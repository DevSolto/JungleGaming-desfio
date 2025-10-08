import type { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import { of } from 'rxjs';
import { DataSource, Repository } from 'typeorm';
import { newDb } from 'pg-mem';
import { TaskPriority, TaskStatus, TASK_EVENT_PATTERNS } from '@repo/types';
import { resetDefaultTaskTimezoneCache } from '@repo/types/utils/datetime';
import { Task } from './task.entity';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  const originalTimezone = process.env.TASKS_TIMEZONE;
  const testTimezone = 'America/Sao_Paulo';
  let dataSource: DataSource;
  let repository: Repository<Task>;
  let service: TasksService;
  const emitMock = jest.fn(() => of(undefined));
  const eventsClient = { emit: emitMock } as unknown as ClientProxy;

  beforeAll(async () => {
    process.env.TASKS_TIMEZONE = testTimezone;
    resetDefaultTaskTimezoneCache();

    const db = newDb({ autoCreateForeignKeyIndices: true });
    db.public.registerFunction({
      name: 'version',
      returns: 'text',
      implementation: () => 'PostgreSQL 13.3',
    });
    db.public.registerFunction({
      name: 'current_database',
      returns: 'text',
      implementation: () => 'test',
    });
    db.public.registerFunction({
      name: 'uuid_generate_v4',
      returns: 'uuid',
      implementation: () => randomUUID(),
      impure: true,
    });
    const dataSourceFactory = db.adapters.createTypeormDataSource({
      type: 'postgres',
      entities: [Task],
    });

    dataSource = await dataSourceFactory.initialize();
    await dataSource.synchronize();

    repository = dataSource.getRepository(Task);
    service = new TasksService(repository, eventsClient);
  });

  afterEach(async () => {
    emitMock.mockClear();
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
      expect.objectContaining({ id: task.id }),
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
});
