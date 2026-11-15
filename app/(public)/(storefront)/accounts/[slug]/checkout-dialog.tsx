'use client'

import { X } from 'lucide-react'
import { useStorefront } from '@/components/storefront/storefront-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CheckoutDetailView, CheckoutView } from '@/src/lib/pesanan'
import { CheckoutForm } from '../../checkout/[slug]/checkout-form'
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
          {checkoutData ? (
            <CheckoutForm data={checkoutData} showProductCard={false} />
          ) : (
            <LoginToCheckout title={data.account.title} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
