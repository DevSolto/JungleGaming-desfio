import { useState, type ReactElement } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { TaskAssignee } from '@repo/types'
import { Controller, useForm } from 'react-hook-form'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { AssigneeMultiSelect } from '../AssigneeMultiSelect'
import { getUsers } from '@/features/users/api/getUsers'

vi.mock('@/features/users/api/getUsers', () => ({
  getUsers: vi.fn(),
}))

const getUsersMock = getUsers as unknown as vi.MockedFunction<typeof getUsers>

const createdClients: QueryClient[] = []

function renderWithClient(children: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  createdClients.push(queryClient)

  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  )
}

function selectOption(option: HTMLElement) {
  fireEvent.pointerDown(option, { pointerId: 1 })
  fireEvent.pointerUp(option, { pointerId: 1 })
  fireEvent.click(option)
}

function openSelector(): HTMLElement {
  const triggers = screen.getAllByRole('combobox')
  const trigger = triggers[triggers.length - 1]
  fireEvent.pointerDown(trigger, { pointerId: 1 })
  fireEvent.pointerUp(trigger, { pointerId: 1 })
  fireEvent.click(trigger)
  return trigger
}

async function findOption(text: string): Promise<HTMLElement> {
  const candidates = await screen.findAllByText(text)
  const option = candidates.find((element) => !element.closest('li'))

  if (!option) {
    throw new Error(`Option "${text}" not found`)
  }

  return option as HTMLElement
}

afterEach(() => {
  createdClients.forEach((client) => client.clear())
  createdClients.length = 0
  vi.clearAllMocks()
})

describe('AssigneeMultiSelect', () => {
  beforeAll(() => {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    Object.defineProperty(globalThis, 'ResizeObserver', {
      writable: true,
      configurable: true,
      value: ResizeObserverMock,
    })
  })

  beforeEach(() => {
    getUsersMock.mockResolvedValue([
      { id: 'user-1', name: 'Explorer 1', email: 'user1@example.com' },
      { id: 'user-2', name: 'Explorer 2', email: 'user2@example.com' },
    ])
  })

  it('carrega usuários conforme a busca e exibe os resultados', async () => {
    renderWithClient(
      <AssigneeMultiSelect value={[]} onChange={() => {}} />,
    )

    openSelector()

    await waitFor(() => {
      expect(getUsersMock).toHaveBeenCalledWith({ search: '', limit: 20 })
    })

    await waitFor(() => {
      expect(screen.getByText('Explorer 1')).toBeTruthy()
      expect(screen.getByText('Explorer 2')).toBeTruthy()
    })

    const searchInput = screen.getByPlaceholderText('Buscar responsável...')
    fireEvent.change(searchInput, { target: { value: 'Explorer' } })

    await waitFor(() => {
      expect(getUsersMock).toHaveBeenLastCalledWith({
        search: 'Explorer',
        limit: 20,
      })
    })
  })

  it('permite selecionar e remover múltiplos responsáveis', async () => {
    function Wrapper() {
      const [value, setValue] = useState<TaskAssignee[]>([])
      return <AssigneeMultiSelect value={value} onChange={setValue} />
    }

    renderWithClient(<Wrapper />)

    openSelector()

    await waitFor(() => {
      expect(getUsersMock).toHaveBeenCalled()
    })

    const optionExplorer1 = await findOption('Explorer 1')
    const optionExplorer2 = await findOption('Explorer 2')

    selectOption(optionExplorer1 as HTMLElement)

    const removeFirst = await screen.findByRole('button', {
      name: /remover responsável explorer 1/i,
    })

    selectOption(optionExplorer2 as HTMLElement)

    await screen.findByRole('button', {
      name: /remover responsável explorer 2/i,
    })

    fireEvent.click(removeFirst)

    await waitFor(() => {
      expect(
        screen.queryByRole('button', {
          name: /remover responsável explorer 1/i,
        }),
      ).toBeNull()
      expect(
        screen.getByRole('button', {
          name: /remover responsável explorer 2/i,
        }),
      ).toBeTruthy()
    })
  })

  it('integra com formulários controlados utilizando react-hook-form', async () => {
    const handleSubmit = vi.fn()

    function FormWrapper() {
      const { control, handleSubmit: onSubmit } = useForm<{ assignees: TaskAssignee[] }>({
        defaultValues: { assignees: [] },
      })

      return (
        <form onSubmit={onSubmit(handleSubmit)}>
          <Controller
            control={control}
            name="assignees"
            render={({ field }) => (
              <AssigneeMultiSelect
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <button type="submit">Salvar</button>
        </form>
      )
    }

    renderWithClient(<FormWrapper />)

    openSelector()

    await waitFor(() => {
      expect(getUsersMock).toHaveBeenCalled()
    })

    const optionExplorer1 = await findOption('Explorer 1')
    const optionExplorer2 = await findOption('Explorer 2')

    selectOption(optionExplorer1)
    const removeExplorer1 = await screen.findAllByRole('button', {
      name: /remover responsável explorer 1/i,
    })

    selectOption(optionExplorer2)
    const removeExplorer2 = await screen.findAllByRole('button', {
      name: /remover responsável explorer 2/i,
    })

    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1)
    })

    const submitted = handleSubmit.mock.calls[0][0]

    expect(submitted.assignees).toEqual([
      {
        id: 'user-1',
        username: 'Explorer 1',
        name: 'Explorer 1',
        email: 'user1@example.com',
      },
      {
        id: 'user-2',
        username: 'Explorer 2',
        name: 'Explorer 2',
        email: 'user2@example.com',
      },
    ])

    // Clean up selection to avoid interference with other tests
    fireEvent.click(removeExplorer1[removeExplorer1.length - 1])
    fireEvent.click(removeExplorer2[removeExplorer2.length - 1])
  })
})
