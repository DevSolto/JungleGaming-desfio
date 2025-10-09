import type { Repository } from 'typeorm';
import { NOTIFICATION_STATUSES } from '@repo/types';

import { Notification } from '../notification.entity';
import { NotificationsPersistenceService } from './notifications-persistence.service';

describe('NotificationsPersistenceService', () => {
  let repository: jest.Mocked<Partial<Repository<Notification>>>;
  let service: NotificationsPersistenceService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    service = new NotificationsPersistenceService(
      repository as Repository<Notification>,
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
  });
});
