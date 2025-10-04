import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
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
  ) {}

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
      const rpcError = error.getError();

      if (
        typeof rpcError === 'object' &&
        rpcError !== null &&
        'statusCode' in rpcError &&
        typeof (rpcError as { statusCode?: unknown }).statusCode === 'number'
      ) {
        const { statusCode, message, code } = rpcError as {
          statusCode: number;
          message?: unknown;
          code?: unknown;
        };
        const normalizedMessage =
          typeof message === 'string'
            ? message
            : 'Internal server error';
        const normalizedCode =
          typeof code === 'string' ? code : undefined;

        const responseBody: Record<string, unknown> = {
          statusCode,
          message: normalizedMessage,
        };

        if (normalizedCode) {
          responseBody.code = normalizedCode;
        }

        return new HttpException(responseBody, statusCode, {
          cause: rpcError,
        });
      }

      if (typeof rpcError === 'string') {
        return new HttpException(rpcError, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    if (error instanceof Error) {
      return new HttpException(
        error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error,
        },
      );
    }

    return new HttpException(
      'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
