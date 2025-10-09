import type { PaginatedResponse, TaskAuditLogDTO } from '@repo/types'

import { fetchWithAuth } from '@/lib/apiClient'
import { paginatedResponseSchema } from '@/schemas/paginatedResponse'

import { taskAuditLogSchema } from '../schemas/auditLogSchema'
import { TASKS_ENDPOINT } from './getTasks'

export interface GetTaskAuditLogsParams {
  page?: number
  size?: number
}

const paginatedAuditLogsSchema = paginatedResponseSchema(taskAuditLogSchema)

function buildAuditLogsUrl(taskId: string, params?: GetTaskAuditLogsParams) {
  const searchParams = new URLSearchParams()

  if (params?.page) {
    searchParams.set('page', params.page.toString())
  }

  if (params?.size) {
    searchParams.set('limit', params.size.toString())
  }

  const query = searchParams.toString()
  const baseUrl = `${TASKS_ENDPOINT}/${taskId}/audit-log`

  return query ? `${baseUrl}?${query}` : baseUrl
}

export async function getTaskAuditLogs(
  taskId: string,
  params?: GetTaskAuditLogsParams,
): Promise<PaginatedResponse<TaskAuditLogDTO>> {
  const response = await fetchWithAuth(buildAuditLogsUrl(taskId, params), {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar histórico: ${response.status} ${response.statusText}`,
    )
  }

  const data = await response.json()
  const parsed = paginatedAuditLogsSchema.parse(data)

  return parsed
}
