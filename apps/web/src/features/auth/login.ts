import type {
  AuthLoginRequest,
  AuthSessionResponse,
  UserDTO,
} from '@repo/types';

import { env } from '@/env';

import { useAuthStore } from './store';
import { extractErrorMessage } from './errors';


const API_BASE_URL = env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
const LOGIN_ENDPOINT = API_BASE_URL
  ? `${API_BASE_URL}/auth/login`
  : '/api/auth/login'

export async function login(
  params: AuthLoginRequest,
): Promise<UserDTO | string> {

  const response = await fetch(LOGIN_ENDPOINT, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    console.error('Erro na resposta de login:', response.status, response.statusText);
    return extractErrorMessage(
      response,
      'Não foi possível realizar login. Tente novamente mais tarde.',
      'login',
    );
  }

  const data = await response.json() as AuthSessionResponse;

  const { setAuth } = useAuthStore.getState();

  setAuth(data);

  return data.user as UserDTO;

}

