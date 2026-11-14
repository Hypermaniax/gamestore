// Storefront hero — editorial headline, catalog search, trust markers, and a layered drop card.

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowUpRight, BadgeCheck, LockKeyhole, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { useStorefront } from './storefront-provider'

const TRUST = [
  { label: 'Verified accounts', Icon: BadgeCheck },
  { label: 'Secure payments', Icon: LockKeyhole },
  { label: 'Warranty up to 14 days', Icon: ShieldCheck },
] as const

export function Hero() {
  const { scrollToCatalog, totalAccounts } = useStorefront()
  const router = useRouter()
  const [query, setQuery] = useState('')

  return (
    <section className="relative isolate overflow-hidden px-5 pb-20 pt-10 sm:px-8 lg:px-12 lg:pb-32 lg:pt-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="hero-grid absolute inset-0 opacity-70" />
        <div className="absolute -left-44 top-0 size-[520px] rounded-full bg-brand/12 blur-[130px]" />
        <div className="absolute -right-36 top-1/4 size-[480px] rounded-full bg-brand-deep/10 blur-[120px] dark:bg-brand/5" />
      </div>

      <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-[1.02fr_.98fr] lg:gap-20">
        <div className="relative z-10">
          <div className="hero-reveal mb-7 inline-flex items-center gap-3 rounded-full border border-foreground/10 bg-foreground/[.035] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[.22em] text-muted-foreground">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-brand-deep" />
            </span>
            Curated game account marketplace
          </div>

          <h1 className="hero-reveal hero-reveal-1 max-w-[780px] font-display text-[clamp(3.8rem,8vw,8.1rem)] font-bold leading-[.8] tracking-[-.08em]">
            Play
            <br />
            further<span className="text-brand-deep">.</span>
          </h1>

          <p className="hero-reveal hero-reveal-2 mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Find ready-to-use game accounts with transparent details, secure transactions, and
            warranties up to 14 days.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              const next = query.trim()
              router.push(next ? `/?q=${encodeURIComponent(next)}#catalog` : '/#catalog')
            }}
            className="hero-reveal hero-reveal-3 mt-9 max-w-2xl rounded-[1.65rem] bg-foreground/[.045] p-1.5 ring-1 ring-foreground/10 shadow-[0_24px_80px_-36px_rgba(17,23,25,.45)]"
          >
            <div className="flex flex-col gap-1.5 rounded-[calc(1.65rem-.375rem)] bg-card p-1.5 sm:flex-row sm:items-center">
              <label className="flex min-w-0 flex-1 items-center gap-3 px-3.5">
                <Search className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search accounts"
                  className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="Search games, ranks, or accounts..."
                />
              </label>
              <button
                type="submit"
                className="group flex h-12 shrink-0 items-center justify-center gap-3 rounded-full bg-brand pl-6 pr-1.5 text-sm font-bold text-brand-ink transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:brightness-105 active:scale-[.98]"
              >
                <span>Search accounts</span>
                <span className="grid size-9 place-items-center rounded-full bg-brand-ink text-brand transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:scale-105">
                  <ArrowRight className="size-4" strokeWidth={1.75} />
                </span>
              </button>
            </div>
          </form>

          <div className="hero-reveal hero-reveal-4 mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
            {TRUST.map(({ label, Icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground"
              >
                <Icon className="size-3.5 text-brand-deep" strokeWidth={1.75} />
                {label}
              </span>
            ))}
          </div>

          <div className="hero-reveal hero-reveal-5 mt-10 grid max-w-xl grid-cols-3 divide-x divide-border border-y border-border py-4">
            <div className="pr-4">
              <p className="font-display text-2xl font-bold tracking-tight">
                {totalAccounts.toLocaleString('en-US')}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">
                Live accounts
              </p>
            </div>
            <div className="px-4">
              <p className="font-display text-2xl font-bold tracking-tight">14d</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">
                Warranty
              </p>
            </div>
            <div className="pl-4">
              <p className="font-display text-2xl font-bold tracking-tight">QRIS</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">
                Local payments
              </p>
            </div>
          </div>
        </div>

        <div className="hero-reveal hero-reveal-2 relative min-h-[480px] lg:min-h-[620px]">
          <div
            aria-hidden
            className="absolute -inset-7 rounded-[3.8rem] bg-brand/[.08] blur-2xl"
          />
          <div
            aria-hidden
            className="absolute inset-5 hidden rounded-[3rem] border border-foreground/10 bg-foreground/[.025] lg:block lg:-rotate-[2deg]"
          />

          <div className="absolute inset-0 rotate-0 overflow-hidden rounded-[2.5rem] bg-foreground/[.06] p-1.5 ring-1 ring-foreground/10 lg:rotate-[1.25deg]">
            <div className="relative h-full overflow-hidden rounded-[calc(2.5rem-.375rem)] bg-[#070b0e] shadow-[inset_0_1px_1px_rgba(255,255,255,.18)]">
              <Image
                src="https://images.unsplash.com/photo-1607896426171-99097eb60cb6?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=90&w=1200&h=1450"
                alt="Neon-lit gaming setup"
                fill
                priority
                sizes="(min-width: 1024px) 620px, 100vw"
                className="object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#05080a] via-[#05080a]/10 to-[#05080a]/35" />

              <div className="absolute inset-x-4 top-4 flex items-center justify-between sm:inset-x-6 sm:top-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-white">
                  <span className="size-1.5 rounded-full bg-brand" />
                  Live drop
                </span>
                <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1.5 font-mono text-[10px] tracking-[.12em] text-white/80">
                  {totalAccounts.toLocaleString('en-US')} live
                </span>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
                <div className="flex items-end justify-between gap-5">
                  <div className="max-w-sm">
                    <span className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-brand">
                      <Sparkles className="size-3.5" strokeWidth={1.5} />
                      Weekly drop
                    </span>
                    <p className="font-display text-3xl font-bold leading-[.95] tracking-[-.045em] text-white sm:text-4xl">
                      Season-ready accounts
                    </p>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-white/65">
                      Handpicked inventory, ready to keep climbing.
                    </p>
                  </div>
                  <button
                    onClick={scrollToCatalog}
                    aria-label="View latest accounts"
                    className="group grid size-14 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:rotate-6 hover:bg-brand hover:text-brand-ink active:scale-95"
                  >
                    <ArrowUpRight
                      className="size-5 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      strokeWidth={1.5}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-drift absolute left-3 top-24 rounded-2xl border border-border bg-card/95 p-3.5 shadow-[0_20px_60px_-24px_rgba(17,23,25,.45)] sm:-left-6 sm:top-20">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-brand text-brand-ink">
                <ShieldCheck className="size-5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-xs font-bold">Buyer protection</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Secure payment & warranty</p>
              </div>
            </div>
          </div>

          <span className="absolute -right-2 top-1/2 hidden -translate-y-1/2 rotate-90 text-[9px] font-bold uppercase tracking-[.35em] text-muted-foreground/70 lg:block">
            Curated / 2026
          </span>
        </div>
      </div>
    </section>
  )
}
