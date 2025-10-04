import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { AUTH_SERVICE } from './auth.constants';
import { LoginDto, RegisterDto } from './dto';
import {
  AUTH_MESSAGE_PATTERNS,
  type AuthLoginResponse,
  type AuthLogoutResponse,
  type AuthRefreshResponse,
  type AuthRegisterResponse,
  type AuthRefreshRequest,
} from '@contracts';

@Injectable()
export class AuthGatewayService {
  constructor(
    @Inject(AUTH_SERVICE)
    private readonly authClient: ClientProxy,
  ) { }

  async register(dto: RegisterDto): Promise<AuthRegisterResponse> {
    try {
      return await lastValueFrom(
        this.authClient.send(AUTH_MESSAGE_PATTERNS.REGISTER, dto),
      );
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  async login(dto: LoginDto): Promise<AuthLoginResponse> {
    try {
      return await lastValueFrom(
        this.authClient.send(AUTH_MESSAGE_PATTERNS.LOGIN, dto),
      );
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  async refresh(refreshToken: string): Promise<AuthRefreshResponse> {
    const payload: AuthRefreshRequest = { refreshToken };
    try {
      return await lastValueFrom(
        this.authClient.send(AUTH_MESSAGE_PATTERNS.REFRESH, payload),
      );
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  async logout(refreshToken: string): Promise<AuthLogoutResponse> {
    const payload: AuthRefreshRequest = { refreshToken };
    try {
      return await lastValueFrom(
        this.authClient.send(AUTH_MESSAGE_PATTERNS.LOGOUT, payload),
      );
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  async ping() {
    try {
      return await lastValueFrom(
        this.authClient.send(AUTH_MESSAGE_PATTERNS.PING, {}),
      );
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private toHttpException(error: unknown): HttpException {
    if (error instanceof RpcException) {
      const normalized = this.normalizeRpcException(error);
      if (normalized) {
        return new HttpException(normalized.body, normalized.statusCode, {
          cause: normalized.cause,
        });
      }
    }

    // Sometimes microservices return plain objects (not RpcException instances)
    // when proxied through the client. Handle those shapes here so status codes
    // like 401/409 from the auth service are preserved instead of becoming 500.
    if (typeof error === 'object' && error !== null && !(error instanceof Error)) {
      const obj = error as Record<string, unknown>;

      // If the object looks like an HTTP/RPC error (has message/status/statusCode/code),
      // normalize and convert to HttpException preserving status code when possible.
      if (
        'message' in obj ||
        'status' in obj ||
        'statusCode' in obj ||
        'error' in obj ||
        'code' in obj
      ) {
        const body = this.normalizeBody({ ...(obj as Record<string, unknown>) });
        const statusCode = this.extractStatusCode(body.statusCode ?? body.status);
        return new HttpException(body, statusCode, { cause: error });
      }
    }

    if (error instanceof HttpException) {
      return error;
    }

    if (error instanceof Error) {
      return new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error,
        },
      );
    }

    return new HttpException(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private normalizeRpcException(error: RpcException):
    | {
      statusCode: number;
      body: Record<string, unknown>;
      cause?: unknown;
    }
    | undefined {
    const rpcError = error.getError();

    if (rpcError instanceof HttpException) {
      const statusCode = rpcError.getStatus();
      const response = rpcError.getResponse();
      const body = this.normalizeBody({
        statusCode,
        ...(typeof response === 'string'
          ? { message: response }
          : (response as Record<string, unknown>)),
      });

      return { statusCode, body, cause: rpcError }; // preserve original exception
    }

    if (rpcError instanceof Error) {
      const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      const body = this.normalizeBody({
        statusCode,
        message: rpcError.message ?? 'Internal server error',
      });

      return { statusCode, body, cause: rpcError };
    }

    if (typeof rpcError === 'string') {
      const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      const body = this.normalizeBody({
        statusCode,
        message: rpcError,
      });

      return { statusCode, body };
    }

    if (typeof rpcError === 'object' && rpcError !== null) {
      const normalized = this.normalizeBody({
        ...(rpcError as Record<string, unknown>),
      });
      const statusCode =
        typeof normalized.statusCode === 'number'
          ? normalized.statusCode
          : HttpStatus.INTERNAL_SERVER_ERROR;

      return {
        statusCode,
        body: normalized,
        cause: rpcError,
      };
    }

    return undefined;
  }

  private normalizeBody(source: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = { ...source };

    const statusCode = this.extractStatusCode(body.statusCode ?? body.status);
    body.statusCode = statusCode;

    const message = this.extractMessage(body.message ?? body.error);
    body.message = message;

    const code = this.extractCode(body.code);
    if (code) {
      body.code = code;
    } else {
      delete body.code;
    }

    return body;
  }

  private extractStatusCode(rawStatus: unknown): number {
    if (typeof rawStatus === 'number' && Number.isFinite(rawStatus)) {
      return rawStatus;
    }

    if (typeof rawStatus === 'string') {
      const parsed = Number.parseInt(rawStatus, 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private extractMessage(rawMessage: unknown): string {
    if (typeof rawMessage === 'string' && rawMessage.trim().length > 0) {
      return rawMessage;
    }

    if (Array.isArray(rawMessage)) {
      const parts = rawMessage
        .map((part) => this.extractMessage(part))
        .filter((part) => part.length > 0);

      if (parts.length > 0) {
        return parts.join(', ');
      }
    }

    return 'Internal server error';
  }

  private extractCode(rawCode: unknown): string | undefined {
    if (typeof rawCode === 'string' && rawCode.trim().length > 0) {
      return rawCode;
    }

    return undefined;
  }
}
