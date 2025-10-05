import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './dto';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { AUTH_MESSAGE_PATTERNS } from '@repo/types';
import type {
  AuthLoginResponse,
  AuthLogoutResponse,
  AuthRefreshResponse,
  AuthRegisterResponse,
} from '@repo/types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @MessagePattern(AUTH_MESSAGE_PATTERNS.REGISTER)
  register(
    @Payload() createUserDto: CreateUserDto,
  ): Promise<AuthRegisterResponse> {
    return this.auth.register(createUserDto);
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.LOGIN)
  login(@Payload() dto: LoginDto): Promise<AuthLoginResponse> {
    return this.auth.login(dto);
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.REFRESH)
  refresh(@Payload() dto: RefreshDto): Promise<AuthRefreshResponse> {
    return this.auth.refresh(dto);
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.LOGOUT)
  logout(@Payload() dto: RefreshDto): Promise<AuthLogoutResponse> {
    return this.auth.logout(dto);
  }
}
