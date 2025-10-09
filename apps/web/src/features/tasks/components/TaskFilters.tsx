import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TaskPriority, TaskStatus } from '@repo/types'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
} from '@/components/ui/command'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import {
  type PriorityFilter,
  type StatusFilter,
  useTasksFilters,
} from '../store/useTasksFilters'
import { useTaskCreationModal } from '../store/useTaskCreationModal'
import { useTasksPagination } from '../store/useTasksPagination'
import { getUsers } from '@/features/users/api/getUsers'

const statusLabels: Record<Exclude<StatusFilter, 'ALL'>, string> = {
  [TaskStatus.TODO]: 'A fazer',
  [TaskStatus.IN_PROGRESS]: 'Em andamento',
  [TaskStatus.REVIEW]: 'Em revisão',
  [TaskStatus.DONE]: 'Concluída',
}

const priorityLabels: Record<Exclude<PriorityFilter, 'ALL'>, string> = {
  [TaskPriority.LOW]: 'Baixa',
  [TaskPriority.MEDIUM]: 'Média',
  [TaskPriority.HIGH]: 'Alta',
  [TaskPriority.URGENT]: 'Urgente',
}

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'Todos os status' },
  { value: TaskStatus.TODO, label: statusLabels[TaskStatus.TODO] },
  { value: TaskStatus.IN_PROGRESS, label: statusLabels[TaskStatus.IN_PROGRESS] },
  { value: TaskStatus.REVIEW, label: statusLabels[TaskStatus.REVIEW] },
  { value: TaskStatus.DONE, label: statusLabels[TaskStatus.DONE] },
]

const priorityOptions: Array<{ value: PriorityFilter; label: string }> = [
  { value: 'ALL', label: 'Todas as prioridades' },
  { value: TaskPriority.LOW, label: priorityLabels[TaskPriority.LOW] },
  { value: TaskPriority.MEDIUM, label: priorityLabels[TaskPriority.MEDIUM] },
  { value: TaskPriority.HIGH, label: priorityLabels[TaskPriority.HIGH] },
  { value: TaskPriority.URGENT, label: priorityLabels[TaskPriority.URGENT] },
]

interface TaskFiltersProps {
  className?: string
  onCreateTask?: () => void
}

export function TaskFilters({ className, onCreateTask }: TaskFiltersProps) {
  const {
    status,
    setStatus,
    priority,
    setPriority,
    dueDate,
    setDueDate,
    assigneeId,
    assigneeName,
    setAssignee,
  } = useTasksFilters()
  const { open } = useTaskCreationModal()
  const { resetPagination } = useTasksPagination()
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false)

  const assigneesQuery = useQuery({
    queryKey: ['users', { search: assigneeSearch }],
    queryFn: () => getUsers({ search: assigneeSearch, limit: 20 }),
    enabled: isAssigneeOpen,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!isAssigneeOpen) {
      setAssigneeSearch('')
    }
  }, [isAssigneeOpen])

  const handleStatusChange = (value: string) => {
    setStatus(value as StatusFilter)
    resetPagination()
  }

  const handlePriorityChange = (value: string) => {
    setPriority(value as PriorityFilter)
    resetPagination()
  }

  const handleDueDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trim()
    setDueDate(value ? value : null)
    resetPagination()
  }

  const users = assigneesQuery.data ?? []

  const selectedUser = useMemo(
    () => users.find((user) => user.id === assigneeId),
    [users, assigneeId],
  )

  const assigneeLabel = assigneeId
    ? selectedUser?.name ?? assigneeName ?? 'Responsável selecionado'
    : 'Todos os responsáveis'

  const emptyMessage = assigneesQuery.isError
    ? 'Não foi possível carregar responsáveis.'
    : 'Nenhum responsável encontrado.'

  const closeAssigneePopover = () => {
    setIsAssigneeOpen(false)
    setAssigneeSearch('')
  }

  const handleAssigneeClear = () => {
    setAssignee({ id: null, name: null })
    resetPagination()
    closeAssigneePopover()
  }

  const handleAssigneeSelect = (userId: string) => {
    const selected = users.find((user) => user.id === userId)

    if (!selected) {
      return
    }

    setAssignee({ id: selected.id, name: selected.name })
    resetPagination()
    closeAssigneePopover()
  }

  const handleCreateTaskClick = () => {
    if (onCreateTask) {
      onCreateTask()
      return
    }

    open()
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-end justify-between gap-4 rounded-lg border border-border bg-card/40 p-4',
        className,
      )}
    >
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-[180px] flex-col gap-2">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </Label>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[200px] flex-col gap-2">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Prioridade
          </Label>
          <Select value={priority} onValueChange={handlePriorityChange}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[220px] flex-col gap-2">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Responsável
          </Label>
          <Popover open={isAssigneeOpen} onOpenChange={setIsAssigneeOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'flex w-full items-center justify-between gap-2 truncate font-normal',
                  !assigneeId && 'text-muted-foreground',
                )}
              >
                <span className="truncate">{assigneeLabel}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(320px,90vw)] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Buscar responsável..."
                  value={assigneeSearch}
                  onValueChange={setAssigneeSearch}
                />
                <CommandList>
                  <CommandEmpty>{emptyMessage}</CommandEmpty>
                  {assigneesQuery.isFetching ? (
                    <CommandLoading>
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando responsáveis...
                      </div>
                    </CommandLoading>
                  ) : null}
                  <CommandGroup heading="Opções">
                    <CommandItem
                      value="__all__"
                      onSelect={handleAssigneeClear}
                    >
                      <span className="flex items-center gap-2">
                        Todos os responsáveis
                        {!assigneeId ? (
                          <Check className="h-4 w-4" />
                        ) : null}
                      </span>
                    </CommandItem>
                  </CommandGroup>
                  {users.length > 0 ? (
                    <CommandGroup heading="Usuários">
                      {users.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={user.id}
                          onSelect={handleAssigneeSelect}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
                              {user.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          </div>
                          {assigneeId === user.id ? (
                            <Check className="ml-auto h-4 w-4" />
                          ) : null}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex min-w-[180px] flex-col gap-2">
          <Label htmlFor="task-filter-due-date" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Prazo
          </Label>
          <Input
            id="task-filter-due-date"
            type="date"
            value={dueDate ?? ''}
            onChange={handleDueDateChange}
            className="h-9"
          />
        </div>
      </div>

      <Button type="button" size="sm" onClick={handleCreateTaskClick}>
        + Nova Tarefa
      </Button>
    </div>
  )
}
