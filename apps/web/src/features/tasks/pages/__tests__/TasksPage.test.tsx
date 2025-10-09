import 'reflect-metadata'

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PaginatedResponse, PaginationMeta, Task } from '@repo/types'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { useTasksFilters } from '../../store/useTasksFilters'
import { useTasksPagination } from '../../store/useTasksPagination'
import { getTasks } from '../../api/getTasks'

vi.mock('@/lib/ws-client', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
  },
}))

vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}))

vi.mock('@/router', () => ({
  router: {
    navigate: vi.fn(),
  },
}))

vi.mock('../../components/CardsView', () => ({
  CardsView: ({ isLoading }: { isLoading: boolean }) => (
    <div data-testid="cards-view">{isLoading ? 'carregando' : 'loaded'}</div>
  ),
}))

vi.mock('../../components/TableView', () => ({
  TableView: ({ isLoading }: { isLoading: boolean }) => (
    <div data-testid="table-view">{isLoading ? 'carregando' : 'loaded'}</div>
  ),
}))

vi.mock('../../components/KanbanView', () => ({
  KanbanView: ({ isLoading }: { isLoading: boolean }) => (
    <div data-testid="kanban-view">{isLoading ? 'carregando' : 'loaded'}</div>
  ),
}))

vi.mock('../../components/TaskModal', () => ({
  TaskModal: () => null,
}))

vi.mock('../../components/ViewSwitcher', () => ({
  ViewSwitcher: () => <div data-testid="view-switcher" />,
}))

vi.mock('../../components/TasksPagination', () => ({
  TasksPagination: ({
    page,
    pageSize,
    meta,
    onPageChange,
    onPageSizeChange,
  }: {
    page: number
    pageSize: number
    meta?: PaginationMeta
    onPageChange: (page: number) => void
    onPageSizeChange: (size: number) => void
  }) => {
    const formatRange = (pagination: PaginationMeta) => {
      if (pagination.total === 0) {
        return 'Mostrando 0–0 de 0'
      }

      const start = (pagination.page - 1) * pagination.size + 1
      const end = Math.min(pagination.page * pagination.size, pagination.total)

      return `Mostrando ${start}–${end} de ${pagination.total}`
    }

    return (
      <div>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!meta || page >= meta.totalPages}
        >
          Próxima
        </button>
        <label>
          Itens por página
          <select
            aria-label="Itens por página"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
          </select>
        </label>
        <span>{meta ? formatRange(meta) : 'Carregando paginação...'}</span>
      </div>
    )
  },
}))

vi.mock('../../api/getTasks', () => ({
  getTasks: vi.fn(),
}))

const { TasksPage } = await import('../TasksPage')

const getTasksMock = getTasks as unknown as vi.MockedFunction<typeof getTasks>

const createdClients: QueryClient[] = []

beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => false,
  })

  Object.defineProperty(window.HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => {},
  })

  Object.defineProperty(window.HTMLElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: () => {},
  })
})

function renderTasksPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  createdClients.push(queryClient)

  return render(
    <QueryClientProvider client={queryClient}>
      <TasksPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.useRealTimers()

  getTasksMock.mockImplementation(async (filters): Promise<PaginatedResponse<Task>> => {
    const total = 100
    const size = filters?.size ?? 10
    const totalPages = Math.max(1, Math.ceil(total / size))
    const requestedPage = filters?.page ?? 1
    const page = Math.min(Math.max(1, requestedPage), totalPages)

    return {
      data: [],
      meta: {
        total,
        page,
        size,
        totalPages,
      },
    }
  })

  useTasksFilters.setState({
    searchTerm: '',
    status: 'ALL',
    priority: 'ALL',
    dueDate: null,
  })

  useTasksPagination.setState({
    page: 1,
    pageSize: 10,
  })
})

afterEach(() => {
  getTasksMock.mockReset()
  createdClients.forEach((client) => client.clear())
  createdClients.length = 0
})

const SEARCH_DEBOUNCE_MS = 500

describe('TasksPage - paginação', () => {
  it('permite navegar entre páginas e alterar o tamanho', async () => {
    renderTasksPage()

    await waitFor(() => {
      expect(getTasksMock).toHaveBeenCalled()
    })

    await screen.findByText('Mostrando 1–10 de 100')

    const [nextButton] = screen.getAllByRole('button', { name: 'Próxima' })
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(useTasksPagination.getState().page).toBe(2)
    })

    const pageSizeTrigger = screen.getByLabelText('Itens por página')
    fireEvent.change(pageSizeTrigger, { target: { value: '20' } })

    await waitFor(() => {
      const state = useTasksPagination.getState()
      expect(state.page).toBe(1)
      expect(state.pageSize).toBe(20)
    })

    await waitFor(() => {
      expect(
        getTasksMock.mock.calls.some((call) =>
          call[0] && 'size' in call[0] && call[0]?.size === 20,
        ),
      ).toBe(true)
    })
  })

  it('reseta a paginação ao alterar o termo de busca', async () => {
    renderTasksPage()

    await waitFor(() => {
      expect(getTasksMock).toHaveBeenCalled()
    })

    const [nextButton] = screen.getAllByRole('button', { name: 'Próxima' })
    fireEvent.click(nextButton)

    const [searchInput] = screen.getAllByRole('searchbox')
    fireEvent.change(searchInput, { target: { value: 'nova busca' } })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, SEARCH_DEBOUNCE_MS))
    })

    await waitFor(() => {
      expect(
        getTasksMock.mock.calls.some((call) => {
          const args = call[0] as Record<string, unknown> | undefined
          return (
            args?.page === 1 &&
            args?.size === 10 &&
            args?.searchTerm === 'nova busca'
          )
        }),
      ).toBe(true)
    })

    await waitFor(() => {
      expect(useTasksPagination.getState().page).toBe(1)
    })
  })

  it('reseta a paginação ao alterar os filtros', async () => {
    renderTasksPage()

    await waitFor(() => {
      expect(getTasksMock).toHaveBeenCalled()
    })

    const [nextButton] = screen.getAllByRole('button', { name: 'Próxima' })
    fireEvent.click(nextButton)

    const dueDateInput = screen.getByLabelText('Prazo')
    fireEvent.change(dueDateInput, { target: { value: '2024-01-01' } })

    await waitFor(() => {
      expect(
        getTasksMock.mock.calls.some((call) => {
          const args = call[0] as Record<string, unknown> | undefined
          return (
            args?.page === 1 &&
            args?.size === 10 &&
            args?.dueDate === '2024-01-01'
          )
        }),
      ).toBe(true)
    })

    await waitFor(() => {
      expect(useTasksPagination.getState().page).toBe(1)
    })
  })
})
