import {
  COMMENT_AUTHOR_NAME_MAX_LENGTH,
  COMMENT_MESSAGE_MAX_LENGTH,
} from '@repo/types'
import { z } from 'zod'

export const commentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  authorId: z.string(),
  authorName: z
    .string()
    .min(1)
    .max(COMMENT_AUTHOR_NAME_MAX_LENGTH)
    .nullish(),
  message: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const commentFormSchema = z.object({
  message: z
    .string()
    .min(1, 'Digite um comentário')
    .max(
      COMMENT_MESSAGE_MAX_LENGTH,
      `O comentário deve ter no máximo ${COMMENT_MESSAGE_MAX_LENGTH} caracteres`,
    ),
})

export type CommentSchema = z.infer<typeof commentSchema>
export type CommentFormSchema = z.infer<typeof commentFormSchema>
