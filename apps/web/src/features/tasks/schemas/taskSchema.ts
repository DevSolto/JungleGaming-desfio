import { TaskPriority, TaskStatus } from '@repo/types'
import { z } from 'zod'

export const taskStatusSchema = z.nativeEnum(TaskStatus)
export const taskPrioritySchema = z.nativeEnum(TaskPriority)

export const taskAssigneeSchema = z.object({
  id: z.string(),
  username: z.string(),
})

export const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().nullish(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  dueDate: z.string().nullish(),
  assignees: z.array(taskAssigneeSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullish(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  dueDate: z.string().nullish(),
  assignees: z.array(taskAssigneeSchema),
})

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
})

export type TaskSchema = z.infer<typeof taskSchema>
export type CreateTaskSchema = z.infer<typeof createTaskSchema>
export type UpdateTaskSchema = z.infer<typeof updateTaskSchema>
