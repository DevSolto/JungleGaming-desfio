import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import type { AuthLoginRequest } from '@repo/types';

export class LoginDto implements AuthLoginRequest {
  @ApiProperty({ example: 'player@junglegaming.dev' })
  @IsString({ message: 'O email deve ser uma string' })
  @IsEmail({}, { message: 'O email deve ser um endereço de email válido' })
  @IsNotEmpty({ message: 'O email é obrigatório' })
  email!: string;

  @ApiProperty({ example: 'changeme', minLength: 6 })
  @IsString({ message: 'A senha deve ser uma string' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 6 caracteres' })
  password!: string;
}
