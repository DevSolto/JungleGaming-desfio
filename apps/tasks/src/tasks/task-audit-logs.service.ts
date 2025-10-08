import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  TaskAuditLogActorDTO,
  TaskAuditLogChangeDTO,
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
}
