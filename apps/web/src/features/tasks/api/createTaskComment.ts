import type { Comment } from '@repo/types'

import { fetchWithAuth } from '@/lib/apiClient'
import { apiResponseSchema } from '@/schemas/apiResponse'

import { commentFormSchema, commentSchema } from '../schemas/commentSchema'
import { TASKS_ENDPOINT } from './getTasks'

export interface CreateTaskCommentInput {
  message: string
}

export async function createTaskComment(
  taskId: string,
  input: CreateTaskCommentInput,
): Promise<Comment> {
  const parsedInput = commentFormSchema.parse({
    message: input.message.trim(),
  })

  const response = await fetchWithAuth(`${TASKS_ENDPOINT}/${taskId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(parsedInput),
  })

  if (!response.ok) {
    throw new Error(
      `Falha ao criar comentário: ${response.status} ${response.statusText}`,
    )
  }

  const data = await response.json()
  const parsed = apiResponseSchema(commentSchema).parse(data)

  return parsed.data
}
