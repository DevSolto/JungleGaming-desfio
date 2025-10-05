import type { AuthTokens, AuthUser } from '@contracts'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'

interface AuthState {
  user: AuthUser | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  setAuth: (payload: { user: AuthUser; tokens: AuthTokens }) => void
  clearAuth: () => void
}

const createStorage = (): StateStorage => {
  if (typeof window === 'undefined') {
    const memoryStorage: Record<string, string> = {}

    return {
      getItem: (name) => memoryStorage[name] ?? null,
      setItem: (name, value) => {
        memoryStorage[name] = value
      },
      removeItem: (name) => {
        delete memoryStorage[name]
      },
    }
  }

  return window.localStorage
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      setAuth: ({ user, tokens }) =>
        set({
          user,
          tokens,
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(createStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
