import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TaskPriority,
  TaskStatus,
  type PaginatedResponse,
  type Task,
} from '@repo/types'

import { getTasks } from './getTasks'

const fetchWithAuthMock = vi.hoisted(() => vi.fn()) as ReturnType<typeof vi.fn>

vi.mock('@/lib/apiClient', () => ({
  fetchWithAuth: fetchWithAuthMock,
  API_BASE_URL: '',
}))

describe('getTasks', () => {
  beforeEach(() => {
    fetchWithAuthMock.mockReset()
  })

  it('retorna os dados paginados com meta', async () => {
    const apiResponse: PaginatedResponse<Task> = {
      data: [
        {
          id: '1',
          title: 'Tarefa de teste',
          description: 'Descrição',
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dueDate: null,
          assignees: [],
        },
      ],
      meta: {
        page: 1,
        size: 10,
        total: 1,
        totalPages: 1,
      },
    }

    fetchWithAuthMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue(apiResponse),
    })

    const result = await getTasks()

    expect(result).toEqual(apiResponse)
    expect(fetchWithAuthMock).toHaveBeenCalledWith('/api/tasks', {
      method: 'GET',
    })
  })

  it('propaga os filtros de paginação na URL', async () => {
    fetchWithAuthMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue({
        data: [],
        meta: { page: 2, size: 5, total: 0, totalPages: 0 },
      }),
    })

    await getTasks({ page: 2, size: 5 })

    expect(fetchWithAuthMock).toHaveBeenCalledWith('/api/tasks?page=2&size=5', {
      method: 'GET',
    })
  })
})
