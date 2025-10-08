import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { TasksGateway } from './tasks.gateway';

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
  private readonly logger = new Logger(TasksEventsController.name);

  constructor(private readonly tasksGateway: TasksGateway) {}

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
  onCommentNew(
    @Payload() comment: unknown,
    @Ctx() context: RmqContext,
  ): void {
    this.forwardEvent('comment:new', comment, context);
  }

  private forwardEvent(
    event: string,
    payload: unknown,
    context: RmqContext,
  ): void {
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
      );
    } finally {
      this.acknowledge(context);
    }
  }

  private acknowledge(context: RmqContext): void {
    const channel = context.getChannelRef() as unknown;
    const originalMessage = context.getMessage() as unknown;

    if (!isAcknowledgeChannel(channel) || !isAcknowledgeMessage(originalMessage)) {
      this.logger.warn(
        'Received invalid RabbitMQ context while acknowledging event; message will not be acked.',
      );
      return;
    }

    channel.ack(originalMessage);
  }
}
