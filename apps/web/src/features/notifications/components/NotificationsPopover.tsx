import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { NotificationDTO } from '@repo/types'
import { Bell, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { router } from '@/router'

import { getNotifications } from '../api/getNotifications'
import { getNotificationResponsibleName } from '../utils/getNotificationResponsibleName'

const DEFAULT_LIMIT = 10

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Data indisponível'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Data inválida'
  }

  return dateFormatter.format(date)
}

function getTaskIdFromMetadata(notification: NotificationDTO) {
  const metadata = notification.metadata

  if (metadata && typeof metadata === 'object' && 'taskId' in metadata) {
    const taskId = metadata.taskId

    if (typeof taskId === 'string' && taskId.trim().length > 0) {
      return taskId
    }
  }

  return null
}

function formatChannel(channel: NotificationDTO['channel']) {
  switch (channel) {
    case 'in_app':
      return 'In-app'
    case 'sms':
      return 'SMS'
    case 'push':
      return 'Push'
    case 'email':
    default:
      return 'E-mail'
  }
}

function formatStatus(status: NotificationDTO['status']) {
  switch (status) {
    case 'pending':
      return 'Pendente'
    case 'sent':
      return 'Enviada'
    case 'failed':
      return 'Falhou'
    default:
      return status
  }
}

interface NotificationsPopoverProps {
  className?: string
}

export function NotificationsPopover({ className }: NotificationsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [lastSeenTotal, setLastSeenTotal] = useState<number | null>(null)

  const {
    data: notificationsResponse,
    error,
    isError,
    isFetching,
    isPending,
    isSuccess,
    refetch,
  } = useQuery({
    queryKey: ['notifications', { limit: DEFAULT_LIMIT }],
    queryFn: () =>
      getNotifications({
        channel: 'in_app',
        limit: DEFAULT_LIMIT,
        page: 1,
      }),
    refetchOnWindowFocus: false,
  })

  const notifications = notificationsResponse?.data ?? []
  const totalNotifications =
    notificationsResponse?.meta.total ?? notifications.length
  const hasNotifications = totalNotifications > 0
  useEffect(() => {
    if (!isSuccess) {
      return
    }

    if (lastSeenTotal === null) {
      setLastSeenTotal(totalNotifications)
      return
    }

    if (totalNotifications < lastSeenTotal) {
      setLastSeenTotal(totalNotifications)
    }
  }, [isSuccess, totalNotifications, lastSeenTotal])

  const newNotificationsCount = useMemo(() => {
    if (!isSuccess || lastSeenTotal === null) {
      return 0
    }

    return Math.max(0, totalNotifications - lastSeenTotal)
  }, [isSuccess, lastSeenTotal, totalNotifications])

  const badgeCount = useMemo(() => {
    if (newNotificationsCount === 0) {
      return null
    }

    if (newNotificationsCount > 99) {
      return '99+'
    }

    return newNotificationsCount.toString()
  }, [newNotificationsCount])

  const errorMessage = isError
    ? error instanceof Error
      ? error.message
      : 'Não foi possível carregar as notificações. Tente novamente.'
    : null

  useEffect(() => {
    if (!isOpen) {
      return
    }

    void refetch()
  }, [isOpen, refetch])

  useEffect(() => {
    if (!isOpen || !isSuccess) {
      return
    }

    setLastSeenTotal(totalNotifications)
  }, [isOpen, isSuccess, totalNotifications])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label={
            badgeCount
              ? `Você tem ${badgeCount} novas notificações`
              : hasNotifications
                ? `Você tem ${totalNotifications} notificações`
                : 'Nenhuma notificação disponível'
          }
        >
          <Bell aria-hidden="true" />

          {badgeCount ? (
            <span className="absolute -top-1.5 -right-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {badgeCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bell className="size-4" aria-hidden="true" />
            <span>Notificações</span>
          </div>

          {isFetching ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Atualizando
            </span>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-mr-2 text-xs"
              onClick={() => refetch()}
            >
              Atualizar
            </Button>
          )}
        </header>

        <div className="max-h-80 overflow-y-auto">
          {isPending ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              <span>Carregando notificações...</span>
            </div>
          ) : errorMessage ? (
            <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
              <p className="text-sm text-destructive">{errorMessage}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          ) : notifications.length > 0 ? (
            <ul className="divide-y divide-border">
              {notifications.map((notification) => {
                const taskId = getTaskIdFromMetadata(notification)
                const responsibleName =
                  getNotificationResponsibleName(notification)

                return (
                  <li key={notification.id} className="space-y-2 px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground">
                        {notification.message}
                      </p>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-secondary-foreground">
                        {formatChannel(notification.channel)}
                      </span>
                    </div>

                    {responsibleName ? (
                      <p className="text-xs text-muted-foreground">
                        Responsável:{' '}
                        <span className="font-medium text-foreground">
                          {responsibleName}
                        </span>
                      </p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDateTime(notification.createdAt)}</span>
                      <span className="font-medium uppercase">
                        {formatStatus(notification.status)}
                      </span>
                    </div>

                    {taskId ? (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto px-0 text-xs"
                        onClick={() => {
                          void router.navigate({
                            to: '/tasks/$taskId',
                            params: { taskId },
                          })
                          setIsOpen(false)
                        }}
                      >
                        Ver tarefa
                      </Button>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Você está em dia! Nenhuma notificação encontrada.
            </div>
          )}
        </div>

        <footer className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          {hasNotifications
            ? `Mostrando ${notifications.length} de ${totalNotifications} notificações`
            : 'Sem notificações registradas até o momento.'}
        </footer>
      </PopoverContent>
    </Popover>
  )
}
