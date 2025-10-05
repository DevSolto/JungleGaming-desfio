import { type KeyboardEvent } from 'react'
import { CalendarDays, Users } from 'lucide-react'
import { type Task, TaskPriority } from '@contracts'

import { cn } from '@/lib/utils'

const priorityLabels: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'Baixa',
  [TaskPriority.MEDIUM]: 'Média',
  [TaskPriority.HIGH]: 'Alta',
  [TaskPriority.URGENT]: 'Urgente',
}

const priorityStyles: Record<TaskPriority, string> = {
  [TaskPriority.LOW]:
    'border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-100',
  [TaskPriority.MEDIUM]:
    'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
  [TaskPriority.HIGH]:
    'border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200',
  [TaskPriority.URGENT]:
    'border-red-200 bg-red-100 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
}

interface TaskCardProps {
  task: Task
  className?: string
  onSelect?: (task: Task) => void
}

function formatDueDate(dueDate?: string | null) {
  if (!dueDate) {
    return 'Sem prazo definido'
  }

  const parsedDate = new Date(dueDate)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Prazo inválido'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate)
}

function getBadgeClassName(priority: TaskPriority) {
  return cn(
    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
    priorityStyles[priority],
  )
}

export function TaskCard({ task, className, onSelect }: TaskCardProps) {
  const isInteractive = Boolean(onSelect)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isInteractive) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect?.(task)
    }
  }

  return (
    <article
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? () => onSelect?.(task) : undefined}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 hover:shadow-md',
        isInteractive && 'cursor-pointer',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">{task.title}</h3>
          {task.description ? (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          ) : null}
        </div>

        <span className={getBadgeClassName(task.priority)}>{priorityLabels[task.priority]}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4" aria-hidden="true" />
          <span>{formatDueDate(task.dueDate)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Users className="size-4" aria-hidden="true" />
          {task.assignees.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {task.assignees.map((assignee) => (
                <span
                  key={assignee.id}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                >
                  {assignee.username}
                </span>
              ))}
            </div>
          ) : (
            <span>Sem responsáveis</span>
          )}
        </div>
      </div>
    </article>
  )
}
