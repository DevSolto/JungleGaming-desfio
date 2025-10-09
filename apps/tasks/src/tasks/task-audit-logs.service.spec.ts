import { DataSource, Repository } from 'typeorm';
import { TASK_EVENT_PATTERNS, type TaskAuditLogChangeDTO } from '@repo/types';
import { TaskAuditLogsService } from './task-audit-logs.service';
import { TaskAuditLog } from './task-audit-log.entity';
import { createTestDataSource } from '../testing/database';

describe('TaskAuditLogsService', () => {
  let dataSource: DataSource;
  let repository: Repository<TaskAuditLog>;
  let service: TaskAuditLogsService;

  beforeAll(async () => {
    dataSource = await createTestDataSource([TaskAuditLog]);
    repository = dataSource.getRepository(TaskAuditLog);
    service = new TaskAuditLogsService(repository);
  });

  afterEach(async () => {
    await repository.createQueryBuilder().delete().from(TaskAuditLog).execute();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('persists audit logs normalizing optional fields', async () => {
    const changes: TaskAuditLogChangeDTO[] = [
      {
        field: 'status',
        previousValue: 'todo',
        currentValue: 'done',
      },
    ];

    const log = await service.createLog({
      taskId: '11111111-1111-1111-1111-111111111111',
      action: TASK_EVENT_PATTERNS.UPDATED,
      actor: { id: 'user-1', displayName: 'Player One' },
      changes,
      metadata: { reason: 'automated-transition' },
    });

    expect(log).toMatchObject({
      taskId: '11111111-1111-1111-1111-111111111111',
      action: TASK_EVENT_PATTERNS.UPDATED,
      actorId: 'user-1',
      actorDisplayName: 'Player One',
      changes,
      metadata: { reason: 'automated-transition' },
    });
  });

  it('stores nulls when actor, changes or metadata are not provided', async () => {
    const log = await service.createLog({
      taskId: '22222222-2222-2222-2222-222222222222',
      action: TASK_EVENT_PATTERNS.CREATED,
    });

    expect(log).toMatchObject({
      taskId: '22222222-2222-2222-2222-222222222222',
      action: TASK_EVENT_PATTERNS.CREATED,
      actorId: null,
      actorDisplayName: null,
      changes: null,
      metadata: null,
    });
  });

  it('returns paginated DTOs ordered by newest first when listing logs', async () => {
    await service.createLog({
      taskId: '33333333-3333-3333-3333-333333333333',
      action: TASK_EVENT_PATTERNS.CREATED,
      actor: { id: 'user-1', displayName: 'Player One' },
    });

    await service.createLog({
      taskId: '33333333-3333-3333-3333-333333333333',
      action: TASK_EVENT_PATTERNS.UPDATED,
      actor: { id: 'user-2', displayName: 'Player Two' },
    });

    const paginated = await service.findAll({
      taskId: '33333333-3333-3333-3333-333333333333',
      page: 1,
      limit: 1,
    });

    expect(paginated).toMatchObject({
      total: 2,
      page: 1,
      limit: 1,
    });

    expect(paginated.data[0]).toMatchObject({
      taskId: '33333333-3333-3333-3333-333333333333',
      action: TASK_EVENT_PATTERNS.UPDATED,
      actor: { id: 'user-2', displayName: 'Player Two' },
    });
    expect(paginated.data[0].createdAt).toEqual(expect.any(String));
  });
});
