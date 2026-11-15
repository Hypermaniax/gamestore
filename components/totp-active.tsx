// Active TOTP card — regenerate recovery codes with password + current code.

'use client'

import { useActionState, useState } from 'react'
import { Check, Copy, ShieldCheck } from 'lucide-react'
import { totpRecoveryRegenerateAction } from '@/src/controllers/auth.controller'
import { totpRecoveryRegenerateSchema } from '@/src/validation/auth'

const ERROR_COPY: Record<string, string> = {
  PASSWORD_INVALID: 'Current password is incorrect.',
  TOTP_INVALID: 'Incorrect TOTP code.',
  TOTP_CODE_REUSED: 'This code has already been used. Wait for the next code.',
  TOTP_LOCKED: 'TOTP is temporarily locked. Try again later.',
  TOTP_NOT_ACTIVE: 'TOTP is not active for this account.',
  TOTP_CORRUPTED: 'The TOTP secret cannot be decrypted. Ask an admin to reset it.',
  INVALID_SESSION: 'Your session is no longer valid. Please sign in again.',
  TOO_MANY_REQUESTS: 'Too many attempts. Please try again later.',
}

export function TotpActiveCard() {
  const [open, setOpen] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [copied, setCopied] = useState(false)
  const [errorDismissed, setErrorDismissed] = useState(false)
  const [state, formAction, pending] = useActionState<{ error: string | null }, FormData>(
    async (_prevState, formData) => {
      const parsed = totpRecoveryRegenerateSchema.safeParse({
        password: String(formData.get('password') ?? ''),
        code: String(formData.get('kode') ?? ''),
      })
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Invalid data.' }
      }

      const result = await totpRecoveryRegenerateAction(parsed.data)
      if (!result.ok) {
        return { error: ERROR_COPY[result.code] ?? result.message }
      }

      setRecoveryCodes(result.recoveryCodes)
      setOpen(false)
      return { error: null }
    },
    { error: null },
  )
  const error = state.error && !errorDismissed ? state.error : null

  return (
    <section className="rounded-2xl border border-border bg-background/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand-deep">
          <ShieldCheck className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold tracking-tight">Two-factor authentication</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign-in requires your password and a 6-digit code from your authenticator app.
          </p>
        </div>
        <span className="rounded-full bg-brand/20 px-3 py-1 text-[11px] font-bold text-brand-deep">
          TOTP active
        </span>
      </div>

      {recoveryCodes ? (
        <div className="mt-5">
          <p className="text-sm font-semibold">New recovery codes have been generated.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Old codes no longer work. Save these now because they are shown only once.
          </p>
          <div className="mt-4 grid gap-2 rounded-xl border border-border bg-card p-4 font-mono text-sm sm:grid-cols-2">
            {recoveryCodes.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(recoveryCodes.join('\n')).then(() => {
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1500)
                })
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold transition hover:bg-muted"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copied' : 'Copy all'}
            </button>
            <button
              type="button"
              onClick={() => setRecoveryCodes(null)}
              className="h-10 rounded-xl bg-foreground px-4 text-xs font-bold text-background transition hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      ) : open ? (
        <form
          noValidate
          action={formAction}
          onSubmit={() => setErrorDismissed(false)}
          className="mt-5 space-y-4"
        >
          <p className="text-xs text-muted-foreground">
            Regenerate recovery codes if the old ones are lost or leaked. Your current TOTP code is
            still required.
          </p>

          <div>
            <label htmlFor="recovery-password" className="text-xs font-bold">
              Current password
            </label>
            <input
              id="recovery-password"
              name="password"
              type="password"
              autoComplete="current-password"
              disabled={pending}
              aria-invalid={!!error}
              className="field mt-2"
              placeholder="Current password"
            />
          </div>

          <div>
            <label htmlFor="recovery-code" className="text-xs font-bold">
              Current TOTP code
            </label>
            <input
              id="recovery-code"
              name="kode"
              inputMode="numeric"
              autoComplete="one-time-code"
              disabled={pending}
              aria-invalid={!!error}
              className="field mt-2 font-mono tracking-[.2em]"
              placeholder="123456"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-semibold text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setErrorDismissed(true)
              }}
              disabled={pending}
              className="h-11 flex-1 rounded-xl border border-border text-xs font-bold transition hover:bg-muted disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-11 flex-1 rounded-xl bg-foreground text-xs font-bold text-background transition hover:opacity-90 disabled:opacity-60"
            >
              {pending ? 'Generating…' : 'Regenerate'}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setErrorDismissed(true)
          }}
          className="mt-5 h-11 w-full rounded-xl border border-border text-sm font-bold transition hover:bg-muted"
        >
          Regenerate recovery codes
        </button>
      )}
    </section>
  )
}
