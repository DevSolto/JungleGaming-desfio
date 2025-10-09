import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy, RmqRecord, RmqRecordBuilder } from '@nestjs/microservices';
import { defaultIfEmpty, lastValueFrom } from 'rxjs';
import { Repository, type DeepPartial } from 'typeorm';
import { Comment } from './comment.entity';
import { Task } from '../tasks/task.entity';
import { TASKS_EVENTS_CLIENT } from '../tasks/tasks.constants';
import {
  TASK_EVENT_PATTERNS,
  TASK_FORWARDING_PATTERNS,
  type CommentDTO,
  type CreateCommentDTO,
  type PaginatedCommentsDTO,
  type TaskCommentListFiltersDTO,
  type TaskCommentCreatedPayload,
  type TaskEventPattern,
  type TaskForwardingPattern,
} from '@repo/types';
import { getCurrentRequestContext } from '@repo/logger';
import type { CorrelatedMessage } from '@repo/types';

const REQUEST_ID_HEADER = 'x-request-id';

export type PaginatedComments = PaginatedCommentsDTO;

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @Inject(TASKS_EVENTS_CLIENT)
    private readonly eventsClient: ClientProxy,
  ) {}

  async create(dto: CreateCommentDTO): Promise<Comment> {
    const task = await this.findTaskOrFail(dto.taskId);

    const normalizedAuthorName =
      typeof dto.authorName === 'string' ? dto.authorName.trim() : null;

    const comment = this.commentsRepository.create({
      ...dto,
      authorName: normalizedAuthorName ? normalizedAuthorName : null,
    } as DeepPartial<Comment>);
    const saved = await this.commentsRepository.save<Comment>(comment);

    await this.emitCommentCreated(saved, task);

    return saved;
  }

  async findAll(filters: TaskCommentListFiltersDTO): Promise<PaginatedComments> {
    await this.findTaskOrFail(filters.taskId);

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;

    const [data, total] = await this.commentsRepository.findAndCount({
      where: { taskId: filters.taskId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: data.map((comment) => this.toCommentDTO(comment)),
      total,
      page,
      limit,
    };
  }

  private async findTaskOrFail(taskId: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  private async emitCommentCreated(comment: Comment, task: Task): Promise<void> {
    const recipients = new Set<string>();

    if (comment.authorId) {
      recipients.add(comment.authorId);
    }

    for (const assignee of task.assignees ?? []) {
      if (assignee?.id) {
        recipients.add(assignee.id);
      }
    }

    const payload: TaskCommentCreatedPayload = {
      comment: this.toCommentDTO(comment),
      recipients: Array.from(recipients),
    };

    await this.emitEvent(TASK_EVENT_PATTERNS.COMMENT_CREATED, payload);
    await this.emitEvent(TASK_FORWARDING_PATTERNS.COMMENT_CREATED, payload);
  }

  private toCommentDTO(comment: Comment): CommentDTO {
    return {
      id: comment.id,
      taskId: comment.taskId,
      authorId: comment.authorId,
      authorName: comment.authorName ?? null,
      message: comment.message,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
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
}
