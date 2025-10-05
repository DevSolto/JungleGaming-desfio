import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import type { AuthRegisterRequest } from '@repo/types';

export class RegisterDto implements AuthRegisterRequest {
  @ApiProperty({ example: 'player@junglegaming.dev' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Player One' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'changeme', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
