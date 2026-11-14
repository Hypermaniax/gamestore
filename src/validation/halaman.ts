import { z } from 'zod'

export const pageCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{2,50}$/, 'Invalid page code.')

export const pageCodeInputSchema = z.object({ code: pageCodeSchema })

export const pageUpdateSchema = z.object({
  code: pageCodeSchema,
  title: z.string().trim().min(1, 'Title is required.').max(200),
  bodyMarkdown: z.string().trim().min(1, 'Page content is required.').max(100_000),
})

export const pageVersionSchema = z.object({
  code: pageCodeSchema,
  version: z.coerce.number().int().min(1),
})

export type PageUpdateInput = z.input<typeof pageUpdateSchema>
export type PageVersionInput = z.input<typeof pageVersionSchema>
