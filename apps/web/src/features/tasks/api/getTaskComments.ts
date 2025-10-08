import type { CommentDTO, PaginatedResponse } from '@repo/types'

import { fetchWithAuth } from '@/lib/apiClient'
import { paginatedResponseSchema } from '@/schemas/paginatedResponse'

import { commentSchema } from '../schemas/commentSchema'
import { TASKS_ENDPOINT } from './getTasks'

export interface GetTaskCommentsParams {
  page?: number
  size?: number
}

const paginatedCommentsSchema = paginatedResponseSchema(commentSchema)

function buildCommentsUrl(taskId: string, params?: GetTaskCommentsParams) {
  const searchParams = new URLSearchParams()

  if (params?.page) {
    searchParams.set('page', params.page.toString())
  }

  if (params?.size) {
    searchParams.set('limit', params.size.toString())
  }

  const query = searchParams.toString()
  const baseUrl = `${TASKS_ENDPOINT}/${taskId}/comments`

  return query ? `${baseUrl}?${query}` : baseUrl
}

export async function getTaskComments(
  taskId: string,
  params?: GetTaskCommentsParams,
): Promise<PaginatedResponse<CommentDTO>> {
  const response = await fetchWithAuth(buildCommentsUrl(taskId, params), {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar comentários: ${response.status} ${response.statusText}`,
    )
  }

  const data = await response.json()
  const parsed = paginatedCommentsSchema.parse(data)

  return parsed
}
