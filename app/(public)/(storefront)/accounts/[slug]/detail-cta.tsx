'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { useStorefront } from '@/components/storefront/storefront-provider'
import { Button } from '@/components/ui/button'
import { rupiah, type CheckoutDetailView } from '@/src/lib/pesanan'
import { CheckoutDialog } from './checkout-dialog'

export function DetailCheckoutButton({
  data,
  className = '',
}: {
  data: CheckoutDetailView
  className?: string
}) {
  const { user } = useStorefront()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={`group h-14 w-full justify-center gap-3 rounded-2xl bg-brand pl-5 pr-2 text-sm font-bold text-brand-ink shadow-[0_20px_40px_-22px_rgba(200,255,54,.8)] hover:bg-brand hover:brightness-105 active:scale-[.99] ${className}`}
      >
        <span>{user ? 'Continue to checkout' : 'Sign in & checkout'}</span>
        <span className="grid size-9 place-items-center rounded-full bg-brand-ink text-brand transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
          <ArrowRight className="size-4" strokeWidth={1.75} />
        </span>
      </Button>
      <CheckoutDialog data={data} open={open} onOpenChange={setOpen} />
    </>
  )
}

export function MobileCheckoutBar({ data }: { data: CheckoutDetailView }) {
  const { user } = useStorefront()
  const [open, setOpen] = useState(false)
  const [footerVisible, setFooterVisible] = useState(false)

  useEffect(() => {
    const footer = document.querySelector('footer')
    if (!footer) return
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { rootMargin: '0px 0px -40px 0px' },
    )
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  if (footerVisible) return null

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 rounded-[1.4rem] border border-border bg-background/95 p-2 pl-4 shadow-[0_20px_60px_-28px_rgba(17,23,25,.55)] backdrop-blur-xl">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
              <LockKeyhole className="size-3" /> Total to pay
            </p>
            <p className="truncate font-display text-lg font-bold tracking-tight">
              {rupiah(data.total)}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setOpen(true)}
            className="group ml-auto h-11 shrink-0 gap-2.5 rounded-[1rem] bg-brand pl-4 pr-1.5 text-sm font-bold text-brand-ink hover:bg-brand hover:brightness-105 active:scale-[.99]"
          >
            <span>{user ? 'Checkout' : 'Sign in'}</span>
            <span className="grid size-8 place-items-center rounded-full bg-brand-ink text-brand">
              <ArrowRight className="size-3.5" strokeWidth={1.75} />
            </span>
          </Button>
        </div>
      </div>
      <CheckoutDialog data={data} open={open} onOpenChange={setOpen} />
    </>
  )
}
