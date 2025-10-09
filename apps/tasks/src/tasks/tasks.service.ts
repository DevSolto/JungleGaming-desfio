import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy, RmqRecord, RmqRecordBuilder } from '@nestjs/microservices';
import { defaultIfEmpty, lastValueFrom } from 'rxjs';
import { Repository, type DeepPartial } from 'typeorm';
import { Task } from './task.entity';
import { TASKS_EVENTS_CLIENT } from './tasks.constants';
import {
  TASK_EVENT_PATTERNS,
  type TaskActor,
  type TaskAuditLogActorDTO,
  type TaskAuditLogChangeDTO,
  type TaskDTO,
  type TaskEventPayload,
} from '@repo/types';
import {
  getDayRangeInTimezone,
  getDefaultTaskTimezone,
  parseDateInTimezone,
} from '@repo/types/utils/datetime';
import type {
  CreateTaskDTO,
  PaginatedTaskAuditLogsDTO,
  TaskEventPattern,
  TaskAuditLogListFiltersDTO,
  TaskListFiltersDTO,
  UpdateTaskDTO,
} from '@repo/types';
import { TaskAuditLogsService } from './task-audit-logs.service';
import {
  createTaskStateSnapshot,
  diffTaskChanges,
} from './task-diff.util';
import { getCurrentRequestContext } from '@repo/logger';
import type { CorrelatedMessage } from '@repo/types';

const REQUEST_ID_HEADER = 'x-request-id';

export interface PaginatedTasks {
  data: Task[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class TasksService {
  private readonly taskTimezone = getDefaultTaskTimezone();

  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @Inject(TASKS_EVENTS_CLIENT)
    private readonly eventsClient: ClientProxy,
    private readonly auditLogsService: TaskAuditLogsService,
  ) {}

  async create(dto: CreateTaskDTO, actor?: TaskActor | null): Promise<Task> {
    const task = this.tasksRepository.create({
      ...dto,
      dueDate: dto.dueDate
        ? parseDateInTimezone(dto.dueDate, this.taskTimezone)
        : null,
    } as DeepPartial<Task>);

    const saved = await this.tasksRepository.save<Task>(task);

    const auditActor = this.toAuditLogActor(actor);

    await this.auditLogsService.createLog({
      taskId: saved.id,
      action: TASK_EVENT_PATTERNS.CREATED,
      actor: auditActor,
    });

    await this.emitEvent(
      TASK_EVENT_PATTERNS.CREATED,
      this.createEventPayload(saved, auditActor),
    );

    return saved;
  }

  async findAll(filters: TaskListFiltersDTO): Promise<PaginatedTasks> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;

    const query = this.tasksRepository.createQueryBuilder('task');

    if (filters.status) {
      query.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters.priority) {
      query.andWhere('task.priority = :priority', {
        priority: filters.priority,
      });
    }

    if (filters.search) {
      query.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.assigneeId) {
      query.andWhere('task.assignees::jsonb @> :assignee', {
        assignee: JSON.stringify([{ id: filters.assigneeId }]),
      });
    }

    if (filters.dueDate) {
      const { start, end } = getDayRangeInTimezone(
        filters.dueDate,
        this.taskTimezone,
      );
      query.andWhere('task.dueDate >= :start AND task.dueDate < :end', {
        start,
        end,
      });
    }

    query.orderBy('task.createdAt', 'DESC');

    const [data, total] = await query
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({ where: { id } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async findAuditLogs(
    filters: TaskAuditLogListFiltersDTO,
  ): Promise<PaginatedTaskAuditLogsDTO> {
    return this.auditLogsService.findAll(filters);
  }

  async update(
    id: string,
    dto: UpdateTaskDTO,
    actor?: TaskActor | null,
  ): Promise<Task> {
    const task = await this.findById(id);
    const previousState = createTaskStateSnapshot(task);

    const { dueDate, ...restDto } = dto;
    const updatePayload: Partial<Task> = {
      ...restDto,
      dueDate:
        dueDate !== undefined
          ? dueDate
            ? parseDateInTimezone(dueDate, this.taskTimezone)
            : null
          : undefined,
    };

    this.tasksRepository.merge(task, updatePayload);

    const saved = await this.tasksRepository.save(task);

    const currentState = createTaskStateSnapshot(saved);
    const changes = diffTaskChanges(previousState, currentState);
    const normalizedChanges = changes.length > 0 ? changes : null;
    const auditActor = this.toAuditLogActor(actor);

    await this.auditLogsService.createLog({
      taskId: saved.id,
      action: TASK_EVENT_PATTERNS.UPDATED,
      actor: auditActor,
      changes: normalizedChanges,
    });

    await this.emitEvent(
      TASK_EVENT_PATTERNS.UPDATED,
      this.createEventPayload(saved, auditActor, normalizedChanges),
    );

    return saved;
  }

  async remove(id: string, actor?: TaskActor | null): Promise<Task> {
    const task = await this.findById(id);
    const taskId = task.id;
    const removed = await this.tasksRepository.remove(task);
    removed.id = taskId;

    const auditActor = this.toAuditLogActor(actor);

    await this.auditLogsService.createLog({
      taskId,
      action: TASK_EVENT_PATTERNS.DELETED,
      actor: auditActor,
    });

    await this.emitEvent(
      TASK_EVENT_PATTERNS.DELETED,
      this.createEventPayload(removed, auditActor),
    );

    return removed;
  }

  private async emitEvent<TPayload extends object>(
    pattern: TaskEventPattern,
    payload: TPayload,
  ): Promise<void> {
    try {
      const record = this.createEventRecord(payload);

      await lastValueFrom(
        this.eventsClient.emit(pattern, record).pipe(defaultIfEmpty(undefined)),
      );
    } catch {
      // Intentionally swallow errors to avoid breaking the main workflow
    }
  }

  private createEventRecord<TPayload extends object>(
    payload: TPayload,
  ): RmqRecord<TPayload> {
    const { correlatedPayload, requestId } = this.withRequestId(payload);
    const builder = new RmqRecordBuilder<TPayload>(correlatedPayload);

    if (requestId) {
      builder.setOptions({
        headers: {
          [REQUEST_ID_HEADER]: requestId,
        },
      });
    }

    return builder.build();
  }

  private withRequestId<TPayload extends object>(
    payload: TPayload,
  ): {
    correlatedPayload: CorrelatedMessage<TPayload>;
    requestId?: string;
  } {
    const payloadRequestId = this.extractRequestId(payload);
    const requestId = payloadRequestId ?? getCurrentRequestContext()?.requestId;

    if (!requestId) {
      return {
        correlatedPayload: payload as CorrelatedMessage<TPayload>,
      };
    }

    if (payloadRequestId === requestId) {
      return {
        correlatedPayload: payload as CorrelatedMessage<TPayload>,
        requestId,
      };
    }

    return {
      correlatedPayload: {
        ...payload,
        requestId,
      } satisfies CorrelatedMessage<TPayload>,
      requestId,
    };
  }

  private extractRequestId(payload: unknown): string | undefined {
    if (!payload || typeof payload !== 'object') {
      return undefined;
    }

    const candidate = (payload as { requestId?: unknown }).requestId;

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }

    return undefined;
  }

  private toAuditLogActor(
    actor?: TaskActor | null,
  ): TaskAuditLogActorDTO | null {
    if (!actor) {
      return null;
    }

    const displayName =
      typeof actor.name === 'string' && actor.name.trim().length > 0
        ? actor.name.trim()
        : typeof actor.email === 'string' && actor.email.trim().length > 0
          ? actor.email.trim()
          : null;

    return {
      id: actor.id,
      displayName,
    };
  }

  private createEventPayload(
    task: Task,
    actor: TaskAuditLogActorDTO | null,
    changes?: TaskAuditLogChangeDTO[] | null,
  ): TaskEventPayload {
    const payload: TaskEventPayload = {
      task: this.toTaskDto(task),
    };

    if (actor) {
      payload.actor = actor;
    }

    if (changes && changes.length > 0) {
      payload.changes = changes;
    }

    return payload;
  }

  private toTaskDto(task: Task): TaskDTO {
    return {
      ...task,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}
