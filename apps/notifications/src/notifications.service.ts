import { Inject, Injectable, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { CommentDTO } from '@contracts';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import {
  COMMENT_NEW_EVENT,
  NOTIFICATIONS_GATEWAY_CLIENT,
  TASKS_COMMENT_CREATED_PATTERN,
  TASKS_UPDATED_PATTERN,
  TASK_UPDATED_EVENT,
} from './notifications.constants';

interface CommentCreatedPayload {
  comment: CommentDTO;
  recipients: string[];
}

interface TaskSnapshot {
  id: string;
  [key: string]: unknown;
}

interface TaskUpdatedPayload {
  task: TaskSnapshot;
  recipients: string[];
  changes?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NOTIFICATIONS_GATEWAY_CLIENT)
    private readonly gatewayClient: ClientProxy,
  ) {}

  @EventPattern(TASKS_COMMENT_CREATED_PATTERN)
  async handleNewComment(
    @Payload() payload: CommentCreatedPayload,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();

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
    @Payload() payload: TaskUpdatedPayload,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();

    try {
      await firstValueFrom(this.gatewayClient.emit(TASK_UPDATED_EVENT, payload));
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
