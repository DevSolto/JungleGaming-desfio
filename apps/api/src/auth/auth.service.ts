import { HttpException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, lastValueFrom, throwError } from 'rxjs';
import { AUTH_SERVICE } from './auth.constants';
import { LoginDto, RegisterDto } from './dto';
import { AUTH_MESSAGE_PATTERNS } from '@repo/contracts';
import type {
  AuthLoginResponse,
  AuthPingResponse,
  AuthRegisterResponse,
} from '@repo/contracts';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_SERVICE)
    private readonly authClient: ClientProxy,
  ) {}

  register(dto: RegisterDto) {
    return lastValueFrom<AuthRegisterResponse>(
      this.authClient.send(AUTH_MESSAGE_PATTERNS.REGISTER, dto).pipe(
        catchError((err) => this.handleRpcException(err)),
      ),
    );
  }

  login(dto: LoginDto) {
    return lastValueFrom<AuthLoginResponse>(
      this.authClient.send(AUTH_MESSAGE_PATTERNS.LOGIN, dto).pipe(
        catchError((err) => this.handleRpcException(err)),
      ),
    );
  }

  ping() {
    return lastValueFrom<AuthPingResponse>(
      this.authClient.send(AUTH_MESSAGE_PATTERNS.PING, {}).pipe(
        catchError((err) => this.handleRpcException(err)),
      ),
    );
  }

  private handleRpcException(error: unknown) {
    if (error instanceof RpcException) {
      const payload = error.getError() as {
        statusCode?: number;
        message?: string;
      };
      if (payload?.statusCode && payload?.message) {
        return throwError(
          () => new HttpException(payload.message, payload.statusCode),
        );
      }
    }

    return throwError(() => error);
  }
}
