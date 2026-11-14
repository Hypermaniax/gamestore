// Account & security page — profile summary, password change, and logout-all.
// Server component only reads the safe profile shape from authService.

import { redirect } from 'next/navigation'
import { Mail, ShieldCheck, UserRound } from 'lucide-react'
import { TotpActiveCard } from '@/components/totp-active'
import { TotpSetupFlow } from '@/components/totp-setup'
import { authService } from '@/src/services/auth.service'
import { ChangeEmailForm } from './change-email-form'
import { ChangePasswordForm } from './change-password-form'
import { LogoutAllCard } from './logout-all-card'

export const instant = false

export default async function AccountPage() {
  const profile = await authService.profile()
  if (!profile.ok) redirect('/login')

  const roleLabel = profile.roleKode === 'ADMIN' ? 'Administrator' : 'Buyer'
  const initial = profile.username.slice(0, 1).toUpperCase()

  return (
    <div className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14 lg:px-12">
      <div className="space-y-8">
        <header>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-deep">My account</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Hello, {profile.username}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your NEXAPLAY profile and account security.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-background/40 p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand text-xl font-extrabold text-brand-ink">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="font-display text-lg font-bold tracking-tight">{profile.username}</p>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                <Mail className="size-3.5 shrink-0" /> {profile.email}
              </p>
            </div>
            <div className="sm:ml-auto">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
                  profile.emailVerified
                    ? 'bg-brand/20 text-brand-deep'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                <ShieldCheck className="size-3.5" />
                {profile.emailVerified ? 'Email verified' : 'Email not verified'}
              </span>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Username
              </dt>
              <dd className="mt-1 flex items-center gap-2 font-semibold">
                <UserRound className="size-4 text-muted-foreground" /> {profile.username}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Role
              </dt>
              <dd className="mt-1 font-semibold">{roleLabel}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                TOTP
              </dt>
              <dd className="mt-1 font-semibold">{profile.totpActive ? 'Active' : 'Not active'}</dd>
            </div>
          </dl>
        </section>

        <ChangeEmailForm currentEmail={profile.email} />

        {profile.totpActive ? (
          <TotpActiveCard />
        ) : (
          <section className="rounded-2xl border border-border bg-background/40 p-5 sm:p-6">
            <TotpSetupFlow />
          </section>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <ChangePasswordForm />
          <LogoutAllCard />
        </div>
      </div>
    </div>
  )
}
