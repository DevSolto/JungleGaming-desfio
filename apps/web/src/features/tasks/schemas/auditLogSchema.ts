import { z } from 'zod'

export const taskAuditLogActorSchema = z.object({
  id: z.string(),
  displayName: z.string().nullish(),
})

export const taskAuditLogChangeSchema = z.object({
  field: z.string(),
  previousValue: z.unknown().optional(),
  currentValue: z.unknown().optional(),
})

export const taskAuditLogSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  action: z.string(),
  actorId: z.string().nullish(),
  actorDisplayName: z.string().nullish(),
  actor: taskAuditLogActorSchema.nullish(),
  changes: z.array(taskAuditLogChangeSchema).nullish(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
  createdAt: z.string(),
})

export type TaskAuditLogSchema = z.infer<typeof taskAuditLogSchema>
