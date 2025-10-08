import type { NotificationChannel, NotificationStatus } from "../enums/notification.js";
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
export type Notification = NotificationDTO;
