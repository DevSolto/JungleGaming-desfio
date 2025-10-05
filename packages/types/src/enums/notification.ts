export const NOTIFICATION_CHANNELS = [
  "email",
  "sms",
  "push",
  "in_app",
] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = [
  "pending",
  "sent",
  "failed",
] as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];
