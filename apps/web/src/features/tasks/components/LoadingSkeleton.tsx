import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  lines?: number
  className?: string
}

export function LoadingSkeleton({ lines = 3, className }: LoadingSkeletonProps) {
  const placeholders = Array.from({ length: lines })

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-card/80 p-4 shadow-sm animate-shimmer',
        className,
      )}
    >
      <div className="space-y-3">
        {placeholders.map((_, index) => (
          <div
            key={index}
            className="h-3 rounded bg-muted"
            style={{ width: `${100 - index * 15}%` }}
          />
        ))}
        <div className="mt-4 flex gap-3">
          <div className="h-8 w-8 rounded-full bg-muted" />
          <div className="h-8 flex-1 rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
