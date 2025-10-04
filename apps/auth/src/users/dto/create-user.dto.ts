import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import type { AuthRegisterRequest } from '@contracts';

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
  password!: string;
}
