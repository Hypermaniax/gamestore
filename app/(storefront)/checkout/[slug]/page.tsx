// Checkout confirmation page — server reads the account and pricing, client form
// owns method selection, voucher preview, and the actual checkout action.

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, LockKeyhole } from 'lucide-react'
import { checkoutService } from '@/src/services/checkout.service'
import { CheckoutForm } from './checkout-form'

export const instant = false

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const result = await checkoutService.getBySlug({ slug })

  if (!result.ok) {
    if (result.code === 'INVALID_SESSION') redirect('/login')
    if (result.code === 'ACCOUNT_UNAVAILABLE' || result.code === 'INPUT_INVALID')
      notFound()
    return (
      <div className="mx-auto max-w-2xl px-5 pb-24 pt-16 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">Checkout cannot continue yet</h1>
        <p className="mt-3 text-sm text-muted-foreground">{result.message}</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-brand px-5 text-sm font-bold text-brand-ink"
        >
          Back to catalog
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1240px] px-5 pb-20 pt-10 sm:px-8 sm:pt-14 lg:px-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to catalog
      </Link>

      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-deep">Checkout</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.055em] sm:text-5xl">
            One account, one payment.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Review the account details, choose a method, then complete payment. Stock is only locked
            after you press continue.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
          <span className="rounded-full bg-foreground px-3 py-1.5 text-background">01 Checkout</span>
          <span className="rounded-full border border-border px-3 py-1.5">02 Payment</span>
          <LockKeyhole className="ml-1 size-3.5" />
        </div>
      </div>

      <div className="mt-9">
        <CheckoutForm data={result.data} />
      </div>
    </div>
  )
}
