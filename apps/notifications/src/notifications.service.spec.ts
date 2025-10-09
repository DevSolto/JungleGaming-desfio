import { of, throwError } from 'rxjs'
import type { ClientProxy, RmqContext } from '@nestjs/microservices'
import type {
  TaskCommentCreatedPayload,
  TaskUpdatedForwardPayload,
} from '@repo/types'
import type { AppLoggerService } from '@repo/logger'

import { NotificationsService } from './notifications.service'
import type { NotificationsPersistenceService } from './notifications/persistence/notifications-persistence.service'
import { Notification } from './notifications/notification.entity'

describe('NotificationsService', () => {
  let service: NotificationsService
  let emitMock: jest.Mock
  let createNotificationMock: jest.Mock
  let gatewayClient: ClientProxy
  let notificationsPersistence: NotificationsPersistenceService
  let loggerFactory: { withContext: jest.Mock }
  let scopedLogger: { debug: jest.Mock; error: jest.Mock }

  const createContext = () => {
    const ack = jest.fn()
    const nack = jest.fn()
    const channel = { ack, nack }
    const message = { content: Buffer.from('test'), properties: { headers: {} } }
    const context = {
      getChannelRef: jest.fn().mockReturnValue(channel),
      getMessage: jest.fn().mockReturnValue(message),
    } as unknown as RmqContext

    return { context, channel }
  }

  beforeEach(() => {
    emitMock = jest.fn()
    createNotificationMock = jest.fn().mockImplementation(({ recipientId, message }) =>
      Promise.resolve({
        id: `notification-${recipientId}`,
        recipientId,
        channel: 'in_app',
        status: 'pending',
        message,
        metadata: null,
        createdAt: new Date(),
        sentAt: null,
      }),
    )

    gatewayClient = { emit: emitMock } as unknown as ClientProxy
    notificationsPersistence = {
      createNotification: createNotificationMock,
      findPaginatedByRecipient: jest.fn(),
    } as unknown as NotificationsPersistenceService

    scopedLogger = {
      debug: jest.fn(),
      error: jest.fn(),
    }

    loggerFactory = {
      withContext: jest.fn().mockReturnValue(scopedLogger),
    }

    service = new NotificationsService(
      gatewayClient,
      notificationsPersistence,
      loggerFactory as unknown as AppLoggerService,
    )
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

    createNotificationMock.mockImplementation(({ recipientId, message }) =>
      Promise.resolve({
        id: `notification-${recipientId}`,
        recipientId,
        channel: 'in_app',
        status: 'pending',
        message,
        metadata: null,
        createdAt: new Date(),
        sentAt: null,
      }),
    )
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

    createNotificationMock.mockImplementation(({ recipientId, message }) =>
      Promise.resolve({
        id: `notification-${recipientId}`,
        recipientId,
        channel: 'in_app',
        status: 'pending',
        message,
        metadata: null,
        createdAt: new Date(),
        sentAt: null,
      }),
    )
    emitMock.mockReturnValue(throwError(() => new Error('gateway error')))

    await service.handleNewComment(payload, context)

    expect(createNotificationMock).toHaveBeenCalledTimes(1)
    expect(emitMock).toHaveBeenCalledTimes(1)
    expect(channel.ack).not.toHaveBeenCalled()
    expect(channel.nack).toHaveBeenCalledTimes(1)
  })

  it('retorna notificações paginadas quando recebe requisição RPC findAll', async () => {
    const { context } = createContext()
    const stored: Notification[] = [
      {
        id: '6f18b85e-b3f0-4d75-8f85-9f8a0f5c0c1a',
        recipientId: '0baf5b64-28e0-4e63-a362-8ec0f24b38ca',
        channel: 'in_app',
        status: 'pending',
        message: 'Atualização disponível',
        metadata: { taskId: '648f71b0-8f4e-4d6d-bca9-72e8f598b357' },
        createdAt: new Date('2024-06-01T10:00:00Z'),
        sentAt: null,
      },
    ]

    ;(notificationsPersistence.findPaginatedByRecipient as jest.Mock).mockResolvedValue({
      data: stored,
      total: 1,
      page: 2,
      limit: 5,
    })

    const result = await service.findAll(
      {
        recipientId: '0baf5b64-28e0-4e63-a362-8ec0f24b38ca',
        page: 2,
        limit: 5,
        taskId: '648f71b0-8f4e-4d6d-bca9-72e8f598b357',
        requestId: 'req-123',
      },
      context,
    )

    expect(notificationsPersistence.findPaginatedByRecipient).toHaveBeenCalledWith({
      recipientId: '0baf5b64-28e0-4e63-a362-8ec0f24b38ca',
      status: undefined,
      channel: undefined,
      search: undefined,
      from: undefined,
      to: undefined,
      taskId: '648f71b0-8f4e-4d6d-bca9-72e8f598b357',
      page: 2,
      limit: 5,
    })
    expect(result).toEqual({
      data: [
        {
          id: '6f18b85e-b3f0-4d75-8f85-9f8a0f5c0c1a',
          recipientId: '0baf5b64-28e0-4e63-a362-8ec0f24b38ca',
          channel: 'in_app',
          status: 'pending',
          message: 'Atualização disponível',
          metadata: { taskId: '648f71b0-8f4e-4d6d-bca9-72e8f598b357' },
          createdAt: '2024-06-01T10:00:00.000Z',
          sentAt: null,
        },
      ],
      total: 1,
      page: 2,
      limit: 5,
    })
  })

  it('normalizes complex recipient structures for comments', async () => {
    const { context, channel } = createContext()
    const payload = {
      comment: {
        id: 'comment-structured',
        taskId: 'task-structured',
        authorId: null,
        authorName: 'Estrutura',
        message: 'Comentário com recipientes complexos',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      recipients: [
        '  user-1  ',
        { id: ' user-2 ' },
        { userId: 'user-3' },
        { recipientId: 'user-4' },
        { ids: ['user-5', ''] },
        { user: { id: 'user-6 ' } },
        { assignee: { id: 'user-7' } },
        { values: ['user-8', null] },
      ],
    } as unknown as TaskCommentCreatedPayload

    emitMock.mockReturnValue(of(undefined))

    await service.handleNewComment(payload, context)

    const recipientIds = createNotificationMock.mock.calls.map(
      ([callPayload]: [{ recipientId: string }]) => callPayload.recipientId,
    )

    expect(recipientIds).toHaveLength(8)
    expect(recipientIds).toEqual(
      expect.arrayContaining([
        'user-1',
        'user-2',
        'user-3',
        'user-4',
        'user-5',
        'user-6',
        'user-7',
        'user-8',
      ]),
    )
    expect(emitMock).toHaveBeenCalledTimes(1)
    expect(channel.ack).toHaveBeenCalledTimes(1)
    expect(channel.nack).not.toHaveBeenCalled()
  })

  it('includes the comment author when recipients are missing', async () => {
    const { context, channel } = createContext()
    const payload = {
      comment: {
        id: 'comment-author',
        taskId: 'task-author',
        authorId: 'author-123',
        authorName: 'Autor',
        message: 'Comentário sem destinatários explícitos',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      recipients: [],
    } as unknown as TaskCommentCreatedPayload

    emitMock.mockReturnValue(of(undefined))

    await service.handleNewComment(payload, context)

    expect(createNotificationMock).toHaveBeenCalledTimes(1)
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: 'author-123' }),
    )
    expect(channel.ack).toHaveBeenCalledTimes(1)
    expect(channel.nack).not.toHaveBeenCalled()
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

  it('derives task recipients from task payload when recipients array is empty', async () => {
    const { context, channel } = createContext()
    const payload = {
      task: {
        id: 'task-derived',
        title: 'Tarefa derivada',
        assignees: [
          { id: 'assignee-1', username: 'user1' },
          { id: 'assignee-2', username: 'user2' },
        ],
        responsibles: [{ id: 'responsible-1' }],
        responsibleIds: ['responsible-2'],
      },
      recipients: [],
      actor: {
        id: 'actor-derived',
        displayName: 'Derivador',
      },
    } as unknown as TaskUpdatedForwardPayload

    emitMock.mockReturnValue(of(undefined))

    await service.handleTaskUpdated(payload, context)

    const recipientIds = createNotificationMock.mock.calls.map(
      ([callPayload]: [{ recipientId: string }]) => callPayload.recipientId,
    )

    expect(new Set(recipientIds)).toEqual(
      new Set([
        'assignee-1',
        'assignee-2',
        'responsible-1',
        'responsible-2',
      ]),
    )
    expect(createNotificationMock).toHaveBeenCalledTimes(4)
    expect(channel.ack).toHaveBeenCalledTimes(1)
    expect(channel.nack).not.toHaveBeenCalled()
  })
})
