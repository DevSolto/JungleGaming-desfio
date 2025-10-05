import { io } from 'socket.io-client'

import { env } from '@/env'

const defaultSocketUrl =
  typeof window !== 'undefined' ? window.location.origin : ''

const socketUrl = env.VITE_WS_URL ?? defaultSocketUrl

export const socket = io(socketUrl, {
  auth: {
    token:
      typeof window !== 'undefined'
        ? localStorage.getItem('accessToken')
        : undefined,
  },
  autoConnect: true,
  withCredentials: true,
})

if (typeof window !== 'undefined') {
  socket.on('reconnect_attempt', () => {
    socket.auth = {
      ...socket.auth,
      token: localStorage.getItem('accessToken'),
    }
  })
}
