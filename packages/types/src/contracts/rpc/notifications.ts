import type { NotificationListFiltersDTO } from "../../dto/notification.js";

export const NOTIFICATIONS_MESSAGE_PATTERNS = {
  FIND_ALL: "notifications.findAll",
  MARK_AS_READ: "notifications.markAsRead",
  MARK_MANY_AS_READ: "notifications.markManyAsRead",
} as const;

export type NotificationsMessagePatterns = typeof NOTIFICATIONS_MESSAGE_PATTERNS;
export type NotificationsMessagePattern =
  NotificationsMessagePatterns[keyof NotificationsMessagePatterns];

export interface NotificationsFindAllPayload extends NotificationListFiltersDTO {
  recipientId: string;
}

export interface NotificationsMarkAsReadPayload {
  notificationId: string;
  recipientId: string;
}

export interface NotificationsMarkManyAsReadPayload {
  notificationIds?: string[];
  before?: string;
  recipientId: string;
}

export type NotificationsMessagePayload =
  | NotificationsFindAllPayload
  | NotificationsMarkAsReadPayload
  | NotificationsMarkManyAsReadPayload;
