import { z } from 'zod'

import { API_BASE_URL, fetchWithAuth } from '@/lib/apiClient'
import { apiResponseSchema } from '@/schemas/apiResponse'

import { userSchema, type User } from '../schemas/userSchema'

const USERS_ENDPOINT = API_BASE_URL ? `${API_BASE_URL}/users` : '/api/users'

const usersResponseSchema = apiResponseSchema(z.array(userSchema))

interface GetUsersParams {
  search?: string
  page?: number
  limit?: number
}

function buildUsersUrl(params?: GetUsersParams) {
  const query = new URLSearchParams()

  const search = params?.search?.trim()
  if (search) {
    query.set('search', search)
  }

  if (params?.page) {
    query.set('page', params.page.toString())
  }

  if (params?.limit) {
    query.set('limit', params.limit.toString())
  }

  const queryString = query.toString()
  return queryString ? `${USERS_ENDPOINT}?${queryString}` : USERS_ENDPOINT
}

export async function getUsers(params?: GetUsersParams): Promise<User[]> {
  const response = await fetchWithAuth(buildUsersUrl(params), {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Falha ao carregar usuários: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const parsed = usersResponseSchema.parse(data)

  return parsed.data
}

export type { GetUsersParams }
export { USERS_ENDPOINT }
