'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  Copy,
  KeyRound,
  Landmark,
  Loader2,
  LockKeyhole,
  QrCode,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import {
  bacaInstruksi,
  rupiah,
  statusMeta,
  waktu,
  type InstructionView,
  type PesananDetailView,
} from '@/src/lib/pesanan'
import { StatusBadge } from '@/components/pesanan/status-badge'
import { Countdown } from '@/components/pesanan/countdown'
import {
  cancelTransactionAction,
  changeTransactionMethodAction,
  confirmReceivedAction,
  revealTransactionAction,
  statusTransactionAction,
} from '@/src/controllers/transaction.controller'

const ERROR_COPY: Record<string, string> = {
  STATUS_INVALID: 'The order status has changed. Reload the page.',
  TRANSACTION_EXPIRED: 'The order has expired. Please check out again.',
  PAYMENT_FAILED: 'Failed to create a new invoice. Try again.',
  PAYMENT_PENDING: 'The invoice is being created. Wait a moment and check again.',
  REQUEST_IN_PROGRESS: 'Your previous request is still being processed.',
  PAYMENT_REQUIRED: 'Credentials can only be revealed after payment is complete.',
  WARRANTY_EXPIRED: 'The warranty period has ended. Contact support for help.',
  CREDENTIALS_UNAVAILABLE: 'Credentials are not available yet. Contact support.',
  TOO_MANY_REQUESTS: 'Too many attempts. Wait a moment.',
  INVALID_SESSION: 'Your session has ended. Please sign in again.',
}

export function PaymentExperience({
  data,
  qrDataUrl,
  instruction,
}: {
  data: PesananDetailView
  qrDataUrl: string | null
  instruction: InstructionView
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [gantiOpen, setGantiOpen] = useState(false)
  const [metodePilihan, setMetodePilihan] = useState<'QRIS' | 'VA' | null>(null)
  const [bankPilihan, setBankPilihan] = useState<
    'BCA' | 'BNI' | 'BRI' | 'MANDIRI' | 'PERMATA' | null
  >(null)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [revealPending, startReveal] = useTransition()
  const [revealed, setRevealed] = useState<{ credentials: string; garansiHingga: string } | null>(
    null,
  )
  const [revealError, setRevealError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const pendingPayment = data.payment.find((payment) => payment.status === 'PENDING') ?? null
  const paidPayment = data.payment.find((payment) => payment.status === 'PAID') ?? null
  const active = pendingPayment ?? paidPayment ?? data.payment.at(-1) ?? null
  const resolvedInstruction = bacaInstruksi(active?.instructions)
  const instructionData = Object.keys(resolvedInstruction).length ? resolvedInstruction : instruction
  const meta = statusMeta(data.status)
  const vaNumber = instructionData.vaNumber ?? null
  const qrImage = qrDataUrl
  const method = metodePilihan ?? (active?.method === 'VA' ? 'VA' : 'QRIS')
  const bank =
    bankPilihan ??
    (active?.bank && ['BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA'].includes(active.bank)
      ? (active.bank as 'BCA' | 'BNI' | 'BRI' | 'MANDIRI' | 'PERMATA')
      : 'BCA')

  useEffect(() => {
    if (data.status !== 'RESERVED') return
    const timer = window.setInterval(async () => {
      const result = await statusTransactionAction({ code: data.code })
      if (result.ok && result.data.status !== 'RESERVED') router.refresh()
    }, 5000)
    return () => window.clearInterval(timer)
  }, [data.code, data.status, router])

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      window.setTimeout(() => setCopied(null), 1800)
    } catch {
      setCopied(null)
    }
  }

  function ganti() {
    setError(null)
    startTransition(async () => {
      const result = await changeTransactionMethodAction({
        code: data.code,
        method,
        bank: method === 'VA' ? bank : undefined,
        kunciIdempoten: crypto.randomUUID(),
      })
      if (!result.ok) {
        setError(ERROR_COPY[result.code] ?? result.message)
        return
      }
      setGantiOpen(false)
      router.refresh()
    })
  }

  function batal() {
    setError(null)
    startTransition(async () => {
      const result = await cancelTransactionAction({ code: data.code })
      if (!result.ok) {
        setError(ERROR_COPY[result.code] ?? result.message)
        return
      }
      setCancelConfirm(false)
      router.refresh()
    })
  }

  function reveal() {
    setRevealError(null)
    startReveal(async () => {
      const result = await revealTransactionAction({ code: data.code })
      if (!result.ok) {
        setRevealError(ERROR_COPY[result.code] ?? result.message)
        return
      }
      setRevealed(result.data)
    })
  }

  function konfirmasi() {
    setError(null)
    startTransition(async () => {
      const result = await confirmReceivedAction({ code: data.code })
      if (!result.ok) {
        setError(ERROR_COPY[result.code] ?? result.message)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
      <div className="space-y-5">
        {data.status === 'RESERVED' && pendingPayment && (
          <section className="overflow-hidden rounded-[28px] border border-border bg-card">
            <div className="flex flex-col justify-between gap-4 border-b border-dashed border-border p-5 sm:flex-row sm:items-center sm:p-7">
              <div>
                <StatusBadge status={data.status} />
                <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">
                  Complete payment
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{meta.hint}</p>
              </div>
              {data.expiredAt && (
                <div className="rounded-2xl border border-border bg-background/60 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                    Payment deadline
                  </p>
                  <Countdown expiredAt={data.expiredAt} />
                </div>
              )}
            </div>

            {pendingPayment.method === 'QRIS' ? (
              <div className="grid gap-6 p-5 sm:grid-cols-[220px_1fr] sm:p-7">
                <div className="mx-auto w-full max-w-[220px] rounded-3xl border border-border bg-white p-4 shadow-sm">
                  {qrImage ? (
                    <Image
                      src={qrImage}
                      alt="Payment QR code"
                      width={420}
                      height={420}
                      unoptimized
                      className="h-auto w-full"
                    />
                  ) : (
                    <div className="grid aspect-square place-items-center rounded-2xl bg-muted text-muted-foreground">
                      <QrCode className="size-10" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand-deep">
                    <QrCode className="size-4" /> QRIS
                  </div>
                  <h3 className="mt-3 font-display text-xl font-bold">Scan and pay</h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Open your bank or e-wallet app, choose QRIS payment, then scan the code beside
                    it. Make sure the amount is {rupiah(data.total)}.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                    <ShieldCheck className="size-4 text-brand-deep" /> Status updates automatically
                    once payment is received.
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 sm:p-7">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand-deep">
                  <Landmark className="size-4" /> Virtual account
                </div>
                <div className="mt-5 rounded-2xl border border-border bg-background/60 p-5">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {instructionData.bank ?? active?.bank ?? bank} Virtual Account
                  </p>
                  <p className="mt-2 break-all font-mono text-2xl font-bold tracking-tight sm:text-3xl">
                    {vaNumber ?? 'VA number not available yet'}
                  </p>
                  {vaNumber && (
                    <button
                      type="button"
                      onClick={() => copy(vaNumber, 'va')}
                      className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-xs font-bold transition hover:bg-foreground hover:text-background"
                    >
                      {copied === 'va' ? (
                        <>
                          <Check className="size-4" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-4" /> Copy number
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Transfer exactly <strong className="text-foreground">{rupiah(data.total)}</strong>{' '}
                  to the VA number above. Use mobile banking or an ATM.
                </p>
              </div>
            )}

            <div className="border-t border-border p-5 sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setGantiOpen((value) => !value)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-bold transition hover:bg-muted"
                >
                  <RefreshCw className="size-4" /> Change method
                </button>
                {!cancelConfirm ? (
                  <button
                    type="button"
                    onClick={() => setCancelConfirm(true)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <XCircle className="size-4" /> Cancel order
                  </button>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2">
                    <span className="text-xs font-semibold text-destructive">Cancel this order?</span>
                    <button
                      type="button"
                      onClick={batal}
                      disabled={pending}
                      className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      Yes, cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelConfirm(false)}
                      className="rounded-lg px-2 py-1.5 text-xs font-bold text-muted-foreground"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>

              {gantiOpen && (
                <div className="mt-5 rounded-2xl border border-border bg-background/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">
                    New method
                  </p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMetodePilihan('QRIS')}
                        className={`h-11 rounded-xl border px-4 text-xs font-bold transition ${
                          method === 'QRIS'
                            ? 'border-brand-deep bg-brand/15 text-brand-deep'
                            : 'border-border'
                        }`}
                      >
                        QRIS
                      </button>
                      <button
                        type="button"
                        onClick={() => setMetodePilihan('VA')}
                        className={`h-11 rounded-xl border px-4 text-xs font-bold transition ${
                          method === 'VA'
                            ? 'border-brand-deep bg-brand/15 text-brand-deep'
                            : 'border-border'
                        }`}
                      >
                        VA
                      </button>
                    </div>
                    {method === 'VA' && (
                      <select
                        value={bank}
                        onChange={(event) => setBankPilihan(event.target.value as typeof bank)}
                        className="h-11 flex-1 rounded-xl border border-input bg-background px-3 text-xs font-bold outline-none focus:border-brand-deep"
                        aria-label="Virtual account bank"
                      >
                        {['BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA'].map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={ganti}
                      disabled={pending}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-xs font-bold text-brand-ink transition hover:brightness-105 disabled:opacity-60"
                    >
                      {pending ? <Loader2 className="size-4 animate-spin" /> :                       <ArrowRight className="size-4" />}
                      Apply
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p role="alert" className="mt-4 flex items-start gap-2 text-xs font-semibold text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
                </p>
              )}
            </div>
          </section>
        )}

        {data.status === 'PAID' && (
          <section className="rounded-[28px] border border-border bg-card p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand text-brand-ink">
                <CheckCircle2 className="size-6" />
              </span>
              <div>
                <StatusBadge status={data.status} />
                <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">
                  Payment received
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Paid on {waktu(data.paidAt)}. The account can now be delivered.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-background/60 p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Total paid</p>
                  <p className="mt-1 font-display text-3xl font-bold tracking-tight">
                    {rupiah(data.total)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold text-muted-foreground">Method</p>
                  <p className="mt-1 text-sm font-bold">
                    {paidPayment?.method ?? active?.method ?? '—'}
                    {paidPayment?.bank ? ` · ${paidPayment.bank}` : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-border p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-brand-deep">
                    <KeyRound className="size-4" /> Account handover
                  </div>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Reveal the credentials, change the email/password immediately, then keep the
                    proof. Do not share the credentials with anyone.
                  </p>
                </div>
                {!revealed && (
                  <button
                    type="button"
                    onClick={reveal}
                    disabled={revealPending}
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-brand-ink transition hover:brightness-105 disabled:opacity-60"
                  >
                    {revealPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                    Reveal credentials
                  </button>
                )}
              </div>

              {revealError && (
                <p role="alert" className="mt-4 text-xs font-semibold text-destructive">
                  {revealError}
                </p>
              )}

              {revealed && (
                <div className="mt-5">
                  <div className="rounded-2xl bg-foreground p-4 text-background">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-background/60">
                        Account credentials
                      </p>
                      <button
                        type="button"
                        onClick={() => copy(revealed.credentials, 'kredensial')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-background/20 px-2.5 py-1.5 text-[11px] font-bold transition hover:bg-background/10"
                      >
                        {copied === 'kredensial' ? <Check className="size-3.5" /> : <Clipboard className="size-3.5" />}
                        {copied === 'kredensial' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
                      {revealed.credentials}
                    </pre>
                  </div>
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    <p>
                      Change the account email and password immediately. The warranty is active
                      until <strong>{waktu(revealed.garansiHingga)}</strong>. Keep your purchase
                      receipt and a screenshot of the credentials.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
              <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock3 className="size-3.5" /> The warranty starts from the first reveal.
              </p>
              {data.receiptConfirmed ? (
                <span className="inline-flex items-center gap-2 text-xs font-bold text-brand-deep">
                  <BadgeCheck className="size-4" /> Receipt confirmed
                </span>
              ) : (
                <button
                  type="button"
                  onClick={konfirmasi}
                  disabled={pending}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-xs font-bold transition hover:bg-muted disabled:opacity-60"
                >
                  <CheckCircle2 className="size-4" /> I have received the account
                </button>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-4 text-xs font-semibold text-destructive">
                {error}
              </p>
            )}
          </section>
        )}

        {['EXPIRED', 'CANCELLED', 'FAILED', 'NEEDS_REFUND', 'REFUNDED', 'DISPUTED'].includes(
          data.status,
        ) && (
          <section className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
            <StatusBadge status={data.status} />
            <h2 className="mt-4 font-display text-2xl font-bold tracking-tight">{meta.label}</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{meta.hint}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-brand-ink"
              >
                Browse other accounts <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/orders"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-5 text-sm font-bold"
              >
                Back to orders
              </Link>
            </div>
          </section>
        )}

        {data.status === 'RESERVED' && !pendingPayment && (
          <section className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
            <Loader2 className="size-6 animate-spin text-brand-deep" />
            <h2 className="mt-4 font-display text-xl font-bold">Your invoice is being prepared</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Please wait a moment. This page will update the status automatically.
            </p>
          </section>
        )}
      </div>

      <aside className="lg:sticky lg:top-24">
        <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_25px_70px_rgba(20,28,30,.08)]">
          <div className="border-b border-dashed border-border p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-deep">
              Order details
            </p>
            <p className="mt-2 font-display text-xl font-bold tracking-tight">
              {data.account.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{data.account.game.name}</p>
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">{data.code}</p>
          </div>

          <div className="space-y-3 p-5 text-sm sm:p-6">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Account price</span>
              <span className="font-semibold">{rupiah(data.initialPrice)}</span>
            </div>
            {Number(data.promotionDiscount) > 0 && (
              <div className="flex justify-between gap-4 text-brand-deep">
                <span>Promotion{data.promotion ? ` ${data.promotion.name}` : ''}</span>
                <span className="font-semibold">−{rupiah(data.promotionDiscount)}</span>
              </div>
            )}
            {Number(data.voucherDiscount) > 0 && (
              <div className="flex justify-between gap-4 text-brand-deep">
                <span>Voucher{data.voucher ? ` ${data.voucher.code}` : ''}</span>
                <span className="font-semibold">−{rupiah(data.voucherDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-dashed border-border pt-3">
              <span className="font-bold">Total</span>
              <span className="font-display text-lg font-bold">{rupiah(data.total)}</span>
            </div>
          </div>

          <div className="space-y-3 border-t border-dashed border-border p-5 text-xs sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Created</span>
              <span className="font-semibold">{waktu(data.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Method</span>
              <span className="font-semibold">
                {active?.method ?? '—'}
                {active?.bank ? ` · ${active.bank}` : ''}
              </span>
            </div>
            {data.expiredAt && data.status === 'RESERVED' && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Payment deadline</span>
                <span className="font-semibold">{waktu(data.expiredAt)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-border p-5 text-[11px] leading-relaxed text-muted-foreground sm:p-6">
            <p className="flex items-start gap-2">
              <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
              Do not close the page before payment is complete. The status will update automatically.
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
