// Xendit webhook — the only public HTTP entry for payment updates (docs/API.md §4).

import { randomUUID } from 'node:crypto'
import { paymentService } from '@/src/services/payment.service'
import { safeEqual } from '@/src/lib/crypto'
import { errorDetail, logger } from '@/src/lib/logger'

function authorized(request: Request): boolean {
  const expected = process.env.XENDIT_CALLBACK_TOKEN
  if (!expected) return process.env.NODE_ENV !== 'production'
  const received = request.headers.get('x-callback-token') ?? ''
  return safeEqual(received, expected)
}

function reply(requestId: string, body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'x-request-id': requestId },
  })
}

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id')?.slice(0, 100) ?? randomUUID()

  if (!authorized(request)) {
    logger.warn('webhook.tidak-dizinkan', { requestId })
    return reply(requestId, { ok: false, code: 'FORBIDDEN' }, 401)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    logger.warn('webhook.payload-invalid', { requestId })
    return reply(requestId, { ok: false, code: 'PAYLOAD_INVALID' }, 400)
  }

  try {
    const result = await paymentService.handleXenditWebhook(payload)
    return reply(requestId, result)
  } catch (err) {
    logger.error('webhook.gagal', { requestId, error: errorDetail(err) })
    return reply(requestId, { ok: false, code: 'WEBHOOK_FAILED' }, 500)
  }
}
