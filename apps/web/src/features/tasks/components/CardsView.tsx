import { type Task } from '@repo/types'

import { cn } from '@/lib/utils'

import { EmptyState } from './EmptyState'
import { LoadingSkeleton } from './LoadingSkeleton'
import { TaskCard } from './TaskCard'

interface CardsViewProps {
  tasks: Task[]
  isLoading?: boolean
  className?: string
  onSelectTask?: (task: Task) => void
  onCreateFirstTask?: () => void
}

export function CardsView({
  tasks,
  isLoading = false,
  className,
  onSelectTask,
  onCreateFirstTask,
}: CardsViewProps) {
  if (isLoading) {
    return (
      <div className={cn('grid gap-4 md:hidden', className)}>
        {Array.from({ length: 3 }).map((_, index) => (
          <LoadingSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="Você ainda não possui tarefas"
        description="Crie sua primeira tarefa para visualizar o progresso por aqui."
        onAction={onCreateFirstTask}
        className="md:hidden"
      />
    )
  }

  return (
    <div className={cn('grid gap-4 md:hidden', className)}>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} onSelect={onSelectTask} />
      ))}
    </div>
  )
}
