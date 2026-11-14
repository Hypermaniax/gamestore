import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

import { prisma, resetDb } from '../helpers/db'
import { buatAkun, buatPembayaran, buatTransaksi, dasar, payloadPaid } from '../helpers/fixtures'
import { POST } from '../../app/api/v1/payments/webhook/xendit/route'

const TOKEN = 'token-webhook-uji'

function request(body: unknown, token: string | null = TOKEN) {
  return new Request('http://localhost/api/v1/payments/webhook/xendit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-callback-token': token } : {}),
    },
    body: JSON.stringify(body),
  })
}

beforeEach(async () => {
  process.env.XENDIT_CALLBACK_TOKEN = TOKEN
  await resetDb()
})

afterAll(async () => {
  process.env.XENDIT_CALLBACK_TOKEN = ''
  await prisma.$disconnect()
})

describe('POST /api/v1/payments/webhook/xendit', () => {
  it('menolak request tanpa callback token', async () => {
    const response = await POST(request({}, null))
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ ok: false, code: 'FORBIDDEN' })
  })

  it('menolak JSON yang tidak valid', async () => {
    const response = await POST(
      new Request('http://localhost/api/v1/payments/webhook/xendit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-callback-token': TOKEN },
        body: '{rusak',
      }),
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ ok: false, code: 'PAYLOAD_INVALID' })
  })

  it('memproses pembayaran valid dan mengembalikan 200', async () => {
    const { user, game } = await dasar()
    const account = await buatAkun({ gameId: game.id, adminId: user.id, status: 'RESERVED' })
    const trx = await buatTransaksi({ accountId: account.id, buyerId: user.id })
    const pay = await buatPembayaran({ transactionId: trx.id })

    const response = await POST(request(payloadPaid(pay.externalId, 'route-dana-1')))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, data: { status: 'DIPROSES' } })
    expect(await prisma.transaction.findUniqueOrThrow({ where: { id: trx.id } })).toMatchObject({
      status: 'PAID',
    })
  })

  it('mengembalikan 500 saat nominal tidak cocok', async () => {
    const { user, game } = await dasar()
    const account = await buatAkun({ gameId: game.id, adminId: user.id, status: 'RESERVED' })
    const trx = await buatTransaksi({ accountId: account.id, buyerId: user.id })
    const pay = await buatPembayaran({ transactionId: trx.id })

    const response = await POST(request(payloadPaid(pay.externalId, 'route-dana-2', '1')))

    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ ok: false, code: 'WEBHOOK_FAILED' })
    expect((await prisma.webhookEvent.findFirstOrThrow()).status).toBe('GAGAL')
  })
})
