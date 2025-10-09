import type { ClientProxy } from '@nestjs/microservices';
import { of } from 'rxjs';
import { DataSource, Repository } from 'typeorm';
import { TaskPriority, TaskStatus, TASK_EVENT_PATTERNS } from '@repo/types';
import { resetDefaultTaskTimezoneCache } from '@repo/types/utils/datetime';
import { Task } from './task.entity';
import { TasksService } from './tasks.service';
import { createTestDataSource } from '../testing/database';
import { TaskAuditLog } from './task-audit-log.entity';
import { TaskAuditLogsService } from './task-audit-logs.service';

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
    expect(emitMock).toHaveBeenCalledWith(
      TASK_EVENT_PATTERNS.CREATED,
      expect.objectContaining({
        task: expect.objectContaining({ id: task.id }),
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

    expect(emitMock).toHaveBeenCalledWith(
      TASK_EVENT_PATTERNS.CREATED,
      expect.objectContaining({
        task: expect.objectContaining({ id: task.id }),
        actor: {
          id: actor.id,
          displayName: 'Explorer One',
        },
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

    expect(emitMock).toHaveBeenCalledWith(
      TASK_EVENT_PATTERNS.UPDATED,
      expect.objectContaining({
        task: expect.objectContaining({ id: task.id }),
        changes: expect.arrayContaining([
          expect.objectContaining({ field: 'status' }),
        ]),
        actor: {
          id: actor.id,
          displayName: 'Alice',
        },
      }),
    );
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

    expect(emitMock).toHaveBeenCalledWith(
      TASK_EVENT_PATTERNS.DELETED,
      expect.objectContaining({
        task: expect.objectContaining({ id: taskId }),
        actor: {
          id: actor.id,
          displayName: 'deleter@example.com',
        },
      }),
    );
  });
});
