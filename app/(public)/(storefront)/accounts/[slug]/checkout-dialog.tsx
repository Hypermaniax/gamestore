'use client'

import Link from 'next/link'
import { ShieldCheck, X } from 'lucide-react'
import { useStorefront } from '@/components/storefront/storefront-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CheckoutDetailView, CheckoutView } from '@/src/lib/pesanan'
import { CheckoutForm } from '@/components/storefront/checkout-form'
import { LoginToCheckout } from './login-to-checkout'

export function CheckoutDialog({
  data,
  open,
  onOpenChange,
}: {
  data: CheckoutDetailView
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user, emailVerified } = useStorefront()
  const currentUser =
    data.user ?? (user ? { username: user, email: '', emailVerified } : null)
  const checkoutData: CheckoutView | null = currentUser
    ? { ...data, user: currentUser }
    : null
  const needsVerification = Boolean(currentUser && !currentUser.emailVerified)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-5xl overflow-y-auto rounded-[28px] p-0 sm:max-w-5xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-popover/95 px-5 py-5 backdrop-blur sm:px-7">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-brand-deep">
              Checkout
            </p>
            <DialogTitle className="mt-1.5 truncate font-display text-xl font-bold tracking-tight sm:text-2xl">
              {data.account.title}
            </DialogTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {data.account.game} · {data.account.type}
            </p>
          </div>
          <DialogClose
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close checkout"
                className="size-9 shrink-0 rounded-full"
              />
            }
          >
            <X />
          </DialogClose>
        </div>

        <div className="p-5 sm:p-7">
          {needsVerification ? (
            <div className="rounded-2xl border border-border bg-muted/30 p-5 sm:p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-brand/15 text-brand-deep">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-display text-xl font-bold tracking-tight">
                Verify your email first
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Your account must be verified before you can buy. Verify the email on your account,
                then continue checkout.
              </p>
              <Link
                href={`/verify-email?next=${encodeURIComponent(`/accounts/${data.account.slug}`)}`}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-brand-ink transition hover:brightness-105 active:scale-[.99]"
              >
                Verify email
              </Link>
            </div>
          ) : checkoutData ? (
            <CheckoutForm data={checkoutData} showProductCard={false} />
          ) : (
            <LoginToCheckout title={data.account.title} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
