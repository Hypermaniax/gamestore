import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '../helpers/db'
import { buatAkun, buatPembayaran, buatTransaksi, dasar } from '../helpers/fixtures'
import * as accountRepo from '../../src/repositories/account-repo'
import * as pageRepo from '../../src/repositories/page-repo'
import * as reportRepo from '../../src/repositories/report-repo'

beforeEach(resetDb)
afterAll(async () => {
  await prisma.$disconnect()
})

describe('katalog publik', () => {
  it('hanya menampilkan akun AVAILABLE yang belum dihapus dan menghormati urutan harga', async () => {
    const { user, game } = await dasar()
    const mahal = await buatAkun({ gameId: game.id, adminId: user.id, status: 'AVAILABLE', price: '200000' })
    const murah = await buatAkun({ gameId: game.id, adminId: user.id, status: 'AVAILABLE', price: '100000' })
    await buatAkun({ gameId: game.id, adminId: user.id, status: 'DELISTED', price: '50000' })
    const dihapus = await buatAkun({ gameId: game.id, adminId: user.id, status: 'AVAILABLE', price: '75000' })
    await prisma.gameAccount.update({ where: { id: dihapus.id }, data: { deletedAt: new Date() } })

    const rows = await accountRepo.listPublic({ sort: 'termurah', skip: 0, take: 10 })

    expect(rows.map((row) => row.id)).toEqual([murah.id, mahal.id])
    expect(await accountRepo.countPublic({})).toBe(2)
  })
})

describe('halaman statis', () => {
  it('publish membekukan versi dan draf baru tidak bocor ke publik', async () => {
    const { user } = await dasar()
    await prisma.staticPage.create({
      data: { code: 'uji-halaman', title: 'Versi 1', bodyMarkdown: 'isi v1', version: 0 },
    })

    const v1 = await pageRepo.publish('uji-halaman', user.id)
    expect(v1?.version).toBe(1)
    expect((await pageRepo.findByCode('uji-halaman'))?.bodyMarkdown).toBe('isi v1')

    await pageRepo.updateDraft('uji-halaman', { title: 'Draf 2', bodyMarkdown: 'isi draf' })
    expect((await pageRepo.findByCode('uji-halaman'))?.bodyMarkdown).toBe('isi v1')

    const v2 = await pageRepo.publish('uji-halaman', user.id)
    expect(v2?.version).toBe(2)
    expect((await pageRepo.findByCode('uji-halaman'))?.bodyMarkdown).toBe('isi draf')
    expect((await pageRepo.findVersion('uji-halaman', 1))?.bodyMarkdown).toBe('isi v1')
  })
})

describe('laporan', () => {
  it('mengagregasi sales per tanggal Jakarta, per game, dan refund', async () => {
    const { user, game } = await dasar()
    const from = new Date('2026-11-12T17:00:00.000Z')
    const to = new Date('2026-11-13T17:00:00.000Z')

    const akunA = await buatAkun({ gameId: game.id, adminId: user.id, status: 'SOLD' })
    const trxA = await buatTransaksi({
      accountId: akunA.id,
      buyerId: user.id,
      status: 'PAID',
      total: '100000',
      paidAt: new Date('2026-11-13T16:30:00.000Z'),
    })
    const payA = await buatPembayaran({ transactionId: trxA.id, status: 'PAID' })

    const akunB = await buatAkun({ gameId: game.id, adminId: user.id, status: 'SOLD' })
    await buatTransaksi({
      accountId: akunB.id,
      buyerId: user.id,
      status: 'PAID',
      total: '200000',
      paidAt: new Date('2026-11-13T17:30:00.000Z'),
    })

    await prisma.refund.create({
      data: {
        paymentId: payA.id,
        transactionId: trxA.id,
        amount: '25000',
        fee: '1000',
        reference: 'REF-UJI',
        adminId: user.id,
        refundedAt: new Date('2026-11-13T10:00:00.000Z'),
      },
    })

    const harian = await reportRepo.sales(from, to)
    expect(harian).toHaveLength(1)
    expect(harian[0]).toMatchObject({ tanggal: '2026-11-13', amount: 1, total: '100000' })

    const perGame = await reportRepo.salesByGame(from, to)
    expect(perGame).toHaveLength(1)
    expect(perGame[0]).toMatchObject({ code: game.code, amount: 1, total: '100000' })

    const refund = await reportRepo.refunds(from, to)
    expect(refund).toHaveLength(1)
    expect(refund[0]).toMatchObject({ tanggal: '2026-11-13', amount: 1, value: '25000', fee: '1000' })
  })
})
