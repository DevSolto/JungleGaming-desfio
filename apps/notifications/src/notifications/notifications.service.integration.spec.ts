import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { of, throwError } from 'rxjs';
import type { RmqContext } from '@nestjs/microservices';
import { DataType, newDb } from 'pg-mem';

import { NotificationsService } from '../notifications.service';
import { Notification } from './notification.entity';
import { NotificationsPersistenceService } from './persistence/notifications-persistence.service';
import { NOTIFICATIONS_GATEWAY_CLIENT } from '../notifications.constants';
import { LoggingModule } from '../common/logging/logging.module';

const createAckContext = () => {
  const ack = jest.fn();
  const nack = jest.fn();
  const channel = { ack, nack };
  const message = { content: Buffer.from('payload') };

  const context = {
    getChannelRef: jest.fn().mockReturnValue(channel),
    getMessage: jest.fn().mockReturnValue(message),
  } as unknown as RmqContext;

  return { context, channel, message };
};

describe('NotificationsService (integração)', () => {
  let moduleRef: TestingModule;
  let service: NotificationsService;
  let repository: Repository<Notification>;
  let persistence: NotificationsPersistenceService;
  let emitMock: jest.Mock;

  beforeEach(async () => {
    emitMock = jest.fn().mockReturnValue(of(undefined));

    moduleRef = await Test.createTestingModule({
      imports: [
        LoggingModule,
        TypeOrmModule.forRootAsync({
          useFactory: async () => ({
            type: 'postgres',
            entities: [Notification],
          }),
          dataSourceFactory: async (options) => {
            const db = newDb({ autoCreateForeignKeyIndices: true });
            const textType = db.public.getType(DataType.text);
            const uuidType = db.public.getType(DataType.uuid);

            db.public.registerFunction({
              name: 'version',
              returns: textType,
              implementation: () => 'PostgreSQL 13.3',
            });
            db.public.registerFunction({
              name: 'current_database',
              returns: textType,
              implementation: () => 'test',
            });
            db.public.registerFunction({
              name: 'uuid_generate_v4',
              returns: uuidType,
              implementation: () => randomUUID(),
              impure: true,
            });

            const dataSource = await db.adapters
              .createTypeormDataSource(options)
              .initialize();

            await dataSource.synchronize();
            return dataSource;
          },
        }),
        TypeOrmModule.forFeature([Notification]),
      ],
      providers: [
        NotificationsPersistenceService,
        NotificationsService,
        {
          provide: NOTIFICATIONS_GATEWAY_CLIENT,
          useValue: { emit: emitMock },
        },
      ],
    }).compile();

    service = moduleRef.get(NotificationsService);
    repository = moduleRef.get(getRepositoryToken(Notification));
    persistence = moduleRef.get(NotificationsPersistenceService);
  });

  afterEach(async () => {
    await moduleRef.close();
    jest.clearAllMocks();
  });

  it('persiste notificações de comentários e faz ack quando tudo ocorre bem', async () => {
    const { context, channel } = createAckContext();

    const taskId = randomUUID();
    const commentId = randomUUID();
    const authorId = randomUUID();
    const firstRecipient = randomUUID();
    const secondRecipient = randomUUID();

    const payload = {
      comment: {
        id: commentId,
        taskId,
        authorId,
        authorName: '  Maria  ',
        message: 'Um novo comentário',
        createdAt: new Date('2024-04-01T12:00:00Z').toISOString(),
        updatedAt: new Date('2024-04-01T12:05:00Z').toISOString(),
      },
      recipients: [firstRecipient, secondRecipient, firstRecipient],
    };

    await service.handleNewComment(payload as never, context);

    const saved = await repository.find({ order: { recipientId: 'ASC' } });

    expect(saved).toHaveLength(2);
    expect(saved.map((item) => item.recipientId)).toEqual(
      expect.arrayContaining([firstRecipient, secondRecipient]),
    );
    expect(saved[0]).toMatchObject({
      channel: 'in_app',
      status: 'pending',
      message: `Maria comentou na tarefa ${taskId}`,
      metadata: expect.objectContaining({
        taskId,
        commentId,
        commentAuthorName: 'Maria',
        commentAuthorId: authorId,
      }),
    });
    expect(channel.ack).toHaveBeenCalledTimes(1);
    expect(channel.nack).not.toHaveBeenCalled();
    expect(emitMock).toHaveBeenCalledTimes(1);
  });

  it('faz nack e não encaminha quando a persistência falha para comentários', async () => {
    const { context, channel } = createAckContext();

    jest
      .spyOn(persistence, 'createNotification')
      .mockRejectedValueOnce(new Error('db indisponível'));

    const taskId = randomUUID();
    const commentId = randomUUID();
    const recipientId = randomUUID();

    const payload = {
      comment: {
        id: commentId,
        taskId,
      },
      recipients: [recipientId],
    };

    await service.handleNewComment(payload as never, context);

    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledTimes(1);
    expect(emitMock).not.toHaveBeenCalled();
    expect(await repository.count()).toBe(0);
  });

  it('persiste notificações de atualização de tarefa e realiza ack', async () => {
    const { context, channel } = createAckContext();

    const taskId = randomUUID();
    const recipientId = randomUUID();
    const actorId = randomUUID();

    const payload = {
      task: {
        id: taskId,
        title: ' Revisão de código ',
      },
      recipients: [recipientId],
      actor: {
        id: actorId,
        displayName: '  João  ',
      },
      changes: [
        {
          field: 'status',
          previousValue: 'todo',
          currentValue: 'doing',
        },
      ],
    };

    await service.handleTaskUpdated(payload as never, context);

    const saved = await repository.find();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      recipientId,
      message: 'João atualizou a tarefa Revisão de código',
      metadata: expect.objectContaining({
        taskId,
        taskTitle: 'Revisão de código',
        actorId,
      }),
    });
    expect(channel.ack).toHaveBeenCalledTimes(1);
    expect(channel.nack).not.toHaveBeenCalled();
    expect(emitMock).toHaveBeenCalledTimes(1);
  });

  it('faz nack e cancela encaminhamento quando persistência falha em atualizações de tarefa', async () => {
    const { context, channel } = createAckContext();

    jest
      .spyOn(persistence, 'createNotification')
      .mockRejectedValue(new Error('falha na escrita'));

    const taskId = randomUUID();
    const recipientId = randomUUID();

    const payload = {
      task: {
        id: taskId,
      },
      recipients: [recipientId],
    };

    await service.handleTaskUpdated(payload as never, context);

    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledTimes(1);
    expect(emitMock).not.toHaveBeenCalled();
    expect(await repository.count()).toBe(0);
  });

  it('faz nack quando o gateway falha ao encaminhar o evento', async () => {
    const { context, channel } = createAckContext();

    emitMock.mockReturnValueOnce(throwError(() => new Error('gateway indisponível')));

    const taskId = randomUUID();
    const recipientId = randomUUID();

    const payload = {
      task: {
        id: taskId,
      },
      recipients: [recipientId],
    };

    await service.handleTaskUpdated(payload as never, context);

    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledTimes(1);
    expect(await repository.count()).toBe(1);
  });
});
