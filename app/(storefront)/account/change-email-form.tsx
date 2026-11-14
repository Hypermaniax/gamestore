// Change email request — sends two confirmation links, one to the old inbox and one to the new inbox.

'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { requestEmailChangeAction } from '@/src/controllers/auth.controller'
import { requestEmailChangeSchema } from '@/src/validation/auth'

const ERROR_COPY: Record<string, string> = {
  PASSWORD_INVALID: 'Current password does not match.',
  EMAIL_SAME: 'The new email is the same as your current email.',
  INPUT_INVALID: 'Invalid email or password.',
  INVALID_SESSION: 'Your session is no longer valid. Please sign in again.',
  TOO_MANY_REQUESTS: 'Too many requests. Try again in a moment.',
}

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [terkirim, setTerkirim] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    const newEmail = String(formData.get('emailBaru') ?? '')
    const konfirmasi = String(formData.get('konfirmasiEmail') ?? '')
    const password = String(formData.get('password') ?? '')

    if (newEmail.trim().toLowerCase() !== konfirmasi.trim().toLowerCase()) {
      setError('New email confirmation does not match.')
      return
    }

    const parsed = requestEmailChangeSchema.safeParse({ newEmail, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid data.')
      return
    }

    startTransition(async () => {
      const result = await requestEmailChangeAction(parsed.data)
      if (!result.ok) {
        setError(ERROR_COPY[result.code] ?? result.message)
        return
      }
      setTerkirim(true)
    })
  }

  return (
    <section
      id="change-email"
      className="scroll-mt-24 rounded-2xl border border-border bg-background/40 p-5 sm:p-6"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10">
        <div>
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
              <Mail className="size-4" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">Change email</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                The new email must be confirmed from both inboxes.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">
              Current email
            </p>
            <p className="mt-1 break-all text-sm font-semibold">{currentEmail}</p>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            We send one link to your old email and one link to your new email. The email only
            changes after both links are opened. The links are valid for 24 hours and all sessions
            will be signed out once the change is complete.
          </p>
        </div>

        {terkirim ? (
          <div className="flex flex-col justify-between gap-4 rounded-xl border border-brand/40 bg-brand/10 p-4">
            <div>
              <p className="text-sm font-semibold">Your email change request has been processed.</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                If the destination email is available, two confirmation links have been sent to your
                old and new email. Check your spam folder too. Your account email will not change
                until both links are opened.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href="/change-email/confirm"
                className="text-xs font-bold text-brand-deep underline-offset-4 hover:underline"
              >
                Open confirmation page
              </Link>
              <button
                type="button"
                onClick={() => setTerkirim(false)}
                className="text-xs font-bold text-muted-foreground underline-offset-4 hover:underline"
              >
                Retry request
              </button>
            </div>
          </div>
        ) : (
          <form noValidate action={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email-baru" className="text-xs font-bold">
                New email
              </label>
              <input
                id="email-baru"
                name="emailBaru"
                type="email"
                autoComplete="email"
                disabled={pending}
                aria-invalid={!!error}
                className="field mt-2"
                placeholder="new-email@example.com"
              />
            </div>

            <div>
              <label htmlFor="email-baru-konfirmasi" className="text-xs font-bold">
                Repeat new email
              </label>
              <input
                id="email-baru-konfirmasi"
                name="konfirmasiEmail"
                type="email"
                autoComplete="email"
                disabled={pending}
                aria-invalid={!!error}
                className="field mt-2"
                placeholder="Repeat new email"
              />
            </div>

            <div>
              <label htmlFor="email-password" className="text-xs font-bold">
                Current password
              </label>
              <input
                id="email-password"
                name="password"
                type="password"
                autoComplete="current-password"
                disabled={pending}
                aria-invalid={!!error}
                className="field mt-2"
                placeholder="Current password"
              />
            </div>

            {error && (
              <p role="alert" className="text-xs font-semibold text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="h-11 w-full rounded-xl bg-foreground text-sm font-bold text-background transition hover:opacity-90 active:scale-[.99] disabled:opacity-60"
            >
              {pending ? 'Processing…' : 'Send confirmation link'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
