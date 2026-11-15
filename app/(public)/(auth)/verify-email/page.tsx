export const instant = false

import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { AuthShell } from '@/components/auth-shell'
import { VerifyEmailForm } from '@/components/verify-email-form'
import { authService } from '@/src/services/auth.service'
import { safeNextPath } from '@/src/lib/safe-next'

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const [{ next: rawNext }, profile] = await Promise.all([
    searchParams,
    authService.profile(),
  ])
  const next = safeNextPath(rawNext)

  if (!profile.ok) {
    return (
      <AuthShell>
        <span className="grid size-11 place-items-center rounded-2xl bg-brand/15 text-brand-deep">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Verify your email</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          Sign in to verify the email on your account. Your verification code is tied to your
          session, so you will not need to enter your email again.
        </p>
        <Link
          href="/login"
          className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-brand-ink transition hover:brightness-105 active:scale-[.99]"
        >
          Sign in
        </Link>
      </AuthShell>
    )
  }

  const verified = profile.emailVerified
  const cooldown = verified ? 0 : await authService.verificationCooldown()

  return (
    <AuthShell>
      {verified && (
        <span className="grid size-11 place-items-center rounded-2xl bg-brand/15 text-brand-deep">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
      )}
      <h1 className={`font-display text-3xl font-bold tracking-tight ${verified ? 'mt-4' : ''}`}>
        {verified ? 'Email verified' : 'Verify your email'}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {verified
          ? 'Your email is already verified. You can continue to checkout.'
          : `Enter the 6-digit code sent to ${profile.email} to verify your account.`}
      </p>

      <div className="mt-7">
        {verified ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={next ?? '/account'}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-brand-ink transition hover:brightness-105 active:scale-[.99]"
            >
              {next ? 'Continue' : 'Back to account'}
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-bold text-foreground transition hover:bg-muted"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <VerifyEmailForm email={profile.email} initialCooldown={cooldown} next={next} />
        )}
      </div>
    </AuthShell>
  )
}
