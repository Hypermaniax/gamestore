// Payment channels + Xendit webhook processing. The webhook inserts an inbox row
// first, then applies the payment state machine in a separate transaction.

import { createHash } from 'node:crypto'
import { revalidateTag } from 'next/cache'
import * as paymentRepo from '../repositories/payment-repo'
import * as transactionRepo from '../repositories/transaction-repo'
import * as voucherRepo from '../repositories/voucher-repo'
import * as webhookRepo from '../repositories/webhook-repo'
import { realClock } from '../lib/clock'
import { toRupiah } from '../lib/diskon'
import { CHANNEL_PEMBAYARAN } from '../lib/pembayaran/metode'
import { emailService } from './email.service'
import { CACHE_TAGS } from '../lib/cache/tags'
import { errorDetail, logger } from '../lib/logger'
import type { Prisma } from '../../generated/client'

type NormalizedStatus = 'PAID' | 'EXPIRED' | 'FAILED'

type NormalizedWebhook = {
  type: 'QRIS' | 'VA'
  externalId: string
  incomingFundId: string
  eventKey: string
  amount: bigint | null
  status: NormalizedStatus
}

export class WebhookError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WebhookError'
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isUniqueViolation = (err: unknown): boolean =>
  isObject(err) && err.code === 'P2002'

function readStatus(value: unknown): NormalizedStatus | null {
  if (typeof value !== 'string') return null
  const status = value.toUpperCase()
  if (['PAID', 'SETTLED', 'SUCCEEDED', 'SUCCESS'].includes(status)) return 'PAID'
  if (['EXPIRED', 'EXPIRE'].includes(status)) return 'EXPIRED'
  if (['FAILED', 'CANCELLED', 'CANCELED', 'DENIED'].includes(status)) return 'FAILED'
  return null
}

function normalize(payload: unknown): NormalizedWebhook {
  if (!isObject(payload)) throw new WebhookError('Webhook payload is not an object.')
  const data = isObject(payload.data) ? payload.data : payload
  const event = typeof payload.event === 'string' ? payload.event.toLowerCase() : ''

  const externalId =
    typeof data.external_id === 'string' ? data.external_id : typeof payload.external_id === 'string' ? payload.external_id : null
  if (!externalId) throw new WebhookError('external_id not found.')

  const status = readStatus(data.status) ?? readStatus(payload.status)
  if (!status) throw new WebhookError('Unknown webhook status.')

  const amountRaw = data.amount ?? data.expected_amount ?? data.paid_amount ?? payload.amount
  let amount: bigint | null = null
  if (typeof amountRaw === 'number' || typeof amountRaw === 'string') {
    const text = String(amountRaw).trim()
    if (/^\d+(\.\d+)?$/.test(text)) amount = toRupiah(text)
  }

  const idRaw =
    data.payment_id ??
    data.transaction_id ??
    data.id ??
    payload.payment_id ??
    payload.transaction_id ??
    payload.id
  const incomingFundId =
    typeof idRaw === 'string' && idRaw.length > 0
      ? idRaw
      : createHash('sha256').update(JSON.stringify(payload)).digest('hex')

  const type: 'QRIS' | 'VA' =
    event.includes('virtual') ||
    event.includes('va') ||
    typeof data.account_number === 'string' ||
    typeof data.bank_code === 'string'
      ? 'VA'
      : 'QRIS'

  const eventKey = `${incomingFundId}:${status}`.slice(0, 120)
  return { type, externalId, incomingFundId, eventKey, amount, status }
}

async function applyPaid(
  tx: Prisma.TransactionClient,
  payment: NonNullable<Awaited<ReturnType<typeof paymentRepo.findByExternalId>>>,
  webhook: NormalizedWebhook,
  now: Date,
): Promise<{ needsRefund: boolean; duplicate: boolean }> {
  const trx = payment.transaction

  if (trx.status === 'PAID') {
    if (payment.status === 'PAID') return { needsRefund: false, duplicate: true }
    await paymentRepo.update(tx, payment.id, {
      status: 'DUPLIKAT',
      incomingFundId: webhook.incomingFundId,
    })
    return { needsRefund: false, duplicate: true }
  }

  if (trx.status === 'RESERVED') {
    await paymentRepo.update(tx, payment.id, {
      status: 'PAID',
      incomingFundId: webhook.incomingFundId,
    })
    await paymentRepo.cancelOtherPending(tx, trx.id, payment.id)
    await transactionRepo.updateStatus(tx, trx.id, ['RESERVED'], {
      status: 'PAID',
      paidAt: now,
    })
    await transactionRepo.markAccountSold(tx, trx.accountId)
    return { needsRefund: false, duplicate: false }
  }

  if (['EXPIRED', 'CANCELLED', 'FAILED'].includes(trx.status)) {
    const reserved = await transactionRepo.reserveAccount(tx, trx.accountId)
    if (!reserved) {
      await paymentRepo.update(tx, payment.id, {
        status: 'PAID',
        incomingFundId: webhook.incomingFundId,
      })
      await transactionRepo.updateStatus(tx, trx.id, [trx.status], { status: 'NEEDS_REFUND' })
      return { needsRefund: true, duplicate: false }
    }

    if (trx.voucherId) {
      const consumed = await voucherRepo.consumeInTx(tx, trx.voucherId, trx.buyerId, trx.id)
      if (consumed !== 'OK') {
        await transactionRepo.releaseAccount(tx, trx.accountId)
        await paymentRepo.update(tx, payment.id, {
          status: 'PAID',
          incomingFundId: webhook.incomingFundId,
        })
        await transactionRepo.updateStatus(tx, trx.id, [trx.status], { status: 'NEEDS_REFUND' })
        return { needsRefund: true, duplicate: false }
      }
    }

    await paymentRepo.update(tx, payment.id, {
      status: 'PAID',
      incomingFundId: webhook.incomingFundId,
    })
    await transactionRepo.updateStatus(tx, trx.id, [trx.status], {
      status: 'PAID',
      paidAt: now,
    })
    await transactionRepo.markAccountSold(tx, trx.accountId)
    return { needsRefund: false, duplicate: false }
  }

  if (trx.status === 'NEEDS_REFUND' || trx.status === 'DISPUTED') {
    await paymentRepo.update(tx, payment.id, {
      status: 'DUPLIKAT',
      incomingFundId: webhook.incomingFundId,
    })
    return { needsRefund: true, duplicate: true }
  }

  throw new WebhookError(`Transaction with status ${trx.status} cannot accept payment.`)
}

async function applyTerminal(
  tx: Prisma.TransactionClient,
  payment: NonNullable<Awaited<ReturnType<typeof paymentRepo.findByExternalId>>>,
  status: 'EXPIRED' | 'FAILED',
): Promise<void> {
  if (payment.status === 'PAID' || payment.status === 'DUPLIKAT') return
  await paymentRepo.update(tx, payment.id, { status })

  const trx = payment.transaction
  if (trx.status !== 'RESERVED') return
  await transactionRepo.updateStatus(tx, trx.id, ['RESERVED'], { status })
  await transactionRepo.releaseAccount(tx, trx.accountId)
  if (trx.voucherId) await voucherRepo.releaseInTx(tx, trx.voucherId, trx.buyerId)
}

export const paymentService = {
  listMethods() {
    return {
      ok: true as const,
      data: {
        channels: CHANNEL_PEMBAYARAN,
        minimal: CHANNEL_PEMBAYARAN[0]?.minimal ?? '0',
      },
    }
  },

  async handleXenditWebhook(payload: unknown) {
    const webhook = normalize(payload)
    const now = realClock.now()

    let event: Awaited<ReturnType<typeof webhookRepo.insert>>
    try {
      event = await webhookRepo.insert({
        type: webhook.type,
        incomingFundId: webhook.eventKey,
        rawPayload: payload as Prisma.InputJsonValue,
      })
    } catch (err) {
      if (!isUniqueViolation(err)) throw err
      const existing = await webhookRepo.findByKey(webhook.type, webhook.eventKey)
      if (!existing) throw err
      event = existing
    }

    if (event.status === 'DIPROSES') return { ok: true as const, data: { status: 'DUPLIKAT' } }

    let needsRefund = false
    try {
      const result = await transactionRepo.run(async (tx) => {
        const locked = await webhookRepo.lockByKey(tx, webhook.type, webhook.eventKey)
        if (!locked) throw new WebhookError('Webhook event is missing.')
        if (locked.status === 'DIPROSES') return { duplicate: true, needsRefund: false }

        const payment = await paymentRepo.findByExternalId(webhook.externalId, tx)
        if (!payment) throw new WebhookError('Payment for this external_id was not found.')

        if (webhook.amount !== null && webhook.amount !== toRupiah(payment.amount.toString()))
          throw new WebhookError('Webhook amount does not match the invoice.')

        if (webhook.status === 'PAID') return applyPaid(tx, payment, webhook, now)
        await applyTerminal(tx, payment, webhook.status)
        return { duplicate: false, needsRefund: false }
      })
      needsRefund = result.needsRefund
      await transactionRepo.run((tx) => webhookRepo.updateStatus(tx, event.id, 'DIPROSES', now))
    } catch (err) {
      await transactionRepo.run((tx) => webhookRepo.updateStatus(tx, event.id, 'GAGAL', now))
      logger.error('webhook.proses-gagal', { eventId: event.id.toString(), error: errorDetail(err) })
      throw err instanceof WebhookError ? err : new WebhookError('Failed to process the webhook.')
    }

    revalidateTag(CACHE_TAGS.katalogAkun, 'max')

    if (needsRefund) {
      await emailService.sendAdminAlert(
        'Payment needs a refund',
        `Webhook ${webhook.type}/${webhook.eventKey} arrived for a transaction that cannot be recovered.`,
      )
    }
    return { ok: true as const, data: { status: 'DIPROSES' } }
  },
}
