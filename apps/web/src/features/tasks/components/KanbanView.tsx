import { type Task, TaskStatus } from '@contracts'

import { cn } from '@/lib/utils'

import { EmptyState } from './EmptyState'
import { LoadingSkeleton } from './LoadingSkeleton'
import { TaskCard } from './TaskCard'

const columns: Array<{ status: TaskStatus; label: string }> = [
  { status: TaskStatus.TODO, label: 'A fazer' },
  { status: TaskStatus.IN_PROGRESS, label: 'Em andamento' },
  { status: TaskStatus.REVIEW, label: 'Em revisão' },
  { status: TaskStatus.DONE, label: 'Concluída' },
]

interface KanbanViewProps {
  tasks: Task[]
  isLoading?: boolean
  className?: string
  onSelectTask?: (task: Task) => void
  onCreateFirstTask?: () => void
}

export function KanbanView({
  tasks,
  isLoading = false,
  className,
  onSelectTask,
  onCreateFirstTask,
}: KanbanViewProps) {
  const hasTasks = tasks.length > 0

  if (!hasTasks && !isLoading) {
    return (
      <EmptyState
        title="Nenhuma tarefa por aqui"
        description="Organize seu fluxo de trabalho criando tarefas e acompanhando o progresso em cada coluna."
        onAction={onCreateFirstTask}
        className="hidden md:flex"
      />
    )
  }

  return (
    <div className={cn('hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-4', className)}>
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.status)

        return (
          <section
            key={column.status}
            className="flex min-h-[320px] flex-col gap-4 rounded-lg border border-dashed border-border bg-card/40 p-4"
          >
            <header className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {column.label}
              </h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {columnTasks.length}
              </span>
            </header>

            <div className="flex flex-1 flex-col gap-3">
              {isLoading ? (
                Array.from({ length: 2 }).map((_, index) => (
                  <LoadingSkeleton key={index} />
                ))
              ) : columnTasks.length > 0 ? (
                columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onSelect={onSelectTask} />
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-border bg-background/40 p-6 text-center text-sm text-muted-foreground">
                  Nenhuma tarefa nesta coluna
                </p>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
