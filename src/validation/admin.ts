// Admin action contracts — user management, TOTP reset, audit reader.

import { z } from 'zod'
import { bigintIdSchema, requiredStringSchema } from './common'

export const userListSchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
})

export const changeUserRoleSchema = z.object({
  userId: bigintIdSchema,
  roleKode: requiredStringSchema('Role is required.').toUpperCase(),
})

export const setUserActiveSchema = z.object({
  userId: bigintIdSchema,
  active: z.boolean(),
})

export const resetUserTotpSchema = z.object({
  userId: bigintIdSchema,
  password: requiredStringSchema('Admin password is required.'),
})

export const auditListSchema = z.object({
  action: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
})

export const webhookListSchema = z.object({
  status: z.enum(['DITERIMA', 'DIPROSES', 'GAGAL']).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
})

export type UserListInput = z.input<typeof userListSchema>
export type ChangeUserRoleInput = z.input<typeof changeUserRoleSchema>
export type SetUserActiveInput = z.input<typeof setUserActiveSchema>
export type ResetUserTotpInput = z.input<typeof resetUserTotpSchema>
export type AuditListInput = z.input<typeof auditListSchema>
export type WebhookListInput = z.input<typeof webhookListSchema>

export const forceLogoutSchema = z.object({
  userId: bigintIdSchema,
})
