import { Inject, Injectable } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import {
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
  type TaskCommentCreatedPayload,
  type TaskUpdatedForwardPayload,
} from '@repo/types';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AppLoggerService } from '@repo/logger';

import {
  COMMENT_NEW_EVENT,
  NOTIFICATIONS_GATEWAY_CLIENT,
  TASKS_COMMENT_CREATED_PATTERN,
  TASKS_UPDATED_PATTERN,
  TASK_UPDATED_EVENT,
} from './notifications.constants';
import { NotificationsPersistenceService } from './notifications/persistence/notifications-persistence.service';

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
  private readonly logger: AppLoggerService;
  private readonly inAppChannel: NotificationChannel =
    NOTIFICATION_CHANNELS.includes('in_app')
      ? ('in_app' as NotificationChannel)
      : NOTIFICATION_CHANNELS[0];

  constructor(
    @Inject(NOTIFICATIONS_GATEWAY_CLIENT)
    private readonly gatewayClient: ClientProxy,
    private readonly notificationsPersistence: NotificationsPersistenceService,
    appLogger: AppLoggerService,
  ) {
    this.logger = appLogger.withContext({ context: NotificationsService.name });
  }

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
        undefined,
        { pattern: TASKS_COMMENT_CREATED_PATTERN },
      );
      return;
    }

    const channel = channelRef;
    const originalMessage = messageRef;

    try {
      await this.persistCommentNotifications(payload);
    } catch (error) {
      this.logger.error(
        'Failed to persist notifications for comment.',
        error,
        {
          commentId: payload.comment?.id ?? null,
          pattern: TASKS_COMMENT_CREATED_PATTERN,
        },
      );
      channel.nack(originalMessage, false, true);
      return;
    }

    try {
      await firstValueFrom(this.gatewayClient.emit(COMMENT_NEW_EVENT, payload));
      channel.ack(originalMessage);
      this.logger.debug('Forwarded comment to gateway.', {
        commentId: payload.comment?.id ?? null,
        event: COMMENT_NEW_EVENT,
      });
    } catch (error) {
      this.logger.error('Failed to forward comment to gateway.', error, {
        commentId: payload.comment?.id ?? null,
        event: COMMENT_NEW_EVENT,
      });
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
        undefined,
        { pattern: TASKS_UPDATED_PATTERN },
      );
      return;
    }

    const channel = channelRef;
    const originalMessage = messageRef;

    try {
      await this.persistTaskUpdateNotifications(payload);
    } catch (error) {
      this.logger.error('Failed to persist notifications for task update.', error, {
        taskId: this.extractTaskId(payload),
        pattern: TASKS_UPDATED_PATTERN,
      });
      channel.nack(originalMessage, false, true);
      return;
    }

    try {
      await firstValueFrom(
        this.gatewayClient.emit(TASK_UPDATED_EVENT, payload),
      );
      channel.ack(originalMessage);
      this.logger.debug('Forwarded task update to gateway.', {
        taskId: payload.task?.id ?? null,
        event: TASK_UPDATED_EVENT,
      });
    } catch (error) {
      this.logger.error('Failed to forward task update to gateway.', error, {
        taskId: payload.task?.id ?? null,
        event: TASK_UPDATED_EVENT,
      });
      channel.nack(originalMessage, false, true);
    }
  }

  private async persistCommentNotifications(
    payload: TaskCommentCreatedPayload,
  ): Promise<void> {
    const recipients = this.normalizeRecipients(payload.recipients);

    if (recipients.length === 0) {
      return;
    }

    const authorName = this.normalizeText(payload.comment?.authorName);
    const message = `${authorName ?? 'Alguém'} comentou na tarefa ${
      payload.comment?.taskId ?? 'desconhecida'
    }`;

    const metadata = {
      taskId: payload.comment?.taskId ?? null,
      commentId: payload.comment?.id ?? null,
      commentMessage: payload.comment?.message ?? null,
      commentAuthorId: payload.comment?.authorId ?? null,
      commentAuthorName: authorName,
      commentCreatedAt: payload.comment?.createdAt ?? null,
    } satisfies Record<string, unknown>;

    await Promise.all(
      recipients.map((recipientId) =>
        this.notificationsPersistence.createNotification({
          recipientId,
          channel: this.inAppChannel,
          message,
          metadata,
        }),
      ),
    );
  }

  private async persistTaskUpdateNotifications(
    payload: TaskUpdatedForwardPayload,
  ): Promise<void> {
    const recipients = this.normalizeRecipients(payload.recipients);

    if (recipients.length === 0) {
      return;
    }

    const taskId = this.extractTaskId(payload);
    const taskTitle = this.extractTaskTitle(payload);
    const actorDisplayName = this.normalizeText(payload.actor?.displayName);

    const message = `${actorDisplayName ?? 'Sistema'} atualizou a tarefa ${
      taskTitle ?? taskId ?? 'desconhecida'
    }`;

    const metadata = {
      taskId: taskId ?? null,
      taskTitle: taskTitle ?? null,
      actorId: payload.actor?.id ?? null,
      actorDisplayName,
      changes: payload.changes ?? null,
    } satisfies Record<string, unknown>;

    await Promise.all(
      recipients.map((recipientId) =>
        this.notificationsPersistence.createNotification({
          recipientId,
          channel: this.inAppChannel,
          message,
          metadata,
        }),
      ),
    );
  }

  private normalizeRecipients(recipients: string[]): string[] {
    return Array.from(
      new Set(
        (recipients ?? [])
          .filter((recipient) => typeof recipient === 'string')
          .map((recipient) => recipient.trim())
          .filter((recipient) => recipient.length > 0),
      ),
    );
  }

  private normalizeText(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private extractTaskId(payload: TaskUpdatedForwardPayload): string | null {
    if (payload?.task && typeof payload.task === 'object') {
      const rawId = (payload.task as { id?: unknown }).id;
      if (typeof rawId === 'string' && rawId.trim().length > 0) {
        return rawId;
      }
    }

    return null;
  }

  private extractTaskTitle(payload: TaskUpdatedForwardPayload): string | null {
    if (payload?.task && typeof payload.task === 'object') {
      const rawTitle = (payload.task as { title?: unknown }).title;
      if (typeof rawTitle === 'string') {
        const trimmed = rawTitle.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    }

    return null;
  }

}
