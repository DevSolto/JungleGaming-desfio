import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  NotificationCreateDTO,
  NotificationStatusUpdateDTO,
} from '@repo/types';
import { NOTIFICATION_STATUSES } from '@repo/types';
import { Repository } from 'typeorm';

import { Notification } from '../notification.entity';
import { AppLoggerService } from '@repo/logger';

@Injectable()
export class NotificationsPersistenceService {
  private readonly logger: AppLoggerService;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    appLogger: AppLoggerService,
  ) {
    this.logger = appLogger.withContext({
      context: NotificationsPersistenceService.name,
    });
  }

  async createNotification(
    payload: NotificationCreateDTO,
  ): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      recipientId: payload.recipientId,
      channel: payload.channel,
      message: payload.message,
      metadata: payload.metadata ?? null,
      status: payload.status ?? NOTIFICATION_STATUSES[0],
      sentAt:
        typeof payload.sentAt === 'string' ? new Date(payload.sentAt) : null,
    });

    try {
      const saved = await this.notificationsRepository.save(notification);

      this.logger.debug('Notification persisted in database.', {
        notificationId: saved.id,
        recipientId: saved.recipientId,
        channel: saved.channel,
        status: saved.status,
      });

      return saved;
    } catch (error) {
      this.logger.error(
        'Failed to persist notification in database.',
        error,
        {
          recipientId: payload.recipientId,
          channel: payload.channel,
        },
      );

      throw error;
    }
  }

  async updateNotificationStatus(
    id: string,
    update: NotificationStatusUpdateDTO,
  ): Promise<Notification | null> {
    try {
      const notification = await this.notificationsRepository.findOne({
        where: { id },
      });

      if (!notification) {
        return null;
      }

      notification.status = update.status;

      if (Object.prototype.hasOwnProperty.call(update, 'sentAt')) {
        notification.sentAt =
          typeof update.sentAt === 'string' && update.sentAt
            ? new Date(update.sentAt)
            : null;
      }

      const saved = await this.notificationsRepository.save(notification);

      this.logger.debug('Notification status updated.', {
        notificationId: saved.id,
        status: saved.status,
        sentAt: saved.sentAt?.toISOString() ?? null,
      });

      return saved;
    } catch (error) {
      this.logger.error(
        'Failed to update notification status in database.',
        error,
        {
          notificationId: id,
          status: update.status,
        },
      );

      throw error;
    }
  }

  async findByRecipient(
    recipientId: string,
  ): Promise<Notification[]> {
    try {
      const notifications = await this.notificationsRepository.find({
        where: { recipientId },
        order: { createdAt: 'DESC' },
      });

      this.logger.debug('Retrieved notifications by recipient.', {
        recipientId,
        notificationCount: notifications.length,
      });

      return notifications;
    } catch (error) {
      this.logger.error(
        'Failed to retrieve notifications by recipient from database.',
        error,
        { recipientId },
      );

      throw error;
    }
  }
}
