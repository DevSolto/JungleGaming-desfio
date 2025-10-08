import type { Task, UpdateTask } from '@repo/types'

import { fetchWithAuth } from '@/lib/apiClient'
import { apiResponseSchema } from '@/schemas/apiResponse'

import { taskSchema, updateTaskSchema } from '../schemas/taskSchema'
import { TASKS_ENDPOINT } from './getTasks'

export async function updateTask(
  taskId: string,
  payload: UpdateTask,
): Promise<Task> {
  const body = updateTaskSchema.parse(payload)

  const response = await fetchWithAuth(`${TASKS_ENDPOINT}/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(
      `Falha ao atualizar tarefa: ${response.status} ${response.statusText}`,
    )
  }

  const data = await response.json()
  const parsed = apiResponseSchema(taskSchema).parse(data)

  return parsed.data
}
