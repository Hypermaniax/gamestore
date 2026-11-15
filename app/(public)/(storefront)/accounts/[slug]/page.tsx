// Public account detail. The checkout form lives on the same page so a buyer can
// inspect the account and continue straight to payment without another hop.

import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  TicketPercent,
} from 'lucide-react'
import { checkoutService } from '@/src/services/checkout.service'
import { rupiah } from '@/src/lib/pesanan'
import { BackToCatalog } from '@/components/storefront/back-to-catalog'
import { AccountGallery } from './account-gallery'
import { DetailCheckoutButton, MobileCheckoutBar } from './detail-cta'

export const instant = false

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const result = await checkoutService.getDetailBySlug({ slug })

  if (!result.ok) {
    if (result.code === 'ACCOUNT_UNAVAILABLE' || result.code === 'INPUT_INVALID') notFound()
    return (
      <div className="mx-auto max-w-2xl px-5 pb-24 pt-16 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">Account details are not available yet</h1>
        <p className="mt-3 text-sm text-muted-foreground">{result.message}</p>
        <BackToCatalog className="mt-6 inline-flex h-11 items-center rounded-full bg-brand px-5 text-sm font-bold text-brand-ink">
          Back to catalog
        </BackToCatalog>
      </div>
    )
  }

  const data = result.data
  const photos = data.account.photos
  const specs = data.account.spesifikasi
  const promoPotongan = data.promotion ? Number(data.promotion.potongan) : 0
  const total = Number(data.total)

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-32 pt-8 sm:px-8 sm:pt-12 lg:px-12 lg:pb-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BackToCatalog className="group inline-flex items-center gap-2.5 text-xs font-bold text-muted-foreground transition hover:text-foreground">
          <span className="grid size-8 place-items-center rounded-full border border-border transition duration-300 group-hover:border-foreground/30 group-hover:bg-card">
            <ArrowLeft className="size-3.5" strokeWidth={1.75} />
          </span>
          Back to catalog
        </BackToCatalog>

        <nav
          aria-label="Breadcrumb"
          className="hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground sm:flex"
        >
          <BackToCatalog className="transition hover:text-foreground">
            Catalog
          </BackToCatalog>
          <span className="text-border">/</span>
          <span>{data.account.game}</span>
          <span className="text-border">/</span>
          <span className="text-foreground">{data.account.type}</span>
        </nav>
      </div>

      <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-10 xl:gap-14">
        <section className="min-w-0">
          <AccountGallery
            photos={photos}
            game={data.account.game}
            type={data.account.type}
            promotion={Boolean(data.promotion)}
          />

          <div className="mt-5 rounded-[32px] bg-foreground/[.035] p-1.5 ring-1 ring-foreground/10 sm:mt-6">
            <div className="rounded-[calc(32px-.375rem)] bg-card p-6 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-brand/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-brand-deep">
                  {data.account.game}
                </span>
                <span className="rounded-full border border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                  {data.account.type}
                </span>
              </div>

              <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.25rem,4vw,3.8rem)] font-bold leading-[.95] tracking-[-.055em]">
                {data.account.title}
              </h1>

              {data.account.description && (
                <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-7 text-muted-foreground sm:text-base">
                  {data.account.description}
                </p>
              )}

              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 border-t border-border pt-5 text-[11px] font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <BadgeCheck className="size-4 text-brand-deep" strokeWidth={1.75} /> Ownership
                  verified
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-brand-deep" strokeWidth={1.75} /> Warranty per
                  terms
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-4 text-brand-deep" strokeWidth={1.75} /> Only 1 in stock
                </span>
              </div>
            </div>
          </div>

          {specs.length > 0 && (
            <div
              id="specifications"
              className="mt-5 scroll-mt-28 rounded-[28px] border border-border bg-card p-6 sm:mt-6 sm:p-8"
            >
              <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">
                    Account specifications
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold tracking-[-.04em]">
                    What&apos;s in the account
                  </h2>
                </div>
                <span className="hidden font-mono text-[9px] uppercase tracking-[.18em] text-muted-foreground sm:block">
                  {String(specs.length).padStart(2, '0')} details
                </span>
              </div>

              <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {specs.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 rounded-2xl bg-foreground/[.025] px-4 py-3.5 ring-1 ring-border/60"
                  >
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand/25 text-brand-deep">
                      <Check className="size-3" strokeWidth={2.25} />
                    </span>
                    <span className="text-sm font-medium leading-5">{item}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 flex items-center gap-2 text-[10px] font-semibold text-muted-foreground">
                <BadgeCheck className="size-3.5 text-brand-deep" strokeWidth={1.75} />
                Every detail above is checked before the listing goes live.
              </p>
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-[32px] bg-foreground/[.04] p-1.5 ring-1 ring-foreground/10 shadow-[0_28px_80px_-46px_rgba(17,23,25,.4)]">
            <div className="overflow-hidden rounded-[calc(32px-.375rem)] bg-card">
              <div className="p-6 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[.18em] text-brand-deep">
                    Ready-to-use account
                  </p>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-brand-deep" />1 in stock
                  </span>
                </div>

                <h2 className="mt-4 font-display text-2xl font-bold leading-tight tracking-[-.04em]">
                  {data.account.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.account.game} · {data.account.type}
                </p>

                <div className="mt-6 border-t border-border pt-5">
                  <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">
                    Total price
                  </p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2.5">
                    <p className="font-display text-[2.35rem] font-bold tracking-[-.055em] text-foreground sm:text-[2.6rem]">
                      {rupiah(total)}
                    </p>
                    {promoPotongan > 0 && (
                      <p className="text-sm font-semibold text-muted-foreground line-through">
                        {rupiah(data.account.price)}
                      </p>
                    )}
                  </div>
                  {data.promotion && (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1.5 text-[10px] font-bold text-brand-deep">
                      <TicketPercent className="size-3.5" strokeWidth={1.75} /> {data.promotion.name} ·
                      save {rupiah(data.promotion.potongan)}
                    </p>
                  )}
                </div>

                <DetailCheckoutButton data={data} className="mt-5" />

                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground">
                  <LockKeyhole className="size-3" strokeWidth={1.75} />
                  Credentials stay private until payment is confirmed.
                </p>

                <div className="mt-6 space-y-2.5 border-t border-border pt-5">
                  <p className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                    <ShieldCheck className="size-4 shrink-0 text-brand-deep" strokeWidth={1.75} />
                    Unique account, only 1 in stock
                  </p>
                  <p className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                    <LockKeyhole className="size-4 shrink-0 text-brand-deep" strokeWidth={1.75} />
                    Stock is locked when you continue to checkout
                  </p>
                  <p className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                    <TicketPercent className="size-4 shrink-0 text-brand-deep" strokeWidth={1.75} />
                    QRIS, VA, and vouchers available
                  </p>
                </div>
              </div>

              {specs.length > 0 && (
                <div className="border-t border-border bg-foreground/[.02] p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">
                      Included
                    </p>
                    <a
                      href="#specifications"
                      className="text-[10px] font-bold text-brand-deep underline-offset-4 hover:underline"
                    >
                      All details
                    </a>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {specs.slice(0, 3).map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-xs font-medium text-muted-foreground"
                      >
                        <Check className="mt-0.5 size-3.5 shrink-0 text-brand-deep" strokeWidth={2.25} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {specs.length > 3 && (
                    <p className="mt-3 text-[10px] text-muted-foreground">
                      +{specs.length - 3} more specifications
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            Secure checkout by NexaPlay
          </p>
        </aside>
      </div>

      <MobileCheckoutBar data={data} />
    </div>
  )
}
