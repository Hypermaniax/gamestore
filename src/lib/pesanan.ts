// Buyer-facing order view types and copy. Pure module: safe for server and client.

export type CheckoutView = {
  user: { username: string; email: string; emailVerified: boolean }
  checkoutAktif: boolean
  account: {
    id: string
    slug: string
    title: string
    description: string | null
    price: string
    game: string
    gameKode: string
    type: string
    photo: string | null
    spesifikasi: string[]
  }
  promotion: { name: string; potongan: string } | null
  total: string
  syarat: { title: string; version: number; isi: string }
}

export type CheckoutDetailView = Omit<CheckoutView, 'user' | 'account'> & {
  user: CheckoutView['user'] | null
  account: CheckoutView['account'] & { photos: string[] }
}

export type PaymentView = {
  method: string
  externalId: string
  status: string
  bank: string | null
  instructions: unknown
  amount: string
  expiredAt: string
}

export type PesananDetailView = {
  code: string
  status: string
  initialPrice: string
  promotionDiscount: string
  voucherDiscount: string
  total: string
  promotion: { id: string; name: string } | null
  voucher: { id: string; code: string } | null
  account: { slug: string; title: string; game: { code: string; name: string } }
  payment: PaymentView[]
  createdAt: string
  expiredAt: string | null
  paidAt: string | null
  warrantyStart: string | null
  revealUntil: string | null
  receiptConfirmed: boolean
}

export type PesananListItem = {
  code: string
  status: string
  total: string
  createdAt: string
  expiredAt: string | null
  account: { slug: string; title: string }
  payment: { method: string; status: string; expiredAt: string }[]
}

export type InstructionView = {
  qrString?: string
  vaNumber?: string
  bank?: string
  expiresAt?: string
}

export type StatusTone = 'live' | 'paid' | 'warn' | 'dead' | 'neutral'

const STATUS: Record<string, { label: string; tone: StatusTone; hint: string }> = {
  RESERVED: {
    label: 'Awaiting payment',
    tone: 'live',
    hint: 'Complete payment before time runs out.',
  },
  PAID: {
    label: 'Paid',
    tone: 'paid',
    hint: 'Payment received. Credentials can now be revealed.',
  },
  EXPIRED: {
    label: 'Expired',
    tone: 'dead',
    hint: 'The payment window has closed. The account has been returned to the catalog.',
  },
  FAILED: {
    label: 'Payment failed',
    tone: 'dead',
    hint: 'The invoice could not be created or was rejected. Please check out again.',
  },
  CANCELLED: {
    label: 'Cancelled',
    tone: 'dead',
    hint: 'This order was cancelled before payment.',
  },
  NEEDS_REFUND: {
    label: 'Refund needed',
    tone: 'warn',
    hint: 'Funds arrived after the account became unavailable. Contact support for a refund.',
  },
  REFUNDED: {
    label: 'Refund complete',
    tone: 'neutral',
    hint: 'The refund has been recorded by an admin.',
  },
  DISPUTED: {
    label: 'Disputed',
    tone: 'warn',
    hint: 'This order is being handled by an admin.',
  },
}

export function statusMeta(status: string) {
  return (
    STATUS[status] ?? {
      label: status,
      tone: 'neutral' as StatusTone,
      hint: 'Order status is being updated.',
    }
  )
}

export function rupiah(value: string | number | bigint): string {
  return `Rp${Number(value).toLocaleString('id-ID')}`
}

export function waktu(value: string | null | undefined): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

export function bacaInstruksi(value: unknown): InstructionView {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const data = value as Record<string, unknown>
  return {
    qrString: typeof data.qrString === 'string' ? data.qrString : undefined,
    vaNumber: typeof data.vaNumber === 'string' ? data.vaNumber : undefined,
    bank: typeof data.bank === 'string' ? data.bank : undefined,
    expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : undefined,
  }
}

export function tanggalPendek(value: string | null | undefined): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}
