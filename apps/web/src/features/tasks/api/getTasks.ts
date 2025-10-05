import type { Task } from '@contracts'

import { env } from '@/env'

import { taskSchema } from '../schemas/taskSchema'

const API_BASE_URL = env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
const TASKS_ENDPOINT = API_BASE_URL ? `${API_BASE_URL}/tasks` : '/api/tasks'

export async function getTasks(): Promise<Task[]> {
  const response = await fetch(TASKS_ENDPOINT, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar tarefas: ${response.status} ${response.statusText}`,
    )
  }

  const data = await response.json()

  return taskSchema.array().parse(data)
}

export { TASKS_ENDPOINT }
