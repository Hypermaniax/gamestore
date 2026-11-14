'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { confirmEmailChangeAction } from '@/src/controllers/auth.controller'
import { confirmEmailChangeSchema } from '@/src/validation/auth'

const ERROR_COPY: Record<string, string> = {
  TOKEN_INVALID: 'Both links are invalid or already used. Please request the email change again.',
  TOKEN_EXPIRED: 'The link has expired. Please request the email change again.',
  EMAIL_ALREADY_USED: 'The destination email is already used by another account. Try a different email.',
  TOO_MANY_REQUESTS: 'Too many attempts. Please try again later.',
}

/** Accepts a bare token or the full link from the email. */
function extractToken(value: string): string {
  const trimmed = value.trim()
  const marker = 'token='
  const index = trimmed.indexOf(marker)
  if (index === -1) return trimmed
  return decodeURIComponent(trimmed.slice(index + marker.length).split('&')[0])
}

export function ConfirmEmailChangeForm({ token }: { token: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sukses, setSukses] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    const tokenA = extractToken(String(formData.get('tokenA') ?? ''))
    const tokenB = extractToken(String(formData.get('tokenB') ?? ''))
    if (!tokenA || !tokenB) {
      setError('Both links (old email and new email) are required.')
      return
    }
    const parsed = confirmEmailChangeSchema.safeParse({ tokenLama: tokenA, tokenBaru: tokenB })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Both links are required.')
      return
    }

    startTransition(async () => {
      const result = await confirmEmailChangeAction(parsed.data)
      if (!result.ok) {
        setError(ERROR_COPY[result.code] ?? result.message)
        return
      }
      setSukses(true)
    })
  }

  return (
    <AuthShell>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-deep">Change email</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Confirm both links</h1>

      {sukses ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Your account email has been changed and all existing sessions have been signed out.
            Please sign in with the new email.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm font-bold text-brand-deep underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <form noValidate action={handleSubmit}>
          <p className="mt-2 text-sm text-muted-foreground">
            Open the links from the old email and the new email, then paste both here. Order
            doesn&apos;t matter.
          </p>

          <label htmlFor="tokenA" className="mt-6 block text-xs font-bold">
            First link
          </label>
          <textarea
            id="tokenA"
            name="tokenA"
            defaultValue={token}
            rows={2}
            disabled={pending}
            aria-invalid={!!error}
            className="field mt-2 h-auto resize-none py-3 break-all"
            placeholder="Paste link or token"
          />

          <label htmlFor="tokenB" className="mt-5 block text-xs font-bold">
            Second link
          </label>
          <textarea
            id="tokenB"
            name="tokenB"
            rows={2}
            disabled={pending}
            aria-invalid={!!error}
            className="field mt-2 h-auto resize-none py-3 break-all"
            placeholder="Paste link or token"
          />

          {error && (
            <p role="alert" className="mt-4 text-xs font-semibold text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-6 h-12 w-full rounded-xl bg-brand text-sm font-bold text-brand-ink transition hover:brightness-105 active:scale-[.99] disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Confirm email change'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
