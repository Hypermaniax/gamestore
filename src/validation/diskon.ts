// Promo & voucher action contracts.

import { z } from 'zod'
import { bigintIdSchema, requiredStringSchema } from './common'

const discountValueSchema = z
  .union([
    z.string().trim().regex(/^\d{1,14}(\.\d{1,2})?$/, 'Invalid discount value.'),
    z.number().positive().max(99_999_999_999_999, 'Discount value is too large.'),
  ])
  .transform((value) => String(value))

export const rupiahSchema = z
  .union([
    z.string().trim().regex(/^\d{1,14}$/, 'Amount must be a positive whole number.'),
    z.number().int().positive().max(99_999_999_999_999, 'Amount is too large.'),
  ])
  .transform((value) => BigInt(value))

export const voucherCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{3,50}$/, 'Voucher code must be 3–50 characters: letters, numbers, hyphens.')

const discountTypeSchema = z.enum(['PERSEN', 'NOMINAL'])
const discountScopeSchema = z.enum(['AKUN', 'GAME', 'SEMUA'])

const discountBase = {
  type: discountTypeSchema,
  value: discountValueSchema,
  maxDiscount: rupiahSchema.nullable().optional(),
}

export const promotionCreateSchema = z.object({
  name: requiredStringSchema('Promo name is required.').max(100),
  ...discountBase,
  scope: discountScopeSchema,
  targetId: bigintIdSchema.nullable().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  active: z.boolean().default(true),
})

export const promotionUpdateSchema = z.object({
  id: bigintIdSchema,
  name: requiredStringSchema('Promo name is required.').max(100).optional(),
  type: discountTypeSchema.optional(),
  value: discountValueSchema.optional(),
  maxDiscount: rupiahSchema.nullable().optional(),
  scope: discountScopeSchema.optional(),
  targetId: bigintIdSchema.nullable().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  active: z.boolean().optional(),
})

export const promotionIdSchema = z.object({ id: bigintIdSchema })

export const voucherCreateSchema = z.object({
  code: voucherCodeSchema,
  type: discountTypeSchema,
  value: discountValueSchema,
  quota: z.coerce.number().int().min(0).max(1_000_000),
  minPurchase: rupiahSchema.nullable().optional(),
  maxDiscount: rupiahSchema.nullable().optional(),
  validUntil: z.coerce.date(),
  active: z.boolean().default(true),
})

export const voucherUpdateSchema = z.object({
  id: bigintIdSchema,
  code: voucherCodeSchema.optional(),
  type: discountTypeSchema.optional(),
  value: discountValueSchema.optional(),
  quota: z.coerce.number().int().min(0).max(1_000_000).optional(),
  minPurchase: rupiahSchema.nullable().optional(),
  maxDiscount: rupiahSchema.nullable().optional(),
  validUntil: z.coerce.date().optional(),
  active: z.boolean().optional(),
})

export const voucherIdSchema = z.object({ id: bigintIdSchema })

export const discountListSchema = z.object({
  q: z.string().trim().max(100).optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
})

export const voucherPreviewSchema = z.object({
  accountId: bigintIdSchema,
  code: voucherCodeSchema.optional(),
  kodeVoucher: voucherCodeSchema.optional(),
})

export const voucherConsumeSchema = z.object({
  voucherId: bigintIdSchema,
  userId: bigintIdSchema,
  transactionId: bigintIdSchema.nullable().optional(),
})

export type PromotionCreateInput = z.input<typeof promotionCreateSchema>
export type PromotionUpdateInput = z.input<typeof promotionUpdateSchema>
export type VoucherCreateInput = z.input<typeof voucherCreateSchema>
export type VoucherUpdateInput = z.input<typeof voucherUpdateSchema>
export type DiscountListInput = z.input<typeof discountListSchema>
export type VoucherPreviewInput = z.input<typeof voucherPreviewSchema>
export type VoucherConsumeInput = z.input<typeof voucherConsumeSchema>
