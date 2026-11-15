'use client'

import { useActionState, useState } from 'react'
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
  const [sukses, setSukses] = useState(false)
  const [state, formAction, pending] = useActionState<{ error: string | null }, FormData>(
    async (_prevState, formData) => {
      const tokenA = extractToken(String(formData.get('tokenA') ?? ''))
      const tokenB = extractToken(String(formData.get('tokenB') ?? ''))
      if (!tokenA || !tokenB) {
        return { error: 'Both links (old email and new email) are required.' }
      }
      const parsed = confirmEmailChangeSchema.safeParse({ tokenLama: tokenA, tokenBaru: tokenB })
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Both links are required.' }
      }

      const result = await confirmEmailChangeAction(parsed.data)
      if (!result.ok) {
        return { error: ERROR_COPY[result.code] ?? result.message }
      }

      setSukses(true)
      return { error: null }
    },
    { error: null },
  )
  const error = state.error

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
        <form noValidate action={formAction}>
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
