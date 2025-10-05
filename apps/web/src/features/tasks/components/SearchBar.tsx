import { useEffect, useMemo, useState } from 'react'
import type { Task } from '@contracts'
import { useQuery } from '@tanstack/react-query'
import { Search as SearchIcon } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandLoading,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { router } from '@/router'
import { cn } from '@/lib/utils'

import { TASKS_ENDPOINT } from '../api/getTasks'
import { taskSchema } from '../schemas/taskSchema'

const DEFAULT_PLACEHOLDER = 'Buscar tarefas'
const SEARCH_DEBOUNCE_MS = 500

const fallbackBaseUrl = 'http://localhost'

const statusLabels: Record<Task['status'], string> = {
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  REVIEW: 'Em revisão',
  DONE: 'Concluída',
}

const priorityLabels: Record<Task['priority'], string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

const buildSearchUrl = (term: string) => {
  if (!term) {
    return TASKS_ENDPOINT
  }

  if (TASKS_ENDPOINT.startsWith('http')) {
    const url = new URL(TASKS_ENDPOINT)
    url.searchParams.set('search', term)
    return url.toString()
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : fallbackBaseUrl
  const url = new URL(TASKS_ENDPOINT, origin)
  url.searchParams.set('search', term)
  return url.toString()
}

const fetchTasksByTerm = async (term: string): Promise<Task[]> => {
  const url = buildSearchUrl(term)
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Falha ao buscar tarefas: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  return taskSchema.array().parse(data)
}

export const onSelectTask = (taskId: string) => {
  void router.navigate({
    to: '/tasks/$taskId',
    params: { taskId },
  })
}

interface SearchBarProps {
  className?: string
  placeholder?: string
  onTaskSelect?: (taskId: string) => void
}

export function SearchBar({
  className,
  placeholder = DEFAULT_PLACEHOLDER,
  onTaskSelect = onSelectTask,
}: SearchBarProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedTerm(searchTerm.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [searchTerm])

  const shouldSearch = debouncedTerm.length > 0

  const {
    data: tasks = [],
    isFetching,
    isError,
  } = useQuery<Task[]>({
    queryKey: ['tasks', 'search', debouncedTerm],
    queryFn: () => fetchTasksByTerm(debouncedTerm),
    enabled: shouldSearch,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })

  const hasResults = tasks.length > 0

  const helperState = useMemo(() => {
    if (!searchTerm.trim()) {
      return 'idle' as const
    }

    if (isError) {
      return 'error' as const
    }

    if (!isFetching && shouldSearch && !hasResults) {
      return 'empty' as const
    }

    return null
  }, [hasResults, isError, isFetching, searchTerm, shouldSearch])

  const handleSelect = (taskId: string) => {
    onTaskSelect(taskId)
    setOpen(false)
    setSearchTerm('')
    setDebouncedTerm('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn('relative w-full', className)}>
          <SearchIcon className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value)
              if (!open) {
                setOpen(true)
              }
            }}
            placeholder={placeholder}
            className="pl-9"
            role="searchbox"
            onFocus={() => setOpen(true)}
            autoComplete="off"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
        collisionPadding={8}
      >
        <Command>
          <CommandList className="max-h-64">
            {isFetching ? (
              <CommandLoading>Carregando tarefas...</CommandLoading>
            ) : null}

            {shouldSearch && hasResults ? (
              <CommandGroup heading="Resultados">
                {tasks.map((task) => (
                  <CommandItem
                    key={task.id}
                    value={task.id}
                    onSelect={() => handleSelect(task.id)}
                  >
                    <div className="flex w-full flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {task.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Prioridade: {priorityLabels[task.priority]} · Status: {statusLabels[task.status]}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {helperState === 'idle' ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Digite um termo para buscar tarefas.
              </div>
            ) : null}

            {helperState === 'error' ? (
              <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                Não foi possível carregar as tarefas.
              </CommandEmpty>
            ) : null}

            {helperState === 'empty' ? (
              <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma tarefa encontrada.
              </CommandEmpty>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
