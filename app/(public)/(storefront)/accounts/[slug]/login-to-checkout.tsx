'use client'

import Link from 'next/link'
import { LogIn, ShieldCheck } from 'lucide-react'
import { useStorefront } from '@/components/storefront/storefront-provider'

export function LoginToCheckout({ title }: { title: string }) {
  const { setLoginOpen } = useStorefront()

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-border bg-card p-6 sm:p-8">
      <div className="absolute -right-12 -top-12 size-40 rounded-full bg-brand/15 blur-2xl" />
      <div className="relative max-w-xl">
        <span className="grid size-11 place-items-center rounded-2xl bg-brand/20 text-brand-deep">
          <ShieldCheck className="size-5" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-bold tracking-tight">
          Sign in to checkout {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Account details are still visible without signing in. After you sign in, the payment form
          appears right on this page without going to another page.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-brand-ink transition hover:brightness-105 active:scale-[.99]"
          >
            <LogIn className="size-4" /> Sign in & checkout
          </button>
          <Link
            href="/register"
            className="flex h-12 items-center justify-center rounded-xl border border-border px-6 text-sm font-bold transition hover:bg-foreground hover:text-background"
          >
            Create a free account
          </Link>
        </div>
      </div>
    </div>
  )
}
