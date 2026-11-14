export const instant = false

import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { authService } from '@/src/services/auth.service'

export default async function VerifikasiEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const { token } = await searchParams
  const hasil = typeof token === 'string' ? await authService.verifyEmail(token) : null

  return (
    <AuthShell>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-deep">Verification</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
        {hasil?.ok ? 'Email verified' : 'Verify email'}
      </h1>

      <p className="mt-4 text-sm text-muted-foreground">
        {hasil?.ok
          ? 'Thank you. Your email is verified and you can now check out.'
          : (hasil?.message ?? 'The verification link is incomplete. Open the link directly from the email.')}
      </p>

      <div className="mt-6 flex flex-wrap gap-4 text-sm font-bold">
        <Link href="/login" className="text-brand-deep underline-offset-4 hover:underline">
          Sign in
        </Link>
        <Link href="/" className="text-foreground underline-offset-4 hover:underline">
          Back to home
        </Link>
      </div>
    </AuthShell>
  )
}
