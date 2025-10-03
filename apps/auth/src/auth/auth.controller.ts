import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) { }

  @MessagePattern('register')
  register(@Payload() createUserDto: CreateUserDto) {
    return this.auth.register(createUserDto);
  }

  @MessagePattern('login')
  login(@Payload() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }
}
