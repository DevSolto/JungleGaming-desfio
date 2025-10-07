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
