'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { resetPasswordAction } from '@/src/controllers/auth.controller'
import { resetPasswordSchema } from '@/src/validation/auth'

const ERROR_COPY: Record<string, string> = {
  INPUT_INVALID: 'Password must be at least 8 characters.',
  TOKEN_INVALID: 'The reset link is invalid. Request a new link.',
  TOKEN_EXPIRED: 'The reset link has expired. Request a new link.',
  TOO_MANY_REQUESTS: 'Too many attempts. Please try again later.',
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sukses, setSukses] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    const password = String(formData.get('password') ?? '')
    const konfirmasi = String(formData.get('konfirmasi') ?? '')
    if (password !== konfirmasi) {
      setError('Passwords do not match.')
      return
    }
    const parsed = resetPasswordSchema.safeParse({ token, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid data.')
      return
    }

    startTransition(async () => {
      const result = await resetPasswordAction(parsed.data)
      if (!result.ok) {
        setError(ERROR_COPY[result.code] ?? result.message)
        return
      }
      setSukses(true)
    })
  }

  return (
    <AuthShell>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-deep">Recovery</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">New password</h1>

      {!token ? (
        <div className="mt-6 space-y-3">
          <p role="alert" className="text-sm text-muted-foreground">
            Incomplete link. Open the link from the reset email, or request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block text-sm font-bold text-brand-deep underline-offset-4 hover:underline"
          >
            Request reset link
          </Link>
        </div>
      ) : sukses ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Your password has been changed and all existing sessions have been signed out.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm font-bold text-brand-deep underline-offset-4 hover:underline"
          >
            Sign in with new password
          </Link>
        </div>
      ) : (
        <form noValidate action={handleSubmit}>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a new password — at least 8 characters.
          </p>

          <label htmlFor="password" className="mt-7 block text-xs font-bold">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            autoFocus
            disabled={pending}
            aria-invalid={!!error}
            className="field mt-2"
            placeholder="At least 8 characters"
          />

          <label htmlFor="konfirmasi" className="mt-5 block text-xs font-bold">
            Repeat new password
          </label>
          <input
            id="konfirmasi"
            name="konfirmasi"
            type="password"
            autoComplete="new-password"
            disabled={pending}
            aria-invalid={!!error}
            className="field mt-2"
            placeholder="Repeat password"
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
            {pending ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
