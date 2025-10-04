import type { AuthLoginRequest } from '@contracts';
import { createLogger } from 'vite';

export async function login(params: AuthLoginRequest) {
    createLogger().info('Login params: ' + JSON.stringify(params));
  return params;
}
