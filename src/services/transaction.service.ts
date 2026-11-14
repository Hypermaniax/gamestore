// Transaction lifecycle — checkout phase 1/2, buyer reads, cancellation, reveal.
// Data access goes through repositories; provider calls stay behind paymentGateway.

import { createHash, randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import { revalidateTag } from 'next/cache'
import { authService } from './auth.service'
import { rbacService } from './rbac.service'
import { auditService } from './audit.service'
import { emailService } from './email.service'
import { settingService } from './setting.service'
import { promotionService } from './promotion.service'
import { voucherService } from './voucher.service'
import * as transactionRepo from '../repositories/transaction-repo'
import * as refundRepo from '../repositories/refund-repo'
import * as paymentRepo from '../repositories/payment-repo'
import * as idempotencyRepo from '../repositories/idempotency-repo'
import * as pageRepo from '../repositories/page-repo'
import * as voucherRepo from '../repositories/voucher-repo'
import * as userRepo from '../repositories/user-repo'
import * as auditRevealRepo from '../repositories/audit-reveal-repo'
import { realClock } from '../lib/clock'
import { decryptString } from '../lib/crypto'
import { toRupiah } from '../lib/diskon'
import { guardRateLimit, clientIp } from '../lib/rate-limit'
import { paymentGateway, PaymentGatewayError } from '../lib/pembayaran/gateway'
import { paymentService } from './payment.service'
import { MIN_PEMBAYARAN } from '../lib/pembayaran/metode'
import { CACHE_TAGS } from '../lib/cache/tags'
import { errorDetail, logger } from '../lib/logger'
import {
  checkoutSchema,
  changeMethodSchema,
  refundCompleteSchema,
  allowRevealSchema,
  transactionAdminListSchema,
  transactionCodeSchema,
  transactionListSchema,
  type CheckoutInput,
  type ChangeMethodInput,
  type TransactionCodeInput,
  type TransactionListInput,
  type TransactionAdminListInput,
  type RefundCompleteInput,
  type AllowRevealInput,
} from '../validation/transaksi'
import { parseInput, type UnionError } from '../validation/parse'
import type { Prisma } from '../../generated/client'

const fail = (code: string, message: string): UnionError => ({ ok: false, code, message })
const SESSION: UnionError = fail('INVALID_SESSION', 'Your session is no longer valid. Please log in again.')
const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002'

class CheckoutError extends Error {
  code: string
  message: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'CheckoutError'
    this.code = code
    this.message = message
  }
}

const envNumber = (name: string, fallback: number): number => {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const expiryMinutes = () => envNumber('EXPIRY_MENIT', 30)
const maxPending = () => envNumber('MAKS_PENDING_PER_USER', 2)
const idempotencyTtlMs = () => envNumber('IDEMPOTENCY_PROCESSING_TTL_MENIT', 5) * 60_000
const warrantyDays = () => envNumber('GARANSI_HARI', 3)
const invalidateCatalog = () => revalidateTag(CACHE_TAGS.katalogAkun, 'max')

function stable(value: unknown): string {
  if (typeof value === 'bigint') return value.toString()
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    )
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stable(entry)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

const requestHash = (action: string, input: unknown): string =>
  createHash('sha256').update(`${action}:${stable(input)}`).digest('hex')

const newTransactionCode = (now: Date): string =>
  `TRX-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(4).toString('hex').toUpperCase()}`

type CheckoutSnapshot = {
  ok: true
  data: {
    code: string
    status: string
    total: string
    expiredAt: string
    payment: Record<string, unknown>
  }
}

const serializePayment = (row: {
  method: string
  externalId: string
  status: string
  reference: string | null
  instructions: Prisma.JsonValue
  amount: { toString(): string }
  expiredAt: Date
}) => ({
  method: row.method,
  externalId: row.externalId,
  status: row.status,
  bank: row.reference,
  instructions: row.instructions,
  amount: row.amount.toString(),
  expiredAt: row.expiredAt.toISOString(),
})

function serializeDetail(row: NonNullable<Awaited<ReturnType<typeof transactionRepo.findByCode>>>) {
  return {
    code: row.code,
    status: row.status,
    initialPrice: row.initialPrice.toString(),
    promotionDiscount: row.promotionDiscount.toString(),
    voucherDiscount: row.voucherDiscount.toString(),
    total: row.total.toString(),
    promotion: row.promotion ? { id: row.promotion.id.toString(), name: row.promotion.name } : null,
    voucher: row.voucher ? { id: row.voucher.id.toString(), code: row.voucher.code } : null,
    account: {
      slug: row.account.slug,
      title: row.account.title,
      game: row.account.game,
    },
    payment: row.payments.map(serializePayment),
    createdAt: row.createdAt.toISOString(),
    expiredAt: row.expiredAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
    warrantyStart: row.warrantyStart?.toISOString() ?? null,
    revealUntil: row.revealUntil?.toISOString() ?? null,
    receiptConfirmed: row.receiptConfirmed,
  }
}

async function requireUser() {
  const session = await authService.verifySession()
  if (!session) return SESSION
  const user = await userRepo.findById(session.userId)
  if (!user || !user.active) return SESSION
  return { session, user }
}

async function requirePermission(code: string) {
  const session = await authService.verifySession()
  if (!session) return SESSION
  if (!(await rbacService.hasPermission(session.userId, code)))
    return fail('FORBIDDEN', 'You do not have permission to perform this action.')
  return session
}

function jakartaDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function remainingPayment(payment: {
  amount: { toString(): string }
  refunds: Array<{ amount: { toString(): string } }>
}): bigint {
  return payment.refunds.reduce(
    (sum, item) => sum - BigInt(item.amount.toString()),
    BigInt(payment.amount.toString()),
  )
}

export const transactionService = {
  /* ------------------------------------------------------------- checkout */

  async checkout(input: CheckoutInput) {
    const actor = await requireUser()
    if ('code' in actor) return actor
    const { user } = actor
    if (!user.emailVerified)
      return fail('EMAIL_NOT_VERIFIED', 'Verify your email before checking out.')

    const limited = await guardRateLimit('checkout', [`user:${user.id}`])
    if (limited) return limited

    const parsed = parseInput(checkoutSchema, input)
    if (!parsed.ok) return parsed

    const setting = await settingService.getPublic()
    if (!setting.data.checkoutAktif)
      return fail('CHECKOUT_CLOSED', 'Checkout is temporarily closed.')

    const now = realClock.now()
    const hash = requestHash('checkout', parsed.data)
    const claim = await idempotencyRepo.claim(
      user.id,
      parsed.data.kunciIdempoten,
      hash,
      now,
      idempotencyTtlMs(),
    )
    if (claim.status === 'REPLAY')
      return (
        (claim.snapshot as CheckoutSnapshot | UnionError | null) ??
        fail('RESULT_UNAVAILABLE', 'The request result is unavailable.')
      )
    if (claim.status === 'SEDANG_DIPROSES')
      return fail('REQUEST_IN_PROGRESS', 'The previous request is still being processed.')
    if (claim.status === 'KONTRAS_ISI')
      return fail('IDEMPOTENCY_CONFLICT', 'The idempotency key has already been used for another request.')

    const finishError = async (error: UnionError) => {
      await idempotencyRepo.finish(user.id, parsed.data.kunciIdempoten, error as Prisma.InputJsonValue, 422)
      return error
    }

    type CheckoutCreated = {
      transaction: { id: bigint; code: string; total: { toString(): string }; expiredAt: Date }
      payment: { id: bigint; externalId: string }
      accountId: bigint
      bank: string | null
    }
    let created: CheckoutCreated | null = null

    try {
      created = await transactionRepo.run(async (tx) => {
        await transactionRepo.lockUser(tx, user.id)
        const pending = await transactionRepo.countPending(tx, user.id)
        if (pending >= maxPending())
          throw new CheckoutError(
            'TRANSACTION_LIMIT',
            `At most ${maxPending()} transactions can be awaiting payment.`,
          )

        const account = await transactionRepo.findAccountForCheckout(tx, parsed.data.accountId)
        if (!account || account.deletedAt || account.status !== 'AVAILABLE')
          throw new CheckoutError('ACCOUNT_UNAVAILABLE', 'Account is not available for purchase.')

        const initialPrice = toRupiah(account.price.toString())
        const promotion = await promotionService.calculatePromo(initialPrice, account.id, account.game.id, tx, now)
        const promoDiscount = toRupiah(promotion.potongan)
        const voucherBase = initialPrice - promoDiscount

        const evaluation = await voucherService.evaluate(
          parsed.data.kodeVoucher,
          user.id,
          voucherBase,
          tx,
          now,
        )
        if (!evaluation.ok) throw new CheckoutError(evaluation.code, evaluation.message)

        const total = voucherBase - evaluation.data.potongan
        if (total <= BigInt(0))
          throw new CheckoutError('TOTAL_INVALID', 'The payment total must be greater than zero.')
        if (total < MIN_PEMBAYARAN)
          throw new CheckoutError(
            'MINIMUM_PAYMENT',
            `Minimum payment is Rp${MIN_PEMBAYARAN.toString()}.`,
          )
        if (total !== parsed.data.totalPratinjau)
          throw new CheckoutError('PRICE_CHANGED', 'The price has changed. Reload the checkout details.')

        const syarat = await pageRepo.findVersionNumber('terms-and-conditions', tx)
        if (!syarat || syarat.version !== parsed.data.termsVersion)
          throw new CheckoutError('TERMS_CHANGED', 'The terms and conditions have changed. Accept the latest version.')

        if (!(await transactionRepo.reserveAccount(tx, account.id)))
          throw new CheckoutError('ACCOUNT_UNAVAILABLE', 'The account was just purchased by another buyer.')

        const code = newTransactionCode(now)
        const expiredAt = new Date(now.getTime() + expiryMinutes() * 60_000)
        const transaction = await transactionRepo.create(tx, {
          code,
          accountId: account.id,
          buyerId: user.id,
          initialPrice: initialPrice.toString(),
          promotionId: promotion.promotion ? BigInt(promotion.promotion.id) : null,
          promotionDiscount: promoDiscount.toString(),
          voucherId: evaluation.data.voucher?.id ?? null,
          voucherDiscount: evaluation.data.potongan.toString(),
          total: total.toString(),
          termsVersion: parsed.data.termsVersion,
          termsAcceptedAt: now,
          expiredAt,
        })

        if (evaluation.data.voucher) {
          const consumed = await voucherRepo.consumeInTx(
            tx,
            evaluation.data.voucher.id,
            user.id,
            transaction.id,
          )
          if (consumed !== 'OK')
            throw new CheckoutError(
              consumed === 'HABIS' ? 'VOUCHER_EXHAUSTED' : 'VOUCHER_ALREADY_USED',
              consumed === 'HABIS'
                ? 'Voucher quota has been used up.'
                : 'You have already used this voucher.',
            )
        }

        const bank = parsed.data.method === 'VA' ? (parsed.data.bank ?? null) : null
        const payment = await paymentRepo.create(tx, {
          transactionId: transaction.id,
          method: parsed.data.method,
          externalId: paymentRepo.nextExternalId(code, 1),
          reference: bank,
          amount: total.toString(),
          expiredAt,
        })
        await transactionRepo.linkIdempotency(tx, user.id, parsed.data.kunciIdempoten, transaction.id)

        return {
          transaction: {
            id: transaction.id,
            code: transaction.code,
            total: transaction.total,
            expiredAt: transaction.expiredAt ?? expiredAt,
          },
          payment: { id: payment.id, externalId: payment.externalId },
          accountId: account.id,
          bank,
        }
      })
    } catch (err) {
      if (err instanceof CheckoutError) return finishError(fail(err.code, err.message))
      throw err
    }

    invalidateCatalog()

    try {
      const gateway = await paymentGateway.create({
        externalId: created.payment.externalId,
        amount: toRupiah(created.transaction.total.toString()),
        method: parsed.data.method,
        bank: parsed.data.bank,
        expiresAt: created.transaction.expiredAt,
        description: `Account purchase ${created.transaction.code}`,
        namaToko: setting.data.namaToko,
        customer: { name: user.username, email: user.email },
      })

      await transactionRepo.run((tx) =>
        paymentRepo.update(tx, created!.payment.id, {
          xenditId: gateway.providerId,
          instructions: gateway.instructions as unknown as Prisma.InputJsonValue,
        }),
      )

      const snapshot = {
        ok: true as const,
        data: {
          code: created.transaction.code,
          status: 'RESERVED',
          total: created.transaction.total.toString(),
          expiredAt: created.transaction.expiredAt.toISOString(),
          payment: {
            method: parsed.data.method,
            bank: created.bank,
            externalId: created.payment.externalId,
            status: 'PENDING',
            instructions: gateway.instructions,
          },
        },
      }
      await idempotencyRepo.finish(
        user.id,
        parsed.data.kunciIdempoten,
        snapshot as unknown as Prisma.InputJsonValue,
        200,
        now,
      )
      return snapshot
    } catch (err) {
      if (err instanceof PaymentGatewayError && err.permanent) {
        await transactionRepo.run(async (tx) => {
          await transactionRepo.updateStatus(tx, created!.transaction.id, ['RESERVED'], { status: 'FAILED' })
          await transactionRepo.releaseAccount(tx, created!.accountId)
          await paymentRepo.update(tx, created!.payment.id, { status: 'FAILED' })
          const row = await transactionRepo.findById(created!.transaction.id, tx)
          if (row?.voucherId)
            await voucherRepo.releaseInTx(tx, row.voucherId, row.buyerId)
        })
        invalidateCatalog()
        logger.error('checkout.gateway-fail', { error: errorDetail(err) })
        return finishError(
          fail('PAYMENT_FAILED', 'Payment could not be created. Try again or use another method.'),
        )
      }

      if (err instanceof PaymentGatewayError) {
        // Timeout/network: keep RESERVED + PROCESSING for reconciliation, never double-charge.
        return fail(
          'PAYMENT_PENDING',
          'Payment is being created. Check the transaction status again shortly.',
        )
      }
      throw err
    }
  },

  async changeMethod(input: ChangeMethodInput) {
    const actor = await requireUser()
    if ('code' in actor) return actor
    const { user } = actor

    const limited = await guardRateLimit('changeMethod', [`user:${user.id}`])
    if (limited) return limited

    const parsed = parseInput(changeMethodSchema, input)
    if (!parsed.ok) return parsed

    const now = realClock.now()
    const claim = await idempotencyRepo.claim(
      user.id,
      parsed.data.kunciIdempoten,
      requestHash('ganti-metode', parsed.data),
      now,
      idempotencyTtlMs(),
    )
    if (claim.status === 'REPLAY')
      return (
        (claim.snapshot as CheckoutSnapshot | UnionError | null) ??
        fail('RESULT_UNAVAILABLE', 'The request result is unavailable.')
      )
    if (claim.status === 'SEDANG_DIPROSES')
      return fail('REQUEST_IN_PROGRESS', 'The previous request is still being processed.')
    if (claim.status === 'KONTRAS_ISI')
      return fail('IDEMPOTENCY_CONFLICT', 'The idempotency key has already been used for another request.')

    const finishError = async (error: UnionError) => {
      await idempotencyRepo.finish(
        user.id,
        parsed.data.kunciIdempoten,
        error as Prisma.InputJsonValue,
        422,
        now,
      )
      return error
    }

    const row = await transactionRepo.findByCode(parsed.data.code)
    if (!row || row.buyerId !== user.id)
      return finishError(        fail('TRANSACTION_NOT_FOUND', 'Transaction not found.'))
    if (row.status !== 'RESERVED')
      return finishError(
        fail('STATUS_INVALID', 'The method can only be changed before payment.'),
      )

    const expiredAt = row.expiredAt ?? new Date(now.getTime() + expiryMinutes() * 60_000)
    if (expiredAt.getTime() <= now.getTime())
      return finishError(
        fail('TRANSACTION_EXPIRED', 'The transaction has expired. Please check out again.'),
      )

    const bank = parsed.data.method === 'VA' ? (parsed.data.bank ?? null) : null
    const current = row.payments.find((payment) => payment.status === 'PENDING')
    if (
      current &&
      current.method === parsed.data.method &&
      (parsed.data.method === 'QRIS' || current.reference === bank)
    ) {
      const snapshot = {
        ok: true as const,
        data: {
          code: row.code,
          status: row.status,
          total: row.total.toString(),
          expiredAt: expiredAt.toISOString(),
          payment: serializePayment(current),
        },
      }
      await idempotencyRepo.linkTransaction(user.id, parsed.data.kunciIdempoten, row.id)
      await idempotencyRepo.finish(
        user.id,
        parsed.data.kunciIdempoten,
        snapshot as unknown as Prisma.InputJsonValue,
        200,
        now,
      )
      return snapshot
    }

    const setting = await settingService.getPublic()
    const externalId = paymentRepo.nextExternalId(row.code, row.payments.length + 1)

    let gateway: Awaited<ReturnType<typeof paymentGateway.create>>
    try {
      gateway = await paymentGateway.create({
        externalId,
        amount: toRupiah(row.total.toString()),
        method: parsed.data.method,
        bank: parsed.data.bank,
        expiresAt: expiredAt,
        description: `Change payment method ${row.code}`,
        namaToko: setting.data.namaToko,
        customer: { name: user.username, email: user.email },
      })
    } catch (err) {
      if (err instanceof PaymentGatewayError && err.permanent) {
        logger.error('ganti-metode.gateway-fail', { error: errorDetail(err) })
        return finishError(
          fail('PAYMENT_FAILED', 'Payment could not be created. Try again or use another method.'),
        )
      }
      if (err instanceof PaymentGatewayError)
        return fail(
          'PAYMENT_PENDING',
          'A new payment is being created. Check the transaction status again shortly.',
        )
      throw err
    }

    let data: {
      code: string
      status: string
      total: string
      expiredAt: string
      payment: ReturnType<typeof serializePayment>
    }
    try {
      data = await transactionRepo.run(async (tx) => {
        await transactionRepo.lockTransaction(tx, row.id)
        const fresh = await transactionRepo.findByCode(row.code, tx)
        if (!fresh || fresh.buyerId !== user.id)
          throw new CheckoutError('TRANSACTION_NOT_FOUND', 'Transaction not found.')
        if (fresh.status !== 'RESERVED')
          throw new CheckoutError(
            'STATUS_INVALID',
            'The transaction has changed and the method can no longer be switched.',
          )

        const freshExpiredAt =
          fresh.expiredAt ?? new Date(now.getTime() + expiryMinutes() * 60_000)
        if (freshExpiredAt.getTime() <= now.getTime())
          throw new CheckoutError(
            'TRANSACTION_EXPIRED',
            'The transaction has expired. Please check out again.',
          )

        await paymentRepo.cancelAllPending(tx, fresh.id)
        const payment = await paymentRepo.create(tx, {
          transactionId: fresh.id,
          method: parsed.data.method,
          externalId,
          reference: bank,
          xenditId: gateway.providerId,
          instructions: gateway.instructions as unknown as Prisma.InputJsonValue,
          amount: fresh.total.toString(),
          expiredAt: freshExpiredAt,
        })
        await transactionRepo.linkIdempotency(tx, user.id, parsed.data.kunciIdempoten, fresh.id)

        return {
          code: fresh.code,
          status: 'RESERVED',
          total: fresh.total.toString(),
          expiredAt: freshExpiredAt.toISOString(),
          payment: {
            method: parsed.data.method,
            externalId,
            status: payment.status,
            bank,
            instructions: gateway.instructions,
            amount: fresh.total.toString(),
            expiredAt: freshExpiredAt.toISOString(),
          },
        }
      })
    } catch (err) {
      await paymentGateway.cancel(gateway.providerId, parsed.data.method)
      if (err instanceof CheckoutError) return finishError(fail(err.code, err.message))
      if (isUniqueViolation(err))
        return finishError(
          fail('REQUEST_IN_PROGRESS', 'The payment method is being changed. Try again.'),
        )
      throw err
    }

    for (const payment of row.payments) {
      if (payment.status === 'PENDING' && payment.xenditId)
        await paymentGateway.cancel(
          payment.xenditId,
          payment.method as 'QRIS' | 'VA',
        )
    }

    const snapshot = { ok: true as const, data }
    await idempotencyRepo.finish(
      user.id,
      parsed.data.kunciIdempoten,
      snapshot as unknown as Prisma.InputJsonValue,
      200,
      now,
    )
    return snapshot
  },

  /* ------------------------------------------------------------ admin reads */

  async listAdmin(input: TransactionAdminListInput) {
    const session = await requirePermission('transaction:read')
    if ('code' in session) return session
    const parsed = parseInput(transactionAdminListSchema, input)
    if (!parsed.ok) return parsed
    const { q, status, page, size } = parsed.data
    const [rows, total] = await Promise.all([
      transactionRepo.listAdmin({ q, status, skip: (page - 1) * size, take: size }),
      transactionRepo.countAdmin({ q, status }),
    ])
    return {
      ok: true as const,
      data: {
        items: rows.map((row) => ({
          code: row.code,
          status: row.status,
          total: row.total.toString(),
          createdAt: row.createdAt.toISOString(),
          expiredAt: row.expiredAt?.toISOString() ?? null,
          paidAt: row.paidAt?.toISOString() ?? null,
          buyer: { username: row.buyer.username, email: row.buyer.email },
          account: {
            slug: row.account.slug,
            title: row.account.title,
            status: row.account.status,
            game: row.account.game,
          },
          payment: row.payments[0]
            ? {
                method: row.payments[0].method,
                status: row.payments[0].status,
                amount: row.payments[0].amount.toString(),
              }
            : null,
        })),
        page,
        size,
        total,
      },
    }
  },

  async detailAdmin(input: TransactionCodeInput) {
    const session = await requirePermission('transaction:read')
    if ('code' in session) return session
    const parsed = parseInput(transactionCodeSchema, input)
    if (!parsed.ok) return parsed
    const row = await transactionRepo.findAdminByCode(parsed.data.code)
    if (!row) return fail('TRANSACTION_NOT_FOUND', 'Transaction not found.')

    const payment = row.payments.map((payment) => ({
      ...payment,
      amount: payment.amount.toString(),
      id: payment.id.toString(),
      refund: payment.refunds.map((refund) => ({
        ...refund,
        id: refund.id.toString(),
        amount: refund.amount.toString(),
        fee: refund.fee.toString(),
        refundedAt: refund.refundedAt.toISOString(),
      })),
      totalRefund: payment.refunds
        .reduce((sum, refund) => sum + BigInt(refund.amount.toString()), BigInt(0))
        .toString(),
      sisaRefund: remainingPayment(payment).toString(),
    }))

    const webhook = await transactionRepo.listWebhookForPayments(
      row.payments.flatMap((payment) => (payment.incomingFundId ? [payment.incomingFundId] : [])),
    )

    return {
      ok: true as const,
      data: {
        code: row.code,
        status: row.status,
        initialPrice: row.initialPrice.toString(),
        promotionDiscount: row.promotionDiscount.toString(),
        voucherDiscount: row.voucherDiscount.toString(),
        total: row.total.toString(),
        termsVersion: row.termsVersion,
        termsAcceptedAt: row.termsAcceptedAt.toISOString(),
        receiptConfirmed: row.receiptConfirmed,
        confirmedAt: row.confirmedAt?.toISOString() ?? null,
        confirmedBy: row.confirmedBy,
        warrantyStart: row.warrantyStart?.toISOString() ?? null,
        revealUntil: row.revealUntil?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        expiredAt: row.expiredAt?.toISOString() ?? null,
        paidAt: row.paidAt?.toISOString() ?? null,
        buyer: { id: row.buyer.id.toString(), username: row.buyer.username, email: row.buyer.email },
        account: {
          id: row.account.id.toString(),
          slug: row.account.slug,
          title: row.account.title,
          status: row.account.status,
          kredensialTerisi: row.account.credentialsEncrypted !== null,
          game: row.account.game,
        },
        promotion: row.promotion ? { name: row.promotion.name } : null,
        voucher: row.voucher ? { code: row.voucher.code } : null,
        payment,
        refund: row.refunds.map((refund) => ({
          ...refund,
          id: refund.id.toString(),
          paymentId: refund.paymentId.toString(),
          amount: refund.amount.toString(),
          fee: refund.fee.toString(),
          refundedAt: refund.refundedAt.toISOString(),
        })),
        auditReveal: row.auditReveals.map((audit) => ({
          waktu: audit.revealedAt.toISOString(),
          ip: audit.ip,
          userAgent: audit.userAgent,
        })),
        webhook: webhook.map((event) => ({
          id: event.id.toString(),
          type: event.type,
          incomingFundId: event.incomingFundId,
          status: event.status,
          processedAt: event.processedAt?.toISOString() ?? null,
        })),
      },
    }
  },

  async summaryAdmin() {
    const session = await requirePermission('transaction:read')
    if ('code' in session) return session
    const now = realClock.now()
    const start = new Date(`${jakartaDate(now)}T00:00:00+07:00`)
    const end = new Date(start.getTime() + 86_400_000)
    const [needsRefund, disputed, duplikat, reserved, omzet] = await Promise.all([
      transactionRepo.listForRefund(['NEEDS_REFUND']),
      transactionRepo.listForRefund(['DISPUTED']),
      transactionRepo.listUnrefundedDuplicates(),
      transactionRepo.countByStatus('RESERVED'),
      transactionRepo.sumRevenue(start, end),
    ])

    const sumRemaining = (rows: typeof needsRefund) =>
      rows.reduce(
        (sum, row) =>
          sum +
          row.payments.reduce((inner, payment) => inner + remainingPayment(payment), BigInt(0)),
        BigInt(0),
      )
    const duplicateRemaining = duplikat.filter((payment) => remainingPayment(payment) > BigInt(0))

    return {
      ok: true as const,
      data: {
        tanggal: jakartaDate(now),
        antrean: {
          needsRefund: { amount: needsRefund.length, sisaRefund: sumRemaining(needsRefund).toString() },
          disputed: { amount: disputed.length, sisaRefund: sumRemaining(disputed).toString() },
          duplikat: {
            amount: duplicateRemaining.length,
            sisaRefund: duplicateRemaining
              .reduce((sum, payment) => sum + remainingPayment(payment), BigInt(0))
              .toString(),
          },
        },
        reserved: { amount: reserved },
        omzetHariIni: {
          jumlahTransaksi: omzet._count,
          total: omzet._sum.total?.toString() ?? '0',
        },
      },
    }
  },

  async syncAdmin(input: TransactionCodeInput) {
    const session = await requirePermission('transaction:sync')
    if ('code' in session) return session
    const parsed = parseInput(transactionCodeSchema, input)
    if (!parsed.ok) return parsed
    const row = await transactionRepo.findAdminByCode(parsed.data.code)
    if (!row) return fail('TRANSACTION_NOT_FOUND', 'Transaction not found.')

    if (paymentGateway.mode() === 'mock')
      return {
        ok: true as const,
        data: {
          code: row.code,
          status: row.status,
          diperiksa: 0,
          perubahan: 0,
          note: 'Mock mode is active; provider sync skipped.',
        },
      }

    const kandidat = row.payments.filter(
      (payment) => payment.method === 'QRIS' && payment.status === 'PENDING' && payment.xenditId,
    )
    if (kandidat.length === 0)
      return {
        ok: true as const,
        data: {
          code: row.code,
          status: row.status,
          diperiksa: 0,
          perubahan: 0,
          note: 'No QRIS payments are waiting to be synced.',
        },
      }

    let diperiksa = 0
    let perubahan = 0
    const note: string[] = []
    for (const payment of kandidat) {
      diperiksa += 1
      let fetched
      try {
        fetched = await paymentGateway.fetchStatus({
          providerId: payment.xenditId!,
          externalId: payment.externalId,
          method: 'QRIS',
        })
      } catch (err) {
        logger.error('sinkron.fetch-fail', { error: errorDetail(err) })
        return fail('SYNC_FAILED', 'Payment sync failed. Try again shortly.')
      }
      if (fetched.status === 'UNSUPPORTED') {
        note.push(fetched.alasan)
        continue
      }
      if (fetched.status === 'PENDING') {
        note.push(`${payment.externalId} is still awaiting payment.`)
        continue
      }

      try {
        await paymentService.handleXenditWebhook({
          event: 'qr.payments',
          source: 'admin-sync',
          data: {
            external_id: payment.externalId,
            id: fetched.incomingFundId,
            status: fetched.status,
            ...(fetched.amount !== null ? { amount: Number(fetched.amount) } : {}),
          },
        })
      } catch (err) {
        logger.error('sinkron.webhook-fail', { error: errorDetail(err) })
        return fail('SYNC_FAILED', 'Payment sync failed. Try again shortly.')
      }
      perubahan += 1
      note.push(`${payment.externalId} → ${fetched.status}.`)
    }

    if (perubahan > 0)
      await auditService.log(session.userId, 'transaction.sync', `transaction:${row.code}`, {
        diperiksa,
        perubahan,
      })
    const latest = await transactionRepo.findAdminByCode(parsed.data.code)
    return {
      ok: true as const,
      data: {
        code: row.code,
        status: latest?.status ?? row.status,
        diperiksa,
        perubahan,
        note: note.join(' ') || 'Sync completed with no changes.',
      },
    }
  },

  async markDispute(input: TransactionCodeInput) {
    const session = await requirePermission('transaction:dispute')
    if ('code' in session) return session
    const parsed = parseInput(transactionCodeSchema, input)
    if (!parsed.ok) return parsed
    const row = await transactionRepo.findAdminByCode(parsed.data.code)
    if (!row) return fail('TRANSACTION_NOT_FOUND', 'Transaction not found.')
    if (row.status === 'DISPUTED')
      return { ok: true as const, data: { code: row.code, status: row.status } }
    if (row.status !== 'PAID')
      return fail('STATUS_INVALID', 'Only PAID transactions can be marked as disputed.')

    const changed = await transactionRepo.run((tx) =>
      transactionRepo.updateStatus(tx, row.id, ['PAID'], { status: 'DISPUTED' }),
    )
    if (changed.count === 0)
      return fail('STATUS_INVALID', 'The transaction status has already changed.')

    await auditService.log(session.userId, 'transaction.dispute', `transaction:${row.code}`)
    await emailService.sendEmail(
      row.buyer.email,
      `Dispute opened for transaction ${row.code}`,
      'Your transaction is being reviewed by an admin. We will contact you through your registered email.',
    )
    return { ok: true as const, data: { code: row.code, status: 'DISPUTED' } }
  },

  async closeDispute(input: TransactionCodeInput) {
    const session = await requirePermission('transaction:dispute')
    if ('code' in session) return session
    const parsed = parseInput(transactionCodeSchema, input)
    if (!parsed.ok) return parsed
    const row = await transactionRepo.findAdminByCode(parsed.data.code)
    if (!row) return fail('TRANSACTION_NOT_FOUND', 'Transaction not found.')
    if (row.status !== 'DISPUTED')
      return fail('STATUS_INVALID', 'This transaction is not under dispute.')

    const changed = await transactionRepo.run((tx) =>
      transactionRepo.updateStatus(tx, row.id, ['DISPUTED'], { status: 'PAID' }),
    )
    if (changed.count === 0)
      return fail('STATUS_INVALID', 'The transaction status has already changed.')

    await auditService.log(session.userId, 'transaction.close-dispute', `transaction:${row.code}`)
    await emailService.sendEmail(
      row.buyer.email,
      `Dispute closed for transaction ${row.code}`,
      'The dispute was closed without a refund. The transaction is PAID again.',
    )
    return { ok: true as const, data: { code: row.code, status: 'PAID' } }
  },

  async completeRefund(input: RefundCompleteInput) {
    const session = await requirePermission('transaction:refund')
    if ('code' in session) return session
    const parsed = parseInput(refundCompleteSchema, input)
    if (!parsed.ok) return parsed
    const row = await transactionRepo.findAdminByCode(parsed.data.code)
    if (!row) return fail('TRANSACTION_NOT_FOUND', 'Transaction not found.')
    const payment = row.payments.find((item) => item.id === parsed.data.paymentId)
    if (!payment)
      return fail('PAYMENT_NOT_FOUND', 'Payment not found for this transaction.')
    if (!['PAID', 'DUPLIKAT'].includes(payment.status))
      return fail('PAYMENT_INVALID', 'This payment is not paid or is no longer valid.')
    if (payment.status === 'PAID' && !['NEEDS_REFUND', 'DISPUTED'].includes(row.status))
      return fail('STATUS_INVALID', 'Mark a dispute first before refunding the main payment.')

    const amount = parsed.data.amount
    if (amount <= BigInt(0)) return fail('AMOUNT_INVALID', 'The refund amount must be greater than zero.')
    if (parsed.data.fee > amount)
      return fail('AMOUNT_INVALID', 'The refund fee cannot exceed the refund amount.')

    const now = realClock.now()
    let status = row.status
    let sisa = BigInt(payment.amount.toString())
    await transactionRepo.run(async (tx) => {
      await transactionRepo.lockPayment(tx, payment.id)
      const sum = await refundRepo.sumByPayment(payment.id, tx)
      const sudah = sum._sum.amount ? BigInt(sum._sum.amount.toString()) : BigInt(0)
      if (sudah + amount > BigInt(payment.amount.toString()))
        throw new CheckoutError('REFUND_AMOUNT_EXCEEDED', 'The total refund exceeds the payment amount.')

      await refundRepo.create(tx, {
        paymentId: payment.id,
        transactionId: row.id,
        amount: amount.toString(),
        fee: parsed.data.fee.toString(),
        ref: parsed.data.ref || null,
        note: parsed.data.note || null,
        adminId: session.userId,
        refundedAt: now,
      })

      sisa = BigInt(payment.amount.toString()) - (sudah + amount)
      if (
        payment.status === 'PAID' &&
        ['NEEDS_REFUND', 'DISPUTED'].includes(row.status) &&
        sisa === BigInt(0)
      ) {
        const changed = await transactionRepo.updateStatus(tx, row.id, ['NEEDS_REFUND', 'DISPUTED'], {
          status: 'REFUNDED',
        })
        if (changed.count === 0)
          throw new CheckoutError('STATUS_INVALID', 'The transaction status has already changed.')
        status = 'REFUNDED'
      }
    })

    await auditService.log(session.userId, 'transaction.refund', `transaction:${row.code}`, {
      paymentId: payment.id.toString(),
      amount: amount.toString(),
      fee: parsed.data.fee.toString(),
      sisa: sisa.toString(),
    })
    await emailService.sendEmail(
      row.buyer.email,
      `Refund for transaction ${row.code}`,
      `A refund of Rp${amount.toLocaleString('id-ID')} has been recorded by an admin. Remaining refund: Rp${sisa.toLocaleString('id-ID')}.`,
    )
    return {
      ok: true as const,
      data: {
        code: row.code,
        status,
        totalRefund: (BigInt(payment.amount.toString()) - sisa).toString(),
        sisaRefund: sisa.toString(),
      },
    }
  },

  async grantReveal(input: AllowRevealInput) {
    const session = await requirePermission('reveal:grant')
    if ('code' in session) return session
    const parsed = parseInput(allowRevealSchema, input)
    if (!parsed.ok) return parsed
    const row = await transactionRepo.findAdminByCode(parsed.data.code)
    if (!row) return fail('TRANSACTION_NOT_FOUND', 'Transaction not found.')
    if (row.status !== 'PAID')
      return fail('STATUS_INVALID', 'Reveal can only be granted for PAID transactions.')

    const now = realClock.now()
    const base = row.revealUntil && row.revealUntil > now ? row.revealUntil : now
    const sampai = new Date(base.getTime() + parsed.data.hari * 86_400_000)
    const changed = await transactionRepo.run((tx) => transactionRepo.setRevealUntil(tx, row.id, sampai))
    if (changed.count === 0)
      return fail('STATUS_INVALID', 'Reveal cannot be granted for this transaction.')

    await auditService.log(session.userId, 'transaction.grant-reveal', `transaction:${row.code}`, {
      sampai: sampai.toISOString(),
    })
    return { ok: true as const, data: { code: row.code, revealUntil: sampai.toISOString() } }
  },

  /* ----------------------------------------------------------- buyer reads */

  async list(input: TransactionListInput) {
    const actor = await requireUser()
    if ('code' in actor) return actor
    const parsed = parseInput(transactionListSchema, input)
    if (!parsed.ok) return parsed
    const { status, page, size } = parsed.data
    const [rows, total] = await Promise.all([
      transactionRepo.listByBuyer(actor.user.id, {
        status,
        skip: (page - 1) * size,
        take: size,
      }),
      transactionRepo.countByBuyer(actor.user.id, status),
    ])
    return {
      ok: true as const,
      data: {
        items: rows.map((row) => ({
          code: row.code,
          status: row.status,
          total: row.total.toString(),
          createdAt: row.createdAt.toISOString(),
          expiredAt: row.expiredAt?.toISOString() ?? null,
          account: row.account,
          payment: row.payments.map((p) => ({
            method: p.method,
            status: p.status,
            expiredAt: p.expiredAt.toISOString(),
          })),
        })),
        page,
        size,
        total,
      },
    }
  },

  async detail(input: TransactionCodeInput) {
    const actor = await requireUser()
    if ('code' in actor) return actor
    const parsed = parseInput(transactionCodeSchema, input)
    if (!parsed.ok) return parsed
    const row = await transactionRepo.findByCode(parsed.data.code)
    if (!row || row.buyerId !== actor.user.id)
      return fail('TRANSACTION_NOT_FOUND', 'Transaction not found.')
    return { ok: true as const, data: serializeDetail(row) }
  },

  async status(input: TransactionCodeInput) {
    const actor = await requireUser()
    if ('code' in actor) return actor
    const parsed = parseInput(transactionCodeSchema, input)
    if (!parsed.ok) return parsed
    const row = await transactionRepo.findStatus(parsed.data.code, actor.user.id)
    if (!row) return fail('TRANSACTION_NOT_FOUND', 'Transaction not found.')
    const now = realClock.now()
    return {
      ok: true as const,
      data: {
        code: row.code,
        status: row.status,
        total: row.total.toString(),
        sisaDetik: row.expiredAt
          ? Math.max(0, Math.floor((row.expiredAt.getTime() - now.getTime()) / 1000))
          : 0,
        payment: row.payments[0]
          ? {
              method: row.payments[0].method,
              status: row.payments[0].status,
            }
          : null,
      },
    }
  },

  /* -------------------------------------------------------------- lifecycle */

  async cancel(input: TransactionCodeInput) {
    const actor = await requireUser()
    if ('code' in actor) return actor
    const parsed = parseInput(transactionCodeSchema, input)
    if (!parsed.ok) return parsed

    const row = await transactionRepo.findOwnedByCode(parsed.data.code, actor.user.id)
    if (!row) return fail('TRANSACTION_NOT_FOUND', 'Transaction not found.')
    if (row.status === 'CANCELLED') return { ok: true as const }
    if (row.status !== 'RESERVED')
      return fail('STATUS_INVALID', 'This transaction cannot be cancelled.')

    await transactionRepo.run(async (tx) => {
      const changed = await transactionRepo.updateStatus(tx, row.id, ['RESERVED'], {
        status: 'CANCELLED',
      })
      if (changed.count === 0) throw new CheckoutError('STATUS_INVALID', 'The transaction has already changed.')
      await transactionRepo.releaseAccount(tx, row.accountId)
      if (row.voucherId) await voucherRepo.releaseInTx(tx, row.voucherId, row.buyerId)
      const payments = await paymentRepo.findByTransactionId(row.id, tx)
      for (const payment of payments) {
        if (payment.status === 'PENDING') await paymentRepo.update(tx, payment.id, { status: 'CANCELLED' })
      }
    })

    invalidateCatalog()

    const payments = await paymentRepo.findByTransactionId(row.id)
    for (const payment of payments) {
      if (payment.xenditId)
        await paymentGateway.cancel(payment.xenditId, payment.method as 'QRIS' | 'VA')
    }
    return { ok: true as const }
  },

  async reveal(input: TransactionCodeInput) {
    const actor = await requireUser()
    if ('code' in actor) return actor
    const limited = await guardRateLimit('reveal', [`user:${actor.user.id}`])
    if (limited) return limited
    const parsed = parseInput(transactionCodeSchema, input)
    if (!parsed.ok) return parsed

    const row = await transactionRepo.findOwnedForReveal(parsed.data.code, actor.user.id)
    if (!row) return fail('TRANSACTION_NOT_FOUND', 'Transaction not found.')
    if (row.status !== 'PAID')
      return fail('PAYMENT_REQUIRED', 'Credentials can only be revealed after payment is complete.')
    if (row.account.status !== 'SOLD')
      return fail('STATUS_INVALID', 'The account status is invalid for reveal.')

    const now = realClock.now()
    if (!row.warrantyStart) {
      await transactionRepo.run((tx) => transactionRepo.claimWarrantyStart(tx, row.id, now))
    }
    const startsAt = row.warrantyStart ?? now
    const batasGaransi = new Date(startsAt.getTime() + warrantyDays() * 86_400_000)
    const bolehSampai = row.revealUntil && row.revealUntil > batasGaransi ? row.revealUntil : batasGaransi
    if (now > bolehSampai)
      return fail('WARRANTY_EXPIRED', 'The warranty period has ended. Contact support for help.')

    if (!row.account.credentialsEncrypted || !row.account.keyVersion)
      return fail('CREDENTIALS_UNAVAILABLE', 'Account credentials are not available yet.')

    const credentials = decryptString(
      row.account.credentialsEncrypted,
      row.account.keyVersion,
      `akun:${row.account.id}`,
    )

    let userAgent: string | null = null
    try {
      userAgent = (await headers()).get('user-agent')?.slice(0, 300) ?? null
    } catch {
      userAgent = null
    }
    const ip = await clientIp()
    await auditRevealRepo.create({
      transactionId: row.id,
      buyerId: row.buyerId,
      ip: ip === 'local' ? null : ip,
      userAgent,
    })

    return {
      ok: true as const,
      data: {
        credentials,
        garansiHingga: bolehSampai.toISOString(),
      },
    }
  },

  async confirmReceived(input: TransactionCodeInput) {
    const actor = await requireUser()
    if ('code' in actor) return actor
    const parsed = parseInput(transactionCodeSchema, input)
    if (!parsed.ok) return parsed
    const row = await transactionRepo.findOwnedByCode(parsed.data.code, actor.user.id)
    if (!row) return fail('TRANSACTION_NOT_FOUND', 'Transaction not found.')
    if (row.status !== 'PAID')
      return fail('STATUS_INVALID', 'Only PAID transactions can be confirmed.')
    if (row.receiptConfirmed) return { ok: true as const }

    await transactionRepo.run(async (tx) => {
      await tx.transaction.updateMany({
        where: { id: row.id, status: 'PAID', receiptConfirmed: false },
        data: {
          receiptConfirmed: true,
          confirmedAt: realClock.now(),
          confirmedBy: 'PEMBELI',
        },
      })
    })
    return { ok: true as const }
  },
}
