import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type CommentDTO, type NotificationDTO, TaskPriority, TaskStatus } from '@repo/types'
import { Bell, CalendarDays, MessageSquare, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { router } from '@/router'

import { deleteTask } from '../api/deleteTask'
import { getTaskById } from '../api/getTaskById'
import { getTaskComments } from '../api/getTaskComments'
import { getTaskNotifications } from '../api/getTaskNotifications'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { TaskModal } from '../components/TaskModal'

interface TaskDetailsPageProps {
  taskId: string
}

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

function formatDate(value?: string | null, fallback = 'Não informado') {
  if (!value) {
    return fallback
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
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

export function TaskDetailsPage({ taskId }: TaskDetailsPageProps) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)

  const taskQuery = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => getTaskById(taskId),
  })

  const commentsQuery = useQuery({
    queryKey: ['task', taskId, 'comments'],
    queryFn: () => getTaskComments(taskId),
    enabled: taskQuery.isSuccess,
  })

  const notificationsQuery = useQuery({
    queryKey: ['task', taskId, 'notifications'],
    queryFn: () => getTaskNotifications(taskId),
    enabled: taskQuery.isSuccess,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.removeQueries({ queryKey: ['task', taskId] })
      toast({
        title: 'Tarefa removida',
        description: 'A tarefa foi removida com sucesso.',
      })
      void router.navigate({ to: '/tasks' })
    },
    onError: (error: unknown) => {
      const description =
        error instanceof Error
          ? error.message
          : 'Não foi possível remover a tarefa. Tente novamente.'

      toast({
        variant: 'destructive',
        title: 'Erro ao remover tarefa',
        description,
      })
    },
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

  const comments = commentsQuery.data ?? []
  const notifications = notificationsQuery.data ?? []

  const commentsError =
    commentsQuery.isError &&
    (commentsQuery.error instanceof Error
      ? commentsQuery.error.message
      : 'Não foi possível carregar os comentários.')

  const notificationsError =
    notificationsQuery.isError &&
    (notificationsQuery.error instanceof Error
      ? notificationsQuery.error.message
      : 'Não foi possível carregar as notificações.')

  return (
    <main className={containerClassName}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void router.navigate({ to: '/tasks' })}
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            ← Voltar para lista de tarefas
          </button>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {task.title}
            </h1>
            {task.description ? (
              <p className="text-sm text-muted-foreground max-w-3xl">
                {task.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>
              Status:
              <strong className="ml-2 font-semibold text-foreground">
                {statusLabels[task.status]}
              </strong>
            </span>
            <span>
              Prioridade:
              <strong className="ml-2 font-semibold text-foreground">
                {priorityLabels[task.priority]}
              </strong>
            </span>
            <span>
              Prazo:
              <strong className="ml-2 font-semibold text-foreground">
                {formatDate(task.dueDate, 'Sem prazo definido')}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
            Editar tarefa
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Removendo...' : 'Excluir tarefa'}
          </Button>
        </div>
      </header>

      <section className="grid gap-6 rounded-lg border border-border bg-card/60 p-6 shadow-sm sm:grid-cols-2">
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden="true" />
            Datas importantes
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <strong className="font-medium text-foreground">Criada em:</strong>{' '}
              {formatDateTime(task.createdAt)}
            </li>
            <li>
              <strong className="font-medium text-foreground">Atualizada em:</strong>{' '}
              {formatDateTime(task.updatedAt)}
            </li>
            <li>
              <strong className="font-medium text-foreground">Prazo:</strong>{' '}
              {formatDate(task.dueDate, 'Sem prazo definido')}
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="size-4" aria-hidden="true" />
            Responsáveis
          </h2>
          {task.assignees.length > 0 ? (
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              {task.assignees.map((assignee) => (
                <li key={assignee.id} className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-foreground">
                  <span>{assignee.username}</span>
                  <span className="text-xs text-muted-foreground">ID: {assignee.id}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum responsável atribuído.</p>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card/60 p-6 shadow-sm">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Comentários
              </h2>
            </div>
            {commentsQuery.isFetching ? (
              <span className="text-xs text-muted-foreground">Atualizando...</span>
            ) : null}
          </header>

          {commentsQuery.isPending ? (
            <div className="space-y-3">
              <LoadingSkeleton className="h-16" />
              <LoadingSkeleton className="h-16" />
            </div>
          ) : commentsError ? (
            <p className="text-sm text-destructive">{commentsError}</p>
          ) : comments.length > 0 ? (
            <ul className="space-y-4">
              {comments.map((comment: CommentDTO) => (
                <li key={comment.id} className="rounded-md border border-border bg-background/80 p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Autor: {comment.authorId}</span>
                    <span>{formatDateTime(comment.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{comment.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum comentário registrado para esta tarefa.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card/60 p-6 shadow-sm">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Notificações
              </h2>
            </div>
            {notificationsQuery.isFetching ? (
              <span className="text-xs text-muted-foreground">Atualizando...</span>
            ) : null}
          </header>

          {notificationsQuery.isPending ? (
            <div className="space-y-3">
              <LoadingSkeleton className="h-16" />
              <LoadingSkeleton className="h-16" />
            </div>
          ) : notificationsError ? (
            <p className="text-sm text-destructive">{notificationsError}</p>
          ) : notifications.length > 0 ? (
            <ul className="space-y-4">
              {notifications.map((notification: NotificationDTO) => (
                <li key={notification.id} className="rounded-md border border-border bg-background/80 p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Canal: {notification.channel}</span>
                    <span>Status: {notification.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{notification.message}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>Criada: {formatDateTime(notification.createdAt)}</span>
                    <span>
                      Enviada:{' '}
                      {notification.sentAt
                        ? formatDateTime(notification.sentAt)
                        : 'Não enviada'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação registrada para esta tarefa.
            </p>
          )}
        </div>
      </section>

      <TaskModal
        open={isEditing}
        onOpenChange={setIsEditing}
        task={task}
        onSuccess={(updatedTask) => {
          setIsEditing(false)
          queryClient.setQueryData(['task', updatedTask.id], updatedTask)
        }}
      />
    </main>
  )
}
