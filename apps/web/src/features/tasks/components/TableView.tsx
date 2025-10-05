import { type Task, TaskPriority, TaskStatus } from '@repo/types'

import { cn } from '@/lib/utils'

import { EmptyState } from './EmptyState'
import { LoadingSkeleton } from './LoadingSkeleton'

const priorityLabels: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'Baixa',
  [TaskPriority.MEDIUM]: 'Média',
  [TaskPriority.HIGH]: 'Alta',
  [TaskPriority.URGENT]: 'Urgente',
}

const statusLabels: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'A fazer',
  [TaskStatus.IN_PROGRESS]: 'Em andamento',
  [TaskStatus.REVIEW]: 'Em revisão',
  [TaskStatus.DONE]: 'Concluída',
}

function formatDueDate(dueDate?: string | null) {
  if (!dueDate) {
    return 'Sem prazo'
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

interface TableViewProps {
  tasks: Task[]
  isLoading?: boolean
  className?: string
  onSelectTask?: (task: Task) => void
  onCreateFirstTask?: () => void
}

export function TableView({
  tasks,
  isLoading = false,
  className,
  onSelectTask,
  onCreateFirstTask,
}: TableViewProps) {
  if (isLoading) {
    return (
      <div className={cn('hidden flex-col gap-3 md:flex', className)}>
        {Array.from({ length: 3 }).map((_, index) => (
          <LoadingSkeleton key={index} className="rounded-md" />
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="Nenhuma tarefa cadastrada"
        description="Use o botão abaixo para adicionar a primeira tarefa da sua equipe."
        onAction={onCreateFirstTask}
        className="hidden md:flex"
      />
    )
  }

  return (
    <div className={cn('hidden overflow-hidden rounded-lg border border-border md:block', className)}>
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Título</th>
            <th className="px-4 py-3">Prioridade</th>
            <th className="px-4 py-3">Responsáveis</th>
            <th className="px-4 py-3">Prazo</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              className={cn(
                'border-t border-border text-sm transition-colors hover:bg-muted/30',
                onSelectTask && 'cursor-pointer',
              )}
              onClick={onSelectTask ? () => onSelectTask(task) : undefined}
            >
              <td className="px-4 py-3 font-medium text-foreground">{task.title}</td>
              <td className="px-4 py-3">{priorityLabels[task.priority]}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {task.assignees.length > 0
                  ? task.assignees.map((assignee) => assignee.username).join(', ')
                  : 'Sem responsáveis'}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDueDate(task.dueDate)}</td>
              <td className="px-4 py-3 text-muted-foreground">{statusLabels[task.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
