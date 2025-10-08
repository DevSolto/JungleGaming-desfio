import type { Task, TaskPriority, TaskStatus } from '@repo/types'
import { z } from 'zod'

import { API_BASE_URL, fetchWithAuth } from '@/lib/apiClient'

import { taskSchema } from '../schemas/taskSchema'

const TASKS_ENDPOINT = API_BASE_URL ? `${API_BASE_URL}/tasks` : '/api/tasks'

const paginatedTasksSchema = z.object({
  data: taskSchema.array(),
})

interface GetTasksFilters {
  status?: TaskStatus | 'ALL'
  priority?: TaskPriority | 'ALL'
  searchTerm?: string | null
  dueDate?: string | null
}

function buildTasksUrl(filters?: GetTasksFilters) {
  const params = new URLSearchParams()

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

  const query = params.toString()

  return query ? `${TASKS_ENDPOINT}?${query}` : TASKS_ENDPOINT
}

export async function getTasks(filters?: GetTasksFilters): Promise<Task[]> {
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

  return parsed.data
}

export type { GetTasksFilters }
export { TASKS_ENDPOINT }
