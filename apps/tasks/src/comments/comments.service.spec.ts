import type { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import { of } from 'rxjs';
import { DataSource, Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { CommentsService } from './comments.service';
import { Task } from '../tasks/task.entity';
import { createTestDataSource } from '../testing/database';
import {
  TaskPriority,
  TaskStatus,
  TASK_FORWARDING_PATTERNS,
} from '@repo/types';

describe('CommentsService', () => {
  let dataSource: DataSource;
  let commentsRepository: Repository<Comment>;
  let tasksRepository: Repository<Task>;
  let service: CommentsService;
  const emitMock = jest.fn(() => of(undefined));
  const eventsClient = { emit: emitMock } as unknown as ClientProxy;

  beforeAll(async () => {
    dataSource = await createTestDataSource([Task, Comment]);
    commentsRepository = dataSource.getRepository(Comment);
    tasksRepository = dataSource.getRepository(Task);
    service = new CommentsService(
      commentsRepository,
      tasksRepository,
      eventsClient,
    );
  });

  afterEach(async () => {
    emitMock.mockClear();
    await commentsRepository.createQueryBuilder().delete().from(Comment).execute();
    await tasksRepository.createQueryBuilder().delete().from(Task).execute();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('throws a NotFoundException when creating a comment for a missing task', async () => {
    await expect(
      service.create({
        taskId: randomUUID(),
        authorId: randomUUID(),
        message: 'Hello world',
      }),
    ).rejects.toThrow('Task not found');
  });

  it('creates a comment and emits a forwarding event with unique recipients', async () => {
    const authorId = randomUUID();
    const assigneeId = randomUUID();
    const task = await tasksRepository.save(
      tasksRepository.create({
        title: 'Sample task',
        description: null,
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: null,
        assignees: [
          { id: assigneeId, username: 'assignee-1' },
          { id: authorId, username: 'author' },
        ],
      }),
    );

    const comment = await service.create({
      taskId: task.id,
      authorId,
      message: 'First comment',
    });

    expect(comment.id).toBeDefined();
    expect(comment.taskId).toBe(task.id);
    expect(comment.message).toBe('First comment');

    expect(emitMock).toHaveBeenCalledWith(
      TASK_FORWARDING_PATTERNS.COMMENT_CREATED,
      expect.objectContaining({
        comment: expect.objectContaining({ id: comment.id, message: 'First comment' }),
        recipients: expect.arrayContaining([authorId, assigneeId]),
      }),
    );

    const payload = emitMock.mock.calls[0][1];
    expect(new Set(payload.recipients).size).toBe(payload.recipients.length);
  });

  it('throws a NotFoundException when listing comments for a missing task', async () => {
    await expect(
      service.findAll({ taskId: randomUUID() }),
    ).rejects.toThrow('Task not found');
  });

  it('lists comments with pagination defaults applied and ordered by creation date', async () => {
    const author1 = randomUUID();
    const author2 = randomUUID();
    const author3 = randomUUID();
    const task = await tasksRepository.save(
      tasksRepository.create({
        title: 'Paginated task',
        description: null,
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: null,
        assignees: [],
      }),
    );

    await service.create({
      taskId: task.id,
      authorId: author1,
      message: 'First',
    });
    await service.create({
      taskId: task.id,
      authorId: author2,
      message: 'Second',
    });
    await service.create({
      taskId: task.id,
      authorId: author3,
      message: 'Third',
    });

    const result = await service.findAll({
      taskId: task.id,
      page: 0,
      limit: 0,
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.total).toBe(3);
    expect(result.data).toHaveLength(3);
    expect(result.data[0].message).toBe('Third');
    expect(result.data[2].message).toBe('First');
  });
});
