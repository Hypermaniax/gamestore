import Link from 'next/link'
import { ArrowUpRight, BadgeCheck, CreditCard, ShieldCheck } from 'lucide-react'

const LINK_GROUPS = [
  {
    title: 'Explore',
    links: [
      ['All accounts', '/#catalog'],
      ['How it works', '/#how'],
    ],
  },
  {
    title: 'Account',
    links: [
      ['My account', '/account'],
      ['My orders', '/orders'],
    ],
  },
  {
    title: 'Help & policies',
    links: [
      ['Help center', '/help'],
      ['FAQ', '/pages/faq'],
      ['Warranty & refund', '/pages/warranty'],
      ['Terms & conditions', '/pages/terms-and-conditions'],
      ['Privacy policy', '/pages/privacy'],
    ],
  },
]

const TRUST = [
  { label: 'Secure checkout', Icon: ShieldCheck },
  { label: 'QRIS & virtual accounts', Icon: CreditCard },
  { label: '14-day warranty', Icon: BadgeCheck },
]

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-foreground/[.018]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -bottom-52 left-1/2 size-[560px] -translate-x-1/2 rounded-full bg-brand/[.07] blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-[1440px] px-5 pb-10 sm:px-8 sm:pb-12 lg:px-12">
        <div className="grid gap-14 py-16 lg:grid-cols-[1.15fr_.85fr] lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[.22em] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-brand-deep" />
              Ready when you are
            </p>

            <h2 className="mt-7 max-w-xl font-display text-[clamp(2.8rem,5.4vw,5rem)] font-bold leading-[.88] tracking-[-.07em]">
              Your next account
              <br />
              is waiting<span className="text-brand-deep">.</span>
            </h2>

            <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
              Browse one-of-one game accounts with transparent details, protected payments, and
              warranty coverage.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/#catalog"
                className="group inline-flex h-12 items-center gap-3 rounded-full bg-foreground pl-5 pr-1.5 text-sm font-bold text-background transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand hover:text-brand-ink"
              >
                <span>Browse inventory</span>
                <span className="grid size-9 place-items-center rounded-full bg-background/15 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                  <ArrowUpRight className="size-4" strokeWidth={1.75} />
                </span>
              </Link>
              <Link
                href="/#how"
                className="inline-flex h-12 items-center rounded-full border border-border px-5 text-sm font-bold transition duration-300 hover:border-foreground/30 hover:bg-card"
              >
                How it works
              </Link>
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3" aria-label="Footer">
            {LINK_GROUPS.map(({ title, links }) => (
              <div key={title}>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">
                  {title}
                </p>
                <ul className="mt-5 space-y-3">
                  {links.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground/70 transition hover:text-foreground"
                      >
                        {label}
                        <ArrowUpRight className="size-3 -translate-x-1 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-6 border-t border-border py-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {TRUST.map(({ label, Icon }) => (
              <span key={label} className="inline-flex items-center gap-2">
                <Icon className="size-3.5 text-brand-deep" strokeWidth={1.75} />
                {label}
              </span>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">© 2026 NexaPlay. All rights reserved.</p>
        </div>

        <div className="border-t border-border pt-8">
          <div className="flex items-end justify-between gap-6">
            <p
              aria-hidden
              className="select-none font-display text-[clamp(3.2rem,11.8vw,10.5rem)] font-bold leading-[.68] tracking-[-.09em] text-foreground/[.07]"
            >
              NEXAPLAY<span className="text-brand-deep/40">.</span>
            </p>
            <p className="mb-1 hidden shrink-0 font-mono text-[9px] uppercase tracking-[.28em] text-muted-foreground/60 sm:block">
              Curated / 2026
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
