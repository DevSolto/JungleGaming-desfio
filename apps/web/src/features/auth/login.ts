import type { AuthLoginRequest, AuthLoginResponse, UserDTO } from '@contracts';

import { env } from '@/env';

import { useAuthStore } from './store';


const API_BASE_URL = env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
const LOGIN_ENDPOINT = API_BASE_URL
  ? `${API_BASE_URL}/auth/login`
  : '/api/auth/login'

export async function login(
  params: AuthLoginRequest,
): Promise<UserDTO|string> {

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
    return extractErrorMessage(response);
  }

  const data = await response.json() as AuthLoginResponse;

  const { setAuth } = useAuthStore.getState();

  setAuth({
    user: data.user,
    tokens: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    },
  });

  return data.user as UserDTO;

}

async function extractErrorMessage(response: Response) {
  try {
    const text = await response.text()
    if (!text) return 'Não foi possível realizar login. Tente novamente mais tarde.'

    const data = (JSON.parse(text) as
      | { message?: string | string[]; error?: string }
      | undefined)

    if (Array.isArray(data?.message)) {
      return (data.message as string[]).join(', ')
    }

    if (typeof data?.message === 'string') return data.message
    if (typeof data?.error === 'string') return data.error
  } catch (error) {
    console.error('Erro ao interpretar resposta de login:', error)
  }

  return 'Não foi possível realizar login. Tente novamente mais tarde.'
}

