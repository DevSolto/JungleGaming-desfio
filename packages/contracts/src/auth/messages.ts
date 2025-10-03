export const AUTH_MESSAGE_PATTERNS = {
  REGISTER: 'auth.register',
  LOGIN: 'auth.login',
  REFRESH: 'auth.refresh',
  LOGOUT: 'auth.logout',
  PING: 'auth.ping',
} as const;

export type AuthMessagePattern =
  (typeof AUTH_MESSAGE_PATTERNS)[keyof typeof AUTH_MESSAGE_PATTERNS];
