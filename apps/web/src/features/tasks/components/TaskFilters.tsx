import { type ChangeEvent } from 'react'
import { TaskPriority, TaskStatus } from '@repo/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import {
  type PriorityFilter,
  type StatusFilter,
  useTasksFilters,
} from '../store/useTasksFilters'
import { useTaskCreationModal } from '../store/useTaskCreationModal'
import { useTasksPagination } from '../store/useTasksPagination'

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
  const { status, setStatus, priority, setPriority, dueDate, setDueDate } =
    useTasksFilters()
  const { open } = useTaskCreationModal()
  const { resetPagination } = useTasksPagination()

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
