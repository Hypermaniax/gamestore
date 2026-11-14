import { encryptString } from '../../../src/lib/crypto'
import { PHOTOS, PROMO_PREFIX, SLUG_PREFIX, TEST_EMAIL_DOMAIN, TEST_PASSWORD } from './config'
import { gameFixtures } from './data-games'
import type { SeedDb } from './types'

export type AccountSeedResult = {
  akunIds: Map<string, bigint>
  akunCount: number
  availableCount: number
}

export async function seedAccounts(db: SeedDb, adminId: bigint): Promise<AccountSeedResult> {
  const games = await db.game.findMany({
    where: { code: { in: gameFixtures.map((game) => game.code) } },
  })
  const gameByKode = new Map(games.map((game) => [game.code, game]))
  const missing = gameFixtures.filter((fixture) => !gameByKode.has(fixture.code)).map((fixture) => fixture.code)
  if (missing.length > 0)
    throw new Error(`Games missing (${missing.join(', ')}). Run the base seed first: npx tsx prisma/seed.ts`)

  const listedAt = new Date(Date.now() - 7 * 86_400_000)
  const akunIds = new Map<string, bigint>()
  let akunCount = 0
  let availableCount = 0

  for (const fixture of gameFixtures) {
    const game = gameByKode.get(fixture.code)!
    for (let index = 0; index < 7; index++) {
      const variant = fixture.variant(index)
      const slug = `${SLUG_PREFIX}${fixture.code.toLowerCase()}-${String(index + 1).padStart(2, '0')}`
      const status = index <= 4 ? 'AVAILABLE' : index === 5 ? 'RESERVED' : 'DELISTED'
      const hasCredential = status !== 'DELISTED' || fixture.code !== 'VLRT'
      const isListed = status === 'AVAILABLE' || status === 'RESERVED'
      const attributes: Record<string, string | number> = {
        rank: variant.rank,
        level: variant.level,
        ...variant.extra,
      }
      const data = {
        gameId: game.id,
        title: `${PROMO_PREFIX}${game.name} — ${variant.title}`,
        description:
          `Akun ${game.name} ${variant.title} siap pakai. Rank ${variant.rank}, level ${variant.level}. ` +
          `Full email, aman, bergaransi. Cocok untuk main ranked maupun koleksi.`,
        price: variant.price.toString(),
        attributes,
        status: 'DELISTED',
        credentialsEncrypted: null as Uint8Array<ArrayBuffer> | null,
        keyVersion: null as string | null,
        listedAt: null as Date | null,
        deletedAt: null,
        adminId,
      }
      const existing = await db.gameAccount.findUnique({ where: { slug }, select: { id: true } })
      const account = existing
        ? await db.gameAccount.update({ where: { id: existing.id }, data })
        : await db.gameAccount.create({ data: { ...data, slug } })

      // Two-phase: AAD needs akun:<id>, and the DB CHECK forbids AVAILABLE/RESERVED without credentials.
      if (hasCredential) {
        const encrypted = encryptString(
          `email:${slug}${TEST_EMAIL_DOMAIN} | password:${TEST_PASSWORD}`,
          `akun:${account.id}`,
        )
        await db.gameAccount.update({
          where: { id: account.id },
          data: {
            status,
            listedAt: isListed ? listedAt : null,
            credentialsEncrypted: encrypted.ciphertext,
            keyVersion: encrypted.keyVersion,
          },
        })
      } else {
        await db.gameAccount.update({
          where: { id: account.id },
          data: { status, listedAt: isListed ? listedAt : null },
        })
      }

      await db.accountPhoto.deleteMany({ where: { accountId: account.id } })
      const photoCount = 2 + (index % 2)
      await db.accountPhoto.createMany({
        data: Array.from({ length: photoCount }, (_, photoIndex) => ({
          accountId: account.id,
          url: PHOTOS[(index + photoIndex) % PHOTOS.length],
          order: photoIndex,
        })),
      })

      akunIds.set(`${fixture.code}-${index}`, account.id)
      akunCount++
      if (status === 'AVAILABLE') availableCount++
    }
  }

  return { akunIds, akunCount, availableCount }
}
