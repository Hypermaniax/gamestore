'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import {
  verifyEmailFormAction,
  type VerifyEmailFormState,
} from '@/src/controllers/auth.controller'
import { OtpCodeInput } from '@/components/otp-code-input'

const ERROR_COPY: Record<string, string> = {
  INPUT_INVALID: 'Enter the 6-digit code from your email.',
  TOKEN_INVALID: 'The code is invalid or has expired. Request a new one.',
  TOO_MANY_REQUESTS: 'Too many attempts. Please try again later.',
}

const RESEND_DELAY_SECONDS = 60
const initialState: VerifyEmailFormState = { ok: false, action: null, error: null }

export function VerifyEmailForm({
  email,
  initialCooldown = 0,
}: {
  email: string
  initialCooldown?: number
}) {
  const [code, setCode] = useState('')
  const [otpKey, setOtpKey] = useState(0)
  const [cooldown, setCooldown] = useState(initialCooldown)
  const [errorDismissed, setErrorDismissed] = useState(false)
  const [intent, setIntent] = useState<'verify' | 'resend'>('verify')
  const [state, formAction, pending] = useActionState<VerifyEmailFormState, FormData>(
    async (prevState, formData) => {
      const result = await verifyEmailFormAction(prevState, formData)
      if (result.ok && result.action === 'resend' && result.resetCode) {
        setCode('')
        setOtpKey((key) => key + 1)
        setCooldown(result.cooldown ?? RESEND_DELAY_SECONDS)
        setErrorDismissed(false)
        setIntent('verify')
      }
      return result
    },
    initialState,
  )

  const busy = pending
  const error =
    state.error && !errorDismissed
      ? (ERROR_COPY[state.code ?? ''] ?? state.error)
      : null
  const notice = state.ok && state.action === 'resend' ? state.notice : null
  const verified = state.ok && state.action === 'verify'

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => {
      setCooldown((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  function handleCodeChange(next: string) {
    setCode(next)
    setIntent('verify')
    if (state.error) setErrorDismissed(true)
  }

  if (verified) {
    return (
      <div>
        <span className="grid size-12 place-items-center rounded-2xl bg-brand/15 text-brand-deep">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-bold tracking-tight">Email verified</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Your email is confirmed and your account is ready. You can continue to checkout.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/account"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-brand-ink transition hover:brightness-105 active:scale-[.99]"
          >
            Back to account
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-bold text-foreground transition hover:bg-muted"
          >
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form
      noValidate
      action={formAction}
      aria-busy={busy}
      onSubmit={() => setErrorDismissed(false)}
    >
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="email" value={email} />
      <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand-deep">
          <Mail className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">
            Code sent to
          </p>
          <p className="truncate text-sm font-semibold">{email}</p>
        </div>
      </div>

      <div className="mt-6 flex items-baseline justify-between gap-3">
        <span id="verification-code-label" className="text-xs font-bold">
          6-digit code
        </span>
        <span id="verification-code-expiry" className="text-[11px] text-muted-foreground">
          Expires in 15 minutes
        </span>
      </div>

      <div className="mt-2.5">
        <OtpCodeInput
          key={otpKey}
          value={code}
          onChange={handleCodeChange}
          disabled={busy}
          invalid={!!error}
          autoFocus
          labelledBy="verification-code-label"
          describedBy={
            error
              ? 'verification-code-expiry verification-error'
              : 'verification-code-expiry'
          }
        />
      </div>

      {error && (
        <div
          id="verification-error"
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-xs font-semibold text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mt-3 flex items-start gap-2 rounded-xl border border-brand-deep/20 bg-brand/10 p-3 text-xs font-semibold text-brand-deep"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      <button
        type="submit"
        name="intent"
        value="verify"
        onClick={() => setIntent('verify')}
        disabled={busy}
        className="group mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-brand-ink transition hover:brightness-105 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && intent === 'verify' ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Verifying…
          </>
        ) : (
          <>
            Verify email
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </>
        )}
      </button>

      <div className="mt-5 border-t border-border pt-4 text-center text-xs text-muted-foreground">
        Didn&apos;t receive the code?{' '}
        <button
          type="submit"
          name="intent"
          value="resend"
          onClick={() => setIntent('resend')}
          disabled={busy || cooldown > 0}
          className="font-bold text-foreground underline-offset-4 transition hover:text-brand-deep hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          {pending && intent === 'resend'
            ? 'Sending…'
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : 'Resend code'}
        </button>
      </div>

      <div className="mt-4 text-center">
        <Link
          href="/account"
          className="inline-block text-xs font-bold text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
        >
          Back to account
        </Link>
      </div>
    </form>
  )
}
