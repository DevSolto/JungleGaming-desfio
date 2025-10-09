import type { NotificationChannel, NotificationStatus } from "../enums/notification.js";
import type { NotificationsFindAllPayload } from "../contracts/rpc/notifications.js";
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
export interface NotificationListFiltersDTO {
    status?: NotificationStatus;
    channel?: NotificationChannel;
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    taskId?: string;
}
export type NotificationListFilters = NotificationListFiltersDTO;
export interface PaginatedNotificationsDTO {
    data: NotificationDTO[];
    total: number;
    page: number;
    limit: number;
}
export type PaginatedNotifications = PaginatedNotificationsDTO;
export declare class NotificationIdParamDto {
    id: string;
}
export declare class NotificationListFiltersDto implements NotificationListFiltersDTO {
    status?: NotificationStatus;
    channel?: NotificationChannel;
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    taskId?: string;
}
export declare class ListNotificationsQueryDto extends NotificationListFiltersDto implements NotificationListFiltersDTO {
}
export declare class NotificationStatusUpdateDto implements NotificationStatusUpdateDTO {
    status: NotificationStatus;
    sentAt?: string | null;
}
export declare class ListNotificationsPayloadDto extends NotificationListFiltersDto implements NotificationsFindAllPayload {
    recipientId: string;
    requestId?: string | null;
}
