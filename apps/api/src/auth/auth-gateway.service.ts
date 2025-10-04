import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
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

  register(dto: RegisterDto): Promise<AuthRegisterResponse> {
    return lastValueFrom(
      this.authClient.send(AUTH_MESSAGE_PATTERNS.REGISTER, dto),
    );
  }

  login(dto: LoginDto): Promise<AuthLoginResponse> {
    return lastValueFrom(
      this.authClient.send(AUTH_MESSAGE_PATTERNS.LOGIN, dto),
    );
  }

  refresh(refreshToken: string): Promise<AuthRefreshResponse> {
    const payload: AuthRefreshRequest = { refreshToken };
    return lastValueFrom(
      this.authClient.send(AUTH_MESSAGE_PATTERNS.REFRESH, payload),
    );
  }

  logout(refreshToken: string): Promise<AuthLogoutResponse> {
    const payload: AuthRefreshRequest = { refreshToken };
    return lastValueFrom(
      this.authClient.send(AUTH_MESSAGE_PATTERNS.LOGOUT, payload),
    );
  }

  ping() {
    return lastValueFrom(this.authClient.send(AUTH_MESSAGE_PATTERNS.PING, {}));
  }
}
