import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { AUTH_SERVICE } from './auth.constants';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_SERVICE)
    private readonly authClient: ClientProxy,
  ) {}

  register(dto: RegisterDto) {
    return lastValueFrom(this.authClient.send('register', dto));
  }

  login(dto: LoginDto) {
    return lastValueFrom(this.authClient.send('login', dto));
  }

  ping() {
    return lastValueFrom(this.authClient.send('ping', {}));
  }
}
