import { prisma } from './db'

let order = 0
const uniq = (prefix: string) => `${prefix}-${Date.now()}-${++order}`
const code = (prefix: string) => `${prefix}${Date.now().toString(36)}${order.toString(36)}`

export async function dasar() {
  const role = await prisma.role.create({ data: { code: 'PEMBELI', name: 'Pembeli' } })
  const user = await prisma.user.create({
    data: {
      username: uniq('buyer'),
      email: `${uniq('buyer')}@test.local`,
      emailVerified: true,
      passwordHash: 'test-hash',
      roleId: role.id,
    },
  })
  const type = await prisma.gameType.create({
    data: { code: code('j'), name: 'Jenis Uji' },
  })
  const game = await prisma.game.create({
    data: { code: code('g'), name: 'Game Uji', typeId: type.id, attributeSchema: [] },
  })
  return { role, user, type, game }
}

export function buatAkun(input: {
  gameId: bigint
  adminId: bigint
  status?: 'DELISTED' | 'AVAILABLE' | 'RESERVED' | 'SOLD'
  price?: string
}) {
  return prisma.gameAccount.create({
    data: {
      slug: uniq('akun'),
      gameId: input.gameId,
      adminId: input.adminId,
      title: 'Akun Uji',
      price: input.price ?? '100000',
      attributes: {},
      status: input.status ?? 'RESERVED',
      credentialsEncrypted: Buffer.from('ciphertext-uji'),
      keyVersion: 'v1',
    },
  })
}

export async function buatTransaksi(input: {
  accountId: bigint
  buyerId: bigint
  status?: string
  total?: string
  voucherId?: bigint | null
  paidAt?: Date | null
}) {
  const now = new Date()
  return prisma.transaction.create({
    data: {
      code: uniq('TRX'),
      accountId: input.accountId,
      buyerId: input.buyerId,
      initialPrice: input.total ?? '100000',
      promotionDiscount: '0',
      voucherDiscount: '0',
      total: input.total ?? '100000',
      status: input.status ?? 'RESERVED',
      termsVersion: 1,
      termsAcceptedAt: now,
      expiredAt: new Date(now.getTime() - 60_000),
      paidAt: input.paidAt ?? (input.status === 'PAID' ? now : null),
      voucherId: input.voucherId ?? null,
    },
  })
}

export function buatPembayaran(input: {
  transactionId: bigint
  externalId?: string
  status?: string
  amount?: string
  method?: 'QRIS' | 'VA'
}) {
  return prisma.payment.create({
    data: {
      transactionId: input.transactionId,
      method: input.method ?? 'QRIS',
      externalId: input.externalId ?? uniq('PAY'),
      status: input.status ?? 'PENDING',
      amount: input.amount ?? '100000',
      expiredAt: new Date(Date.now() + 30 * 60_000),
    },
  })
}

export function payloadPaid(externalId: string, id: string, amount = '100000', method: 'QRIS' | 'VA' = 'QRIS') {
  return {
    event: method === 'VA' ? 'virtual_account.paid' : 'qr.payment',
    data: {
      external_id: externalId,
      id,
      status: 'PAID',
      amount: Number(amount),
      ...(method === 'VA' ? { bank_code: 'BCA' } : {}),
    },
  }
}

export function payloadTerminal(
  externalId: string,
  id: string,
  status: 'EXPIRED' | 'FAILED',
  amount = '100000',
) {
  return {
    event: 'qr.payment',
    data: { external_id: externalId, id, status, amount: Number(amount) },
  }
}
