import { Inject, Injectable } from '@nestjs/common';
import { RmqContext, RmqRecord, RmqRecordBuilder } from '@nestjs/microservices';
import {
  ListNotificationsPayloadDto,
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
  type NotificationDTO,
  type PaginatedNotifications,
  type TaskCommentCreatedPayload,
  type TaskCreatedForwardPayload,
  type TaskDeletedForwardPayload,
  type TaskUpdatedForwardPayload,
} from '@repo/types';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AppLoggerService, runWithRequestContext } from '@repo/logger';
import type { CorrelatedMessage } from '@repo/types';

const REQUEST_ID_HEADER = 'x-request-id';

import {
  COMMENT_NEW_EVENT,
  NOTIFICATIONS_GATEWAY_CLIENT,
  TASKS_COMMENT_CREATED_PATTERN,
  TASKS_CREATED_PATTERN,
  TASKS_DELETED_PATTERN,
  TASKS_UPDATED_PATTERN,
  TASK_CREATED_EVENT,
  TASK_UPDATED_EVENT,
  TASK_DELETED_EVENT,
} from './notifications.constants';
import {
  NotificationsPersistenceService,
  type FindNotificationsOptions,
} from './notifications/persistence/notifications-persistence.service';
import { transformPayload, toRpcException } from './common/rpc.utils';
import type { Notification } from './notifications/notification.entity';

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

  async findAll(payload: unknown, context: RmqContext): Promise<PaginatedNotifications> {
    try {
      const dto = transformPayload(ListNotificationsPayloadDto, payload ?? {});
      const requestId = this.resolveRequestId(dto, context);
      const filters = this.normalizeListNotificationsPayload(dto);

      const result = await this.withRequestContext(requestId, () =>
        this.notificationsPersistence.findPaginatedByRecipient(filters),
      );

      return {
        data: result.data.map((notification) =>
          this.toNotificationDto(notification),
        ),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    } catch (error) {
      throw toRpcException(error);
    }
  }

  async handleNewComment(
    payload: TaskCommentCreatedPayload,
    context: RmqContext,
  ): Promise<void> {
    const channelRef = context.getChannelRef() as unknown;
    const messageRef = context.getMessage() as unknown;
    const requestId = this.resolveRequestId(payload, context);

    if (
      !isAcknowledgeChannel(channelRef) ||
      !isAcknowledgeMessage(messageRef)
    ) {
      this.logger.error(
        'Received invalid RabbitMQ context while processing comment event.',
        undefined,
        this.buildLogContext({ pattern: TASKS_COMMENT_CREATED_PATTERN }, requestId),
      );
      return;
    }

    const channel = channelRef;
    const originalMessage = messageRef;

    await this.withRequestContext(requestId, async () => {
      try {
        await this.persistCommentNotifications(payload, requestId);
      } catch (error) {
        this.logger.error(
          'Failed to persist notifications for comment.',
          error,
          this.buildLogContext(
            {
              commentId: payload.comment?.id ?? null,
              pattern: TASKS_COMMENT_CREATED_PATTERN,
            },
            requestId,
          ),
        );
        channel.nack(originalMessage, false, true);
        return;
      }

      try {
        const record = this.createGatewayRecord(payload, requestId);
        await firstValueFrom(this.gatewayClient.emit(COMMENT_NEW_EVENT, record));
        channel.ack(originalMessage);
        this.logger.debug('Forwarded comment to gateway.', {
          ...this.buildLogContext({}, requestId),
          commentId: payload.comment?.id ?? null,
          event: COMMENT_NEW_EVENT,
        });
      } catch (error) {
        this.logger.error(
          'Failed to forward comment to gateway.',
          error,
          this.buildLogContext(
            {
              commentId: payload.comment?.id ?? null,
              event: COMMENT_NEW_EVENT,
            },
            requestId,
          ),
        );
        channel.nack(originalMessage, false, true);
      }
    });
  }

  async handleTaskUpdated(
    payload: TaskUpdatedForwardPayload,
    context: RmqContext,
  ): Promise<void> {
    await this.handleTaskEvent(payload, context, {
      pattern: TASKS_UPDATED_PATTERN,
      persist: (data, requestId) =>
        this.persistTaskUpdateNotifications(data, requestId),
      persistErrorMessage: 'Failed to persist notifications for task update.',
      forwardEvent: TASK_UPDATED_EVENT,
      forwardSuccessMessage: 'Forwarded task update to gateway.',
      forwardErrorMessage: 'Failed to forward task update to gateway.',
    });
  }

  async handleTaskCreated(
    payload: TaskCreatedForwardPayload,
    context: RmqContext,
  ): Promise<void> {
    await this.handleTaskEvent(payload, context, {
      pattern: TASKS_CREATED_PATTERN,
      persist: (data, requestId) =>
        this.persistTaskCreatedNotifications(data, requestId),
      persistErrorMessage: 'Failed to persist notifications for task creation.',
      forwardEvent: TASK_CREATED_EVENT,
      forwardSuccessMessage: 'Forwarded task creation to gateway.',
      forwardErrorMessage: 'Failed to forward task creation to gateway.',
    });
  }

  async handleTaskDeleted(
    payload: TaskDeletedForwardPayload,
    context: RmqContext,
  ): Promise<void> {
    await this.handleTaskEvent(payload, context, {
      pattern: TASKS_DELETED_PATTERN,
      persist: (data, requestId) =>
        this.persistTaskDeletedNotifications(data, requestId),
      persistErrorMessage: 'Failed to persist notifications for task deletion.',
      forwardEvent: TASK_DELETED_EVENT,
      forwardSuccessMessage: 'Forwarded task deletion to gateway.',
      forwardErrorMessage: 'Failed to forward task deletion to gateway.',
    });
  }

  private async handleTaskEvent<TPayload extends TaskUpdatedForwardPayload>(
    payload: TPayload,
    context: RmqContext,
    options: {
      pattern: string;
      persist: (payload: TPayload, requestId?: string) => Promise<void>;
      persistErrorMessage: string;
      forwardEvent: string;
      forwardSuccessMessage: string;
      forwardErrorMessage: string;
    },
  ): Promise<void> {
    const channelRef = context.getChannelRef() as unknown;
    const messageRef = context.getMessage() as unknown;
    const requestId = this.resolveRequestId(payload, context);

    if (
      !isAcknowledgeChannel(channelRef) ||
      !isAcknowledgeMessage(messageRef)
    ) {
      this.logger.error(
        'Received invalid RabbitMQ context while processing task event.',
        undefined,
        this.buildLogContext({ pattern: options.pattern }, requestId),
      );
      return;
    }

    const channel = channelRef;
    const originalMessage = messageRef;
    const taskId = this.extractTaskId(payload);

    await this.withRequestContext(requestId, async () => {
      try {
        await options.persist(payload, requestId);
      } catch (error) {
        this.logger.error(
          options.persistErrorMessage,
          error,
          this.buildLogContext(
            { pattern: options.pattern, taskId },
            requestId,
          ),
        );
        channel.nack(originalMessage, false, true);
        return;
      }

      try {
        const record = this.createGatewayRecord(payload, requestId);
        await firstValueFrom(
          this.gatewayClient.emit(options.forwardEvent, record),
        );
        channel.ack(originalMessage);
        this.logger.debug(options.forwardSuccessMessage, {
          ...this.buildLogContext(
            { pattern: options.pattern, taskId, event: options.forwardEvent },
            requestId,
          ),
        });
      } catch (error) {
        this.logger.error(
          options.forwardErrorMessage,
          error,
          this.buildLogContext(
            { pattern: options.pattern, taskId, event: options.forwardEvent },
            requestId,
          ),
        );
        channel.nack(originalMessage, false, true);
      }
    });
  }

  private async persistCommentNotifications(
    payload: TaskCommentCreatedPayload,
    requestId?: string,
  ): Promise<void> {
    const recipients = this.resolveCommentRecipients(payload);

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

    const persistedNotifications = await Promise.all(
      recipients.map((recipientId) =>
        this.notificationsPersistence.createNotification({
          recipientId,
          channel: this.inAppChannel,
          message,
          metadata,
        }),
      ),
    );

    this.logger.debug(
      'Persisted comment notifications in storage.',
      this.buildLogContext(
        {
          pattern: TASKS_COMMENT_CREATED_PATTERN,
          commentId: payload.comment?.id ?? null,
          recipientsCount: recipients.length,
          notificationIds: this.extractNotificationIds(persistedNotifications),
        },
        requestId,
      ),
    );
  }

  private async persistTaskUpdateNotifications(
    payload: TaskUpdatedForwardPayload,
    requestId?: string,
  ): Promise<void> {
    const recipients = this.resolveTaskRecipients(payload);

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

    const persistedNotifications = await Promise.all(
      recipients.map((recipientId) =>
        this.notificationsPersistence.createNotification({
          recipientId,
          channel: this.inAppChannel,
          message,
          metadata,
        }),
      ),
    );

    this.logger.debug(
      'Persisted task update notifications in storage.',
      this.buildLogContext(
        {
          pattern: TASKS_UPDATED_PATTERN,
          taskId,
          recipientsCount: recipients.length,
          notificationIds: this.extractNotificationIds(persistedNotifications),
        },
        requestId,
      ),
    );
  }

  private async persistTaskCreatedNotifications(
    payload: TaskCreatedForwardPayload,
    requestId?: string,
  ): Promise<void> {
    const recipients = this.resolveTaskRecipients(payload);

    if (recipients.length === 0) {
      return;
    }

    const taskId = this.extractTaskId(payload);
    const taskTitle = this.extractTaskTitle(payload);
    const actorDisplayName = this.normalizeText(payload.actor?.displayName);

    const message = `${actorDisplayName ?? 'Sistema'} criou a tarefa ${
      taskTitle ?? taskId ?? 'desconhecida'
    }`;

    const metadata = {
      taskId: taskId ?? null,
      taskTitle: taskTitle ?? null,
      actorId: payload.actor?.id ?? null,
      actorDisplayName,
      changes: payload.changes ?? null,
    } satisfies Record<string, unknown>;

    const persistedNotifications = await Promise.all(
      recipients.map((recipientId) =>
        this.notificationsPersistence.createNotification({
          recipientId,
          channel: this.inAppChannel,
          message,
          metadata,
        }),
      ),
    );

    this.logger.debug(
      'Persisted task creation notifications in storage.',
      this.buildLogContext(
        {
          pattern: TASKS_CREATED_PATTERN,
          taskId,
          recipientsCount: recipients.length,
          notificationIds: this.extractNotificationIds(persistedNotifications),
        },
        requestId,
      ),
    );
  }

  private async persistTaskDeletedNotifications(
    payload: TaskDeletedForwardPayload,
    requestId?: string,
  ): Promise<void> {
    const recipients = this.resolveTaskRecipients(payload);

    if (recipients.length === 0) {
      return;
    }

    const taskId = this.extractTaskId(payload);
    const taskTitle = this.extractTaskTitle(payload);
    const actorDisplayName = this.normalizeText(payload.actor?.displayName);

    const message = `${actorDisplayName ?? 'Sistema'} removeu a tarefa ${
      taskTitle ?? taskId ?? 'desconhecida'
    }`;

    const metadata = {
      taskId: taskId ?? null,
      taskTitle: taskTitle ?? null,
      actorId: payload.actor?.id ?? null,
      actorDisplayName,
      changes: payload.changes ?? null,
    } satisfies Record<string, unknown>;

    const persistedNotifications = await Promise.all(
      recipients.map((recipientId) =>
        this.notificationsPersistence.createNotification({
          recipientId,
          channel: this.inAppChannel,
          message,
          metadata,
        }),
      ),
    );

    this.logger.debug(
      'Persisted task deletion notifications in storage.',
      this.buildLogContext(
        {
          pattern: TASKS_DELETED_PATTERN,
          taskId,
          recipientsCount: recipients.length,
          notificationIds: this.extractNotificationIds(persistedNotifications),
        },
        requestId,
      ),
    );
  }

  private normalizeListNotificationsPayload(
    dto: ListNotificationsPayloadDto,
  ): FindNotificationsOptions {
    const page = dto.page && dto.page > 0 ? dto.page : 1;
    const limit = dto.limit && dto.limit > 0 ? dto.limit : 10;

    return {
      recipientId: dto.recipientId,
      status: dto.status,
      channel: dto.channel,
      search: this.normalizeSearch(dto.search),
      from: this.normalizeDate(dto.from),
      to: this.normalizeDate(dto.to),
      taskId: dto.taskId,
      page,
      limit,
    } satisfies FindNotificationsOptions;
  }

  private normalizeSearch(search?: string): string | undefined {
    if (typeof search !== 'string') {
      return undefined;
    }

    const trimmed = search.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }

  private normalizeDate(value?: string): Date | undefined {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return undefined;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private toNotificationDto(notification: Notification): NotificationDTO {
    return {
      id: notification.id,
      recipientId: notification.recipientId,
      channel: notification.channel,
      status: notification.status,
      message: notification.message,
      metadata: notification.metadata ?? null,
      createdAt: notification.createdAt.toISOString(),
      sentAt: notification.sentAt ? notification.sentAt.toISOString() : null,
    } satisfies NotificationDTO;
  }

  private extractNotificationIds(
    notifications: Array<{ id?: string | null }>,
  ): string[] {
    return notifications
      .map((notification) =>
        typeof notification?.id === 'string' ? notification.id : null,
      )
      .filter((id): id is string => !!id && id.trim().length > 0);
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

  private async withRequestContext<T>(
    requestId: string | undefined,
    handler: () => Promise<T>,
  ): Promise<T> {
    if (!requestId) {
      return handler();
    }

    return runWithRequestContext({ requestId }, handler);
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

  private createGatewayRecord<TPayload extends object>(
    payload: TPayload,
    requestId?: string,
  ): RmqRecord<TPayload> {
    const { correlatedPayload, resolvedRequestId } = this.withRequestId(
      payload,
      requestId,
    );

    const builder = new RmqRecordBuilder<TPayload>(correlatedPayload);

    if (resolvedRequestId) {
      builder.setOptions({
        headers: {
          [REQUEST_ID_HEADER]: resolvedRequestId,
        },
      });
    }

    return builder.build();
  }

  private withRequestId<TPayload extends object>(
    payload: TPayload,
    explicitRequestId?: string,
  ): {
    correlatedPayload: CorrelatedMessage<TPayload>;
    resolvedRequestId?: string;
  } {
    const payloadRequestId = this.extractRequestIdFromPayload(payload);
    const requestId = payloadRequestId ?? explicitRequestId;

    if (!requestId) {
      return {
        correlatedPayload: payload as CorrelatedMessage<TPayload>,
      };
    }

    if (payloadRequestId === requestId) {
      return {
        correlatedPayload: payload as CorrelatedMessage<TPayload>,
        resolvedRequestId: requestId,
      };
    }

    return {
      correlatedPayload: {
        ...payload,
        requestId,
      } satisfies CorrelatedMessage<TPayload>,
      resolvedRequestId: requestId,
    };
  }

  private resolveCommentRecipients(
    payload: TaskCommentCreatedPayload,
  ): string[] {
    const normalizedRecipients = this.normalizeRecipients(
      payload?.recipients ?? undefined,
    );
    const recipients = new Set(normalizedRecipients);

    if (recipients.size === 0) {
      const authorId = this.extractIdentifier(payload?.comment?.authorId);
      if (authorId) {
        recipients.add(authorId);
      }

      const taskRecipients = this.extractTaskRecipients(
        (payload as { task?: unknown }).task,
      );

      for (const recipient of taskRecipients) {
        recipients.add(recipient);
      }
    }

    const authorId = this.extractIdentifier(payload?.comment?.authorId);
    if (authorId) {
      recipients.delete(authorId);
    }

    return Array.from(recipients);
  }

  private resolveTaskRecipients(
    payload: TaskUpdatedForwardPayload,
  ): string[] {
    const recipients = new Set(
      this.normalizeRecipients(payload?.recipients ?? undefined),
    );

    const taskRecipients = this.extractTaskRecipients(payload?.task);
    for (const recipient of taskRecipients) {
      recipients.add(recipient);
    }

    const actorId =
      this.extractIdentifier(payload?.actor?.id) ??
      this.extractIdentifier((payload as { actorId?: unknown }).actorId);

    if (actorId) {
      recipients.delete(actorId);
    }

    return Array.from(recipients);
  }

  private normalizeRecipients(recipients: unknown): string[] {
    const normalized = new Set<string>();

    const visit = (value: unknown, depth = 0): void => {
      if (value === undefined || value === null) {
        return;
      }

      if (depth > 5) {
        return;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          normalized.add(trimmed);
        }
        return;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          visit(item, depth + 1);
        }
        return;
      }

      if (typeof value !== 'object') {
        return;
      }

      const record = value as Record<string, unknown>;

      const directKeys = ['id', 'userId', 'recipientId'];
      for (const key of directKeys) {
        const candidate = record[key];
        if (typeof candidate === 'string') {
          const trimmed = candidate.trim();
          if (trimmed.length > 0) {
            normalized.add(trimmed);
          }
        }
      }

      const arrayKeys = ['ids', 'values', 'list'];
      for (const key of arrayKeys) {
        const candidate = record[key];
        if (candidate !== undefined) {
          visit(candidate, depth + 1);
        }
      }

      const nestedKeys = [
        'user',
        'account',
        'profile',
        'member',
        'assignee',
        'responsible',
        'target',
      ];
      for (const key of nestedKeys) {
        const candidate = record[key];
        if (candidate !== undefined) {
          visit(candidate, depth + 1);
        }
      }
    };

    visit(recipients);

    return Array.from(normalized);
  }

  private extractIdentifier(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private extractTaskRecipients(task: unknown): string[] {
    if (!task || typeof task !== 'object') {
      return [];
    }

    const record = task as Record<string, unknown>;
    const recipients = new Set<string>();

    const candidateKeys = [
      'assignees',
      'assigneeIds',
      'responsibles',
      'responsibleIds',
      'owners',
      'ownerIds',
      'participants',
      'participantIds',
      'followers',
      'followerIds',
      'watchers',
      'watcherIds',
    ];

    for (const key of candidateKeys) {
      const value = record[key];
      if (value === undefined) {
        continue;
      }

      for (const recipient of this.normalizeRecipients(value)) {
        recipients.add(recipient);
      }
    }

    return Array.from(recipients);
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
