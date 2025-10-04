import { Injectable } from '@nestjs/common';
import type { NotificationDTO } from '@contracts';
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
} from '@contracts';

@Injectable()
export class AppService {
  getSampleNotification(): NotificationDTO {
    return {
      id: 'notification-demo',
      recipientId: 'player-1',
      channel: NOTIFICATION_CHANNELS[3],
      status: NOTIFICATION_STATUSES[0],
      message: 'Contracts package synced successfully.',
      metadata: { source: 'contracts-demo' },
      createdAt: new Date().toISOString(),
    };
  }
}
