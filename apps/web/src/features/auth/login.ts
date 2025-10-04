import type { AuthLoginRequest, AuthLoginResponse } from '@contracts'
import { env } from '@/env'


const API_BASE_URL = env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
const LOGIN_ENDPOINT = API_BASE_URL
  ? `${API_BASE_URL}/auth/login`
  : '/api/auth/login'

export async function login(
  params: AuthLoginRequest,
): Promise<AuthLoginResponse> {

  console.log('Login params:', params);

  const response = await fetch(LOGIN_ENDPOINT, {
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

  // safety: some responses may be 200 with empty body (or 204). Avoid
  // calling response.json() directly because it throws on empty body.
  const text = await response.text();
  if (!text || text.trim().length === 0) {
    throw new Error('Resposta vazia do servidor ao tentar realizar login.')
  }

  try {
    return JSON.parse(text) as AuthLoginResponse
  } catch (err) {
    console.error('Erro ao parsear JSON de login:', err)
    throw new Error('Resposta inválida do servidor ao tentar realizar login.')
  }
}

async function extractErrorMessage(response: Response) {
  try {
    const text = await response.text()
    if (!text) return 'Não foi possível realizar login. Tente novamente mais tarde.'

    const data = (JSON.parse(text) as
      | { message?: string | string[]; error?: string }
      | undefined)

    if (Array.isArray(data?.message)) {
      console.error('Erro de validação:', data.message)
      return (data.message as string[]).join(', ')
    }

    if (typeof data?.message === 'string') return data.message
    if (typeof data?.error === 'string') return data.error
  } catch (error) {
    console.error('Erro ao interpretar resposta de login:', error)
  }

  return 'Não foi possível realizar login. Tente novamente mais tarde.'
}

