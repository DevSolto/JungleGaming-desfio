import { Outlet, createRootRouteWithContext, redirect } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/features/auth/store'

import type { QueryClient } from '@tanstack/react-query'
import type { AuthSession } from '@repo/types'

interface MyRouterContext {
  queryClient: QueryClient
}

const PUBLIC_ROUTES = new Set(['/', '/auth'])

function normalizePath(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/'
  }

  return pathname.replace(/\/+$/, '') || '/'
}

function getPersistedSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storedValue = window.localStorage.getItem('auth-storage')

    if (!storedValue) {
      return null
    }

    const parsed = JSON.parse(storedValue) as {
      state?: {
        session?: AuthSession | null
      }
    }

    const persistedSession = parsed?.state?.session

    if (persistedSession?.accessToken && persistedSession.user) {
      return persistedSession
    }
  } catch (error) {
    console.error('Failed to parse persisted auth session', error)
  }

  return null
}

function ensureAuthenticated(): boolean {
  const { session, setAuth, clearAuth } = useAuthStore.getState()

  if (session?.accessToken) {
    return true
  }

  const persistedSession = getPersistedSession()

  if (persistedSession) {
    setAuth(persistedSession)
    return true
  }

  clearAuth()

  return false
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: ({ location }) => {
    const pathname = normalizePath(location.pathname)
    const isAuthenticated = ensureAuthenticated()

    if (pathname === '/auth' && isAuthenticated) {
      throw redirect({ to: '/tasks' })
    }

    if (!isAuthenticated && !PUBLIC_ROUTES.has(pathname)) {
      throw redirect({ to: '/auth' })
    }
  },
  component: () => (
    <>
      <Outlet />
      <Toaster />
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
          TanStackQueryDevtools,
        ]}
      />
    </>
  ),
})
