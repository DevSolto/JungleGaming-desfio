import type { Task } from '@repo/types'

import { apiResponseSchema } from '@/schemas/apiResponse'

import { taskSchema } from '../schemas/taskSchema'
import { TASKS_ENDPOINT } from './getTasks'

export async function getTaskById(taskId: string): Promise<Task> {
  const response = await fetch(`${TASKS_ENDPOINT}/${taskId}`, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar tarefa: ${response.status} ${response.statusText}`,
    )
  }

  const data = await response.json()
  const parsed = apiResponseSchema(taskSchema).safeParse(data)

  if (parsed.success) {
    return parsed.data.data
  }

  return taskSchema.parse(data)
}
