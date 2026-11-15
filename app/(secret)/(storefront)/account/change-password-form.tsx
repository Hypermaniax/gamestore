// Change password while logged in — requires the current password.

'use client'

import { useActionState, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { changePasswordAction } from '@/src/controllers/auth.controller'
import { changePasswordSchema } from '@/src/validation/auth'

const ERROR_COPY: Record<string, string> = {
  PASSWORD_INVALID: 'Current password does not match.',
  INPUT_INVALID: 'New password must be at least 8 characters.',
  INVALID_SESSION: 'Your session is no longer valid. Please sign in again.',
  TOO_MANY_REQUESTS: 'Too many requests. Try again in a moment.',
}

export function ChangePasswordForm() {
  const [sukses, setSukses] = useState(false)
  const [state, formAction, pending] = useActionState<{ error: string | null }, FormData>(
    async (_prevState, formData) => {
      const passwordLama = String(formData.get('passwordLama') ?? '')
      const passwordBaru = String(formData.get('passwordBaru') ?? '')
      const konfirmasi = String(formData.get('konfirmasi') ?? '')

      if (passwordBaru !== konfirmasi) {
        return { error: 'New password confirmation does not match.' }
      }

      const parsed = changePasswordSchema.safeParse({ passwordLama, passwordBaru })
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Invalid data.' }
      }

      const result = await changePasswordAction(parsed.data)
      if (!result.ok) {
        return { error: ERROR_COPY[result.code] ?? result.message }
      }

      setSukses(true)
      return { error: null }
    },
    { error: null },
  )
  const error = state.error

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-background/40 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
          <KeyRound className="size-4" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">Change password</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Other devices are signed out automatically after the password is changed.
          </p>
        </div>
      </div>

      {sukses ? (
        <div className="mt-5 flex grow flex-col justify-between gap-4 rounded-xl border border-brand/40 bg-brand/10 p-4">
          <p className="text-sm font-semibold">
            Password changed successfully. You stay signed in on this device.
          </p>
          <button
            type="button"
            onClick={() => {
              setSukses(false)
            }}
            className="self-start text-xs font-bold text-brand-deep underline-offset-4 hover:underline"
          >
            Change password again
          </button>
        </div>
      ) : (
        <form noValidate action={formAction} className="mt-5 space-y-4">
          <div>
            <label htmlFor="password-lama" className="text-xs font-bold">
              Current password
            </label>
            <input
              id="password-lama"
              name="passwordLama"
              type="password"
              autoComplete="current-password"
              disabled={pending}
              aria-invalid={!!error}
              className="field mt-2"
              placeholder="Current password"
            />
          </div>

          <div>
            <label htmlFor="password-baru" className="text-xs font-bold">
              New password
            </label>
            <input
              id="password-baru"
              name="passwordBaru"
              type="password"
              autoComplete="new-password"
              disabled={pending}
              aria-invalid={!!error}
              className="field mt-2"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label htmlFor="password-konfirmasi" className="text-xs font-bold">
              Repeat new password
            </label>
            <input
              id="password-konfirmasi"
              name="konfirmasi"
              type="password"
              autoComplete="new-password"
              disabled={pending}
              aria-invalid={!!error}
              className="field mt-2"
              placeholder="Repeat new password"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-semibold text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="h-11 w-full rounded-xl bg-foreground text-sm font-bold text-background transition hover:opacity-90 active:scale-[.99] disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      )}
    </section>
  )
}
