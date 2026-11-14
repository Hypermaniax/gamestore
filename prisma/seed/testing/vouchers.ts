import type { SeedDb } from './types'

type VoucherSeed = {
  code: string
  type: 'PERSEN' | 'NOMINAL'
  value: string
  quota: number
  used: number
  minPurchase: string | null
  maxDiscount: string | null
  validUntil: Date
  active: boolean
}

async function ensureVoucher(db: SeedDb, data: VoucherSeed) {
  return db.voucher.upsert({
    where: { code: data.code },
    update: {
      type: data.type,
      value: data.value,
      quota: data.quota,
      minPurchase: data.minPurchase,
      maxDiscount: data.maxDiscount,
      validUntil: data.validUntil,
      active: data.active,
    },
    create: data,
  })
}

export async function seedVouchers(db: SeedDb) {
  const now = Date.now()
  const expiry = new Date(now + 30 * 86_400_000)
  await ensureVoucher(db, {
    code: 'NEXA10',
    type: 'PERSEN',
    value: '10',
    quota: 100,
    used: 0,
    minPurchase: null,
    maxDiscount: '50000',
    validUntil: expiry,
    active: true,
  })
  await ensureVoucher(db, {
    code: 'NEXAHEMAT50K',
    type: 'NOMINAL',
    value: '50000',
    quota: 20,
    used: 0,
    minPurchase: '300000',
    maxDiscount: null,
    validUntil: expiry,
    active: true,
  })
  await ensureVoucher(db, {
    code: 'NEXAMAKS25K',
    type: 'PERSEN',
    value: '20',
    quota: 50,
    used: 0,
    minPurchase: null,
    maxDiscount: '25000',
    validUntil: expiry,
    active: true,
  })
  await ensureVoucher(db, {
    code: 'NEXAHABIS',
    type: 'NOMINAL',
    value: '10000',
    quota: 5,
    used: 5,
    minPurchase: null,
    maxDiscount: null,
    validUntil: expiry,
    active: true,
  })
  await ensureVoucher(db, {
    code: 'NEXAKEDALUWARSA',
    type: 'PERSEN',
    value: '10',
    quota: 10,
    used: 0,
    minPurchase: null,
    maxDiscount: null,
    validUntil: new Date(now - 86_400_000),
    active: true,
  })
  await ensureVoucher(db, {
    code: 'NEXANONAKTIF',
    type: 'PERSEN',
    value: '10',
    quota: 10,
    used: 0,
    minPurchase: null,
    maxDiscount: null,
    validUntil: expiry,
    active: false,
  })
}
