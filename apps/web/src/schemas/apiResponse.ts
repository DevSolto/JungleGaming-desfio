import { z } from 'zod'

export const apiResponseSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    data: schema,
  })
