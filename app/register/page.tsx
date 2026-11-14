// Standalone registration route (PEMBELI role) — NexaPlay styling, real server action.

'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { registerAction } from '@/src/controllers/auth.controller'
import { registerSchema } from '@/src/validation/auth'
import { ThemeToggle } from '@/components/theme-toggle'

export default function DaftarForm() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sukses, setSukses] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    const parsed = registerSchema.safeParse({
      username: String(formData.get('username') ?? ''),
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid data.')
      return
    }

    startTransition(async () => {
      const result = await registerAction(parsed.data)
      if (!result.ok) {
        setError(result.message)
        return
      }
      setSukses(true)
    })
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

      <form
        noValidate
        action={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-[28px] border border-border bg-popover p-8 shadow-[0_30px_100px_rgba(0,0,0,.35)] sm:p-10"
      >
        <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-deep">New account</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Sign up</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a buyer account — your email will be verified.
        </p>

        {sukses ? (
          <div className="mt-7 space-y-2">
            <p className="text-sm font-semibold">Registration successful.</p>
            <p className="text-sm text-muted-foreground">
              Check your email for the verification link. In development, the link appears in the
              server log.
            </p>
            <Link
              href="/"
              className="mt-2 inline-block text-sm font-bold text-brand-deep underline-offset-4 hover:underline"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <>
            <label htmlFor="username" className="mt-7 block text-xs font-bold">
              Username
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              disabled={pending}
              aria-invalid={!!error}
              className="field mt-2"
              placeholder="your username"
            />

            <label htmlFor="email" className="mt-5 block text-xs font-bold">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              disabled={pending}
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
              autoComplete="new-password"
              disabled={pending}
              aria-invalid={!!error}
              className="field mt-2"
              placeholder="At least 8 characters"
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
              {pending ? 'Processing…' : 'Sign up'}
            </button>
          </>
        )}

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  )
}
