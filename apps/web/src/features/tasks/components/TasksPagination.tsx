import type { PaginationMeta } from '@repo/types'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface TasksPaginationProps {
  page: number
  pageSize: number
  meta?: PaginationMeta
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  className?: string
}

const pageSizeOptions = [10, 20, 50] as const

function formatRange(meta: PaginationMeta) {
  if (meta.total === 0) {
    return 'Mostrando 0–0 de 0'
  }

  const currentPage = Math.max(1, meta.page)
  const pageSize = Math.max(1, meta.size)
  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, meta.total)

  return `Mostrando ${start}–${end} de ${meta.total}`
}

export function TasksPagination({
  page,
  pageSize,
  meta,
  onPageChange,
  onPageSizeChange,
  className,
}: TasksPaginationProps) {
  const hasMeta = Boolean(meta)
  const isFirstPage = page <= 1
  const isLastPage = hasMeta
    ? meta!.totalPages <= 0 || page >= meta!.totalPages
    : true

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-between gap-3 rounded-lg border border-border bg-card/40 p-4 text-sm sm:flex-row',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFirstPage || !hasMeta}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Itens por página
        </span>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange(Number(value))}
          disabled={!hasMeta}
        >
          <SelectTrigger aria-label="Itens por página" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((option) => (
              <SelectItem key={option} value={option.toString()}>
                {option} por página
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-xs text-muted-foreground" aria-live="polite">
        {hasMeta ? formatRange(meta!) : 'Carregando paginação...'}
      </div>
    </div>
  )
}
