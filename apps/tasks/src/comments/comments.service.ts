import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { defaultIfEmpty, lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { Task } from '../tasks/task.entity';
import { TASKS_EVENTS_CLIENT } from '../tasks/tasks.constants';
import {
  TASK_FORWARDING_PATTERNS,
  type CommentDTO,
  type CreateCommentDTO,
  type PaginatedCommentsDTO,
  type TaskCommentListFiltersDTO,
  type TaskCommentCreatedPayload,
  type TaskForwardingPattern,
} from '@repo/types';

export interface PaginatedComments extends PaginatedCommentsDTO {
  data: CommentDTO[];
}

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

    const comment = this.commentsRepository.create(dto);
    const saved = await this.commentsRepository.save(comment);

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

    await this.emitEvent(TASK_FORWARDING_PATTERNS.COMMENT_CREATED, payload);
  }

  private toCommentDTO(comment: Comment): CommentDTO {
    return {
      id: comment.id,
      taskId: comment.taskId,
      authorId: comment.authorId,
      message: comment.message,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  private async emitEvent(
    pattern: TaskForwardingPattern,
    payload: unknown,
  ): Promise<void> {
    try {
      await lastValueFrom(
        this.eventsClient.emit(pattern, payload).pipe(defaultIfEmpty(undefined)),
      );
    } catch {
      // Intentionally swallow errors to avoid breaking the main workflow
    }
  }
}
