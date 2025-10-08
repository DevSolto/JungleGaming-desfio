import { z } from 'zod'

const paginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  size: z.number(),
  totalPages: z.number(),
})

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    data: z.array(schema),
    meta: paginationMetaSchema,
  })

export type PaginationMetaSchema = z.infer<typeof paginationMetaSchema>
