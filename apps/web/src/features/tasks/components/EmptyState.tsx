import { ClipboardList } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title?: string
  description?: string
  className?: string
  onAction?: () => void
  actionLabel?: string
}

export function EmptyState({
  title = 'Nada por aqui ainda',
  description = 'Comece criando uma tarefa para acompanhar o trabalho da sua equipe.',
  className,
  onAction,
  actionLabel = 'Criar primeira tarefa',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-card/60 p-8 text-center',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        <ClipboardList className="size-6" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>

      {onAction ? (
        <Button type="button" onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
