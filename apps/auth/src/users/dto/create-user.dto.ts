import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import type { AuthRegisterRequest } from '@repo/types';

export class CreateUserDto implements AuthRegisterRequest {
  @IsString({
    message: 'email must be a string',
  })
  @IsEmail(
    {},
    {
      message: 'email must be a valid email address',
    },
  )
  email!: string;

  @IsString({
    message: 'name must be a string',
  })
  @IsNotEmpty({
    message: 'name must not be empty',
  })
  name!: string;

  @IsString({
    message: 'password must be a string',
  })
  @IsNotEmpty({
    message: 'password must not be empty',
  })
  @MinLength(6, {
    message: 'password must be at least 6 characters long',
  })
  password!: string;
}
