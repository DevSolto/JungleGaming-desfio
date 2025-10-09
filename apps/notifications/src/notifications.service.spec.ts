import { of, throwError } from 'rxjs'
import type { ClientProxy, RmqContext } from '@nestjs/microservices'
import type {
  TaskCommentCreatedPayload,
  TaskUpdatedForwardPayload,
} from '@repo/types'

import { NotificationsService } from './notifications.service'
import type { NotificationsPersistenceService } from './notifications/persistence/notifications-persistence.service'

describe('NotificationsService', () => {
  let service: NotificationsService
  let emitMock: jest.Mock
  let createNotificationMock: jest.Mock
  let gatewayClient: ClientProxy
  let notificationsPersistence: NotificationsPersistenceService

  const createContext = () => {
    const ack = jest.fn()
    const nack = jest.fn()
    const channel = { ack, nack }
    const message = { content: Buffer.from('test') }
    const context = {
      getChannelRef: jest.fn().mockReturnValue(channel),
      getMessage: jest.fn().mockReturnValue(message),
    } as unknown as RmqContext

    return { context, channel }
  }

  beforeEach(() => {
    emitMock = jest.fn()
    createNotificationMock = jest.fn()

    gatewayClient = { emit: emitMock } as unknown as ClientProxy
    notificationsPersistence = {
      createNotification: createNotificationMock,
    } as unknown as NotificationsPersistenceService

    service = new NotificationsService(gatewayClient, notificationsPersistence)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('persists notifications for new comments before forwarding the event', async () => {
    const { context, channel } = createContext()
    const payload: TaskCommentCreatedPayload = {
      comment: {
        id: 'comment-1',
        taskId: 'task-1',
        authorId: 'author-1',
        authorName: '  Maria  ',
        message: 'Um novo comentário',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      recipients: ['user-1', 'user-2', 'user-1'],
    }

    createNotificationMock.mockResolvedValue(undefined)
    emitMock.mockReturnValue(of(undefined))

    await service.handleNewComment(payload, context)

    expect(createNotificationMock).toHaveBeenCalledTimes(2)
    expect(createNotificationMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        recipientId: 'user-1',
        channel: 'in_app',
        message: 'Maria comentou na tarefa task-1',
        metadata: expect.objectContaining({
          taskId: 'task-1',
          commentId: 'comment-1',
          commentAuthorName: 'Maria',
        }),
      }),
    )
    expect(createNotificationMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ recipientId: 'user-2' }),
    )
    expect(emitMock).toHaveBeenCalledTimes(1)
    expect(channel.ack).toHaveBeenCalledTimes(1)
    expect(channel.nack).not.toHaveBeenCalled()
  })

  it('nacks the message and skips forwarding when persistence fails for comments', async () => {
    const { context, channel } = createContext()
    const payload: TaskCommentCreatedPayload = {
      comment: {
        id: 'comment-2',
        taskId: 'task-2',
        authorId: 'author-2',
        authorName: 'João',
        message: 'Outro comentário',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      recipients: ['user-3'],
    }

    createNotificationMock.mockRejectedValue(new Error('db offline'))

    await service.handleNewComment(payload, context)

    expect(createNotificationMock).toHaveBeenCalledTimes(1)
    expect(emitMock).not.toHaveBeenCalled()
    expect(channel.ack).not.toHaveBeenCalled()
    expect(channel.nack).toHaveBeenCalledTimes(1)
  })

  it('nacks the message when forwarding the comment event fails', async () => {
    const { context, channel } = createContext()
    const payload: TaskCommentCreatedPayload = {
      comment: {
        id: 'comment-3',
        taskId: 'task-3',
        authorId: 'author-3',
        authorName: null,
        message: 'Falha no envio',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      recipients: ['user-4'],
    }

    createNotificationMock.mockResolvedValue(undefined)
    emitMock.mockReturnValue(throwError(() => new Error('gateway error')))

    await service.handleNewComment(payload, context)

    expect(createNotificationMock).toHaveBeenCalledTimes(1)
    expect(emitMock).toHaveBeenCalledTimes(1)
    expect(channel.ack).not.toHaveBeenCalled()
    expect(channel.nack).toHaveBeenCalledTimes(1)
  })

  it('persists task update notifications with metadata before forwarding', async () => {
    const { context, channel } = createContext()
    const payload: TaskUpdatedForwardPayload = {
      task: {
        id: 'task-10',
        title: ' Revisão de código ',
      },
      recipients: ['user-10'],
      actor: {
        id: 'actor-1',
        displayName: '  Ana  ',
      },
      changes: [
        {
          field: 'status',
          previousValue: 'todo',
          currentValue: 'doing',
        },
      ],
    }

    createNotificationMock.mockResolvedValue(undefined)
    emitMock.mockReturnValue(of(undefined))

    await service.handleTaskUpdated(payload, context)

    expect(createNotificationMock).toHaveBeenCalledTimes(1)
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'user-10',
        message: 'Ana atualizou a tarefa Revisão de código',
        metadata: expect.objectContaining({
          taskId: 'task-10',
          taskTitle: 'Revisão de código',
          actorId: 'actor-1',
          actorDisplayName: 'Ana',
          changes: payload.changes,
        }),
      }),
    )
    expect(emitMock).toHaveBeenCalledTimes(1)
    expect(channel.ack).toHaveBeenCalledTimes(1)
    expect(channel.nack).not.toHaveBeenCalled()
  })

  it('nacks the message and aborts forwarding when task update persistence fails', async () => {
    const { context, channel } = createContext()
    const payload: TaskUpdatedForwardPayload = {
      task: {
        id: 'task-20',
      },
      recipients: ['user-20'],
    }

    createNotificationMock.mockRejectedValue(new Error('db unavailable'))

    await service.handleTaskUpdated(payload, context)

    expect(createNotificationMock).toHaveBeenCalledTimes(1)
    expect(emitMock).not.toHaveBeenCalled()
    expect(channel.ack).not.toHaveBeenCalled()
    expect(channel.nack).toHaveBeenCalledTimes(1)
  })
})
