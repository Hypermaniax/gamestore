// Toast viewport — polite announcements, auto-dismissed by the provider.

'use client'

import { Check } from 'lucide-react'
import { useStorefront } from './storefront-provider'

export function Toast() {
  const { toast } = useStorefront()

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex justify-center px-4 transition duration-300 ${
        toast ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="flex items-center gap-2.5 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-2xl">
        <span className="grid size-5 place-items-center rounded-full bg-brand text-brand-ink">
          <Check className="size-3" />
        </span>
        {toast}
      </div>
    </div>
  )
}
