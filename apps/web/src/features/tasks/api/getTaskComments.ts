import type { CommentDTO } from '@repo/types'

import { commentSchema } from '../schemas/commentSchema'
import { fetchWithAuth } from '@/lib/apiClient'

import { TASKS_ENDPOINT } from './getTasks'

export async function getTaskComments(taskId: string): Promise<CommentDTO[]> {
  const response = await fetchWithAuth(`${TASKS_ENDPOINT}/${taskId}/comments`, {
    method: 'GET',
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
