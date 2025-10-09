import type {
  NotificationChannel,
  NotificationDTO,
  NotificationStatus,
  PaginatedResponse,
} from '@repo/types'

import { API_BASE_URL, fetchWithAuth } from '@/lib/apiClient'
import { paginatedResponseSchema } from '@/schemas/paginatedResponse'

import { notificationSchema } from '../schemas/notificationSchema'

const NOTIFICATIONS_ENDPOINT = API_BASE_URL
  ? `${API_BASE_URL}/notifications`
  : '/api/notifications'

const paginatedNotificationsSchema = paginatedResponseSchema(notificationSchema)

export interface GetNotificationsFilters {
  status?: NotificationStatus
  channel?: NotificationChannel
  search?: string | null
  from?: string | null
  to?: string | null
  page?: number
  limit?: number
}

function buildNotificationsUrl(filters?: GetNotificationsFilters) {
  const params = new URLSearchParams()

  if (filters?.page) {
    params.set('page', filters.page.toString())
  }

  if (filters?.limit) {
    params.set('limit', filters.limit.toString())
  }

  if (filters?.status) {
    params.set('status', filters.status)
  }

  if (filters?.channel) {
    params.set('channel', filters.channel)
  }

  const searchTerm = filters?.search?.trim()
  if (searchTerm) {
    params.set('search', searchTerm)
  }

  if (filters?.from) {
    params.set('from', filters.from)
  }

  if (filters?.to) {
    params.set('to', filters.to)
  }

  const query = params.toString()

  return query
    ? `${NOTIFICATIONS_ENDPOINT}?${query}`
    : NOTIFICATIONS_ENDPOINT
}

export async function getNotifications(
  filters?: GetNotificationsFilters,
): Promise<PaginatedResponse<NotificationDTO>> {
  const response = await fetchWithAuth(buildNotificationsUrl(filters), {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar notificações: ${response.status} ${response.statusText}`,
    )
  }

  const data = await response.json()
  const parsed = paginatedNotificationsSchema.parse(data)

  return parsed
}

export { NOTIFICATIONS_ENDPOINT }
