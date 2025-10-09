import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { TasksGateway } from './tasks.gateway';
import { AppLoggerService, runWithRequestContext } from '@repo/logger';

const REQUEST_ID_HEADER = 'x-request-id';

type AcknowledgeMessage = { content: Buffer };

interface AcknowledgeChannel {
  ack(message: AcknowledgeMessage, allUpTo?: boolean, requeue?: boolean): void;
}

const isAcknowledgeChannel = (value: unknown): value is AcknowledgeChannel =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { ack?: unknown }).ack === 'function';

const isAcknowledgeMessage = (value: unknown): value is AcknowledgeMessage =>
  typeof value === 'object' &&
  value !== null &&
  Buffer.isBuffer((value as { content?: unknown }).content);

@Controller()
export class TasksEventsController {
  private readonly logger: AppLoggerService;

  constructor(
    private readonly tasksGateway: TasksGateway,
    appLogger: AppLoggerService,
  ) {
    this.logger = appLogger.withContext({
      context: TasksEventsController.name,
    });
  }

  @EventPattern('task.created')
  onTaskCreated(@Payload() task: unknown, @Ctx() context: RmqContext): void {
    this.forwardEvent('task:created', task, context);
  }

  @EventPattern('task.updated')
  onTaskUpdated(@Payload() task: unknown, @Ctx() context: RmqContext): void {
    this.forwardEvent('task:updated', task, context);
  }

  @EventPattern('task.deleted')
  onTaskDeleted(@Payload() task: unknown, @Ctx() context: RmqContext): void {
    this.forwardEvent('task:deleted', task, context);
  }

  @EventPattern('comment.new')
  onCommentNew(@Payload() comment: unknown, @Ctx() context: RmqContext): void {
    this.forwardEvent('comment:new', comment, context);
  }

  private forwardEvent(
    event: string,
    payload: unknown,
    context: RmqContext,
  ): void {
    const requestId = this.resolveRequestId(payload, context);

    const handler = () => {
      try {
        this.tasksGateway.emitToClients(event, payload);
      } catch (error) {
        const messageDetail =
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error);
        const stack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Failed to handle RabbitMQ event "${event}": ${messageDetail}`,
          stack,
          this.buildLogContext({ event }, requestId),
        );
      } finally {
        this.acknowledge(context, requestId);
      }
    };

    if (requestId) {
      runWithRequestContext({ requestId }, handler);
      return;
    }

    handler();
  }

  private acknowledge(context: RmqContext, requestId?: string): void {
    const channel = context.getChannelRef() as unknown;
    const originalMessage = context.getMessage() as unknown;

    if (
      !isAcknowledgeChannel(channel) ||
      !isAcknowledgeMessage(originalMessage)
    ) {
      this.logger.warn(
        'Received invalid RabbitMQ context while acknowledging event; message will not be acked.',
        this.buildLogContext({}, requestId),
      );
      return;
    }

    channel.ack(originalMessage);
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

    const candidate = (payload as { requestId?: unknown }).requestId;

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
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

  private buildLogContext(
    base: Record<string, unknown>,
    requestId?: string,
  ): Record<string, unknown> {
    if (!requestId) {
      return base;
    }

    return {
      ...base,
      requestId,
    };
  }
}
