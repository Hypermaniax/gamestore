import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '../helpers/db'
import { buatAkun, dasar } from '../helpers/fixtures'
import * as accountRepo from '../../src/repositories/account-repo'

beforeEach(resetDb)
afterAll(async () => {
  await prisma.$disconnect()
})

describe('filter akun admin', () => {
  it('memfilter akun berdasarkan game dan status tanpa mencampur game lain', async () => {
    const { user, game, type } = await dasar()
    const gameLain = await prisma.game.create({
      data: {
        code: `${game.code}-lain`,
        name: 'Game Lain',
        typeId: type.id,
        attributeSchema: [],
      },
    })

    const tersedia = await buatAkun({ gameId: game.id, adminId: user.id, status: 'AVAILABLE' })
    await buatAkun({ gameId: game.id, adminId: user.id, status: 'SOLD' })
    await buatAkun({ gameId: gameLain.id, adminId: user.id, status: 'AVAILABLE' })

    const semua = await accountRepo.listAdmin({ gameId: game.id, skip: 0, take: 20 })
    expect(semua).toHaveLength(2)
    expect(semua.every((row) => row.game.id === game.id)).toBe(true)

    const filter = { gameId: game.id, status: 'AVAILABLE' as const, skip: 0, take: 20 }
    const rows = await accountRepo.listAdmin(filter)
    expect(rows.map((row) => row.id)).toEqual([tersedia.id])
    expect(await accountRepo.countAdmin(filter)).toBe(1)
  })

  it('menghitung status dan mencari akun lewat slug', async () => {
    const { user, game } = await dasar()
    const tersedia = await buatAkun({ gameId: game.id, adminId: user.id, status: 'AVAILABLE' })
    await buatAkun({ gameId: game.id, adminId: user.id, status: 'AVAILABLE' })
    await buatAkun({ gameId: game.id, adminId: user.id, status: 'SOLD' })

    const counts = await accountRepo.countAdminByStatus({ gameId: game.id })
    expect(Object.fromEntries(counts.map((row) => [row.status, row.total]))).toEqual({
      AVAILABLE: 2,
      SOLD: 1,
    })

    const search = { q: tersedia.slug, skip: 0, take: 20 }
    expect((await accountRepo.listAdmin(search)).map((row) => row.id)).toEqual([tersedia.id])
    expect(await accountRepo.countAdmin(search)).toBe(1)
  })
})
