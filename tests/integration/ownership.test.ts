import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '../helpers/db'
import { buatAkun, buatTransaksi, dasar } from '../helpers/fixtures'
import * as transactionRepo from '../../src/repositories/transaction-repo'

beforeEach(resetDb)
afterAll(async () => {
  await prisma.$disconnect()
})

describe('object-level authorization transaksi', () => {
  it('query pembeli lain tidak pernah menemukan transaksi orang lain', async () => {
    const a = await dasar()
    const b = await prisma.user.create({
      data: {
        username: `buyer-b-${Date.now()}`,
        email: `buyer-b-${Date.now()}@test.local`,
        emailVerified: true,
        passwordHash: 'hash',
        roleId: a.role.id,
      },
    })
    const account = await buatAkun({ gameId: a.game.id, adminId: a.user.id, status: 'SOLD' })
    const trx = await buatTransaksi({ accountId: account.id, buyerId: a.user.id, status: 'PAID' })

    expect(await transactionRepo.findOwnedByCode(trx.code, a.user.id)).not.toBeNull()
    expect(await transactionRepo.findOwnedByCode(trx.code, b.id)).toBeNull()
    expect(await transactionRepo.findStatus(trx.code, a.user.id)).not.toBeNull()
    expect(await transactionRepo.findStatus(trx.code, b.id)).toBeNull()
    expect(await transactionRepo.findOwnedForReveal(trx.code, a.user.id)).not.toBeNull()
    expect(await transactionRepo.findOwnedForReveal(trx.code, b.id)).toBeNull()
  })
})
