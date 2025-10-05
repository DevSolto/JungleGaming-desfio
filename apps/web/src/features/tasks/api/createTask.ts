import type { CreateTask, Task } from '@repo/types'

import { createTaskSchema, taskSchema } from '../schemas/taskSchema'
import { TASKS_ENDPOINT } from './getTasks'

export async function createTask(payload: CreateTask): Promise<Task> {
  const body = createTaskSchema.parse(payload)

  const response = await fetch(TASKS_ENDPOINT, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(
      `Falha ao criar tarefa: ${response.status} ${response.statusText}`,
    )
  }

  const data = await response.json()

  return taskSchema.parse(data)
}
