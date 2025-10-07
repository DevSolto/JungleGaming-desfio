import type {
  AuthRegisterRequest,
  AuthSessionResponse,
  UserDTO,
} from '@repo/types';

import { env } from '@/env';

import { extractErrorMessage } from './errors';
import { useAuthStore } from './store';


const API_BASE_URL = env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
const REGISTER_ENDPOINT = API_BASE_URL
  ? `${API_BASE_URL}/auth/register`
  : '/api/auth/register'

export async function register(
  params: AuthRegisterRequest,
): Promise<UserDTO | string> {
  const response = await fetch(REGISTER_ENDPOINT, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    console.error('Erro na resposta de cadastro:', response.status, response.statusText);
    return extractErrorMessage(
      response,
      'Não foi possível concluir o cadastro. Tente novamente mais tarde.',
      'cadastro',
    );
  }

  const data = await response.json() as AuthSessionResponse;

  const { setAuth } = useAuthStore.getState();

  setAuth(data);

  return data.user as UserDTO;
}
