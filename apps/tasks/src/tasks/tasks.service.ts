import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy, RmqRecord, RmqRecordBuilder } from '@nestjs/microservices';
import { defaultIfEmpty, lastValueFrom } from 'rxjs';
import { Repository, type DeepPartial } from 'typeorm';
import { Task } from './task.entity';
import { TASKS_EVENTS_CLIENT } from './tasks.constants';
import {
  TASK_EVENT_PATTERNS,
  TASK_FORWARDING_PATTERNS,
  type TaskActor,
  type TaskAuditLogActorDTO,
  type TaskAuditLogChangeDTO,
  type TaskDTO,
  type TaskEventPayload,
  type TaskAssigneeDTO,
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
  TaskForwardingPattern,
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
    const normalizedAssignees = this.normalizeAssignees(dto.assignees);
    const task = this.tasksRepository.create({
      ...dto,
      assignees: normalizedAssignees,
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

    const payload = this.createEventPayload(
      saved,
      auditActor,
      null,
      this.getAssigneeRecipients(saved.assignees),
    );

    await this.emitEvent(TASK_EVENT_PATTERNS.CREATED, payload);
    await this.emitEvent(TASK_FORWARDING_PATTERNS.CREATED, payload);

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
      const trimmedAssigneeId = filters.assigneeId.trim();

      if (trimmedAssigneeId.length > 0) {
        query.andWhere('task.assignees::jsonb @> :assignee', {
          assignee: JSON.stringify([{ id: trimmedAssigneeId }]),
        });
      }
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

    const { dueDate, assignees, ...restDto } = dto;
    const updatePayload: Partial<Task> = {
      ...restDto,
      dueDate:
        dueDate !== undefined
          ? dueDate
            ? parseDateInTimezone(dueDate, this.taskTimezone)
            : null
          : undefined,
    };

    if (assignees !== undefined) {
      updatePayload.assignees = this.normalizeAssignees(assignees);
    }

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

    const payload = this.createEventPayload(
      saved,
      auditActor,
      normalizedChanges,
      this.getAssigneeRecipients(saved.assignees),
    );

    await this.emitEvent(TASK_EVENT_PATTERNS.UPDATED, payload);
    await this.emitEvent(TASK_FORWARDING_PATTERNS.UPDATED, payload);

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

    const payload = this.createEventPayload(
      removed,
      auditActor,
      null,
      this.getAssigneeRecipients(task.assignees),
    );

    await this.emitEvent(TASK_EVENT_PATTERNS.DELETED, payload);
    await this.emitEvent(TASK_FORWARDING_PATTERNS.DELETED, payload);

    return removed;
  }

  private async emitEvent<TPayload extends object>(
    pattern: TaskEventPattern | TaskForwardingPattern,
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
    recipients?: string[] | null,
  ): TaskEventPayload {
    const payload: TaskEventPayload = {
      task: this.toTaskDto(task),
    };

    payload.recipients = recipients?.length
      ? [...recipients]
      : [];

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
      id: task.id,
      title: task.title,
      description: task.description ?? null,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      assignees: Array.isArray(task.assignees)
        ? task.assignees.map((assignee) => ({ ...assignee }))
        : [],
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private normalizeAssignees(
    assignees?: TaskAssigneeDTO[] | null,
  ): TaskAssigneeDTO[] {
    if (!Array.isArray(assignees) || assignees.length === 0) {
      return [];
    }

    const unique = new Map<string, TaskAssigneeDTO>();

    for (const candidate of assignees) {
      if (!candidate || typeof candidate !== 'object') {
        continue;
      }

      const rawId = candidate.id;
      const id = typeof rawId === 'string' ? rawId.trim() : '';

      if (!id) {
        continue;
      }

      const rawUsername = candidate.username;
      const username =
        typeof rawUsername === 'string' ? rawUsername.trim() : '';

      if (!username) {
        continue;
      }

      const existing = unique.get(id);
      const normalized: TaskAssigneeDTO = existing
        ? { ...existing, id, username }
        : { id, username };

      if (candidate.name === null) {
        normalized.name = null;
      } else if (typeof candidate.name === 'string') {
        const trimmedName = candidate.name.trim();
        if (trimmedName.length > 0) {
          normalized.name = trimmedName;
        } else {
          normalized.name = null;
        }
      }

      if (candidate.email === null) {
        normalized.email = null;
      } else if (typeof candidate.email === 'string') {
        const trimmedEmail = candidate.email.trim();
        if (trimmedEmail.length > 0) {
          normalized.email = trimmedEmail;
        } else {
          normalized.email = null;
        }
      }

      unique.set(id, normalized);
    }

    return Array.from(unique.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  private getAssigneeRecipients(
    ...groups: (TaskAssigneeDTO[] | null | undefined)[]
  ): string[] {
    const recipients = new Set<string>();

    for (const group of groups) {
      if (!Array.isArray(group)) {
        continue;
      }

      for (const assignee of group) {
        const id = typeof assignee?.id === 'string' ? assignee.id.trim() : '';

        if (id) {
          recipients.add(id);
        }
      }
    }

    return Array.from(recipients).sort((a, b) => a.localeCompare(b));
  }
}
