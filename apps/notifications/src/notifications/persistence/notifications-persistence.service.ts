import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  NotificationCreateDTO,
  NotificationStatusUpdateDTO,
  NotificationStatus,
  NotificationChannel,
} from '@repo/types';
import { NOTIFICATION_STATUSES } from '@repo/types';
import { Repository } from 'typeorm';

import { Notification } from '../notification.entity';
import { AppLoggerService } from '@repo/logger';

export interface FindNotificationsOptions {
  recipientId: string;
  status?: NotificationStatus;
  channel?: NotificationChannel;
  search?: string;
  from?: Date;
  to?: Date;
  taskId?: string;
  page: number;
  limit: number;
}

export interface PaginatedNotificationEntities {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
}

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

  async findPaginatedByRecipient(
    options: FindNotificationsOptions,
  ): Promise<PaginatedNotificationEntities> {
    const page = options.page > 0 ? options.page : 1;
    const limit = options.limit > 0 ? options.limit : 10;

    try {
      const query = this.notificationsRepository
        .createQueryBuilder('notification')
        .where('notification.recipientId = :recipientId', {
          recipientId: options.recipientId,
        })
        .orderBy('notification.createdAt', 'DESC');

      if (options.status) {
        query.andWhere('notification.status = :status', {
          status: options.status,
        });
      }

      if (options.channel) {
        query.andWhere('notification.channel = :channel', {
          channel: options.channel,
        });
      }

      if (options.search) {
        const trimmed = options.search.trim();

        if (trimmed.length > 0) {
          const sanitized = trimmed
            .replace(/%/g, '\\%')
            .replace(/_/g, '\\_');
          const likeSearch = `%${sanitized}%`;
          query.andWhere('notification.message ILIKE :search', {
            search: likeSearch,
          });
        }
      }

      if (options.from) {
        query.andWhere('notification.createdAt >= :from', {
          from: options.from,
        });
      }

      if (options.to) {
        query.andWhere('notification.createdAt <= :to', {
          to: options.to,
        });
      }

      if (options.taskId) {
        query.andWhere("notification.metadata ->> 'taskId' = :taskId", {
          taskId: options.taskId,
        });
      }

      const [data, total] = await query
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      this.logger.debug('Retrieved paginated notifications for recipient.', {
        recipientId: options.recipientId,
        notificationCount: data.length,
        total,
        page,
        limit,
      });

      return {
        data,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(
        'Failed to retrieve paginated notifications from database.',
        error,
        {
          recipientId: options.recipientId,
          status: options.status ?? null,
          channel: options.channel ?? null,
          taskId: options.taskId ?? null,
        },
      );

      throw error;
    }
  }
}
