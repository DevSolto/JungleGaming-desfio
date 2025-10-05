import type { Task, UpdateTask } from '@repo/types'

import { taskSchema, updateTaskSchema } from '../schemas/taskSchema'
import { TASKS_ENDPOINT } from './getTasks'

export async function updateTask(
  taskId: string,
  payload: UpdateTask,
): Promise<Task> {
  const body = updateTaskSchema.parse(payload)

  const response = await fetch(`${TASKS_ENDPOINT}/${taskId}`, {
    method: 'PUT',
    credentials: 'include',
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

  return taskSchema.parse(data)
}
