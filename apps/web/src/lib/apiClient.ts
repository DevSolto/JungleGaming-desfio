import type { AuthSession } from '@repo/types'

import { env } from '@/env'
import { useAuthStore } from '@/features/auth/store'

const API_BASE_URL = env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
const REFRESH_ENDPOINT = API_BASE_URL
  ? `${API_BASE_URL}/auth/refresh`
  : '/api/auth/refresh'

type FetchInput = Parameters<typeof fetch>[0]
type FetchInit = Parameters<typeof fetch>[1]

function resolveCredentials(init?: FetchInit): RequestCredentials {
  if (init?.credentials) {
    return init.credentials
  }

  return 'include'
}

function shouldSkipRefresh(input: FetchInput): boolean {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url

  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh')
  )
}

async function refreshAccessToken(): Promise<string | null> {
  const { session, setAuth, clearAuth } = useAuthStore.getState()

  if (!session?.user) {
    clearAuth()
    return null
  }

  try {
    const response = await fetch(REFRESH_ENDPOINT, {
      method: 'POST',
      credentials: 'include',
    })

    if (!response.ok) {
      clearAuth()
      return null
    }

    const data = (await response.json()) as { accessToken: string }
    const updatedSession: AuthSession = {
      user: session.user,
      accessToken: data.accessToken,
    }

    setAuth(updatedSession)

    return data.accessToken
  } catch (error) {
    console.error('Failed to refresh access token', error)
    clearAuth()
    return null
  }
}

function applyAuthHeader(headers: Headers, accessToken?: string | null) {
  if (!accessToken || headers.has('Authorization')) {
    return
  }

  headers.set('Authorization', `Bearer ${accessToken}`)
}

export async function fetchWithAuth(
  input: FetchInput,
  init?: FetchInit,
): Promise<Response> {
  const headers = new Headers(init?.headers)
  const { session, clearAuth } = useAuthStore.getState()

  applyAuthHeader(headers, session?.accessToken)

  const credentials = resolveCredentials(init)

  const response = await fetch(input, { ...init, headers, credentials })

  if (response.status !== 401 || shouldSkipRefresh(input)) {
    return response
  }

  const refreshedToken = await refreshAccessToken()

  if (!refreshedToken) {
    return response
  }

  const retryHeaders = new Headers(init?.headers)
  applyAuthHeader(retryHeaders, refreshedToken)

  const retryResponse = await fetch(input, {
    ...init,
    headers: retryHeaders,
    credentials,
  })

  if (retryResponse.status === 401) {
    clearAuth()
  }

  return retryResponse
}

export { API_BASE_URL }
