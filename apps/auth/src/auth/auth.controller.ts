import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { AUTH_MESSAGE_PATTERNS } from '@repo/contracts';
import type { AuthLoginResponse, AuthRegisterResponse } from '@repo/contracts';

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
}
