// Logout-all card — destructive action with an inline confirmation step.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, ShieldAlert } from 'lucide-react'
import { logoutAllAction } from '@/src/controllers/auth.controller'

export function LogoutAllCard() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function logoutAll() {
    setError(null)
    startTransition(async () => {
      const result = await logoutAllAction()
      if (!result.ok) {
        setError(result.message)
        return
      }
      router.replace('/login')
      router.refresh()
    })
  }

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-background/40 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-4" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">All devices</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Revoke all sessions, including this device. You will need to sign in again.
          </p>
        </div>
      </div>

      <div className="mt-5 flex grow flex-col justify-end gap-3">
        {confirming ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-semibold">Sign out of all devices?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              All signed-in devices will lose access immediately.
            </p>
            {error && (
              <p role="alert" className="mt-3 text-xs font-semibold text-destructive">
                {error}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirming(false)
                  setError(null)
                }}
                disabled={pending}
                className="h-10 flex-1 rounded-xl border border-border text-xs font-bold transition hover:bg-muted disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={logoutAll}
                disabled={pending}
                className="h-10 flex-1 rounded-xl bg-destructive text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {pending ? 'Processing…' : 'Yes, sign out all'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 text-sm font-bold text-destructive transition hover:bg-destructive/10 active:scale-[.99]"
          >
            <LogOut className="size-4" /> Sign out of all devices
          </button>
        )}
      </div>
    </section>
  )
}
