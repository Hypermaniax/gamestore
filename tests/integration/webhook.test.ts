import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

import { prisma, resetDb } from '../helpers/db'
import {
  buatAkun,
  buatPembayaran,
  buatTransaksi,
  dasar,
  payloadPaid,
  payloadTerminal,
} from '../helpers/fixtures'
import { paymentService } from '../../src/services/payment.service'
import { autoKonfirmasiJob, expiryJob, webhookRetryJob } from '../../src/jobs/handlers'

beforeEach(resetDb)
afterAll(async () => {
  await prisma.$disconnect()
})

async function bacaTransaksi(id: bigint) {
  return prisma.transaction.findUniqueOrThrow({ where: { id } })
}

describe('webhook Xendit — state machine', () => {
  it('PAID pada RESERVED menandai lunas, akun SOLD, event DIPROSES', async () => {
    const { user, game } = await dasar()
    const account = await buatAkun({ gameId: game.id, adminId: user.id, status: 'RESERVED' })
    const trx = await buatTransaksi({ accountId: account.id, buyerId: user.id })
    const pay = await buatPembayaran({ transactionId: trx.id })

    const hasil = await paymentService.handleXenditWebhook(
      payloadPaid(pay.externalId, 'dana-paid-1'),
    )

    expect(hasil).toEqual({ ok: true, data: { status: 'DIPROSES' } })
    const [transaction, payment, akunBaru, event] = await Promise.all([
      bacaTransaksi(trx.id),
      prisma.payment.findUniqueOrThrow({ where: { id: pay.id } }),
      prisma.gameAccount.findUniqueOrThrow({ where: { id: account.id } }),
      prisma.webhookEvent.findUniqueOrThrow({
        where: { type_incomingFundId: { type: 'QRIS', incomingFundId: 'dana-paid-1:PAID' } },
      }),
    ])
    expect(transaction.status).toBe('PAID')
    expect(transaction.paidAt).not.toBeNull()
    expect(payment.status).toBe('PAID')
    expect(akunBaru.status).toBe('SOLD')
    expect(event.status).toBe('DIPROSES')
  })

  it('event duplikat tidak diproses dua kali', async () => {
    const { user, game } = await dasar()
    const account = await buatAkun({ gameId: game.id, adminId: user.id, status: 'RESERVED' })
    const trx = await buatTransaksi({ accountId: account.id, buyerId: user.id })
    const pay = await buatPembayaran({ transactionId: trx.id })
    const payload = payloadPaid(pay.externalId, 'dana-duplikat-1')

    await paymentService.handleXenditWebhook(payload)
    const kedua = await paymentService.handleXenditWebhook(payload)

    expect(kedua).toEqual({ ok: true, data: { status: 'DUPLIKAT' } })
    expect(await prisma.webhookEvent.count()).toBe(1)
    expect((await bacaTransaksi(trx.id)).status).toBe('PAID')
  })

  it('nominal tidak cocok membuat event GAGAL dan transaksi tetap RESERVED', async () => {
    const { user, game } = await dasar()
    const account = await buatAkun({ gameId: game.id, adminId: user.id, status: 'RESERVED' })
    const trx = await buatTransaksi({ accountId: account.id, buyerId: user.id })
    const pay = await buatPembayaran({ transactionId: trx.id })

    await expect(
      paymentService.handleXenditWebhook(payloadPaid(pay.externalId, 'dana-salah-1', '999')),
    ).rejects.toThrow('Webhook amount does not match the invoice.')

    const event = await prisma.webhookEvent.findFirstOrThrow()
    expect(event.status).toBe('GAGAL')
    expect((await bacaTransaksi(trx.id)).status).toBe('RESERVED')
  })

  it('event terminal setelah PAID diabaikan', async () => {
    const { user, game } = await dasar()
    const account = await buatAkun({ gameId: game.id, adminId: user.id, status: 'RESERVED' })
    const trx = await buatTransaksi({ accountId: account.id, buyerId: user.id })
    const pay = await buatPembayaran({ transactionId: trx.id })

    await paymentService.handleXenditWebhook(payloadPaid(pay.externalId, 'dana-urut-1'))
    const hasil = await paymentService.handleXenditWebhook(
      payloadTerminal(pay.externalId, 'dana-urut-2', 'EXPIRED'),
    )

    expect(hasil.ok).toBe(true)
    expect((await bacaTransaksi(trx.id)).status).toBe('PAID')
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: pay.id } })).toMatchObject({
      status: 'PAID',
    })
  })

  it('telat bayar setelah EXPIRED mereserve ulang akun dan mengonsumsi ulang voucher', async () => {
    const { user, game } = await dasar()
    const account = await buatAkun({ gameId: game.id, adminId: user.id, status: 'AVAILABLE' })
    const voucher = await prisma.voucher.create({
      data: {
        code: `V-${Date.now()}`,
        type: 'NOMINAL',
        value: '10000',
        quota: 1,
        used: 0,
        validUntil: new Date(Date.now() + 86_400_000),
        active: true,
      },
    })
    const trx = await buatTransaksi({
      accountId: account.id,
      buyerId: user.id,
      status: 'EXPIRED',
      voucherId: voucher.id,
    })
    await prisma.voucherUsage.create({
      data: {
        voucherId: voucher.id,
        userId: user.id,
        transactionId: trx.id,
        status: 'DIPULIHKAN',
        restoredAt: new Date(),
      },
    })
    const pay = await buatPembayaran({ transactionId: trx.id, status: 'EXPIRED' })

    await paymentService.handleXenditWebhook(payloadPaid(pay.externalId, 'dana-telat-1'))

    expect((await bacaTransaksi(trx.id)).status).toBe('PAID')
    expect(await prisma.gameAccount.findUniqueOrThrow({ where: { id: account.id } })).toMatchObject({
      status: 'SOLD',
    })
    const voucherBaru = await prisma.voucher.findUniqueOrThrow({ where: { id: voucher.id } })
    const usages = await prisma.voucherUsage.findUniqueOrThrow({
      where: { voucherId_userId: { voucherId: voucher.id, userId: user.id } },
    })
    expect(voucherBaru.used).toBe(1)
    expect(usages.status).toBe('TERPAKAI')
  })

  it('telat bayar saat akun sudah terjual menjadi NEEDS_REFUND', async () => {
    const { user, game } = await dasar()
    const account = await buatAkun({ gameId: game.id, adminId: user.id, status: 'SOLD' })
    const trx = await buatTransaksi({ accountId: account.id, buyerId: user.id, status: 'EXPIRED' })
    const pay = await buatPembayaran({ transactionId: trx.id, status: 'PENDING' })

    await paymentService.handleXenditWebhook(payloadPaid(pay.externalId, 'dana-telat-2'))

    expect((await bacaTransaksi(trx.id)).status).toBe('NEEDS_REFUND')
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: pay.id } })).toMatchObject({
      status: 'PAID',
    })
  })

  it('pembayaran kedua pada transaksi PAID menjadi DUPLIKAT', async () => {
    const { user, game } = await dasar()
    const account = await buatAkun({ gameId: game.id, adminId: user.id, status: 'SOLD' })
    const trx = await buatTransaksi({
      accountId: account.id,
      buyerId: user.id,
      status: 'PAID',
      paidAt: new Date(),
    })
    await buatPembayaran({ transactionId: trx.id, status: 'PAID' })
    const kedua = await buatPembayaran({ transactionId: trx.id, status: 'PENDING' })

    await paymentService.handleXenditWebhook(payloadPaid(kedua.externalId, 'dana-ganda-1'))

    expect((await bacaTransaksi(trx.id)).status).toBe('PAID')
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: kedua.id } })).toMatchObject({
      status: 'DUPLIKAT',
    })
  })

  it('dana masuk tagihan lama setelah ganti metode tetap diterima', async () => {
    const { user, game } = await dasar()
    const account = await buatAkun({ gameId: game.id, adminId: user.id, status: 'RESERVED' })
    const trx = await buatTransaksi({ accountId: account.id, buyerId: user.id })
    const lama = await buatPembayaran({ transactionId: trx.id, status: 'CANCELLED' })
    const baru = await buatPembayaran({ transactionId: trx.id, status: 'PENDING', method: 'VA' })

    await paymentService.handleXenditWebhook(
      payloadPaid(lama.externalId, 'dana-lama-1', '100000', 'VA'),
    )

    const [transaction, pembayaranLama, pembayaranBaru, akunBaru] = await Promise.all([
      bacaTransaksi(trx.id),
      prisma.payment.findUniqueOrThrow({ where: { id: lama.id } }),
      prisma.payment.findUniqueOrThrow({ where: { id: baru.id } }),
      prisma.gameAccount.findUniqueOrThrow({ where: { id: account.id } }),
    ])
    expect(transaction.status).toBe('PAID')
    expect(pembayaranLama.status).toBe('PAID')
    expect(pembayaranBaru.status).toBe('CANCELLED')
    expect(akunBaru.status).toBe('SOLD')
  })

  it('EXPIRED pada RESERVED melepas akun', async () => {
    const { user, game } = await dasar()
    const account = await buatAkun({ gameId: game.id, adminId: user.id, status: 'RESERVED' })
    const trx = await buatTransaksi({ accountId: account.id, buyerId: user.id })
    const pay = await buatPembayaran({ transactionId: trx.id })

    await paymentService.handleXenditWebhook(
      payloadTerminal(pay.externalId, 'dana-exp-1', 'EXPIRED'),
    )

    expect((await bacaTransaksi(trx.id)).status).toBe('EXPIRED')
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: pay.id } })).toMatchObject({
      status: 'EXPIRED',
    })
    expect(await prisma.gameAccount.findUniqueOrThrow({ where: { id: account.id } })).toMatchObject({
      status: 'AVAILABLE',
    })
  })
})

describe('job webhook & transaksi', () => {
  it('WebhookRetryJob memproses ulang event GAGAL setelah pembayaran tersedia', async () => {
    const { user, game } = await dasar()
    const externalId = `retry-${Date.now()}`
    const payload = payloadPaid(externalId, 'dana-retry-1')

    await expect(paymentService.handleXenditWebhook(payload)).rejects.toThrow()
    expect((await prisma.webhookEvent.findFirstOrThrow()).status).toBe('GAGAL')

    const account = await buatAkun({ gameId: game.id, adminId: user.id, status: 'RESERVED' })
    const trx = await buatTransaksi({ accountId: account.id, buyerId: user.id })
    await buatPembayaran({ transactionId: trx.id, externalId })

    const hasil = await webhookRetryJob()

    expect(hasil.processed).toBe(1)
    expect((await prisma.webhookEvent.findFirstOrThrow()).status).toBe('DIPROSES')
    expect((await bacaTransaksi(trx.id)).status).toBe('PAID')
  })

  it('ExpiryJob mengakhiri transaksi RESERVED dan membatalkan tagihan', async () => {
    const { user, game } = await dasar()
    const account = await buatAkun({ gameId: game.id, adminId: user.id, status: 'RESERVED' })
    const trx = await buatTransaksi({ accountId: account.id, buyerId: user.id })
    const pay = await buatPembayaran({ transactionId: trx.id })

    const hasil = await expiryJob()

    expect(hasil.processed).toBe(1)
    expect((await bacaTransaksi(trx.id)).status).toBe('EXPIRED')
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: pay.id } })).toMatchObject({
      status: 'CANCELLED',
    })
    expect(await prisma.gameAccount.findUniqueOrThrow({ where: { id: account.id } })).toMatchObject({
      status: 'AVAILABLE',
    })
  })

  it('AutoKonfirmasiJob menutup transaksi lewat batas garansi tanpa reveal', async () => {
    const { user, game } = await dasar()
    const account = await buatAkun({ gameId: game.id, adminId: user.id, status: 'SOLD' })
    const paidAt = new Date(Date.now() - 40 * 86_400_000)
    const trx = await buatTransaksi({
      accountId: account.id,
      buyerId: user.id,
      status: 'PAID',
      paidAt,
    })

    await autoKonfirmasiJob()

    const transaction = await bacaTransaksi(trx.id)
    expect(transaction.warrantyStart).not.toBeNull()
    expect(transaction.receiptConfirmed).toBe(true)
    expect(transaction.confirmedBy).toBe('OTOMATIS')
  })
})
