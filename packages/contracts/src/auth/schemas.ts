export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthRegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface AuthLoginRequest {
  username: string;
  password: string;
}

export interface AuthRefreshRequest {
  refreshToken: string;
}

export interface AuthRefreshResponse extends AuthTokens {}

export interface AuthRegisterResponse extends AuthTokens {
  user: AuthUser;
}

export type AuthLoginResponse = AuthRegisterResponse;

export interface AuthLogoutResponse {
  success: boolean;
}

export interface AuthPingResponse {
  status: 'ok';
  ts: string;
}
