import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { TaskAuditLogDTO } from '@repo/types'
import { TaskPriority, TaskStatus } from '@repo/types'
import { History, Layers, ListTree, UserCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { router } from '@/router'

import { getTaskById } from '../api/getTaskById'
import { getTaskAuditLogs } from '../api/getTaskAuditLogs'
import { LoadingSkeleton } from '../components/LoadingSkeleton'

const containerClassName =
  'mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8'

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

const actionLabels: Record<string, string> = {
  'task.created': 'Tarefa criada',
  'task.updated': 'Tarefa atualizada',
  'task.deleted': 'Tarefa removida',
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }

  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não'
  }

  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR').format(value)
  }

  if (typeof value === 'string') {
    const date = new Date(value)

    if (!Number.isNaN(date.getTime()) && /\d{4}-\d{2}-\d{2}T/.test(value)) {
      return formatDateTime(value)
    }

    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatChangeValue(item)).join(', ')
  }

  try {
    return JSON.stringify(value)
  } catch (error) {
    console.error('Failed to stringify audit log value', error)
    return String(value)
  }
}

function getFieldLabel(field: string): string {
  switch (field) {
    case 'title':
      return 'Título'
    case 'description':
      return 'Descrição'
    case 'status':
      return 'Status'
    case 'priority':
      return 'Prioridade'
    case 'dueDate':
      return 'Prazo'
    case 'assignees':
      return 'Responsáveis'
    default:
      return field
  }
}

function getPaginatedRange(
  page: number,
  size: number,
  total: number,
  count: number,
) {
  if (total === 0 || count === 0) {
    return { start: 0, end: 0, total }
  }

  const start = (page - 1) * size + 1
  const end = Math.min(total, start + count - 1)

  return { start, end, total }
}

interface TaskHistoryPageProps {
  taskId: string
}

export function TaskHistoryPage({ taskId }: TaskHistoryPageProps) {
  const [page, setPage] = useState(1)
  const pageSize = 10

  const numberFormatter = useMemo(() => new Intl.NumberFormat('pt-BR'), [])

  useEffect(() => {
    setPage(1)
  }, [taskId])

  const taskQuery = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => getTaskById(taskId),
  })

  const auditLogsQuery = useQuery({
    queryKey: ['task', taskId, 'audit-log', { page, size: pageSize }],
    queryFn: () => getTaskAuditLogs(taskId, { page, size: pageSize }),
    enabled: taskQuery.isSuccess,
    keepPreviousData: true,
  })

  if (taskQuery.isPending) {
    return (
      <main className={containerClassName}>
        <LoadingSkeleton className="h-24" />
        <LoadingSkeleton className="h-64" />
      </main>
    )
  }

  if (taskQuery.isError) {
    const message =
      taskQuery.error instanceof Error
        ? taskQuery.error.message
        : 'Não foi possível carregar a tarefa selecionada.'

    return (
      <main className={containerClassName}>
        <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-destructive">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">Erro ao carregar tarefa</h1>
            <p className="text-sm text-destructive/80">{message}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => taskQuery.refetch()}
            className="w-fit"
          >
            Tentar novamente
          </Button>
        </div>
      </main>
    )
  }

  const task = taskQuery.data
  const auditLogsData = auditLogsQuery.data
  const logs = auditLogsData?.data ?? []
  const meta = auditLogsData?.meta
  const currentPage = meta?.page ?? page
  const totalPages = meta?.totalPages ?? (logs.length > 0 ? currentPage : 0)
  const isFirstPage = currentPage <= 1
  const isLastPage = totalPages === 0 || currentPage >= totalPages
  const range = meta
    ? getPaginatedRange(meta.page, meta.size, meta.total, logs.length)
    : { start: 0, end: 0, total: 0 }

  const auditLogsError =
    auditLogsQuery.isError &&
    (auditLogsQuery.error instanceof Error
      ? auditLogsQuery.error.message
      : 'Não foi possível carregar o histórico de alterações.')

  return (
    <main className={containerClassName}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() =>
              void router.navigate({ to: '/tasks/$taskId', params: { taskId } })
            }
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            ← Voltar para detalhes da tarefa
          </button>
          <div className="space-y-2">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              <History className="size-6" aria-hidden="true" />
              Histórico de alterações
            </h1>
            <p className="text-sm text-muted-foreground max-w-3xl">
              Consulte todas as mudanças registradas para a tarefa{' '}
              <span className="font-semibold text-foreground">{task.title}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <ListTree className="size-4" aria-hidden="true" />
              Status:
              <strong className="ml-1 font-semibold text-foreground">
                {statusLabels[task.status]}
              </strong>
            </span>
            <span className="flex items-center gap-2">
              <Layers className="size-4" aria-hidden="true" />
              Prioridade:
              <strong className="ml-1 font-semibold text-foreground">
                {priorityLabels[task.priority]}
              </strong>
            </span>
            <span className="flex items-center gap-2">
              <UserCircle2 className="size-4" aria-hidden="true" />
              Última atualização:
              <strong className="ml-1 font-semibold text-foreground">
                {formatDateTime(task.updatedAt)}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => void router.navigate({ to: '/tasks' })}
          >
            Voltar para lista de tarefas
          </Button>
        </div>
      </header>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card/60 p-6 shadow-sm">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Registros do histórico
            </h2>
          </div>
          {auditLogsQuery.isFetching ? (
            <span className="text-xs text-muted-foreground">Atualizando...</span>
          ) : null}
        </header>

        {auditLogsQuery.isPending ? (
          <div className="space-y-3" role="status" aria-live="polite">
            <LoadingSkeleton className="h-16" />
            <LoadingSkeleton className="h-16" />
          </div>
        ) : auditLogsError ? (
          <p className="text-sm text-destructive">{auditLogsError}</p>
        ) : logs.length > 0 ? (
          <ul className="space-y-4" aria-live="polite">
            {logs.map((log: TaskAuditLogDTO) => {
              const actorName =
                log.actor?.displayName?.trim() ||
                log.actorDisplayName?.trim() ||
                log.actor?.id ||
                log.actorId ||
                'Sistema'

              const changeItems = log.changes ?? []
              const hasChanges = changeItems.length > 0
              const actionLabel = actionLabels[log.action] ?? log.action

              return (
                <li
                  key={log.id}
                  className="space-y-3 rounded-md border border-border bg-background/80 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {actionLabel} por{' '}
                      <span className="font-medium text-foreground">{actorName}</span>
                    </span>
                    <span>{formatDateTime(log.createdAt)}</span>
                  </div>

                  {hasChanges ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Alterações</h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {changeItems.map((change, index) => (
                          <li
                            key={`${change.field}-${index}`}
                            className="rounded-md border border-border/60 bg-muted/40 p-3"
                          >
                            <div className="text-xs uppercase tracking-wide text-muted-foreground/80">
                              {getFieldLabel(change.field)}
                            </div>
                            <div className="mt-1 space-y-1 text-sm text-foreground">
                              <p>
                                <span className="font-medium text-muted-foreground">Antes:</span>{' '}
                                {formatChangeValue(change.previousValue)}
                              </p>
                              <p>
                                <span className="font-medium text-muted-foreground">Depois:</span>{' '}
                                {formatChangeValue(change.currentValue)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma alteração detalhada disponível para este registro.
                    </p>
                  )}

                  {log.metadata ? (
                    <details className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                      <summary className="cursor-pointer font-medium text-foreground">
                        Ver metadados adicionais
                      </summary>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum registro de histórico disponível para esta tarefa.
          </p>
        )}

        <footer className="flex flex-col gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span aria-live="polite">
            {meta && meta.total > 0
              ? `Exibindo ${numberFormatter.format(range.start)}–${numberFormatter.format(range.end)} de ${numberFormatter.format(range.total)} registros`
              : 'Nenhum registro disponível'}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={isFirstPage || auditLogsQuery.isFetching}
              aria-label="Página anterior do histórico"
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((current) => (isLastPage ? current : current + 1))
              }
              disabled={isLastPage || auditLogsQuery.isFetching || logs.length === 0}
              aria-label="Próxima página do histórico"
            >
              Próxima
            </Button>
          </div>
        </footer>
      </section>
    </main>
  )
}
