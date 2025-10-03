export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthTokens {
  access_token: string;
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

export interface AuthRegisterResponse extends AuthTokens {
  user: AuthUser;
}

export type AuthLoginResponse = AuthRegisterResponse;

export interface AuthPingResponse {
  status: 'ok';
  ts: string;
}
