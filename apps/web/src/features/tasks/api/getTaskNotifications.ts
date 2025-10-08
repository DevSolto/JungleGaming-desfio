import type { NotificationDTO } from '@repo/types'

import { notificationSchema } from '../schemas/notificationSchema'
import { fetchWithAuth } from '@/lib/apiClient'

import { TASKS_ENDPOINT } from './getTasks'

export async function getTaskNotifications(
  taskId: string,
): Promise<NotificationDTO[]> {
  const response = await fetchWithAuth(`${TASKS_ENDPOINT}/${taskId}/notifications`, {
    method: 'GET',
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
