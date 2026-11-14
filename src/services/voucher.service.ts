// Voucher codes — admin CRUD, checkout preview (no quota consumption), and the
// atomic consume/release primitives the transaction flow will call in Fase 5.

import { authService } from './auth.service'
import { rbacService } from './rbac.service'
import { auditService } from './audit.service'
import { promotionService } from './promotion.service'
import * as voucherRepo from '../repositories/voucher-repo'
import * as accountRepo from '../repositories/account-repo'
import * as userRepo from '../repositories/user-repo'
import {
  discountListSchema,
  voucherCreateSchema,
  voucherIdSchema,
  voucherConsumeSchema,
  voucherPreviewSchema,
  voucherUpdateSchema,
  type DiscountListInput,
  type VoucherCreateInput,
  type VoucherConsumeInput,
  type VoucherPreviewInput,
  type VoucherUpdateInput,
} from '../validation/diskon'
import { parseInput, type UnionError } from '../validation/parse'
import { hitungDiskon, toRupiah, type DiskonJenis } from '../lib/diskon'
import { realClock } from '../lib/clock'
import { z } from 'zod'
import type { SessionClaims } from '../lib/session'

const fail = (code: string, message: string): UnionError => ({ ok: false, code, message })
const SESSION: UnionError = fail('INVALID_SESSION', 'Your session is no longer valid. Please log in again.')
const FORBIDDEN: UnionError = fail('FORBIDDEN', 'You do not have permission to perform this action.')
const isError = (value: SessionClaims | UnionError): value is UnionError => 'code' in value

async function requirePermission(code: string): Promise<SessionClaims | UnionError> {
  const session = await authService.verifySession()
  if (!session) return SESSION
  if (!(await rbacService.hasPermission(session.userId, code))) return FORBIDDEN
  return session
}

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002'

type VoucherRow = {
  id: bigint
  code: string
  type: string
  value: { toString(): string }
  quota: number
  used: number
  minPurchase: { toString(): string } | null
  maxDiscount: { toString(): string } | null
  validUntil: Date
  active: boolean
  _count?: { usages: number }
}

const serializeAdmin = (voucher: VoucherRow) => ({
  id: voucher.id.toString(),
  code: voucher.code,
  type: voucher.type,
  value: voucher.value.toString(),
  quota: voucher.quota,
  used: voucher.used,
  sisa: voucher.quota - voucher.used,
  minPurchase: voucher.minPurchase?.toString() ?? null,
  maxDiscount: voucher.maxDiscount?.toString() ?? null,
  validUntil: voucher.validUntil.toISOString(),
  active: voucher.active,
  jumlahPemakaian: voucher._count?.usages ?? 0,
})

export const voucherService = {
  /* --------------------------------------------------------------- admin */

  async listAdmin(input: DiscountListInput) {
    const session = await requirePermission('voucher:read')
    if (isError(session)) return session
    const parsed = parseInput(discountListSchema, input)
    if (!parsed.ok) return parsed

    const filter = { q: parsed.data.q, active: parsed.data.active }
    const [rows, total] = await Promise.all([
      voucherRepo.listAdmin({
        ...filter,
        skip: (parsed.data.page - 1) * parsed.data.size,
        take: parsed.data.size,
      }),
      voucherRepo.countAdmin(filter),
    ])
    return {
      ok: true as const,
      data: {
        items: rows.map(serializeAdmin),
        page: parsed.data.page,
        size: parsed.data.size,
        total,
      },
    }
  },

  async create(input: VoucherCreateInput) {
    const session = await requirePermission('voucher:write')
    if (isError(session)) return session
    const parsed = parseInput(voucherCreateSchema, input)
    if (!parsed.ok) return parsed
    if (parsed.data.type === 'PERSEN' && Number(parsed.data.value) > 100)
      return fail('VALUE_INVALID', 'Percentage discount cannot exceed 100.')

    try {
      const row = await voucherRepo.create({
        code: parsed.data.code,
        type: parsed.data.type,
        value: parsed.data.value,
        quota: parsed.data.quota,
        minPurchase: parsed.data.minPurchase?.toString() ?? null,
        maxDiscount: parsed.data.maxDiscount?.toString() ?? null,
        validUntil: parsed.data.validUntil,
        active: parsed.data.active,
      })
      await auditService.log(session.userId, 'voucher.create', `voucher:${row.id}`, { code: row.code })
      return { ok: true as const, id: row.id.toString() }
    } catch (err) {
      if (isUniqueViolation(err)) return fail('CODE_ALREADY_USED', 'Voucher code is already in use.')
      throw err
    }
  },

  async update(input: VoucherUpdateInput) {
    const session = await requirePermission('voucher:write')
    if (isError(session)) return session
    const parsed = parseInput(voucherUpdateSchema, input)
    if (!parsed.ok) return parsed

    const existing = await voucherRepo.findById(parsed.data.id)
    if (!existing) return fail('VOUCHER_NOT_FOUND', 'Voucher not found.')

    const type = (parsed.data.type ?? existing.type) as DiskonJenis
    const value = parsed.data.value ?? existing.value.toString()
    if (type === 'PERSEN' && Number(value) > 100)
      return fail('VALUE_INVALID', 'Percentage discount cannot exceed 100.')
    if (parsed.data.quota !== undefined && parsed.data.quota < existing.used)
      return fail('QUOTA_INVALID', 'Quota cannot be lower than the number already used.')

    try {
      await voucherRepo.update(existing.id, {
        ...(parsed.data.code !== undefined ? { code: parsed.data.code } : {}),
        type,
        value,
        ...(parsed.data.quota !== undefined ? { quota: parsed.data.quota } : {}),
        ...(parsed.data.minPurchase !== undefined
          ? { minPurchase: parsed.data.minPurchase?.toString() ?? null }
          : {}),
        ...(parsed.data.maxDiscount !== undefined
          ? { maxDiscount: parsed.data.maxDiscount?.toString() ?? null }
          : {}),
        ...(parsed.data.validUntil !== undefined ? { validUntil: parsed.data.validUntil } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      })
      await auditService.log(session.userId, 'voucher.update', `voucher:${existing.id}`, {
        fields: Object.keys(parsed.data),
      })
      return { ok: true as const }
    } catch (err) {
      if (isUniqueViolation(err)) return fail('CODE_ALREADY_USED', 'Voucher code is already in use.')
      throw err
    }
  },

  async setActive(input: { id: string; active: boolean }) {
    const session = await requirePermission('voucher:write')
    if (isError(session)) return session
    const parsed = parseInput(voucherIdSchema.extend({ active: z.boolean() }), input)
    if (!parsed.ok) return parsed
    const existing = await voucherRepo.findById(parsed.data.id)
    if (!existing) return fail('VOUCHER_NOT_FOUND', 'Voucher not found.')
    await voucherRepo.update(existing.id, { active: parsed.data.active })
    await auditService.log(session.userId, 'voucher.active', `voucher:${existing.id}`, { active: parsed.data.active })
    return { ok: true as const }
  },

  /* -------------------------------------------------------------- checkout */

  /**
   * Internal pricing primitive shared by preview and checkout. It only validates
   * the voucher against the already-discounted base; quota is consumed later.
   */
  async evaluate(
    code: string | undefined,
    userId: bigint,
    voucherBase: bigint,
    db?: voucherRepo.Db,
    now = realClock.now(),
  ) {
    if (!code) return { ok: true as const, data: { voucher: null, potongan: BigInt(0) } }

    const row = await voucherRepo.findByCode(code, db)
    if (!row || !row.active || row.validUntil.getTime() <= now.getTime())
      return fail('VOUCHER_INVALID', 'Voucher is invalid or has expired.')

    const usages = await voucherRepo.findUsage(row.id, userId, db)
    if (usages?.status === 'TERPAKAI')
      return fail('VOUCHER_ALREADY_USED', 'You have already used this voucher.')
    if (row.used >= row.quota) return fail('VOUCHER_EXHAUSTED', 'Voucher quota has been used up.')

    if (row.minPurchase !== null && voucherBase < toRupiah(row.minPurchase.toString()))
      return fail('VOUCHER_MIN_PURCHASE', 'The purchase has not reached the voucher minimum.')

    if (row.type === 'NOMINAL' && toRupiah(row.value.toString()) > voucherBase)
      return fail('VOUCHER_INVALID', 'Voucher discount exceeds the price.')

    const potongan = hitungDiskon(voucherBase, {
      type: row.type as DiskonJenis,
      value: row.value.toString(),
      maxDiscount: row.maxDiscount?.toString() ?? null,
    })
    return {
      ok: true as const,
      data: {
        voucher: { id: row.id, code: row.code, potongan: potongan.toString() },
        potongan,
      },
    }
  },

  /** Price preview: promo first, voucher on the discounted base. Never consumes quota. */
  async preview(input: VoucherPreviewInput) {
    const session = await authService.verifySession()
    if (!session) return SESSION
    const user = await userRepo.findById(session.userId)
    if (!user || !user.active) return SESSION
    if (!user.emailVerified)
      return fail('EMAIL_NOT_VERIFIED', 'Verify your email before checking out.')

    const parsed = parseInput(voucherPreviewSchema, input)
    if (!parsed.ok) return parsed

    const account = await accountRepo.findById(parsed.data.accountId)
    if (!account || account.deletedAt || account.status !== 'AVAILABLE')
      return fail('ACCOUNT_UNAVAILABLE', 'Account is not available for purchase.')

    const initialPrice = toRupiah(account.price.toString())
    const promotion = await promotionService.calculatePromo(initialPrice, account.id, account.game.id)
    const promoDiscount = toRupiah(promotion.potongan)
    const voucherBase = initialPrice - promoDiscount

    const evaluation = await voucherService.evaluate(
      parsed.data.kodeVoucher ?? parsed.data.code,
      session.userId,
      voucherBase,
    )
    if (!evaluation.ok) return evaluation

    const voucher = evaluation.data.voucher
      ? {
          id: evaluation.data.voucher.id.toString(),
          code: evaluation.data.voucher.code,
          potongan: evaluation.data.voucher.potongan,
        }
      : null
    const total = voucherBase - evaluation.data.potongan
    if (total <= BigInt(0))
      return fail('TOTAL_INVALID', 'The payment total must be greater than zero.')

    return {
      ok: true as const,
      data: {
        initialPrice: initialPrice.toString(),
        promotion: promotion.promotion
          ? { id: promotion.promotion.id, name: promotion.promotion.name, potongan: promotion.potongan }
          : null,
        voucher,
        total: total.toString(),
      },
    }
  },

  /** Internal primitive for Fase 5 checkout: atomic quota + usage claim. */
  async consume(input: VoucherConsumeInput) {
    const parsed = parseInput(voucherConsumeSchema, input)
    if (!parsed.ok) return parsed
    const usages = await voucherRepo.findUsage(parsed.data.voucherId, parsed.data.userId)
    if (usages?.status === 'TERPAKAI')
      return fail('VOUCHER_ALREADY_USED', 'You have already used this voucher.')
    const result = await voucherRepo.consume(
      parsed.data.voucherId,
      parsed.data.userId,
      parsed.data.transactionId ?? null,
    )
    if (result === 'HABIS') return fail('VOUCHER_EXHAUSTED', 'Voucher quota has been used up.')
    if (result === 'SUDAH_DIPAKAI')
      return fail('VOUCHER_ALREADY_USED', 'You have already used this voucher.')
    return { ok: true as const }
  },

  /** Internal primitive: EXPIRED/CANCELLED/FAILED flips usage to DIPULIHKAN. */
  async release(voucherId: bigint, userId: bigint): Promise<boolean> {
    return voucherRepo.release(voucherId, userId)
  },
}
