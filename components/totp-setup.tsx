// TOTP onboarding — used from the account page (session) and forced setup after login.

'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import { Check, Copy, ShieldCheck, Smartphone } from 'lucide-react'
import { totpActivateAction, totpSetupAction } from '@/src/controllers/auth.controller'
import { totpActivateSchema } from '@/src/validation/auth'

const ERROR_COPY: Record<string, string> = {
  INPUT_INVALID: 'TOTP code must be 6 digits.',
  INVALID_SESSION: 'Your session is no longer valid. Please sign in again.',
  TOKEN_INVALID: 'TOTP setup session expired. Please sign in again.',
  TOTP_ALREADY_ACTIVE: 'TOTP is already active.',
  TOTP_NOT_SETUP: 'Request a TOTP secret first.',
  TOTP_CORRUPTED: 'The TOTP secret cannot be decrypted. Ask an admin to reset it.',
  TOTP_INVALID: 'Incorrect TOTP code. Try the latest code.',
  TOO_MANY_REQUESTS: 'Too many attempts. Please try again later.',
}

type SetupData = {
  secret: string
  otpauthUri: string
  qrDataUrl: string
}

function copyToClipboard(value: string): Promise<void> {
  return navigator.clipboard.writeText(value)
}

export function TotpSetupFlow({ challengeToken }: { challengeToken?: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [setup, setSetup] = useState<SetupData | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  function markCopied(key: string) {
    setCopied(key)
    window.setTimeout(() => setCopied(null), 1500)
  }

  function beginSetup() {
    setError(null)
    startTransition(async () => {
      const result = await totpSetupAction({ challengeToken })
      if (!result.ok) {
        setError(ERROR_COPY[result.code] ?? result.message)
        return
      }

      let qrDataUrl = ''
      try {
        qrDataUrl = await QRCode.toDataURL(result.otpauthUri, {
          width: 220,
          margin: 1,
          color: { dark: '#0a0a0a', light: '#ffffff' },
        })
      } catch {
        qrDataUrl = ''
      }
      setSetup({ secret: result.secret, otpauthUri: result.otpauthUri, qrDataUrl })
    })
  }

  function activate(formData: FormData) {
    setError(null)
    const parsed = totpActivateSchema.safeParse({
      challengeToken,
      code: String(formData.get('kode') ?? ''),
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid TOTP code.')
      return
    }

    startTransition(async () => {
      const result = await totpActivateAction(parsed.data)
      if (!result.ok) {
        setError(ERROR_COPY[result.code] ?? result.message)
        return
      }
      setRecoveryCodes(result.recoveryCodes)
    })
  }

  function finish() {
    if (challengeToken) {
      router.replace('/panel')
      router.refresh()
      return
    }
    router.refresh()
  }

  if (recoveryCodes) {
    return (
      <div>
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand-deep">
            <ShieldCheck className="size-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">TOTP activated</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Save these recovery codes now. They are shown only once.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 rounded-xl border border-border bg-card p-4 font-mono text-sm sm:grid-cols-2">
          {recoveryCodes.map((code) => (
            <span key={code}>{code}</span>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void copyToClipboard(recoveryCodes.join('\n')).then(() => markCopied('all'))
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold transition hover:bg-muted"
          >
            {copied === 'all' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied === 'all' ? 'Copied' : 'Copy all'}
          </button>
          <button
            type="button"
            onClick={finish}
            className="h-10 rounded-xl bg-foreground px-4 text-xs font-bold text-background transition hover:opacity-90"
          >
            {challengeToken ? 'Continue to panel' : 'Done'}
          </button>
        </div>
      </div>
    )
  }

  if (setup) {
    return (
      <div>
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
            <Smartphone className="size-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">Scan TOTP QR code</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Scan with Google Authenticator, Aegis, or another TOTP app.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
          {setup.qrDataUrl ? (
            <Image
              src={setup.qrDataUrl}
              alt="QR code to register TOTP"
              width={220}
              height={220}
              unoptimized
              className="shrink-0 self-center rounded-xl bg-white p-3 sm:self-start"
            />
          ) : (
            <div className="grid size-[220px] shrink-0 place-items-center self-center rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground sm:self-start">
              Failed to generate QR code. Enter the secret below manually.
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">
              Manual secret
            </p>
            <p className="mt-2 break-all rounded-xl border border-border bg-card p-3 font-mono text-xs">
              {setup.secret}
            </p>
            <button
              type="button"
              onClick={() => {
                void copyToClipboard(setup.secret).then(() => markCopied('secret'))
              }}
              className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-brand-deep underline-offset-4 hover:underline"
            >
              {copied === 'secret' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied === 'secret' ? 'Secret copied' : 'Copy secret'}
            </button>

            <form noValidate action={activate} className="mt-5">
              <label htmlFor="totp-activate" className="text-xs font-bold">
                6-digit code from your app
              </label>
              <input
                id="totp-activate"
                name="kode"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                disabled={pending}
                aria-invalid={!!error}
                className="field mt-2 font-mono tracking-[.25em]"
                placeholder="123456"
              />

              {error && (
                <p role="alert" className="mt-3 text-xs font-semibold text-destructive">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="mt-4 h-11 w-full rounded-xl bg-brand text-sm font-bold text-brand-ink transition hover:brightness-105 active:scale-[.99] disabled:opacity-60"
              >
                {pending ? 'Activating…' : 'Activate TOTP'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
          <ShieldCheck className="size-4" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">Two-factor authentication</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Add an extra layer of security with TOTP codes from your authenticator app.
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Once active, sign-in will require your password and a 6-digit code. Save the recovery codes
        shown after activation.
      </p>

      {error && (
        <p role="alert" className="mt-4 text-xs font-semibold text-destructive">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={beginSetup}
        disabled={pending}
        className="mt-5 h-11 w-full rounded-xl bg-foreground text-sm font-bold text-background transition hover:opacity-90 active:scale-[.99] disabled:opacity-60"
      >
        {pending ? 'Preparing…' : 'Activate TOTP'}
      </button>
    </div>
  )
}
