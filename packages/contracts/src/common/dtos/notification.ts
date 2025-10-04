export const NOTIFICATION_CHANNELS = ['email', 'sms', 'push', 'in_app'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ['pending', 'sent', 'failed'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export interface NotificationDTO {
  id: string;
  recipientId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  message: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  sentAt?: string | null;
}
