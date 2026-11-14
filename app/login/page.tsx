// Standalone login route — required by the panel guard redirects.
// The landing page uses its own modal; both share the same server action.

'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { loginAction } from '@/src/controllers/auth.controller'
import { loginSchema } from '@/src/validation/auth'
import { ThemeToggle } from '@/components/theme-toggle'
import { TotpLoginForm } from '@/components/totp-login-form'

const ERROR_COPY: Record<string, string> = {
  INPUT_INVALID: 'Invalid data.',
  CREDENTIALS_INVALID: 'Incorrect email/username or password.',
  INVALID_SESSION: 'Invalid session.',
  TOO_MANY_REQUESTS: 'Too many attempts. Please try again later.',
}

export default function LoginForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [challengeToken, setChallengeToken] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    const parsed = loginSchema.safeParse({
      usernameOrEmail: String(formData.get('identity') ?? ''),
      password: String(formData.get('password') ?? ''),
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid data.')
      return
    }

    startTransition(async () => {
      const result = await loginAction(parsed.data)
      if (!result.ok) {
        setError(ERROR_COPY[result.code] ?? 'Something went wrong. Please try again.')
        return
      }
      if (result.jalur === 'perlu-totp') {
        setChallengeToken(result.token)
        return
      }
      if (result.jalur === 'perlu-setup-totp') {
        router.push(`/totp/setup?token=${encodeURIComponent(result.token)}`)
        return
      }
      router.push(result.peran === 'ADMIN' ? '/panel' : '/')
      router.refresh()
    })
  }

  function handleTotpSuccess(result: { peran: string }) {
    router.push(result.peran === 'ADMIN' ? '/panel' : '/')
    router.refresh()
  }

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none fixed inset-0 z-0 noise opacity-[0.028] mix-blend-soft-light" />
      <div className="absolute left-5 top-5 z-10 flex items-center gap-3 sm:left-8 sm:top-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Back to home">
          <span className="grid size-9 rotate-3 place-items-center rounded-[10px] bg-brand text-brand-ink">
            <Sparkles className="size-5" />
          </span>
          <span className="font-display text-xl font-bold tracking-[-0.04em]">
            NEXA<span className="text-brand-deep">PLAY</span>
          </span>
        </Link>
      </div>
      <div className="absolute right-5 top-5 z-10 sm:right-8 sm:top-8">
        <ThemeToggle />
      </div>

      {challengeToken ? (
        <div className="relative z-10 w-full max-w-md rounded-[28px] border border-border bg-popover p-8 shadow-[0_30px_100px_rgba(0,0,0,.35)] sm:p-10">
          <TotpLoginForm
            challengeToken={challengeToken}
            onSuccess={handleTotpSuccess}
            onBack={() => {
              setChallengeToken(null)
              setError(null)
            }}
          />
        </div>
      ) : (
        <form
          noValidate
          action={handleSubmit}
          className="relative z-10 w-full max-w-md rounded-[28px] border border-border bg-popover p-8 shadow-[0_30px_100px_rgba(0,0,0,.35)] sm:p-10"
        >
        <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-deep">Welcome</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Sign in to NEXAPLAY</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use your account email or username.
        </p>

        <label htmlFor="identity" className="mt-7 block text-xs font-bold">
          Email or username
        </label>
        <input
          id="identity"
          name="identity"
          autoComplete="username"
          autoFocus
          aria-invalid={!!error}
          className="field mt-2"
          placeholder="name@email.com"
        />

        <label htmlFor="password" className="mt-5 block text-xs font-bold">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!error}
          className="field mt-2"
          placeholder="At least 8 characters"
        />

        <div className="mt-2 flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs font-bold text-brand-deep underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

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
          {pending ? 'Processing…' : 'Sign in'}
        </button>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-bold text-foreground underline-offset-4 hover:underline">
            Sign up free
          </Link>
        </p>
        </form>
      )}
    </main>
  )
}
