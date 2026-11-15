export const instant = false

import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { TotpSetupFlow } from '@/components/totp-setup'
import { readTotpSetupCookie } from '@/src/lib/session'

export default async function TotpSetupPage() {
  const forced = !!(await readTotpSetupCookie())

  if (!forced) {
    return (
      <AuthShell>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-deep">Security</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Setup session not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open this page through the sign-in flow so a TOTP setup session is available.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-bold text-brand-deep underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-deep">Security</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Set up TOTP</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This account must use two-factor authentication before accessing the panel.
      </p>
      <div className="mt-7">
        <TotpSetupFlow forced />
      </div>
      <Link
        href="/login"
        className="mt-6 inline-block text-xs font-bold text-muted-foreground underline-offset-4 hover:underline"
      >
        Back to sign in
      </Link>
    </AuthShell>
  )
}
