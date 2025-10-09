import type { PaginatedResponse, Task, TaskPriority, TaskStatus } from '@repo/types'

import { API_BASE_URL, fetchWithAuth } from '@/lib/apiClient'
import { paginatedResponseSchema } from '@/schemas/paginatedResponse'

import { taskSchema } from '../schemas/taskSchema'

const TASKS_ENDPOINT = API_BASE_URL ? `${API_BASE_URL}/tasks` : '/api/tasks'

const paginatedTasksSchema = paginatedResponseSchema(taskSchema)

interface GetTasksFilters {
  status?: TaskStatus | 'ALL'
  priority?: TaskPriority | 'ALL'
  searchTerm?: string | null
  dueDate?: string | null
  assigneeId?: string | null
  page?: number
  size?: number
}

function buildTasksUrl(filters?: GetTasksFilters) {
  const params = new URLSearchParams()

  if (filters?.page) {
    params.set('page', filters.page.toString())
  }

  if (filters?.size) {
    params.set('size', filters.size.toString())
  }

  if (filters?.status && filters.status !== 'ALL') {
    params.set('status', filters.status)
  }

  if (filters?.priority && filters.priority !== 'ALL') {
    params.set('priority', filters.priority)
  }

  const searchTerm = filters?.searchTerm?.trim()
  if (searchTerm) {
    params.set('search', searchTerm)
  }

  if (filters?.dueDate) {
    params.set('dueDate', filters.dueDate)
  }

  const assigneeId = filters?.assigneeId?.trim()
  if (assigneeId) {
    params.set('assigneeId', assigneeId)
  }

  const query = params.toString()

  return query ? `${TASKS_ENDPOINT}?${query}` : TASKS_ENDPOINT
}

export async function getTasks(
  filters?: GetTasksFilters,
): Promise<PaginatedResponse<Task>> {
  const response = await fetchWithAuth(buildTasksUrl(filters), {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar tarefas: ${response.status} ${response.statusText}`,
    )
  }

  const data = await response.json()
  const parsed = paginatedTasksSchema.parse(data)

  return parsed
}

export type { GetTasksFilters }
export { TASKS_ENDPOINT }
