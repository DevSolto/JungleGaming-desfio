export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

// Explicit interface export to ensure the symbol is emitted in the package types
export interface AuthSessionResponse {
  user: AuthUser;
  accessToken: string;
}

export interface AuthRegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthRefreshRequest {
  refreshToken: string;
}

export interface AuthRefreshResponse extends AuthTokens { }

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
