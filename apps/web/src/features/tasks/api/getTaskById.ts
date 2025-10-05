import type { Task } from '@contracts'

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
  const payload = 'data' in data ? data.data : data

  return taskSchema.parse(payload)
}
