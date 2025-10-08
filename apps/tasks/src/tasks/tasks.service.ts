import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { defaultIfEmpty, lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { TASKS_EVENTS_CLIENT } from './tasks.constants';
import { TASK_EVENT_PATTERNS } from '@repo/types';
import {
  getDayRangeInTimezone,
  getDefaultTaskTimezone,
  parseDateInTimezone,
} from '@repo/types/utils/datetime';
import type {
  CreateTaskDTO,
  TaskEventPattern,
  TaskListFiltersDTO,
  UpdateTaskDTO,
} from '@repo/types';

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
  ) {}

  async create(dto: CreateTaskDTO): Promise<Task> {
    const task = this.tasksRepository.create({
      ...dto,
      dueDate: dto.dueDate
        ? parseDateInTimezone(dto.dueDate, this.taskTimezone)
        : null,
    });

    const saved = await this.tasksRepository.save(task);
    await this.emitEvent(TASK_EVENT_PATTERNS.CREATED, saved);

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

  async update(id: string, dto: UpdateTaskDTO): Promise<Task> {
    const task = await this.findById(id);

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

    await this.emitEvent(TASK_EVENT_PATTERNS.UPDATED, saved);

    return saved;
  }

  async remove(id: string): Promise<Task> {
    const task = await this.findById(id);
    const removed = await this.tasksRepository.remove(task);

    await this.emitEvent(TASK_EVENT_PATTERNS.DELETED, removed);

    return removed;
  }

  private async emitEvent(
    pattern: TaskEventPattern,
    payload: unknown,
  ): Promise<void> {
    try {
      await lastValueFrom(
        this.eventsClient
          .emit(pattern, payload)
          .pipe(defaultIfEmpty(undefined)),
      );
    } catch {
      // Intentionally swallow errors to avoid breaking the main workflow
    }
  }
}
