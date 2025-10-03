import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'player@junglegaming.dev' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'changeme', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
