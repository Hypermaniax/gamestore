'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Check,
  Gamepad2,
  Landmark,
  Loader2,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  TicketPercent,
} from 'lucide-react'
import { checkoutAction } from '@/src/controllers/transaction.controller'
import { previewCheckoutAction } from '@/src/controllers/discount.controller'
import { rupiah, type CheckoutView } from '@/src/lib/pesanan'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ERROR_COPY: Record<string, string> = {
  ACCOUNT_UNAVAILABLE: 'This account was just purchased by someone else.',
  TRANSACTION_LIMIT: 'You have too many unpaid orders.',
  PRICE_CHANGED: 'The price changed. Reload the page and try again.',
  TERMS_CHANGED: 'The terms & conditions just changed. Reload the page.',
  TOTAL_INVALID: 'Invalid payment total.',
  MINIMUM_PAYMENT: 'The payment total is below the minimum.',
  EMAIL_NOT_VERIFIED: 'Verify your email before checkout.',
  CHECKOUT_CLOSED: 'Checkout is temporarily closed.',
  VOUCHER_EXHAUSTED: 'The voucher quota is used up.',
  VOUCHER_ALREADY_USED: 'You have already used this voucher.',
  PAYMENT_FAILED: 'Failed to create the invoice. Try again in a moment.',
  PAYMENT_PENDING: 'Payment is being created. Check your order again shortly.',
  REQUEST_IN_PROGRESS: 'Your previous request is still being processed.',
}

export function CheckoutForm({
  data,
  showProductCard = true,
}: {
  data: CheckoutView
  showProductCard?: boolean
}) {
  const router = useRouter()
  const [method, setMetode] = useState<'QRIS' | 'VA'>('QRIS')
  const [bank, setBank] = useState<'BCA' | 'BNI' | 'BRI' | 'MANDIRI' | 'PERMATA'>('BCA')
  const [kodeVoucher, setKodeVoucher] = useState('')
  const [appliedVoucher, setAppliedVoucher] = useState<string | null>(null)
  const [total, setTotal] = useState(data.total)
  const [promotion, setPromo] = useState(data.promotion)
  const [voucher, setVoucher] = useState<{ code: string; potongan: string } | null>(null)
  const [voucherError, setVoucherError] = useState<string | null>(null)
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [voucherPending, startVoucher] = useTransition()

  function resetVoucher() {
    setKodeVoucher('')
    setAppliedVoucher(null)
    setVoucher(null)
    setVoucherError(null)
    setTotal(data.total)
    setPromo(data.promotion)
  }

  function applyVoucher() {
    const code = kodeVoucher.trim().toUpperCase()
    if (!code) {
      resetVoucher()
      return
    }
    setVoucherError(null)
    startVoucher(async () => {
      const result = await previewCheckoutAction({
        accountId: data.account.id,
        kodeVoucher: code,
      })
      if (!result.ok) {
        setVoucherError(ERROR_COPY[result.code] ?? result.message)
        return
      }
      setAppliedVoucher(code)
      setTotal(result.data.total)
      setPromo(result.data.promotion ? { name: String(result.data.promotion.name), potongan: String(result.data.promotion.potongan) } : null)
      setVoucher(
        result.data.voucher
          ? { code: result.data.voucher.code, potongan: result.data.voucher.potongan }
          : null,
      )
    })
  }

  function submit() {
    setError(null)
    if (!agree) {
      setError('Please check the terms & conditions agreement first.')
      return
    }
    startTransition(async () => {
      const result = await checkoutAction({
        accountId: data.account.id,
        kodeVoucher: appliedVoucher ?? undefined,
        method,
        bank: method === 'VA' ? bank : undefined,
        termsVersion: data.syarat.version,
        totalPratinjau: total,
        kunciIdempoten: crypto.randomUUID(),
      })
      if (!result.ok) {
        setError(ERROR_COPY[result.code] ?? result.message)
        return
      }
      router.push(`/orders/${result.data.code}`)
    })
  }

  const disabled = pending || !data.checkoutAktif || !data.user.emailVerified

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
      <div className="space-y-5">
        {showProductCard && (
          <section className="overflow-hidden rounded-[28px] border border-border bg-card">
            <div className="grid sm:grid-cols-[220px_1fr]">
              <div className="relative h-44 bg-secondary sm:h-full">
                {data.account.photo ? (
                  <Image
                    src={data.account.photo}
                    alt={data.account.game}
                    fill
                    sizes="(min-width: 640px) 220px, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-muted-foreground">
                    <Gamepad2 className="size-10" />
                  </span>
                )}
                <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-white backdrop-blur">
                  {data.account.type}
                </span>
              </div>
              <div className="p-5 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-deep">
                  {data.account.game}
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
                  {data.account.title}
                </h2>
                {data.account.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {data.account.description}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.account.spesifikasi.slice(0, 5).map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                  <ShieldCheck className="size-4 text-brand-deep" />
                  Stock is locked after you continue to payment.
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-[28px] border border-border bg-card p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-brand/20 text-xs font-extrabold text-brand-deep">
              01
            </span>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">Payment method</h2>
              <p className="text-xs text-muted-foreground">Choose QRIS or virtual account.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMetode('QRIS')}
              aria-pressed={method === 'QRIS'}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                method === 'QRIS'
                  ? 'border-brand-deep bg-brand/10'
                  : 'border-border hover:border-foreground/25'
              }`}
            >
              <span className="grid size-10 place-items-center rounded-xl bg-foreground text-background">
                <QrCode className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-bold">QRIS</span>
                <span className="block text-[11px] text-muted-foreground">
                  Scan from your bank or e-wallet
                </span>
              </span>
              {method === 'QRIS' && <Check className="ml-auto size-4 text-brand-deep" />}
            </button>
            <button
              type="button"
              onClick={() => setMetode('VA')}
              aria-pressed={method === 'VA'}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                method === 'VA'
                  ? 'border-brand-deep bg-brand/10'
                  : 'border-border hover:border-foreground/25'
              }`}
            >
              <span className="grid size-10 place-items-center rounded-xl bg-foreground text-background">
                <Landmark className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-bold">Virtual account</span>
                <span className="block text-[11px] text-muted-foreground">
                  Transfer from mobile banking
                </span>
              </span>
              {method === 'VA' && <Check className="ml-auto size-4 text-brand-deep" />}
            </button>
          </div>

          {method === 'VA' && (
            <div className="mt-4">
              <label htmlFor="bank" className="text-xs font-bold">
                Bank
              </label>
              <Select value={bank} onValueChange={(value) => setBank(value as typeof bank)}>
                <SelectTrigger
                  id="bank"
                  className="mt-2 h-11 w-full rounded-xl border-input bg-background px-3 text-sm font-semibold focus-visible:border-brand-deep focus-visible:ring-0"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {['BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA'].map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-border bg-card p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-brand/20 text-xs font-extrabold text-brand-deep">
              02
            </span>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">Have a voucher code?</h2>
              <p className="text-xs text-muted-foreground">The discount is calculated after active promotions.</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <label className="flex h-12 flex-1 items-center gap-3 rounded-xl border border-input bg-background px-4 focus-within:border-brand-deep">
              <TicketPercent className="size-4 shrink-0 text-muted-foreground" />
              <Input
                value={kodeVoucher}
                onChange={(event) => {
                  const next = event.target.value.toUpperCase()
                  setKodeVoucher(next)
                  if (appliedVoucher && next !== appliedVoucher) {
                    setAppliedVoucher(null)
                    setVoucher(null)
                    setTotal(data.total)
                    setPromo(data.promotion)
                    setVoucherError(null)
                  }
                }}
                placeholder="Example: NEXA10"
                className="h-auto border-0 bg-transparent px-0 py-0 text-sm font-semibold uppercase shadow-none placeholder:font-normal placeholder:normal-case focus-visible:border-0 focus-visible:ring-0"
                aria-label="Voucher code"
              />
            </label>
            <button
              type="button"
              onClick={applyVoucher}
              disabled={voucherPending}
              className="h-12 rounded-xl border border-border px-5 text-sm font-bold transition hover:bg-foreground hover:text-background disabled:opacity-60"
            >
              {voucherPending ? 'Checking…' : appliedVoucher ? 'Update' : 'Apply'}
            </button>
          </div>

          {voucherError && (
            <p role="alert" className="mt-3 flex items-start gap-2 text-xs font-semibold text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" /> {voucherError}
            </p>
          )}
          {voucher && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-brand/15 px-4 py-3 text-xs font-semibold text-brand-deep">
              <span>Voucher {voucher.code} active</span>
              <span>−{rupiah(voucher.potongan)}</span>
            </div>
          )}
        </section>

        <details className="group rounded-[28px] border border-border bg-card p-5 sm:p-7">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <span>
              <span className="font-display text-lg font-bold tracking-tight">
                {data.syarat.title} v{data.syarat.version}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Read before continuing.
              </span>
            </span>
            <span className="text-xs font-bold text-brand-deep group-open:hidden">Open</span>
            <span className="hidden text-xs font-bold text-brand-deep group-open:block">Close</span>
          </summary>
          <p className="mt-4 whitespace-pre-line border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
            {data.syarat.isi}
          </p>
        </details>
      </div>

      <aside className="lg:sticky lg:top-24">
        <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_25px_70px_rgba(20,28,30,.08)]">
          <div className="border-b border-dashed border-border p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-deep">
              Order summary
            </p>
            <p className="mt-2 font-display text-xl font-bold tracking-tight">{data.account.game}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{data.account.title}</p>
          </div>

          <div className="space-y-3 p-5 text-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Account price</span>
              <span className="font-semibold">{rupiah(data.account.price)}</span>
            </div>
            {promotion && (
              <div className="flex items-center justify-between gap-4 text-brand-deep">
                <span>Promotion {promotion.name}</span>
                <span className="font-semibold">−{rupiah(promotion.potongan)}</span>
              </div>
            )}
            {voucher && (
              <div className="flex items-center justify-between gap-4 text-brand-deep">
                <span>Voucher {voucher.code}</span>
                <span className="font-semibold">−{rupiah(voucher.potongan)}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Service fee</span>
              <span className="font-semibold">Rp0</span>
            </div>
          </div>

          <div className="border-t border-dashed border-border p-5 sm:p-6">
            <p className="text-xs font-semibold text-muted-foreground">Total to pay</p>
            <p className="mt-1 font-display text-4xl font-bold tracking-[-.05em]">{rupiah(total)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Includes warranty protection as per the terms.
            </p>
          </div>

          <div className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
            <label className="flex items-start gap-3 text-xs leading-relaxed text-muted-foreground">
              <input
                type="checkbox"
                checked={agree}
                onChange={(event) => setAgree(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--brand-deep)]"
              />
              <span>
                I have read and agree to {data.syarat.title} version {data.syarat.version}.
              </span>
            </label>

            {!data.checkoutAktif && (
              <p className="rounded-xl bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive">
                Checkout is temporarily closed.
              </p>
            )}
            {!data.user.emailVerified && (
              <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
                Verify your email first.{' '}
                <Link href="/verify-email" className="underline underline-offset-2">
                  Enter your verification code
                </Link>
                .
              </p>
            )}
            {error && (
              <p role="alert" className="flex items-start gap-2 text-xs font-semibold text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={disabled}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-brand-ink transition hover:brightness-105 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Creating invoice…
                </>
              ) : (
                <>
                  Continue to payment <ArrowRight className="size-4" />
                </>
              )}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
              <LockKeyhole className="size-3" /> Payment data is processed securely.
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
