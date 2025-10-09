import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { CommentsService, PaginatedComments } from './comments.service';
import {
  CreateCommentDto,
  ListTaskCommentsDto,
  TASKS_MESSAGE_PATTERNS,
} from '@repo/types';
import { transformPayload, toRpcException } from '../common/rpc.utils';
import { runWithRequestContext } from '@repo/logger';

const REQUEST_ID_HEADER = 'x-request-id';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @MessagePattern(TASKS_MESSAGE_PATTERNS.COMMENT_CREATE)
  async create(@Payload() payload: unknown, @Ctx() context: RmqContext) {
    try {
      const dto = transformPayload(CreateCommentDto, payload);
      const requestId = this.resolveRequestId(dto, context);
      const sanitized = this.stripRequestId(dto);

      return await this.withRequestContext(requestId, () =>
        this.commentsService.create(sanitized),
      );
    } catch (error) {
      throw toRpcException(error);
    }
  }

  @MessagePattern(TASKS_MESSAGE_PATTERNS.COMMENT_FIND_ALL)
  async findAll(
    @Payload() payload: unknown,
    @Ctx() context: RmqContext,
  ): Promise<PaginatedComments> {
    try {
      const dto = transformPayload(ListTaskCommentsDto, payload ?? {});
      const requestId = this.resolveRequestId(dto, context);
      const sanitized = this.stripRequestId(dto);

      return await this.withRequestContext(requestId, () =>
        this.commentsService.findAll(sanitized),
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
