import type { CommentDTO } from '@contracts'

import { commentSchema } from '../schemas/commentSchema'
import { TASKS_ENDPOINT } from './getTasks'

export async function getTaskComments(taskId: string): Promise<CommentDTO[]> {
  const response = await fetch(`${TASKS_ENDPOINT}/${taskId}/comments`, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar comentários: ${response.status} ${response.statusText}`,
    )
  }

  const data = await response.json()
  const payload = 'data' in data ? data.data : data

  return commentSchema.array().parse(payload)
}
