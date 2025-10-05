import type { NotificationDTO } from '@repo/types'

import { notificationSchema } from '../schemas/notificationSchema'
import { TASKS_ENDPOINT } from './getTasks'

export async function getTaskNotifications(
  taskId: string,
): Promise<NotificationDTO[]> {
  const response = await fetch(`${TASKS_ENDPOINT}/${taskId}/notifications`, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar notificações: ${response.status} ${response.statusText}`,
    )
  }

  const data = await response.json()
  const payload = 'data' in data ? data.data : data

  return notificationSchema.array().parse(payload)
}
