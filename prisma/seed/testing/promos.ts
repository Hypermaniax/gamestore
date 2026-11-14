import { PROMO_PREFIX } from './config'
import type { SeedDb } from './types'

type PromotionSeed = {
  name: string
  type: 'PERSEN' | 'NOMINAL'
  value: string
  maxDiscount: string | null
  scope: 'AKUN' | 'GAME' | 'SEMUA'
  targetId: bigint | null
  startsAt: Date
  endsAt: Date
  active: boolean
}

async function ensurePromo(db: SeedDb, data: PromotionSeed) {
  const existing = await db.promotion.findFirst({ where: { name: data.name } })
  if (existing) return db.promotion.update({ where: { id: existing.id }, data })
  return db.promotion.create({ data })
}

export async function seedPromos(db: SeedDb, akunIds: Map<string, bigint>) {
  const ml = await db.game.findUnique({ where: { code: 'ML' } })
  if (!ml) throw new Error('Game ML missing. Run the base seed first: npx tsx prisma/seed.ts')
  const targetAkun = akunIds.get('ML-4')
  if (!targetAkun) throw new Error('Fixture akun ML-4 missing — run seedAccounts first')

  const now = Date.now()
  const day = 86_400_000
  await ensurePromo(db, {
    name: `${PROMO_PREFIX}Semua 10%`,
    type: 'PERSEN',
    value: '10',
    maxDiscount: '50000',
    scope: 'SEMUA',
    targetId: null,
    startsAt: new Date(now - day),
    endsAt: new Date(now + 30 * day),
    active: true,
  })
  await ensurePromo(db, {
    name: `${PROMO_PREFIX}Mobile Legends 20%`,
    type: 'PERSEN',
    value: '20',
    maxDiscount: '100000',
    scope: 'GAME',
    targetId: ml.id,
    startsAt: new Date(now - day),
    endsAt: new Date(now + 30 * day),
    active: true,
  })
  await ensurePromo(db, {
    name: `${PROMO_PREFIX}Akun Termahal Potongan 50K`,
    type: 'NOMINAL',
    value: '50000',
    maxDiscount: null,
    scope: 'AKUN',
    targetId: targetAkun,
    startsAt: new Date(now - day),
    endsAt: new Date(now + 30 * day),
    active: true,
  })
  await ensurePromo(db, {
    name: `${PROMO_PREFIX}Kedaluwarsa 25%`,
    type: 'PERSEN',
    value: '25',
    maxDiscount: '75000',
    scope: 'SEMUA',
    targetId: null,
    startsAt: new Date(now - 60 * day),
    endsAt: new Date(now - day),
    active: true,
  })
  await ensurePromo(db, {
    name: `${PROMO_PREFIX}Nonaktif 15%`,
    type: 'PERSEN',
    value: '15',
    maxDiscount: null,
    scope: 'SEMUA',
    targetId: null,
    startsAt: new Date(now - day),
    endsAt: new Date(now + 30 * day),
    active: false,
  })
}
