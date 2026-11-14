// Checkout, transaction lifecycle, store settings, and webhook contracts.

import { z } from 'zod'
import { bigintIdSchema, requiredStringSchema } from './common'
import { voucherCodeSchema, rupiahSchema } from './diskon'
import { VA_BANKS } from '../lib/pembayaran/metode'

export const checkoutSchema = z
  .object({
    accountId: bigintIdSchema,
    kodeVoucher: voucherCodeSchema.optional(),
    method: z.enum(['QRIS', 'VA']),
    bank: z.enum(VA_BANKS).optional(),
    termsVersion: z.coerce.number().int().positive(),
    totalPratinjau: rupiahSchema,
    kunciIdempoten: z
      .string()
      .trim()
      .min(8, 'Invalid idempotency key.')
      .max(120, 'Idempotency key is too long.'),
  })
  .superRefine((value, ctx) => {
    if (value.method === 'VA' && !value.bank) {
      ctx.addIssue({ code: 'custom', path: ['bank'], message: 'Bank is required for VA.' })
    }
    if (value.method === 'QRIS' && value.bank) {
      ctx.addIssue({ code: 'custom', path: ['bank'], message: 'QRIS does not use a bank.' })
    }
  })

export const checkoutSlugSchema = z.object({
  slug: requiredStringSchema('Account is required.').max(120),
})

export const changeMethodSchema = z
  .object({
    code: requiredStringSchema('Transaction code is required.').max(50),
    method: z.enum(['QRIS', 'VA']),
    bank: z.enum(VA_BANKS).optional(),
    kunciIdempoten: z
      .string()
      .trim()
      .min(8, 'Invalid idempotency key.')
      .max(120, 'Idempotency key is too long.'),
  })
  .superRefine((value, ctx) => {
    if (value.method === 'VA' && !value.bank) {
      ctx.addIssue({ code: 'custom', path: ['bank'], message: 'Bank is required for VA.' })
    }
    if (value.method === 'QRIS' && value.bank) {
      ctx.addIssue({ code: 'custom', path: ['bank'], message: 'QRIS does not use a bank.' })
    }
  })

export const transactionCodeSchema = z.object({
  code: requiredStringSchema('Transaction code is required.').max(50),
})

export const transactionListSchema = z.object({
  status: z.string().trim().max(20).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  size: z.coerce.number().int().min(1).max(50).default(20),
})

export const transactionStatusSchema = z.object({
  code: requiredStringSchema('Transaction code is required.').max(50),
})

export const settingUpdateSchema = z.object({
  checkoutAktif: z.boolean().optional(),
  namaToko: requiredStringSchema('Store name is required.').max(100).optional(),
  kontakCs: z.string().trim().max(200).optional(),
  pesanPengumuman: z.string().trim().max(500).optional(),
})


const transaksiStatusValues = [
  'RESERVED',
  'PAID',
  'EXPIRED',
  'CANCELLED',
  'FAILED',
  'NEEDS_REFUND',
  'REFUNDED',
  'DISPUTED',
] as const

export const transactionAdminListSchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(transaksiStatusValues).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
})

export const refundCompleteSchema = z.object({
  code: requiredStringSchema('Transaction code is required.').max(50),
  paymentId: bigintIdSchema,
  amount: rupiahSchema,
  fee: z
    .union([
      z.string().trim().regex(/^\d{1,14}$/, 'Fee must be a whole number.'),
      z.number().int().min(0).max(99_999_999_999_999),
    ])
    .transform((value) => BigInt(value))
    .default(BigInt(0)),
  ref: z.string().trim().max(120).optional(),
  note: z.string().trim().max(1000).optional(),
})

export const allowRevealSchema = z.object({
  code: requiredStringSchema('Transaction code is required.').max(50),
  hari: z.coerce.number().int().min(1).max(365).default(1),
})

export type TransactionAdminListInput = z.input<typeof transactionAdminListSchema>
export type RefundCompleteInput = z.input<typeof refundCompleteSchema>
export type AllowRevealInput = z.input<typeof allowRevealSchema>

export type CheckoutInput = z.input<typeof checkoutSchema>
export type ChangeMethodInput = z.input<typeof changeMethodSchema>
export type CheckoutSlugInput = z.input<typeof checkoutSlugSchema>
export type TransactionCodeInput = z.input<typeof transactionCodeSchema>
export type TransactionListInput = z.input<typeof transactionListSchema>
export type SettingUpdateInput = z.input<typeof settingUpdateSchema>
