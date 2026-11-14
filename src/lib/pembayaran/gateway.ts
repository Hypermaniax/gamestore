// Payment gateway adapter — Xendit in production, deterministic mock in dev.
// The rest of the app only sees this interface, so callback payload shapes and
// provider-specific fields stay out of the transaction service.

import { createHash } from 'node:crypto'
import type { MetodePembayaran, VABank } from './metode'

export type PaymentInstructions = {
  qrString?: string
  vaNumber?: string
  bank?: string
  expiresAt: string
}

export type CreatePaymentInput = {
  externalId: string
  amount: bigint
  method: MetodePembayaran
  bank?: VABank
  expiresAt: Date
  description: string
  namaToko: string
  customer: { name: string; email: string }
}

export type CreatedPayment = {
  providerId: string
  instructions: PaymentInstructions
  raw: Record<string, unknown>
}

export type FetchedPaymentStatus =
  | { status: 'PAID'; incomingFundId: string; amount: bigint | null }
  | { status: 'FAILED'; incomingFundId: string; amount: bigint | null }
  | { status: 'PENDING' }
  | { status: 'UNSUPPORTED'; alasan: string }

export type FetchPaymentInput = {
  providerId: string
  externalId: string
  method: MetodePembayaran
}

export class PaymentGatewayError extends Error {
  permanent: boolean

  constructor(message: string, permanent: boolean) {
    super(message)
    this.name = 'PaymentGatewayError'
    this.permanent = permanent
  }
}

function callbackUrl(): string {
  return `${process.env.APP_BASE_URL ?? 'http://localhost:3000'}/api/v1/payments/webhook/xendit`
}

function mockPayment(input: CreatePaymentInput): CreatedPayment {
  const seed = createHash('sha256').update(input.externalId).digest('hex')
  const vaNumber = `8808${seed.slice(0, 8).replace(/\D/g, '0')}`
  const instructions: PaymentInstructions =
    input.method === 'QRIS'
      ? {
          qrString: `MOCK-QRIS|${input.externalId}|${input.amount.toString()}`,
          expiresAt: input.expiresAt.toISOString(),
        }
      : {
          vaNumber,
          bank: input.bank,
          expiresAt: input.expiresAt.toISOString(),
        }

  return {
    providerId: `mock-${input.externalId}`,
    instructions,
    raw: { mock: true, externalId: input.externalId, method: input.method, bank: input.bank ?? null },
  }
}

async function xenditFetch(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
): Promise<unknown> {
  const secret = process.env.XENDIT_SECRET_KEY
  if (!secret) throw new PaymentGatewayError('Xendit secret is not configured.', false)

  const base = process.env.XENDIT_BASE_URL ?? 'https://api.xendit.co'
  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${secret}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        ...(body?.external_id ? { 'Idempotency-key': String(body.external_id) } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15_000),
    })
  } catch (err) {
    throw new PaymentGatewayError(`Cannot reach Xendit: ${(err as Error).message}`, false)
  }

  const text = await response.text()
  let parsed: unknown = {}
  try {
    parsed = text ? (JSON.parse(text) as unknown) : {}
  } catch {
    parsed = { raw: text }
  }
  if (!response.ok) {
    const message =
      parsed && typeof parsed === 'object' && 'message' in parsed && typeof parsed.message === 'string'
        ? parsed.message
        : `Xendit rejected the request (${response.status}).`
    throw new PaymentGatewayError(message, response.status >= 400 && response.status < 500)
  }
  return parsed
}

async function xenditRequest(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const parsed = await xenditFetch('POST', path, body)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : { raw: parsed }
}

function readQrPayment(raw: unknown): FetchedPaymentStatus | null {
  if (!Array.isArray(raw)) return null
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const status = typeof row.status === 'string' ? row.status.toUpperCase() : ''
    if (status !== 'SUCCEEDED' && status !== 'PAID') continue
    const id = typeof row.id === 'string' ? row.id : null
    if (!id) continue
    const amountRaw = row.amount
    const amount =
      typeof amountRaw === 'number' || typeof amountRaw === 'string'
        ? BigInt(Math.round(Number(amountRaw)))
        : null
    return { status: 'PAID', incomingFundId: id, amount }
  }
  return null
}

export const paymentGateway = {
  mode(): 'xendit' | 'mock' {
    return process.env.XENDIT_SECRET_KEY ? 'xendit' : 'mock'
  },

  async create(input: CreatePaymentInput): Promise<CreatedPayment> {
    if (this.mode() === 'mock') {
      if (process.env.NODE_ENV === 'production')
        throw new PaymentGatewayError('Xendit secret is not configured.', false)
      return mockPayment(input)
    }

    if (input.method === 'QRIS') {
      const raw = await xenditRequest('/qr_codes', {
        external_id: input.externalId,
        type: 'DYNAMIC',
        callback_url: callbackUrl(),
        amount: Number(input.amount),
      })
      return {
        providerId: String(raw.id ?? ''),
        instructions: {
          qrString: typeof raw.qr_string === 'string' ? raw.qr_string : undefined,
          expiresAt:
            typeof raw.expires_at === 'string' ? raw.expires_at : input.expiresAt.toISOString(),
        },
        raw,
      }
    }

    if (!input.bank) throw new PaymentGatewayError('VA bank is required.', true)
    const raw = await xenditRequest('/callback_virtual_accounts', {
      external_id: input.externalId,
      bank_code: input.bank,
      name: input.namaToko,
      expected_amount: Number(input.amount),
      is_closed: true,
      expiration_date: input.expiresAt.toISOString(),
      callback_url: callbackUrl(),
    })
    return {
      providerId: String(raw.id ?? ''),
      instructions: {
        vaNumber: typeof raw.account_number === 'string' ? raw.account_number : undefined,
        bank: input.bank,
        expiresAt:
          typeof raw.expiration_date === 'string'
            ? raw.expiration_date
            : input.expiresAt.toISOString(),
      },
      raw,
    }
  },

  /**
   * Poll the provider for a QRIS payment status. VA status is callback-only, so
   * it is reported as unsupported instead of guessing from the VA lifecycle.
   */
  async fetchStatus(input: FetchPaymentInput): Promise<FetchedPaymentStatus> {
    if (this.mode() === 'mock')
      return { status: 'UNSUPPORTED', alasan: 'Mock mode has no provider status.' }
    if (input.method !== 'QRIS')
      return { status: 'UNSUPPORTED', alasan: 'VA status is only available through the Xendit webhook.' }
    if (!input.providerId)
      return { status: 'UNSUPPORTED', alasan: 'Xendit QRIS ID has not been saved.' }

    const query = new URLSearchParams({ external_id: input.externalId, limit: '10' })
    const raw = await xenditFetch('GET', `/qr_codes/payments?${query.toString()}`)
    return readQrPayment(raw) ?? { status: 'PENDING' }
  },

  /** Best-effort cancel; the DB state is the source of truth for our UI. */
  async cancel(providerId: string | null, method: MetodePembayaran): Promise<void> {
    if (this.mode() === 'mock' || !providerId || method !== 'QRIS') return
    try {
      await xenditRequest(`/qr_codes/${encodeURIComponent(providerId)}/expire`, {})
    } catch {
      // A late webhook is handled by the payment state machine; never block cancel.
    }
  },
}
