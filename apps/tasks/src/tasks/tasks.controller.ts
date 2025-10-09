import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { TasksService, PaginatedTasks } from './tasks.service';
import {
  CreateTaskPayloadDto,
  ListTaskAuditLogsDto,
  ListTasksDto,
  RemoveTaskPayloadDto,
  TaskIdDto,
  TASKS_MESSAGE_PATTERNS,
  UpdateTaskPayloadDto,
} from '@repo/types';
import { transformPayload, toRpcException } from '../common/rpc.utils';
import { runWithRequestContext } from '@repo/logger';

const REQUEST_ID_HEADER = 'x-request-id';

@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @MessagePattern(TASKS_MESSAGE_PATTERNS.CREATE)
  async create(@Payload() payload: unknown, @Ctx() context: RmqContext) {
    try {
      const dto = transformPayload(CreateTaskPayloadDto, payload);
      const requestId = this.resolveRequestId(dto, context);
      const sanitized = this.stripRequestId(dto);
      const { actor, ...data } = sanitized;

      return await this.withRequestContext(requestId, () =>
        this.tasksService.create(data, actor ?? null),
      );
    } catch (error) {
      throw toRpcException(error);
    }
  }

  @MessagePattern(TASKS_MESSAGE_PATTERNS.FIND_ALL)
  async findAll(
    @Payload() payload: unknown,
    @Ctx() context: RmqContext,
  ): Promise<PaginatedTasks> {
    try {
      const dto = transformPayload(ListTasksDto, payload ?? {});
      const requestId = this.resolveRequestId(dto, context);
      const sanitized = this.stripRequestId(dto);

      return await this.withRequestContext(requestId, () =>
        this.tasksService.findAll(sanitized),
      );
    } catch (error) {
      throw toRpcException(error);
    }
  }

  @MessagePattern(TASKS_MESSAGE_PATTERNS.FIND_BY_ID)
  async findById(@Payload() payload: unknown, @Ctx() context: RmqContext) {
    try {
      const dto = transformPayload(TaskIdDto, payload);
      const requestId = this.resolveRequestId(dto, context);
      const { id } = this.stripRequestId(dto);

      return await this.withRequestContext(requestId, () =>
        this.tasksService.findById(id),
      );
    } catch (error) {
      throw toRpcException(error);
    }
  }

  @MessagePattern(TASKS_MESSAGE_PATTERNS.UPDATE)
  async update(@Payload() payload: unknown, @Ctx() context: RmqContext) {
    try {
      const dto = transformPayload(UpdateTaskPayloadDto, payload);
      const requestId = this.resolveRequestId(dto, context);
      const sanitized = this.stripRequestId(dto);
      const { id, data, actor } = sanitized;

      return await this.withRequestContext(requestId, () =>
        this.tasksService.update(id, data, actor ?? null),
      );
    } catch (error) {
      throw toRpcException(error);
    }
  }

  @MessagePattern(TASKS_MESSAGE_PATTERNS.REMOVE)
  async remove(@Payload() payload: unknown, @Ctx() context: RmqContext) {
    try {
      const dto = transformPayload(RemoveTaskPayloadDto, payload);
      const requestId = this.resolveRequestId(dto, context);
      const { id, actor } = this.stripRequestId(dto);

      return await this.withRequestContext(requestId, () =>
        this.tasksService.remove(id, actor ?? null),
      );
    } catch (error) {
      throw toRpcException(error);
    }
  }

  @MessagePattern(TASKS_MESSAGE_PATTERNS.AUDIT_FIND_ALL)
  async findAuditLogs(
    @Payload() payload: unknown,
    @Ctx() context: RmqContext,
  ) {
    try {
      const dto = transformPayload(ListTaskAuditLogsDto, payload);
      const requestId = this.resolveRequestId(dto, context);
      const sanitized = this.stripRequestId(dto);

      return await this.withRequestContext(requestId, () =>
        this.tasksService.findAuditLogs(sanitized),
      );
    } catch (error) {
      throw toRpcException(error);
    }
  }

  private resolveRequestId(
    payload: unknown,
    context: RmqContext,
  ): string | undefined {
    const payloadRequestId = this.extractRequestIdFromPayload(payload);

    if (payloadRequestId) {
      return payloadRequestId;
    }

    return this.extractRequestIdFromContext(context);
  }

  private extractRequestIdFromPayload(payload: unknown): string | undefined {
    if (!payload || typeof payload !== 'object') {
      return undefined;
    }

    const requestId = (payload as { requestId?: unknown }).requestId;

    if (typeof requestId === 'string') {
      const trimmed = requestId.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }

    return undefined;
  }

  private extractRequestIdFromContext(context: RmqContext): string | undefined {
    const message = context?.getMessage?.();
    const headers =
      (message?.properties?.headers as Record<string, unknown> | undefined) ?? {};

    const candidate = headers[REQUEST_ID_HEADER] ?? headers['request-id'];

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }

    return undefined;
  }

  private async withRequestContext<T>(
    requestId: string | undefined,
    handler: () => Promise<T>,
  ): Promise<T> {
    if (!requestId) {
      return handler();
    }

    return runWithRequestContext({ requestId }, handler);
  }

  private stripRequestId<T extends { requestId?: string }>(
    payload: T,
  ): Omit<T, 'requestId'> {
    const { requestId: _ignored, ...rest } = payload;
    return rest;
  }
}
