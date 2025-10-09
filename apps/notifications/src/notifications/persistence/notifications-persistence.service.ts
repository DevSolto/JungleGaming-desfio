import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  NotificationCreateDTO,
  NotificationStatusUpdateDTO,
} from '@repo/types';
import { NOTIFICATION_STATUSES } from '@repo/types';
import { Repository } from 'typeorm';

import { Notification } from '../notification.entity';

@Injectable()
export class NotificationsPersistenceService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

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

    return this.notificationsRepository.save(notification);
  }

  async updateNotificationStatus(
    id: string,
    update: NotificationStatusUpdateDTO,
  ): Promise<Notification | null> {
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

    return this.notificationsRepository.save(notification);
  }

  async findByRecipient(
    recipientId: string,
  ): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: { recipientId },
      order: { createdAt: 'DESC' },
    });
  }
}
