// Order detail + payment page. QR data is generated on the server only for the
// active invoice; the browser never receives another buyer's data.

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import QRCode from 'qrcode'
import { ArrowLeft } from 'lucide-react'
import { transactionService } from '@/src/services/transaction.service'
import { bacaInstruksi } from '@/src/lib/pesanan'
import { PaymentExperience } from './payment-experience'

export const instant = false

export default async function PesananDetailPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const result = await transactionService.detail({ code })

  if (!result.ok) {
    if (result.code === 'INVALID_SESSION') redirect('/login')
    notFound()
  }

  const active =
    result.data.payment.find((payment) => payment.status === 'PENDING') ??
    result.data.payment.find((payment) => payment.status === 'PAID') ??
    result.data.payment.at(-1) ??
    null
  const instruction = bacaInstruksi(active?.instructions)
  const pending = result.data.payment.find((payment) => payment.status === 'PENDING') ?? null
  const qrDataUrl =
    pending?.method === 'QRIS' && instruction.qrString
      ? await QRCode.toDataURL(instruction.qrString, {
          margin: 1,
          width: 420,
          color: { dark: '#111719', light: '#ffffff' },
        })
      : null

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-20 pt-10 sm:px-8 sm:pt-14 lg:px-12">
      <Link
        href="/orders"
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All orders
      </Link>

      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-deep">Order</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.055em] sm:text-5xl">
            {result.data.account.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {result.data.account.game.name} · <span className="font-mono">{result.data.code}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
          <span className="rounded-full bg-foreground px-3 py-1.5 text-background">01 Checkout</span>
          <span className="rounded-full bg-brand px-3 py-1.5 text-brand-ink">02 Payment</span>
          <span className="rounded-full border border-border px-3 py-1.5">03 Complete</span>
        </div>
      </div>

      <div className="mt-9">
        <PaymentExperience data={result.data} qrDataUrl={qrDataUrl} instruction={instruction} />
      </div>
    </div>
  )
}
