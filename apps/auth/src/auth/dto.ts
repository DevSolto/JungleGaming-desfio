import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import type {
  AuthLoginRequest,
  AuthRefreshRequest,
  AuthRegisterRequest,
} from '@contracts';

export class RegisterDto implements AuthRegisterRequest {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
export class LoginDto implements AuthLoginRequest {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email!: string; // ou email

  @IsString()
  @MinLength(6)
  password!: string;
}
export class RefreshDto implements AuthRefreshRequest {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
