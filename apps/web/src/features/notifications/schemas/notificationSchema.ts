import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES } from '@repo/types'
import { z } from 'zod'

const channelValues = [...NOTIFICATION_CHANNELS] as [
  (typeof NOTIFICATION_CHANNELS)[number],
  ...(typeof NOTIFICATION_CHANNELS)[number][],
]

const statusValues = [...NOTIFICATION_STATUSES] as [
  (typeof NOTIFICATION_STATUSES)[number],
  ...(typeof NOTIFICATION_STATUSES)[number][],
]

export const notificationSchema = z.object({
  id: z.string(),
  recipientId: z.string(),
  channel: z.enum(channelValues),
  status: z.enum(statusValues),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
  createdAt: z.string(),
  sentAt: z.string().nullish(),
})

export type NotificationSchema = z.infer<typeof notificationSchema>
