export interface TokensDTO {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer" | string;
}
