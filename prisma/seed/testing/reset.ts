import { PROMO_PREFIX, SLUG_PREFIX, VOUCHER_CODES } from './config'
import type { SeedDb } from './types'

export async function resetFixtures(db: SeedDb): Promise<void> {
  const testAkun = await db.gameAccount.findMany({
    where: { slug: { startsWith: SLUG_PREFIX } },
    select: { id: true },
  })
  const akunIds = testAkun.map((row) => row.id)
  const testVoucher = await db.voucher.findMany({
    where: { code: { in: [...VOUCHER_CODES] } },
    select: { id: true },
  })
  const voucherIds = testVoucher.map((row) => row.id)

  const transaction = await db.transaction.count({
    where: {
      OR: [{ accountId: { in: akunIds } }, { voucherId: { in: voucherIds } }],
    },
  })
  if (transaction > 0)
    throw new Error(`Refusing --reset: ${transaction} transaction(s) reference test fixtures. Clean those first.`)

  await db.voucherUsage.deleteMany({ where: { voucherId: { in: voucherIds } } })
  await db.voucher.deleteMany({ where: { id: { in: voucherIds } } })
  await db.promotion.deleteMany({ where: { name: { startsWith: PROMO_PREFIX } } })
  await db.accountPhoto.deleteMany({ where: { accountId: { in: akunIds } } })
  await db.gameAccount.deleteMany({ where: { id: { in: akunIds } } })
  console.log(`Reset: accounts ${akunIds.length}, vouchers ${voucherIds.length}, promos deleted`)
}
