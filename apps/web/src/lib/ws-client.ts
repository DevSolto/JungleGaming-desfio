import { io } from 'socket.io-client'

import { env } from '@/env'

const socketUrl =
  typeof window !== 'undefined'
    ? env.VITE_WS_URL ?? window.location.origin
    : env.VITE_WS_URL ?? ''

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
