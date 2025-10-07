import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";
import type { TokensDTO } from "./tokens.js";
import type { UserDTO } from "./user.js";

export type AuthUserDTO = UserDTO;

export type AuthTokensDTO = TokensDTO;

export type AuthUser = AuthUserDTO;
export type AuthTokens = AuthTokensDTO;

export interface AuthSessionDTO {
  user: AuthUserDTO;
  accessToken: string;
}

export type AuthSession = AuthSessionDTO;
export type AuthSessionResponse = AuthSessionDTO;

export interface AuthRegisterRequestDTO {
  email: string;
  name: string;
  password: string;
}

export type AuthRegisterRequest = AuthRegisterRequestDTO;

export interface AuthLoginRequestDTO {
  email: string;
  password: string;
}

export type AuthLoginRequest = AuthLoginRequestDTO;

export interface AuthRefreshRequestDTO {
  refreshToken: string;
}

export type AuthRefreshRequest = AuthRefreshRequestDTO;

export class RegisterDto implements AuthRegisterRequest {
  @ApiProperty({ example: "player@junglegaming.dev" })
  @IsEmail({}, { message: "O email deve ser um endereço de email válido" })
  @IsNotEmpty({ message: "O email é obrigatório" })
  email!: string;

  @ApiProperty({ example: "Player One" })
  @IsString({ message: "O nome deve ser uma string" })
  @IsNotEmpty({ message: "O nome é obrigatório" })
  name!: string;

  @ApiProperty({ example: "changeme", minLength: 6 })
  @IsString({ message: "A senha deve ser uma string" })
  @MinLength(6, { message: "A senha deve ter no mínimo 6 caracteres" })
  password!: string;
}

export class LoginDto implements AuthLoginRequest {
  @ApiProperty({ example: "player@junglegaming.dev" })
  @IsString({ message: "O email deve ser uma string" })
  @IsEmail({}, { message: "O email deve ser um endereço de email válido" })
  @IsNotEmpty({ message: "O email é obrigatório" })
  email!: string;

  @ApiProperty({ example: "changeme", minLength: 6 })
  @IsString({ message: "A senha deve ser uma string" })
  @MinLength(6, { message: "A senha deve ter no mínimo 6 caracteres" })
  password!: string;
}

export class RefreshDto implements AuthRefreshRequest {
  @ApiProperty({ example: "refresh-token" })
  @IsString({ message: "O refresh token deve ser uma string" })
  @IsNotEmpty({ message: "O refresh token é obrigatório" })
  refreshToken!: string;
}

export interface AuthRegisterResponseDTO extends AuthTokensDTO {
  user: AuthUserDTO;
}

export type AuthLoginResponseDTO = AuthRegisterResponseDTO;

export type AuthRefreshResponseDTO = AuthTokensDTO;

export type AuthRegisterResponse = AuthRegisterResponseDTO;
export type AuthLoginResponse = AuthLoginResponseDTO;
export type AuthRefreshResponse = AuthRefreshResponseDTO;

export interface AuthLogoutResponseDTO {
  success: boolean;
}

export type AuthLogoutResponse = AuthLogoutResponseDTO;

export interface AuthPingResponseDTO {
  status: "ok";
  ts: string;
}

export type AuthPingResponse = AuthPingResponseDTO;
