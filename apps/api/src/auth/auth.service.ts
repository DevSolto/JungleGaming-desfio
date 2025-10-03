import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
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
      this.authClient.send(AUTH_MESSAGE_PATTERNS.REGISTER, dto),
    );
  }

  login(dto: LoginDto) {
    return lastValueFrom<AuthLoginResponse>(
      this.authClient.send(AUTH_MESSAGE_PATTERNS.LOGIN, dto),
    );
  }

  ping() {
    return lastValueFrom<AuthPingResponse>(
      this.authClient.send(AUTH_MESSAGE_PATTERNS.PING, {}),
    );
  }
}
