import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import type { AuthLoginRequest } from '@contracts';

export class LoginDto implements AuthLoginRequest {
  @ApiProperty({ example: 'player@junglegaming.dev' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'changeme', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
