'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { requestPasswordResetAction } from '@/src/controllers/auth.controller'
import { requestPasswordResetSchema } from '@/src/validation/auth'

export default function LupaPasswordPage() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [terkirim, setTerkirim] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    const parsed = requestPasswordResetSchema.safeParse({
      email: String(formData.get('email') ?? ''),
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid data.')
      return
    }

    startTransition(async () => {
      const result = await requestPasswordResetAction(parsed.data)
      if (!result.ok) {
        setError(result.message)
        return
      }
      setTerkirim(true)
    })
  }

  return (
    <AuthShell>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-deep">Recovery</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Forgot password</h1>

      {terkirim ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            If that email is registered, a reset link has been sent. The link is valid for 1 hour,
            and all existing sessions will be signed out after the password is changed.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm font-bold text-brand-deep underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form noValidate action={handleSubmit}>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your account email. We&apos;ll send a link to create a new password.
          </p>

          <label htmlFor="email" className="mt-7 block text-xs font-bold">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            disabled={pending}
            aria-invalid={!!error}
            className="field mt-2"
            placeholder="name@email.com"
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
            {pending ? 'Sending…' : 'Send reset link'}
          </button>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Remember your password?{' '}
            <Link href="/login" className="font-bold text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}
