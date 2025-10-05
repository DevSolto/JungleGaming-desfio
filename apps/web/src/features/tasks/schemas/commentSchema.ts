import { z } from 'zod'

export const commentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  authorId: z.string(),
  message: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type CommentSchema = z.infer<typeof commentSchema>
