import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type CommentDTO,
  type NotificationDTO,
  type PaginationMeta,
  COMMENT_MESSAGE_MAX_LENGTH,
  TaskPriority,
  TaskStatus,
} from '@repo/types'
import { Bell, CalendarDays, History, MessageSquare, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { router } from '@/router'

import { deleteTask } from '../api/deleteTask'
import { getTaskById } from '../api/getTaskById'
import { createTaskComment } from '../api/createTaskComment'
import { getTaskComments } from '../api/getTaskComments'
import { getTaskNotifications } from '../api/getTaskNotifications'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { TaskModal } from '../components/TaskModal'
import {
  commentFormSchema,
  type CommentFormSchema,
} from '../schemas/commentSchema'
import { getNotificationResponsibleName } from '../../notifications/utils/getNotificationResponsibleName'

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

export function getCommentsDisplayRange(
  meta: PaginationMeta | undefined,
  count: number,
) {
  if (!meta || meta.total === 0 || count === 0) {
    return { start: 0, end: 0, total: meta?.total ?? 0 }
  }

  const start = (meta.page - 1) * meta.size + 1
  const end = Math.min(meta.total, start + count - 1)

  return { start, end, total: meta.total }
}

export function TaskDetailsPage({ taskId }: TaskDetailsPageProps) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [commentPage, setCommentPage] = useState(1)
  const [pageSize] = useState(5)

  const numberFormatter = useMemo(() => new Intl.NumberFormat('pt-BR'), [])

  const taskQuery = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => getTaskById(taskId),
  })

  const commentsQuery = useQuery({
    queryKey: ['task', taskId, 'comments', { page: commentPage, size: pageSize }],
    queryFn: () => getTaskComments(taskId, { page: commentPage, size: pageSize }),
    enabled: taskQuery.isSuccess,
    keepPreviousData: true,
  })

  const notificationsQuery = useQuery({
    queryKey: ['task', taskId, 'notifications'],
    queryFn: () => getTaskNotifications(taskId),
    enabled: taskQuery.isSuccess,
  })

  const commentForm = useForm<CommentFormSchema>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { message: '' },
  })

  const createCommentMutation = useMutation({
    mutationFn: (values: CommentFormSchema) =>
      createTaskComment(taskId, values),
    onSuccess: () => {
      toast({
        title: 'Comentário publicado',
        description: 'Seu comentário foi enviado com sucesso.',
      })

      setCommentPage(1)
      commentForm.reset()
      queryClient.invalidateQueries({ queryKey: ['task', taskId, 'comments'] })
      queryClient.invalidateQueries({ queryKey: ['task', taskId, 'notifications'] })
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    },
    onError: (error: unknown) => {
      const description =
        error instanceof Error
          ? error.message
          : 'Não foi possível enviar o comentário. Tente novamente.'

      toast({
        variant: 'destructive',
        title: 'Erro ao publicar comentário',
        description,
      })
    },
  })

  const handleSubmitComment = commentForm.handleSubmit((values) => {
    createCommentMutation.mutate(values)
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

  const commentsData = commentsQuery.data
  const comments = commentsData?.data ?? []
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

  const commentsMeta = commentsData?.meta
  const commentsTotal = commentsMeta?.total ?? 0
  const commentsRange = getCommentsDisplayRange(commentsMeta, comments.length)
  const currentCommentsPage = commentsMeta?.page ?? commentPage
  const totalPages = commentsMeta?.totalPages ?? (commentsTotal > 0 ? currentCommentsPage : 0)
  const isFirstPage = currentCommentsPage <= 1
  const isLastPage = commentsTotal === 0 || currentCommentsPage >= totalPages

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
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void router.navigate({
                to: '/tasks/$taskId/history',
                params: { taskId },
              })
            }
          >
            <History className="size-4" aria-hidden="true" />
            Histórico
          </Button>
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

          <Form {...commentForm}>
            <form onSubmit={handleSubmitComment} className="space-y-4">
              <FormField
                control={commentForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adicionar comentário</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Escreva aqui o que deseja registrar"
                        {...field}
                        value={field.value ?? ''}
                        disabled={createCommentMutation.isPending}
                        className="min-h-[120px]"
                      />
                    </FormControl>
                    <FormDescription>
                      Máximo de {numberFormatter.format(COMMENT_MESSAGE_MAX_LENGTH)} caracteres por
                      comentário.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-end gap-4">
                <Button
                  type="submit"
                  disabled={createCommentMutation.isPending}
                  className="ml-auto"
                >
                  {createCommentMutation.isPending ? 'Enviando...' : 'Publicar comentário'}
                </Button>
              </div>
            </form>
          </Form>

          {commentsQuery.isPending ? (
            <div className="space-y-3" role="status" aria-live="polite">
              <LoadingSkeleton className="h-16" />
              <LoadingSkeleton className="h-16" />
            </div>
          ) : commentsError ? (
            <p className="text-sm text-destructive">{commentsError}</p>
          ) : comments.length > 0 ? (
            <ul className="space-y-4" aria-live="polite">
              {comments.map((comment: CommentDTO) => {
                const authorDisplayName =
                  typeof comment.authorName === 'string' &&
                  comment.authorName.trim().length > 0
                    ? comment.authorName.trim()
                    : comment.authorId

                return (
                  <li
                    key={comment.id}
                    className="rounded-md border border-border bg-background/80 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        Autor:{' '}
                        <span className="font-medium text-foreground">
                          {authorDisplayName}
                        </span>
                      </span>
                      <span>{formatDateTime(comment.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground">{comment.message}</p>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum comentário registrado para esta tarefa.
            </p>
          )}

          <footer className="flex flex-col gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span aria-live="polite">
              {commentsTotal > 0
                ? `Exibindo ${numberFormatter.format(commentsRange.start)}–${numberFormatter.format(
                    commentsRange.end,
                  )} de ${numberFormatter.format(commentsRange.total)} comentários`
                : 'Nenhum comentário disponível'}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCommentPage((page) => Math.max(1, page - 1))}
                disabled={isFirstPage || commentsQuery.isFetching}
                aria-label="Página anterior de comentários"
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setCommentPage((page) => (isLastPage ? page : page + 1))
                }
                disabled={isLastPage || commentsQuery.isFetching || comments.length === 0}
                aria-label="Próxima página de comentários"
              >
                Próxima
              </Button>
            </div>
          </footer>
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
              {notifications.map((notification: NotificationDTO) => {
                const responsibleName =
                  getNotificationResponsibleName(notification) ?? 'Não informado'

                return (
                  <li
                    key={notification.id}
                    className="rounded-md border border-border bg-background/80 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        Responsável:{' '}
                        <span className="font-medium text-foreground">
                          {responsibleName}
                        </span>
                      </span>
                      <span>
                        Criada em:{' '}
                        <span className="font-medium text-foreground">
                          {formatDateTime(notification.createdAt)}
                        </span>
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground">{notification.message}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>Canal: {notification.channel}</span>
                      <span>Status: {notification.status}</span>
                      <span>
                        Enviada:{' '}
                        {notification.sentAt
                          ? formatDateTime(notification.sentAt)
                          : 'Não enviada'}
                      </span>
                    </div>
                  </li>
                )
              })}
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
