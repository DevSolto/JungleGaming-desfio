import type { NotificationChannel, NotificationStatus } from "../enums/notification.js";
export interface NotificationCreateDTO {
    recipientId: string;
    channel: NotificationChannel;
    message: string;
    metadata?: Record<string, unknown> | null;
    status?: NotificationStatus;
    sentAt?: string | null;
}
export interface NotificationStatusUpdateDTO {
    status: NotificationStatus;
    sentAt?: string | null;
}
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
//# sourceMappingURL=notification.d.ts.map