import { z } from 'zod'

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use the YYYY-MM-DD format.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, 'Invalid date.')

export const reportQuerySchema = z
  .object({
    dari: isoDate.optional(),
    sampai: isoDate.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.dari || !value.sampai) return
    const dari = new Date(`${value.dari}T00:00:00Z`).getTime()
    const sampai = new Date(`${value.sampai}T00:00:00Z`).getTime()
    if (dari > sampai) {
      ctx.addIssue({ code: 'custom', path: ['dari'], message: 'Start date must be before end date.' })
    }
    if (sampai - dari > 366 * 86_400_000) {
      ctx.addIssue({ code: 'custom', path: ['sampai'], message: 'Report range can be at most 366 days.' })
    }
  })

export type ReportQueryInput = z.input<typeof reportQuerySchema>
