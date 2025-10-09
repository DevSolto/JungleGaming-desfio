import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  PaginatedTaskAuditLogsDTO,
  TaskAuditLogActorDTO,
  TaskAuditLogChangeDTO,
  TaskAuditLogDTO,
  TaskAuditLogListFiltersDTO,
} from '@repo/types';
import { TaskAuditLog } from './task-audit-log.entity';

export interface CreateTaskAuditLogInput {
  taskId: string;
  action: string;
  actor?: TaskAuditLogActorDTO | null;
  changes?: TaskAuditLogChangeDTO[] | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class TaskAuditLogsService {
  constructor(
    @InjectRepository(TaskAuditLog)
    private readonly repository: Repository<TaskAuditLog>,
  ) {}

  async createLog(input: CreateTaskAuditLogInput): Promise<TaskAuditLog> {
    const { taskId, action, actor, changes, metadata } = input;

    const log = this.repository.create({
      taskId,
      action,
      actorId: actor?.id ?? null,
      actorDisplayName: actor?.displayName ?? null,
      changes: changes && changes.length > 0 ? changes : null,
      metadata: metadata ?? null,
    });

    return this.repository.save(log);
  }

  async findAll(
    filters: TaskAuditLogListFiltersDTO,
  ): Promise<PaginatedTaskAuditLogsDTO> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;

    const [logs, total] = await this.repository.findAndCount({
      where: { taskId: filters.taskId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    const data = logs.map((log) => this.toDto(log));

    return {
      data,
      total,
      page,
      limit,
    };
  }

  private toDto(log: TaskAuditLog): TaskAuditLogDTO {
    return {
      id: log.id,
      taskId: log.taskId,
      action: log.action,
      actorId: log.actorId ?? null,
      actorDisplayName: log.actorDisplayName ?? null,
      actor: log.actorId
        ? {
            id: log.actorId,
            displayName: log.actorDisplayName ?? null,
          }
        : null,
      changes: log.changes ?? null,
      metadata: log.metadata ?? null,
      createdAt: log.createdAt.toISOString(),
    };
  }
}
