import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { TaskAssignee } from '@repo/types'
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { getUsers } from '@/features/users/api/getUsers'
import { getTaskAssigneeDisplayName, mapUserToTaskAssignee } from '../utils/assignees'

interface AssigneeMultiSelectProps {
  value: TaskAssignee[]
  onChange: (assignees: TaskAssignee[]) => void
  disabled?: boolean
}

export function AssigneeMultiSelect({ value, onChange, disabled }: AssigneeMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const assignees = useMemo(() => value ?? [], [value])
  const selectedIds = useMemo(
    () => new Set(assignees.map((assignee) => assignee.id)),
    [assignees],
  )

  const usersQuery = useQuery({
    queryKey: ['users', { search: searchTerm }],
    queryFn: () => getUsers({ search: searchTerm, limit: 20 }),
    enabled: open,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!open) {
      setSearchTerm('')
    }
  }, [open])

  const toggleAssignee = (candidate: TaskAssignee) => {
    if (disabled) {
      return
    }

    if (selectedIds.has(candidate.id)) {
      onChange(assignees.filter((assignee) => assignee.id !== candidate.id))
      return
    }

    onChange([...assignees, candidate])
  }

  const handleUserSelect = (userId: string) => {
    const users = usersQuery.data ?? []
    const user = users.find((candidate) => candidate.id === userId)

    if (!user) {
      return
    }

    const assignee = mapUserToTaskAssignee(user)
    toggleAssignee(assignee)
  }

  const handleRemoveAssignee = (assigneeId: string) => {
    if (disabled) {
      return
    }

    onChange(assignees.filter((assignee) => assignee.id !== assigneeId))
  }

  const emptyMessage = usersQuery.isError
    ? 'Não foi possível carregar responsáveis.'
    : 'Nenhum responsável encontrado.'

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={(nextOpen) => !disabled && setOpen(nextOpen)}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between text-left font-normal',
              assignees.length === 0 && 'text-muted-foreground',
            )}
            disabled={disabled}
          >
            <span>
              {assignees.length > 0
                ? `${assignees.length} responsável(is) selecionado(s)`
                : 'Selecionar responsáveis'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(420px,90vw)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar responsável..."
              value={searchTerm}
              onValueChange={setSearchTerm}
              disabled={disabled || usersQuery.isLoading}
            />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              {usersQuery.isFetching ? (
                <CommandLoading>
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando responsáveis...
                  </div>
                </CommandLoading>
              ) : null}
              <CommandGroup heading="Usuários">
                {(usersQuery.data ?? []).map((user) => {
                  const assignee = mapUserToTaskAssignee(user)
                  const isSelected = selectedIds.has(assignee.id)

                  return (
                    <CommandItem
                      key={assignee.id}
                      value={assignee.id}
                      onSelect={handleUserSelect}
                      disabled={disabled}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {getTaskAssigneeDisplayName(assignee)}
                        </span>
                        {assignee.email ? (
                          <span className="text-xs text-muted-foreground">
                            {assignee.email}
                          </span>
                        ) : null}
                      </div>
                      {isSelected ? (
                        <Check className="ml-auto h-4 w-4" />
                      ) : null}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {assignees.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {assignees.map((assignee) => (
            <li key={assignee.id}>
              <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {getTaskAssigneeDisplayName(assignee)}
                {assignee.email ? (
                  <span className="text-[10px] text-muted-foreground">
                    {assignee.email}
                  </span>
                ) : null}
                {!disabled ? (
                  <button
                    type="button"
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary-foreground/10 text-secondary-foreground/80 transition hover:bg-secondary-foreground/20 hover:text-secondary-foreground"
                    onClick={() => handleRemoveAssignee(assignee.id)}
                    aria-label={`Remover responsável ${getTaskAssigneeDisplayName(assignee)}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhum responsável selecionado.
        </p>
      )}
    </div>
  )
}
