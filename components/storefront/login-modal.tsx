// Login modal — wired to the real auth server action (no mock session).
// Error codes from the service are mapped to Indonesian copy here, never in the service.

'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import {
  loginFormAction,
  requestPasswordResetFormAction,
  type LoginFormState,
  type RequestPasswordResetFormState,
} from '@/src/controllers/auth.controller'
import { TotpLoginForm } from '@/components/totp-login-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useStorefront } from './storefront-provider'

const ERROR_COPY: Record<string, string> = {
  INPUT_INVALID: 'Invalid data.',
  CREDENTIALS_INVALID: 'Incorrect email/username or password.',
  INVALID_SESSION: 'Invalid session.',
  TOO_MANY_REQUESTS: 'Too many requests. Try again in a moment.',
}

type Mode = 'masuk' | 'lupa'

export function LoginModal() {
  const { loginOpen, setLoginOpen, setUser, setEmailTerverifikasi, notify, closeModals } =
    useStorefront()
  const router = useRouter()
  const pathname = usePathname()
  const [mode, setMode] = useState<Mode>('masuk')
  const [totpChallenge, setTotpChallenge] = useState<string | null>(null)
  const [loginErrorDismissed, setLoginErrorDismissed] = useState(true)
  const [forgotDismissed, setForgotDismissed] = useState(true)
  const [loginState, loginFormActionState, pending] = useActionState<LoginFormState, FormData>(
    async (prevState, formData) => {
      const result = await loginFormAction(prevState, formData)
      if (result.challengeToken) {
        setTotpChallenge(result.challengeToken)
        return result
      }
      if (result.redirectTo) {
        if (result.redirectTo.startsWith('/totp/setup')) {
          close()
          router.push(result.redirectTo)
          return result
        }
        if (result.peran && result.username) {
          completeLogin({
            peran: result.peran,
            username: result.username,
            emailVerified: result.emailVerified ?? false,
          })
        }
      }
      return result
    },
    { error: null },
  )
  const [forgotState, forgotFormAction, resetPending] = useActionState<
    RequestPasswordResetFormState,
    FormData
  >(requestPasswordResetFormAction, { ok: false, error: null })
  const error =
    loginState.error && !loginErrorDismissed
      ? (ERROR_COPY[loginState.code ?? ''] ?? 'Something went wrong. Try again.')
      : null
  const resetError = forgotState.error && !forgotDismissed ? forgotState.error : null
  const resetSent = forgotState.ok && !forgotDismissed

  function resetState() {
    setMode('masuk')
    setTotpChallenge(null)
    setLoginErrorDismissed(true)
    setForgotDismissed(true)
  }

  function close() {
    resetState()
    setLoginOpen(false)
  }

  function openForgot() {
    setMode('lupa')
    setLoginErrorDismissed(true)
    setForgotDismissed(true)
  }

  function backToLogin() {
    setMode('masuk')
    setForgotDismissed(true)
  }

  function completeLogin(result: {
    peran: string
    username: string
    emailVerified: boolean
  }) {
    if (result.peran === 'ADMIN') {
      resetState()
      closeModals()
      router.push('/panel')
      router.refresh()
      return
    }

    setUser(result.username)
    setEmailTerverifikasi(result.emailVerified)
    resetState()
    closeModals()
    if (!pathname.startsWith('/accounts/')) router.refresh()
    notify(`Welcome, ${result.username}`)
  }

  return (
    <Dialog open={loginOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        className="max-w-md gap-0 rounded-[28px] bg-popover p-7 text-popover-foreground shadow-2xl sm:max-w-md sm:p-9"
      >
      {mode === 'masuk' ? totpChallenge ? (
        <div className="relative">
          <DialogTitle className="sr-only">Two-step verification</DialogTitle>
          <TotpLoginForm
            challengeToken={totpChallenge}
            onSuccess={(result) => completeLogin(result)}
            onBack={() => {
              setTotpChallenge(null)
            }}
          />
        </div>
      ) : (
        <form
          noValidate
          action={loginFormActionState}
          onSubmit={() => setLoginErrorDismissed(false)}
        >
          <div className="mb-7">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-deep">
              Welcome
            </p>
            <DialogTitle className="mt-2 font-display text-3xl font-bold tracking-tight">
              Sign in to NEXAPLAY
            </DialogTitle>
          </div>

          <label htmlFor="modal-identity" className="text-xs font-bold">
            Email or username
          </label>
          <Input
            id="modal-identity"
            name="identity"
            autoFocus
            autoComplete="username"
            aria-invalid={!!error}
            className="field mt-2"
                placeholder="name@email.com"
          />

          <label htmlFor="modal-password" className="mt-5 block text-xs font-bold">
            Password
          </label>
          <Input
            id="modal-password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!error}
            className="field mt-2"
            placeholder="At least 8 characters"
          />

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={openForgot}
              className="text-xs font-bold text-brand-deep underline-offset-4 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-4 text-xs font-semibold text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="mt-6 h-12 w-full rounded-xl bg-foreground text-sm font-bold text-background hover:bg-foreground hover:opacity-90"
          >
            {pending ? 'Processing…' : 'Sign in'}
          </Button>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            No account yet?{' '}
            <Link
              href="/register"
              className="font-bold text-foreground underline-offset-4 hover:underline"
            >
              Sign up free
            </Link>
          </p>
        </form>
      ) : (
        <form
          noValidate
          action={forgotFormAction}
          onSubmit={() => setForgotDismissed(false)}
        >
          <div className="mb-7">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-deep">
              Recovery
            </p>
            <DialogTitle className="mt-2 font-display text-3xl font-bold tracking-tight">
              Forgot password
            </DialogTitle>
          </div>

          {resetSent ? (
            <>
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-deep" />
                <p className="text-sm text-muted-foreground">
                  If that email is registered, a reset link has been sent. The link is valid for
                  1 hour and all old sessions will be signed out once the password is changed.
                </p>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                In development, the reset link appears in the server log.
              </p>
              <Button
                type="button"
                onClick={backToLogin}
                className="mt-6 h-12 w-full rounded-xl bg-brand text-sm font-bold text-brand-ink hover:bg-brand hover:brightness-105 active:scale-[.99]"
              >
                Back to sign in
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Enter your account email. We will send a link to create a new password.
              </p>

              <label htmlFor="modal-reset-email" className="mt-7 block text-xs font-bold">
                Email
              </label>
              <Input
                id="modal-reset-email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                disabled={resetPending}
                aria-invalid={!!resetError}
                className="field mt-2"
            placeholder="name@email.com"
              />

              {resetError && (
                <p role="alert" className="mt-4 text-xs font-semibold text-destructive">
                  {resetError}
                </p>
              )}

              <Button
                type="submit"
                disabled={resetPending}
                className="mt-6 h-12 w-full rounded-xl bg-brand text-sm font-bold text-brand-ink hover:bg-brand hover:brightness-105 active:scale-[.99]"
              >
                {resetPending ? 'Sending…' : 'Send reset link'}
              </Button>

              <button
                type="button"
                onClick={backToLogin}
                className="mt-4 flex w-full items-center justify-center gap-2 text-xs font-bold text-muted-foreground transition hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" /> Back to sign in
              </button>
            </>
          )}
        </form>
      )}
      </DialogContent>
    </Dialog>
  )
}
