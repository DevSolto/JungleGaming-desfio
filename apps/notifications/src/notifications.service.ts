import { Inject, Injectable, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type {
  TaskCommentCreatedPayload,
  TaskUpdatedForwardPayload,
} from '@repo/types';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import {
  COMMENT_NEW_EVENT,
  NOTIFICATIONS_GATEWAY_CLIENT,
  TASKS_COMMENT_CREATED_PATTERN,
  TASKS_UPDATED_PATTERN,
  TASK_UPDATED_EVENT,
} from './notifications.constants';

type AcknowledgeMessage = {
  content: Buffer;
};

interface AcknowledgeChannel {
  ack(message: AcknowledgeMessage, allUpTo?: boolean, requeue?: boolean): void;
  nack(message: AcknowledgeMessage, allUpTo?: boolean, requeue?: boolean): void;
}

const isAcknowledgeChannel = (value: unknown): value is AcknowledgeChannel =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { ack?: unknown }).ack === 'function' &&
  typeof (value as { nack?: unknown }).nack === 'function';

const isAcknowledgeMessage = (value: unknown): value is AcknowledgeMessage =>
  typeof value === 'object' &&
  value !== null &&
  Buffer.isBuffer((value as { content?: unknown }).content);

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NOTIFICATIONS_GATEWAY_CLIENT)
    private readonly gatewayClient: ClientProxy,
  ) {}

  @EventPattern(TASKS_COMMENT_CREATED_PATTERN)
  async handleNewComment(
    @Payload() payload: TaskCommentCreatedPayload,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channelRef = context.getChannelRef() as unknown;
    const messageRef = context.getMessage() as unknown;

    if (
      !isAcknowledgeChannel(channelRef) ||
      !isAcknowledgeMessage(messageRef)
    ) {
      this.logger.error(
        'Received invalid RabbitMQ context while processing comment event.',
      );
      return;
    }

    const channel = channelRef;
    const originalMessage = messageRef;

    try {
      await firstValueFrom(this.gatewayClient.emit(COMMENT_NEW_EVENT, payload));
      channel.ack(originalMessage);
      this.logger.debug(
        `Forwarded comment ${payload.comment?.id ?? 'unknown'} to ${COMMENT_NEW_EVENT}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to forward comment ${payload.comment?.id ?? 'unknown'}: ${error instanceof Error ? error.message : error}`,
      );
      channel.nack(originalMessage, false, true);
    }
  }

  @EventPattern(TASKS_UPDATED_PATTERN)
  async handleTaskUpdated(
    @Payload() payload: TaskUpdatedForwardPayload,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channelRef = context.getChannelRef() as unknown;
    const messageRef = context.getMessage() as unknown;

    if (
      !isAcknowledgeChannel(channelRef) ||
      !isAcknowledgeMessage(messageRef)
    ) {
      this.logger.error(
        'Received invalid RabbitMQ context while processing task event.',
      );
      return;
    }

    const channel = channelRef;
    const originalMessage = messageRef;

    try {
      await firstValueFrom(
        this.gatewayClient.emit(TASK_UPDATED_EVENT, payload),
      );
      channel.ack(originalMessage);
      this.logger.debug(
        `Forwarded task ${payload.task?.id ?? 'unknown'} update to ${TASK_UPDATED_EVENT}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to forward task ${payload.task?.id ?? 'unknown'} update: ${error instanceof Error ? error.message : error}`,
      );
      channel.nack(originalMessage, false, true);
    }
  }
}
