import { describe, expect, beforeEach, afterEach, it, vi } from 'vitest'

import { useAuthStore } from './store'
import { register } from './register'

describe('register', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    useAuthStore.setState({
      user: null,
      session: null,
      isAuthenticated: false,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    useAuthStore.setState({
      user: null,
      session: null,
      isAuthenticated: false,
    })
  })

  it('envia a requisição de cadastro e persiste a sessão em caso de sucesso', async () => {
    const responsePayload = {
      user: {
        id: 'user-1',
        name: 'Usuário Teste',
        email: 'usuario@teste.com',
      },
      accessToken: 'token-123',
    }

    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(responsePayload),
    })

    const result = await register({
      name: 'Usuário Teste',
      email: 'usuario@teste.com',
      password: 'segredo',
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Usuário Teste',
        email: 'usuario@teste.com',
        password: 'segredo',
      }),
    })

    expect(result).toEqual(responsePayload.user)

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(responsePayload.user)
    expect(state.session).toEqual(responsePayload)
  })

  it('retorna mensagem de erro quando a API responde com falha', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: vi.fn().mockResolvedValue(
        JSON.stringify({ message: 'Email já cadastrado' }),
      ),
    })

    const result = await register({
      name: 'Usuário Teste',
      email: 'usuario@teste.com',
      password: 'segredo',
    })

    expect(result).toBe('Email já cadastrado')

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.session).toBeNull()
  })
})
