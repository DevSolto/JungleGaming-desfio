import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ClientProxy,
  RpcException,
  RmqRecordBuilder,
} from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import type {
  Comment,
  CreateComment,
  CreateTask,
  PaginatedComments as PaginatedCommentsResult,
  PaginatedTaskAuditLogsDTO as PaginatedTaskAuditLogsResult,
  PaginatedTasks as PaginatedTasksResult,
  Task,
  TaskActor,
  TaskCommentListFilters,
  TaskAuditLogListFiltersDTO,
  TaskListFilters,
  TasksCreatePayload,
  TasksMessagePattern,
  TasksRemovePayload,
  TasksUpdatePayload,
  UpdateTask,
  type CorrelatedMessage,
} from '@repo/types';
import { TASKS_MESSAGE_PATTERNS } from '@repo/types';
import { getCurrentRequestContext } from '@repo/logger';
import { TASKS_RPC_CLIENT } from './tasks.constants';

export type ListTasksFilters = TaskListFilters;
export type PaginatedTasks = PaginatedTasksResult;
export type PaginatedComments = PaginatedCommentsResult;
export type ListTaskCommentsFilters = Omit<TaskCommentListFilters, 'taskId'>;
export type CreateTaskComment = Omit<CreateComment, 'taskId'>;
export type PaginatedTaskAuditLogs = PaginatedTaskAuditLogsResult;
export type ListTaskAuditLogsFilters = Omit<
  TaskAuditLogListFiltersDTO,
  'taskId'
>;

@Injectable()
export class TasksService {
  constructor(
    @Inject(TASKS_RPC_CLIENT)
    private readonly client: ClientProxy,
  ) {}

  async create(payload: CreateTask, actor?: TaskActor | null): Promise<Task> {
    const rpcPayload: TasksCreatePayload = {
      ...payload,
      ...(actor ? { actor } : {}),
    };

    return this.send<Task>(TASKS_MESSAGE_PATTERNS.CREATE, rpcPayload);
  }

  async findAll(filters: ListTasksFilters = {}): Promise<PaginatedTasks> {
    return this.send<PaginatedTasks>(TASKS_MESSAGE_PATTERNS.FIND_ALL, filters);
  }

  async findById(id: string): Promise<Task> {
    return this.send<Task>(TASKS_MESSAGE_PATTERNS.FIND_BY_ID, { id });
  }

  async update(
    id: string,
    data: UpdateTask,
    actor?: TaskActor | null,
  ): Promise<Task> {
    const rpcPayload: TasksUpdatePayload = {
      id,
      data,
      ...(actor ? { actor } : {}),
    };

    return this.send<Task>(TASKS_MESSAGE_PATTERNS.UPDATE, rpcPayload);
  }

  async remove(id: string, actor?: TaskActor | null): Promise<Task> {
    const rpcPayload: TasksRemovePayload = {
      id,
      ...(actor ? { actor } : {}),
    };

    return this.send<Task>(TASKS_MESSAGE_PATTERNS.REMOVE, rpcPayload);
  }

  async listComments(
    taskId: string,
    filters: ListTaskCommentsFilters = {},
  ): Promise<PaginatedComments> {
    return this.send<PaginatedComments>(
      TASKS_MESSAGE_PATTERNS.COMMENT_FIND_ALL,
      {
        taskId,
        ...filters,
      },
    );
  }

  async createComment(
    taskId: string,
    data: CreateTaskComment,
  ): Promise<Comment> {
    return this.send<Comment>(TASKS_MESSAGE_PATTERNS.COMMENT_CREATE, {
      taskId,
      ...data,
    });
  }

  async listAuditLogs(
    taskId: string,
    filters: ListTaskAuditLogsFilters = {},
  ): Promise<PaginatedTaskAuditLogs> {
    return this.send<PaginatedTaskAuditLogs>(
      TASKS_MESSAGE_PATTERNS.AUDIT_FIND_ALL,
      {
        taskId,
        ...filters,
      },
    );
  }

  private async send<TResponse, TPayload extends object>(
    pattern: TasksMessagePattern,
    payload: TPayload,
  ): Promise<TResponse> {
    try {
      const record = this.createRecord(payload);
      return await lastValueFrom(this.client.send<TResponse>(pattern, record));
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private createRecord<TPayload extends object>(
    payload: TPayload,
  ): ReturnType<RmqRecordBuilder['build']> {
    const requestId = getCurrentRequestContext()?.requestId;
    const correlatedPayload = this.withRequestId(payload, requestId);

    const builder = new RmqRecordBuilder(correlatedPayload);

    if (requestId) {
      builder.setOptions({
        headers: {
          'x-request-id': requestId,
        },
      });
    }

    return builder.build();
  }

  private withRequestId<TPayload extends object>(
    payload: TPayload,
    requestId?: string,
  ): CorrelatedMessage<TPayload> {
    if (!requestId) {
      return payload as CorrelatedMessage<TPayload>;
    }

    return {
      ...payload,
      requestId,
    } satisfies CorrelatedMessage<TPayload>;
  }

  private toHttpException(error: unknown): HttpException {
    if (error instanceof RpcException) {
      const normalized = this.normalizeRpcException(error);
      if (normalized) {
        return this.createHttpException(
          normalized.body,
          normalized.statusCode,
          normalized.cause,
        );
      }
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      !(error instanceof Error)
    ) {
      const obj = error as Record<string, unknown>;

      if (
        'message' in obj ||
        'status' in obj ||
        'statusCode' in obj ||
        'error' in obj ||
        'code' in obj
      ) {
        const body = this.normalizeBody({
          ...obj,
        });
        const statusCode = this.extractStatusCode(
          body.statusCode ?? body.status,
        );
        return this.createHttpException(body, statusCode, error);
      }
    }

    if (error instanceof HttpException) {
      return error;
    }

    if (error instanceof Error) {
      return this.createHttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }

    return this.createHttpException(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private normalizeRpcException(error: RpcException):
    | {
        statusCode: number;
        body: Record<string, unknown>;
        cause?: unknown;
      }
    | undefined {
    const rpcError = error.getError();

    if (rpcError instanceof HttpException) {
      const statusCode = rpcError.getStatus();
      const response = rpcError.getResponse();
      const body = this.normalizeBody({
        statusCode,
        ...(typeof response === 'string'
          ? { message: response }
          : (response as Record<string, unknown>)),
      });

      return { statusCode, body, cause: rpcError };
    }

    if (rpcError instanceof Error) {
      const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      const body = this.normalizeBody({
        statusCode,
        message: rpcError.message ?? 'Internal server error',
      });

      return { statusCode, body, cause: rpcError };
    }

    if (typeof rpcError === 'string') {
      const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      const body = this.normalizeBody({
        statusCode,
        message: rpcError,
      });

      return { statusCode, body };
    }

    if (typeof rpcError === 'object' && rpcError !== null) {
      const normalized = this.normalizeBody({
        ...(rpcError as Record<string, unknown>),
      });
      const statusCode =
        typeof normalized.statusCode === 'number'
          ? normalized.statusCode
          : HttpStatus.INTERNAL_SERVER_ERROR;

      return {
        statusCode,
        body: normalized,
        cause: rpcError,
      };
    }

    return undefined;
  }

  private normalizeBody(
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = { ...source };

    const statusCode = this.extractStatusCode(body.statusCode ?? body.status);
    body.statusCode = statusCode;

    const message = this.extractMessage(body.message ?? body.error);
    body.message = message;

    const code = this.extractCode(body.code);
    if (code) {
      body.code = code;
    } else {
      delete body.code;
    }

    return body;
  }

  private extractStatusCode(rawStatus: unknown): number {
    if (typeof rawStatus === 'number' && Number.isFinite(rawStatus)) {
      return rawStatus;
    }

    if (typeof rawStatus === 'string') {
      const parsed = Number.parseInt(rawStatus, 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private extractMessage(rawMessage: unknown): string {
    if (typeof rawMessage === 'string' && rawMessage.trim().length > 0) {
      return rawMessage;
    }

    if (Array.isArray(rawMessage)) {
      const parts = rawMessage
        .map((part) => this.extractMessage(part))
        .filter((part) => part.length > 0);

      if (parts.length > 0) {
        return parts.join(', ');
      }
    }

    return 'Internal server error';
  }

  private extractCode(rawCode: unknown): string | undefined {
    if (typeof rawCode === 'string' && rawCode.trim().length > 0) {
      return rawCode;
    }

    return undefined;
  }

  private createHttpException(
    body: Record<string, unknown>,
    statusCode: number,
    cause?: unknown,
  ): HttpException {
    const options = cause ? { cause } : undefined;

    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return options
          ? new BadRequestException(body, options)
          : new BadRequestException(body);
      case HttpStatus.UNAUTHORIZED:
        return options
          ? new UnauthorizedException(body, options)
          : new UnauthorizedException(body);
      case HttpStatus.FORBIDDEN:
        return options
          ? new ForbiddenException(body, options)
          : new ForbiddenException(body);
      case HttpStatus.NOT_FOUND:
        return options
          ? new NotFoundException(body, options)
          : new NotFoundException(body);
      case HttpStatus.CONFLICT:
        return options
          ? new ConflictException(body, options)
          : new ConflictException(body);
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return options
          ? new UnprocessableEntityException(body, options)
          : new UnprocessableEntityException(body);
      default:
        return new HttpException(body, statusCode, options ?? {});
    }
  }
}
