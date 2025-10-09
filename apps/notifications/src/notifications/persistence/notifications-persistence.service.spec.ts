import type { Repository } from 'typeorm';
import { NOTIFICATION_STATUSES } from '@repo/types';
import type { AppLoggerService } from '@repo/logger';

import { Notification } from '../notification.entity';
import { NotificationsPersistenceService } from './notifications-persistence.service';

describe('NotificationsPersistenceService', () => {
  let repository: jest.Mocked<Partial<Repository<Notification>>>;
  let service: NotificationsPersistenceService;
  let loggerFactory: { withContext: jest.Mock };
  let scopedLogger: { debug: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    scopedLogger = {
      debug: jest.fn(),
      error: jest.fn(),
    };

    loggerFactory = {
      withContext: jest.fn().mockReturnValue(scopedLogger),
    };

    service = new NotificationsPersistenceService(
      repository as Repository<Notification>,
      loggerFactory as unknown as AppLoggerService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('cria notificações normalizando campos opcionais', async () => {
    const sentAtIso = new Date('2024-03-01T12:00:00Z').toISOString();
    const createdNotification: Notification = {
      id: 'notification-1',
      recipientId: 'user-1',
      channel: 'in_app',
      status: 'pending',
      message: 'Olá',
      metadata: null,
      createdAt: new Date('2024-03-01T12:00:00Z'),
      sentAt: null,
    };

    repository.create!.mockReturnValue(createdNotification);
    repository.save!.mockResolvedValue({
      ...createdNotification,
      status: 'sent',
      sentAt: new Date(sentAtIso),
    });

    const result = await service.createNotification({
      recipientId: 'user-1',
      channel: 'in_app',
      message: 'Olá',
      sentAt: sentAtIso,
    });

    expect(repository.create).toHaveBeenCalledTimes(1);
    const createPayload = repository.create!.mock.calls[0][0];
    expect(createPayload).toMatchObject({
      recipientId: 'user-1',
      channel: 'in_app',
      message: 'Olá',
      metadata: null,
      status: NOTIFICATION_STATUSES[0],
    });
    expect(createPayload.sentAt).toBeInstanceOf(Date);
    expect(createPayload.sentAt?.toISOString()).toBe(sentAtIso);
    expect(repository.save).toHaveBeenCalledWith(createdNotification);
    expect(result.status).toBe('sent');
    expect(result.sentAt?.toISOString()).toBe(sentAtIso);
    expect(scopedLogger.debug).toHaveBeenCalledWith(
      'Notification persisted in database.',
      expect.objectContaining({
        notificationId: 'notification-1',
        recipientId: 'user-1',
      }),
    );
  });

  it('atualiza o status e retorna null quando notificação não existe', async () => {
    repository.findOne!.mockResolvedValue(null);

    const result = await service.updateNotificationStatus('missing', {
      status: 'failed',
    });

    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'missing' } });
    expect(repository.save).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('atualiza o status e data de envio quando a notificação existe', async () => {
    const existingNotification: Notification = {
      id: 'notification-2',
      recipientId: 'user-2',
      channel: 'email',
      status: 'pending',
      message: 'Mensagem',
      metadata: null,
      createdAt: new Date('2024-02-15T08:00:00Z'),
      sentAt: null,
    };

    repository.findOne!.mockResolvedValue(existingNotification);
    repository.save!.mockResolvedValue({
      ...existingNotification,
      status: 'sent',
      sentAt: new Date('2024-02-16T10:30:00Z'),
    });

    const result = await service.updateNotificationStatus('notification-2', {
      status: 'sent',
      sentAt: '2024-02-16T10:30:00.000Z',
    });

    expect(repository.save).toHaveBeenCalledTimes(1);
    const savedNotification = repository.save!.mock.calls[0][0];
    expect(savedNotification.status).toBe('sent');
    expect(savedNotification.sentAt).toBeInstanceOf(Date);
    expect(savedNotification.sentAt?.toISOString()).toBe(
      '2024-02-16T10:30:00.000Z',
    );
    expect(result?.status).toBe('sent');
    expect(result?.sentAt?.toISOString()).toBe('2024-02-16T10:30:00.000Z');
    expect(scopedLogger.debug).toHaveBeenCalledWith(
      'Notification status updated.',
      expect.objectContaining({ notificationId: 'notification-2', status: 'sent' }),
    );
  });

  it('limpa o sentAt quando explicitamente definido como null', async () => {
    const existingNotification: Notification = {
      id: 'notification-3',
      recipientId: 'user-3',
      channel: 'sms',
      status: 'sent',
      message: 'Conteúdo',
      metadata: null,
      createdAt: new Date('2024-01-10T05:00:00Z'),
      sentAt: new Date('2024-01-10T06:00:00Z'),
    };

    repository.findOne!.mockResolvedValue(existingNotification);
    repository.save!.mockResolvedValue({
      ...existingNotification,
      status: 'failed',
      sentAt: null,
    });

    const result = await service.updateNotificationStatus('notification-3', {
      status: 'failed',
      sentAt: null,
    });

    expect(repository.save).toHaveBeenCalledTimes(1);
    const savedNotification = repository.save!.mock.calls[0][0];
    expect(savedNotification.status).toBe('failed');
    expect(savedNotification.sentAt).toBeNull();
    expect(result?.sentAt).toBeNull();
  });

  it('busca notificações por destinatário ordenando do mais recente para o mais antigo', async () => {
    const notifications: Notification[] = [
      {
        id: 'notification-10',
        recipientId: 'user-10',
        channel: 'in_app',
        status: 'pending',
        message: 'Primeira',
        metadata: null,
        createdAt: new Date('2024-04-01T09:00:00Z'),
        sentAt: null,
      },
    ];

    repository.find!.mockResolvedValue(notifications);

    const result = await service.findByRecipient('user-10');

    expect(repository.find).toHaveBeenCalledWith({
      where: { recipientId: 'user-10' },
      order: { createdAt: 'DESC' },
    });
    expect(result).toBe(notifications);
    expect(scopedLogger.debug).toHaveBeenCalledWith(
      'Retrieved notifications by recipient.',
      expect.objectContaining({
        recipientId: 'user-10',
        notificationCount: notifications.length,
      }),
    );
  });

  it('realiza busca paginada aplicando filtros quando disponíveis', async () => {
    const notifications: Notification[] = [
      {
        id: 'notification-20',
        recipientId: 'user-42',
        channel: 'in_app',
        status: 'sent',
        message: 'Alerta crítico resolvido',
        metadata: { taskId: 'task-123' },
        createdAt: new Date('2024-05-01T12:00:00Z'),
        sentAt: new Date('2024-05-01T12:05:00Z'),
      },
    ];

    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([notifications, 7]),
    };

    repository.createQueryBuilder!.mockReturnValue(queryBuilder as never);

    const result = await service.findPaginatedByRecipient({
      recipientId: 'user-42',
      status: 'sent',
      channel: 'in_app',
      search: '  crítico ',
      from: new Date('2024-04-30T00:00:00Z'),
      to: new Date('2024-05-02T00:00:00Z'),
      taskId: 'task-123',
      page: 2,
      limit: 5,
    });

    expect(repository.createQueryBuilder).toHaveBeenCalledWith('notification');
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'notification.recipientId = :recipientId',
      { recipientId: 'user-42' },
    );
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(1,
      'notification.status = :status',
      { status: 'sent' },
    );
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(2,
      'notification.channel = :channel',
      { channel: 'in_app' },
    );
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(3,
      'notification.message ILIKE :search',
      { search: '%crítico%' },
    );
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(4,
      'notification.createdAt >= :from',
      { from: new Date('2024-04-30T00:00:00Z') },
    );
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(5,
      'notification.createdAt <= :to',
      { to: new Date('2024-05-02T00:00:00Z') },
    );
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(6,
      "notification.metadata ->> 'taskId' = :taskId",
      { taskId: 'task-123' },
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith(
      'notification.createdAt',
      'DESC',
    );
    expect(queryBuilder.skip).toHaveBeenCalledWith(5);
    expect(queryBuilder.take).toHaveBeenCalledWith(5);
    expect(result).toEqual({
      data: notifications,
      total: 7,
      page: 2,
      limit: 5,
    });
    expect(scopedLogger.debug).toHaveBeenCalledWith(
      'Retrieved paginated notifications for recipient.',
      expect.objectContaining({
        recipientId: 'user-42',
        notificationCount: notifications.length,
        total: 7,
        page: 2,
        limit: 5,
      }),
    );
  });
});
