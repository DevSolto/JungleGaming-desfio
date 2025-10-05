import { z } from 'zod'

export const notificationSchema = z.object({
  id: z.string(),
  recipientId: z.string(),
  channel: z.string(),
  status: z.string(),
  message: z.string(),
  metadata: z.record(z.unknown()).nullish(),
  createdAt: z.string(),
  sentAt: z.string().nullish(),
})

export type NotificationSchema = z.infer<typeof notificationSchema>
