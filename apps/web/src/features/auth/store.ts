import type { AuthSession, AuthUser } from '@repo/types'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'

interface AuthState {
  user: AuthUser | null
  session: AuthSession | null
  isAuthenticated: boolean
  setAuth: (session: AuthSession) => void
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
      session: null,
      isAuthenticated: false,
      setAuth: (session) =>
        set(() => {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('accessToken', session.accessToken)
          }

          return {
            user: session.user,
            session,
            isAuthenticated: true,
          }
        }),
      clearAuth: () =>
        set(() => {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('accessToken')
          }

          return {
            user: null,
            session: null,
            isAuthenticated: false,
          }
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(createStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
