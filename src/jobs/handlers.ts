// Scheduled job implementations. Each handler is idempotent: lock rows inside a
// transaction and re-check state after taking the lock.

import * as idempotencyRepo from '../repositories/idempotency-repo'
import * as paymentRepo from '../repositories/payment-repo'
import * as retensiRepo from '../repositories/retensi-repo'
import * as transactionRepo from '../repositories/transaction-repo'
import * as voucherRepo from '../repositories/voucher-repo'
import * as webhookRepo from '../repositories/webhook-repo'
import { paymentGateway } from '../lib/pembayaran/gateway'
import { realClock } from '../lib/clock'
import { paymentService } from '../services/payment.service'
import { alertOnce } from '../services/alert.service'
import type { JobResult } from './run'

const DAY_MS = 86_400_000

const envAngka = (name: string, fallback: number): number => {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export async function idempotencyJob(): Promise<JobResult> {
  const now = realClock.now()
  const processing = await idempotencyRepo.expireProcessing(now)
  const finished = await idempotencyRepo.expireSelesai(now)
  return { ok: true, processed: processing.count + finished.count }
}

export async function expiryJob(): Promise<JobResult> {
  const now = realClock.now()
  const rows = await transactionRepo.listExpired(now)
  let processed = 0

  for (const row of rows) {
    const result = await transactionRepo.run(async (tx) => {
      await transactionRepo.lockTransaction(tx, row.id)
      const fresh = await transactionRepo.findById(row.id, tx)
      if (!fresh || fresh.status !== 'RESERVED') return { changed: false, pending: [] }
      if (!fresh.expiredAt || fresh.expiredAt.getTime() > now.getTime())
        return { changed: false, pending: [] }

      const changed = await transactionRepo.updateStatus(tx, fresh.id, ['RESERVED'], {
        status: 'EXPIRED',
      })
      if (changed.count === 0) return { changed: false, pending: [] }

      await transactionRepo.releaseAccount(tx, fresh.accountId)
      if (fresh.voucherId)
        await voucherRepo.releaseInTx(tx, fresh.voucherId, fresh.buyerId)

      const payments = await paymentRepo.findByTransactionId(fresh.id, tx)
      await paymentRepo.cancelAllPending(tx, fresh.id)
      return {
        changed: true,
        pending: payments.filter(
          (payment) => payment.status === 'PENDING' && payment.xenditId,
        ),
      }
    })

    if (result.changed) processed++
    for (const payment of result.pending) {
      await paymentGateway.cancel(payment.xenditId, payment.method as 'QRIS' | 'VA')
    }
  }

  const menggantung = await transactionRepo.countExpired(new Date(now.getTime() - 10 * 60_000))
  if (menggantung > 0)
    await alertOnce(
      'RESERVED_MENGGANTUNG',
      'Stuck RESERVED transactions',
      `${menggantung} RESERVED transactions have been expired for more than 10 minutes. Check ExpiryJob/Xendit.`,
    )

  return { ok: true, processed }
}

export async function webhookRetryJob(): Promise<JobResult> {
  const rows = await webhookRepo.listFailed(20)
  let processed = 0

  for (const event of rows) {
    if (event.rawPayload === null) continue
    try {
      await paymentService.handleXenditWebhook(event.rawPayload)
      processed++
    } catch {
      // Keep GAGAL for the next run; the webhook service records the failure.
    }
  }

  const sisaGagal = await webhookRepo.countFailed()
  if (sisaGagal >= 20)
    await alertOnce(
      'WEBHOOK_FAILED',
      'Failed webhooks are piling up',
      `${sisaGagal} webhook events are in GAGAL status. Check the webhook panel and Xendit.`,
    )

  return { ok: true, processed }
}

export async function retensiJob(): Promise<JobResult> {
  const now = realClock.now()
  const webhookHari = envAngka('RETENSI_WEBHOOK_PAYLOAD_HARI', 90)
  const snapshotHari = envAngka('RETENSI_IDEMPOTENCY_SNAPSHOT_HARI', 30)
  const tokenHari = envAngka('RETENSI_TOKEN_HARI', 30)

  const webhook = await retensiRepo.kosongkanWebhookPayload(
    new Date(now.getTime() - webhookHari * DAY_MS),
  )
  const snapshot = await retensiRepo.kosongkanSnapshotIdempotency(
    new Date(now.getTime() - snapshotHari * DAY_MS),
  )
  const tokenCutoff = new Date(now.getTime() - tokenHari * DAY_MS)
  const refresh = await retensiRepo.hapusRefreshKedaluwarsa(tokenCutoff)
  const email = await retensiRepo.hapusEmailToken(tokenCutoff)
  const emailOtp = await retensiRepo.hapusEmailOtp(tokenCutoff)

  return {
    ok: true,
    processed: webhook.count + snapshot.count + refresh + email.count + emailOtp.count,
  }
}

export async function autoKonfirmasiJob(): Promise<JobResult> {
  const now = realClock.now()
  const maxTanpaRevealHari = envAngka('GARANSI_MAKS_TANPA_REVEAL_HARI', 30)
  const garansiHari = envAngka('GARANSI_HARI', 3)
  let processed = 0

  const belumMulai = await transactionRepo.listWarrantyNotStarted(
    new Date(now.getTime() - maxTanpaRevealHari * DAY_MS),
  )
  for (const row of belumMulai) {
    const fresh = await transactionRepo.findById(row.id)
    if (!fresh?.paidAt) continue
    const startsAt = new Date(fresh.paidAt.getTime() + maxTanpaRevealHari * DAY_MS)
    if (await transactionRepo.setWarrantyStart(row.id, startsAt)) processed++
  }

  const habis = await transactionRepo.listWarrantyExpired(
    new Date(now.getTime() - garansiHari * DAY_MS),
  )
  for (const row of habis) {
    const cutoff = new Date(now.getTime() - garansiHari * DAY_MS)
    if (await transactionRepo.autoConfirm(row.id, cutoff, now)) processed++
  }

  return { ok: true, processed }
}
