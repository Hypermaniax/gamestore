// TOTP second login step — shared by the standalone login page and the storefront modal.

'use client'

import { useState, useTransition } from 'react'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { loginTotpAction } from '@/src/controllers/auth.controller'
import { totpLoginSchema } from '@/src/validation/auth'
import { Input } from '@/components/ui/input'

const ERROR_COPY: Record<string, string> = {
  INPUT_INVALID: 'Invalid code.',
  TOKEN_INVALID: 'Verification session expired. Please sign in again.',
  INVALID_SESSION: 'Your session is no longer valid. Please sign in again.',
  TOTP_NOT_ACTIVE: 'TOTP is not active for this account.',
  TOTP_LOCKED: 'Too many incorrect codes. Try again later.',
  TOTP_CORRUPTED: 'The TOTP secret cannot be decrypted. Ask an admin to reset it.',
  TOTP_CODE_REUSED: 'This code has already been used. Wait for the next code.',
  TOTP_INVALID: 'Incorrect TOTP or recovery code.',
  TOO_MANY_REQUESTS: 'Too many attempts. Please try again later.',
}

export function TotpLoginForm({
  challengeToken,
  onSuccess,
  onBack,
}: {
  challengeToken: string
  onSuccess: (result: { peran: string; username: string; emailVerified: boolean }) => void
  onBack: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    const parsed = totpLoginSchema.safeParse({
      challengeToken,
      code: String(formData.get('kode') ?? ''),
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid code.')
      return
    }

    startTransition(async () => {
      const result = await loginTotpAction(parsed.data)
      if (!result.ok) {
        setError(ERROR_COPY[result.code] ?? result.message)
        return
      }
      onSuccess(result)
    })
  }

  return (
    <form noValidate action={handleSubmit}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand-deep">
          <KeyRound className="size-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-deep">
            Two-factor verification
          </p>
          <h2 id="totp-title" className="mt-2 font-display text-2xl font-bold tracking-tight">
            Enter your security code
          </h2>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Open your authenticator app and enter the 6-digit code. You can also use one of your
        recovery codes.
      </p>

      <label htmlFor="totp-code" className="mt-6 block text-xs font-bold">
        TOTP or recovery code
      </label>
      <Input
        id="totp-code"
        name="kode"
        autoComplete="one-time-code"
        autoFocus
        disabled={pending}
        aria-invalid={!!error}
        className="field mt-2 font-mono tracking-[.15em]"
        placeholder="123456 or xxxxx-xxxxx"
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
        {pending ? 'Verifying…' : 'Verify and sign in'}
      </button>

      <button
        type="button"
        onClick={onBack}
        disabled={pending}
        className="mt-4 flex w-full items-center justify-center gap-2 text-xs font-bold text-muted-foreground underline-offset-4 hover:underline disabled:opacity-60"
      >
        <ArrowLeft className="size-3.5" /> Back to sign in
      </button>
    </form>
  )
}
