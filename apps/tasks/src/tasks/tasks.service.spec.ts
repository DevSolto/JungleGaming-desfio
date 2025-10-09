jest.mock('@repo/logger', () => ({
  getCurrentRequestContext: jest.fn(() => undefined),
  runWithRequestContext: jest.fn((_: unknown, handler: () => unknown) => handler()),
}));

import type { ClientProxy } from '@nestjs/microservices';
import { of } from 'rxjs';
import { DataSource, Repository } from 'typeorm';
import {
  TaskPriority,
  TaskStatus,
  TASK_EVENT_PATTERNS,
  TASK_FORWARDING_PATTERNS,
} from '@repo/types';
import { resetDefaultTaskTimezoneCache } from '@repo/types/utils/datetime';
import { Task } from './task.entity';
import { TasksService } from './tasks.service';
import { createTestDataSource } from '../testing/database';
import { TaskAuditLog } from './task-audit-log.entity';
import { TaskAuditLogsService } from './task-audit-logs.service';

const logger = jest.requireMock('@repo/logger') as {
  getCurrentRequestContext: jest.Mock;
  runWithRequestContext: jest.Mock;
};

describe('TasksService', () => {
  const originalTimezone = process.env.TASKS_TIMEZONE;
  const testTimezone = 'America/Sao_Paulo';
  let dataSource: DataSource;
  let repository: Repository<Task>;
  let service: TasksService;
  let auditLogsRepository: Repository<TaskAuditLog>;
  const emitMock = jest.fn(() => of(undefined));
  const eventsClient = { emit: emitMock } as unknown as ClientProxy;

  beforeAll(async () => {
    process.env.TASKS_TIMEZONE = testTimezone;
    resetDefaultTaskTimezoneCache();

    dataSource = await createTestDataSource([Task, TaskAuditLog]);

    repository = dataSource.getRepository(Task);
    auditLogsRepository = dataSource.getRepository(TaskAuditLog);
    const auditLogsService = new TaskAuditLogsService(auditLogsRepository);
    service = new TasksService(repository, eventsClient, auditLogsService);
  });

  afterEach(async () => {
    emitMock.mockClear();
    logger.getCurrentRequestContext.mockReturnValue(undefined);
    await auditLogsRepository
      .createQueryBuilder()
      .delete()
      .from(TaskAuditLog)
      .execute();
    await repository.createQueryBuilder().delete().from(Task).execute();
  });

  afterAll(async () => {
    await dataSource.destroy();
    process.env.TASKS_TIMEZONE = originalTimezone;
    resetDefaultTaskTimezoneCache();
  });

  it('persists due dates normalized to UTC using the configured timezone', async () => {
    const task = await service.create({
      title: 'Configured timezone task',
      description: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: '2024-03-10',
      assignees: [],
    });

    expect(task.dueDate?.toISOString()).toBe('2024-03-10T03:00:00.000Z');

    const createdCall = emitMock.mock.calls.find(
      ([pattern]) => pattern === TASK_EVENT_PATTERNS.CREATED,
    );

    expect(createdCall).toBeDefined();

    const [, createdRecord] = createdCall!;
    expect(createdRecord).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          task: expect.objectContaining({ id: task.id }),
          recipients: [],
        }),
      }),
    );

    const logs = await auditLogsRepository.find();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      taskId: task.id,
      action: TASK_EVENT_PATTERNS.CREATED,
      actorId: null,
    });
  });

  it('registers audit logs and emits events with actor metadata when creating a task', async () => {
    const actor = {
      id: 'user-1',
      name: '  Explorer One  ',
      email: 'explorer@junglegaming.dev',
    };

    const task = await service.create(
      {
        title: 'Task with actor',
        description: 'Ensure audit metadata is stored',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: null,
        assignees: [],
      },
      actor,
    );

    const logs = await auditLogsRepository.find({ order: { createdAt: 'ASC' } });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      action: TASK_EVENT_PATTERNS.CREATED,
      taskId: task.id,
      actorId: actor.id,
      actorDisplayName: 'Explorer One',
      changes: null,
      metadata: null,
    });

    const createdCall = emitMock.mock.calls.find(
      ([pattern]) => pattern === TASK_EVENT_PATTERNS.CREATED,
    );

    expect(createdCall).toBeDefined();

    const [, createdRecord] = createdCall!;
    expect(createdRecord).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          task: expect.objectContaining({ id: task.id }),
          actor: {
            id: actor.id,
            displayName: 'Explorer One',
          },
          recipients: [],
        }),
      }),
    );
  });

  it('normalizes assignees data and populates recipients when creating tasks', async () => {
    const task = await service.create({
      title: 'Task with assignees',
      description: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: null,
      assignees: [
        {
          id: ' 33333333-3333-3333-3333-333333333333 ',
          username: '  Explorer  ',
          name: '  Explorer  ',
          email: '  explorer@example.com  ',
        },
        {
          id: '33333333-3333-3333-3333-333333333333',
          username: 'Explorer',
          name: 'Explorer   ',
          email: ' explorer@example.com ',
        },
        {
          id: '11111111-1111-1111-1111-111111111111',
          username: 'alpha',
          name: ' Alpha ',
          email: '',
        },
      ],
    });

    expect(task.assignees).toEqual([
      {
        id: '11111111-1111-1111-1111-111111111111',
        username: 'alpha',
        name: 'Alpha',
        email: null,
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        username: 'Explorer',
        name: 'Explorer',
        email: 'explorer@example.com',
      },
    ]);

    const createdEvent = emitMock.mock.calls.find(
      ([pattern]) => pattern === TASK_EVENT_PATTERNS.CREATED,
    );

    expect(createdEvent).toBeDefined();

    const createdRecord = createdEvent![1] as { data: Record<string, unknown> };
    const createdData = createdRecord.data as Record<string, unknown>;

    expect(createdData).toEqual(
      expect.objectContaining({
        recipients: [
          '11111111-1111-1111-1111-111111111111',
          '33333333-3333-3333-3333-333333333333',
        ],
        task: expect.objectContaining({
          assignees: [
            expect.objectContaining({
              id: '11111111-1111-1111-1111-111111111111',
            }),
            expect.objectContaining({
              id: '33333333-3333-3333-3333-333333333333',
            }),
          ],
        }),
      }),
    );

    const logs = await auditLogsRepository.find({ order: { createdAt: 'ASC' } });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      taskId: task.id,
      action: TASK_EVENT_PATTERNS.CREATED,
      changes: null,
    });
  });

  it('stores audit logs and emits events when creating tasks with assignees and actor metadata', async () => {
    const actor = {
      id: 'leader-1',
      name: '  Explorer Lead  ',
      email: 'lead@junglegaming.dev',
    };

    const task = await service.create(
      {
        title: 'Task with tracked assignees',
        description: 'Validate responsible assignment',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: null,
        assignees: [
          {
            id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            username: 'beta',
            name: '  Beta   ',
            email: ' beta@example.com ',
          },
          {
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            username: 'alpha',
            name: 'Alpha',
            email: null,
          },
        ],
      },
      actor,
    );

    const logs = await auditLogsRepository.find({ order: { createdAt: 'ASC' } });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      taskId: task.id,
      action: TASK_EVENT_PATTERNS.CREATED,
      actorId: actor.id,
      actorDisplayName: 'Explorer Lead',
      changes: null,
    });

    const createdEvent = emitMock.mock.calls.find(
      ([pattern]) => pattern === TASK_EVENT_PATTERNS.CREATED,
    );

    expect(createdEvent).toBeDefined();

    const createdRecord = createdEvent![1] as { data: Record<string, unknown> };
    const createdData = createdRecord.data as Record<string, unknown>;

    expect(createdData).toEqual(
      expect.objectContaining({
        actor: { id: actor.id, displayName: 'Explorer Lead' },
        recipients: [
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        ],
        task: expect.objectContaining({
          assignees: [
            {
              id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              username: 'alpha',
              name: 'Alpha',
              email: null,
            },
            {
              id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
              username: 'beta',
              name: 'Beta',
              email: 'beta@example.com',
            },
          ],
        }),
      }),
    );
  });

  it('filters tasks by dueDate respecting the configured day range', async () => {
    const matching = await service.create({
      title: 'Matches filter',
      description: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: '2024-05-20',
      assignees: [],
    });

    await service.create({
      title: 'Different day',
      description: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: '2024-05-21',
      assignees: [],
    });

    await service.create({
      title: 'No due date',
      description: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      assignees: [],
    });

    const result = await service.findAll({ dueDate: '2024-05-20' });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe(matching.id);
    expect(result.data[0].dueDate?.toISOString()).toBe('2024-05-20T03:00:00.000Z');
  });

  it('registers audit logs with normalized changes when updating a task', async () => {
    const task = await service.create({
      title: 'Task to update',
      description: 'Initial description',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: '2024-05-20',
      assignees: [],
    });

    emitMock.mockClear();

    const actor = {
      id: 'actor-1',
      name: '  Alice  ',
      email: 'alice@example.com',
    };

    logger.getCurrentRequestContext.mockReturnValue({
      requestId: 'update-request',
    });

    await service.update(
      task.id,
      {
        status: TaskStatus.IN_PROGRESS,
        dueDate: '2024-05-25',
        assignees: [
          {
            id: 'a1b2c3',
            username: 'alice',
          },
        ],
      },
      actor,
    );

    const logs = await auditLogsRepository.find({
      order: { createdAt: 'ASC' },
    });

    expect(logs).toHaveLength(2);

    const updateLog = logs[1];
    expect(updateLog).toMatchObject({
      action: TASK_EVENT_PATTERNS.UPDATED,
      taskId: task.id,
      actorId: actor.id,
      actorDisplayName: 'Alice',
    });
    expect(updateLog.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'status',
          previousValue: TaskStatus.TODO,
          currentValue: TaskStatus.IN_PROGRESS,
        }),
        expect.objectContaining({
          field: 'dueDate',
          previousValue: '2024-05-20T03:00:00.000Z',
          currentValue: '2024-05-25T03:00:00.000Z',
        }),
        expect.objectContaining({
          field: 'assignees',
          previousValue: [],
          currentValue: [
            {
              id: 'a1b2c3',
              username: 'alice',
            },
          ],
        }),
      ]),
    );

    const updatedCall = emitMock.mock.calls.find(
      ([pattern]) => pattern === TASK_EVENT_PATTERNS.UPDATED,
    );

    expect(updatedCall).toBeDefined();

    const [, updatedRecordRaw] = updatedCall!;
    const updatedRecord = updatedRecordRaw as {
      data: {
        recipients: string[];
        requestId?: string;
      };
      options?: { headers?: Record<string, string> };
    };

    expect(updatedRecord).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          task: expect.objectContaining({ id: task.id }),
          changes: expect.arrayContaining([
            expect.objectContaining({ field: 'status' }),
          ]),
          actor: {
            id: actor.id,
            displayName: 'Alice',
          },
          recipients: ['a1b2c3'],
          requestId: 'update-request',
        }),
        options: expect.objectContaining({
          headers: expect.objectContaining({ 'x-request-id': 'update-request' }),
        }),
      }),
    );

    const forwardedCall = emitMock.mock.calls.find(
      ([pattern]) => pattern === TASK_FORWARDING_PATTERNS.UPDATED,
    );

    expect(forwardedCall).toBeDefined();

    const [, forwardedRecord] = forwardedCall!;
    expect(forwardedRecord).toEqual(updatedRecord);
  });

  it('tracks assignee updates and emits recipients when responsibles change', async () => {
    const task = await service.create({
      title: 'Task with responsibles',
      description: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: null,
      assignees: [
        {
          id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          username: 'beta',
          name: ' Beta  ',
          email: 'beta@example.com',
        },
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          username: 'alpha',
          name: 'Alpha',
          email: null,
        },
      ],
    });

    emitMock.mockClear();

    const actor = {
      id: 'updater-1',
      name: '  Responsible Manager ',
      email: 'manager@example.com',
    };

    await service.update(
      task.id,
      {
        assignees: [
          {
            id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
            username: 'charlie',
            name: ' Charlie ',
            email: 'charlie@example.com',
          },
          {
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            username: 'alpha',
            name: '  Alpha  ',
            email: 'alpha@example.com',
          },
        ],
      },
      actor,
    );

    const logs = await auditLogsRepository.find({ order: { createdAt: 'ASC' } });
    expect(logs).toHaveLength(2);

    const updateLog = logs[1];
    expect(updateLog).toMatchObject({
      action: TASK_EVENT_PATTERNS.UPDATED,
      taskId: task.id,
      actorId: actor.id,
      actorDisplayName: 'Responsible Manager',
    });

    expect(updateLog.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'assignees',
          previousValue: [
            {
              id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              username: 'alpha',
              name: 'Alpha',
              email: null,
            },
            {
              id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
              username: 'beta',
              name: 'Beta',
              email: 'beta@example.com',
            },
          ],
          currentValue: [
            {
              id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              username: 'alpha',
              name: 'Alpha',
              email: 'alpha@example.com',
            },
            {
              id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
              username: 'charlie',
              name: 'Charlie',
              email: 'charlie@example.com',
            },
          ],
        }),
      ]),
    );

    const updatedEvent = emitMock.mock.calls.find(
      ([pattern]) => pattern === TASK_EVENT_PATTERNS.UPDATED,
    );

    expect(updatedEvent).toBeDefined();

    const [, updatedRecord] = updatedEvent!;
    const updatedData = (updatedRecord as { data: Record<string, unknown> }).data as {
      recipients: string[];
      task: { assignees: Array<Record<string, unknown>> };
      actor?: Record<string, unknown>;
    };

    expect(updatedData.actor).toEqual({
      id: actor.id,
      displayName: 'Responsible Manager',
    });
    expect(updatedData.recipients).toEqual([
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
    ]);
    expect(updatedData.task.assignees).toEqual([
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        username: 'alpha',
        name: 'Alpha',
        email: 'alpha@example.com',
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        username: 'charlie',
        name: 'Charlie',
        email: 'charlie@example.com',
      },
    ]);

    const forwardedEvent = emitMock.mock.calls.find(
      ([pattern]) => pattern === TASK_FORWARDING_PATTERNS.UPDATED,
    );

    expect(forwardedEvent).toBeDefined();
    const [, forwardedRecord] = forwardedEvent!;
    expect(forwardedRecord).toEqual(updatedRecord);
  });

  it('filters tasks by assignee id using normalized filters', async () => {
    const matching = await service.create({
      title: 'Matches assignee filter',
      description: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: null,
      assignees: [
        { id: 'assignee-1', username: 'owner1' },
        { id: 'assignee-2', username: 'owner2' },
      ],
    });

    await service.create({
      title: 'Different assignee',
      description: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: null,
      assignees: [{ id: 'assignee-3', username: 'owner3' }],
    });

    const result = await service.findAll({ assigneeId: '  assignee-2  ' });

    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe(matching.id);
    expect(result.data[0].assignees).toEqual([
      { id: 'assignee-1', username: 'owner1' },
      { id: 'assignee-2', username: 'owner2' },
    ]);
  });

  it('registers deletion audit logs with actor information and emits events', async () => {
    const task = await service.create({
      title: 'Task to delete',
      description: 'This task will be removed',
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      assignees: [],
    });

    const actor = {
      id: 'actor-delete',
      email: 'deleter@example.com',
      name: '',
    };

    emitMock.mockClear();

    const taskId = task.id;

    const removed = await service.remove(taskId, actor);

    expect(removed.id ?? taskId).toBe(taskId);

    const logs = await auditLogsRepository.find({ order: { createdAt: 'ASC' } });
    expect(logs).toHaveLength(2);

    const deleteLog = logs[1];
    expect(deleteLog).toMatchObject({
      action: TASK_EVENT_PATTERNS.DELETED,
      taskId,
      actorId: actor.id,
      actorDisplayName: 'deleter@example.com',
      changes: null,
    });

    const deletedCall = emitMock.mock.calls.find(
      ([pattern]) => pattern === TASK_EVENT_PATTERNS.DELETED,
    );

    expect(deletedCall).toBeDefined();

    const [, deletedRecord] = deletedCall!;
    expect(deletedRecord).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          task: expect.objectContaining({ id: taskId }),
          actor: {
            id: actor.id,
            displayName: 'deleter@example.com',
          },
          recipients: [],
        }),
      }),
    );
  });
});
