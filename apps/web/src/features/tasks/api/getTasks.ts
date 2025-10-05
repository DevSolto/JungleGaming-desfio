import type { Task, TaskPriority, TaskStatus } from '@contracts'
import { z } from 'zod'

import { env } from '@/env'

import { taskSchema } from '../schemas/taskSchema'

const API_BASE_URL = env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
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

  const query = params.toString()

  return query ? `${TASKS_ENDPOINT}?${query}` : TASKS_ENDPOINT
}

function matchesDueDate(task: Task, dueDate: string) {
  if (!task.dueDate) {
    return false
  }

  return task.dueDate.slice(0, 10) === dueDate
}

export async function getTasks(filters?: GetTasksFilters): Promise<Task[]> {
  const response = await fetch(buildTasksUrl(filters), {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar tarefas: ${response.status} ${response.statusText}`,
    )
  }

  const data = await response.json()
  const parsed = paginatedTasksSchema.parse(data)

  if (filters?.dueDate) {
    const dueDate = filters.dueDate
    return parsed.data.filter((task) => matchesDueDate(task, dueDate))
  }

  return parsed.data
}

export type { GetTasksFilters }
export { TASKS_ENDPOINT }
