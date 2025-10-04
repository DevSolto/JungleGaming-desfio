import type { AuthLoginRequest, AuthLoginResponse } from '@contracts'
import { env } from '@/env'

const API_BASE_URL = env.SERVER_URL?.replace(/\/$/, '') ?? ''

export async function login(
  params: AuthLoginRequest,
): Promise<AuthLoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return (await response.json()) as AuthLoginResponse
}

async function extractErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as
      | { message?: string | string[] }
      | undefined

    if (Array.isArray(data?.message)) {
      return data.message.join(', ')
    }

    if (typeof data?.message === 'string' && data.message.trim().length > 0) {
      return data.message
    }
  } catch (error) {
    console.error('Erro ao interpretar resposta de login', error)
  }

  return 'Não foi possível realizar login. Tente novamente mais tarde.'
}
