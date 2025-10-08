export declare const NOTIFICATION_CHANNELS: readonly ["email", "sms", "push", "in_app"];
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export declare const NOTIFICATION_STATUSES: readonly ["pending", "sent", "failed"];
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];
