'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CredentialValues } from '@/src/lib/credential'

export function CredentialFields({
  values,
  onChange,
  disabled = false,
  showValidation = false,
  existing = false,
}: {
  values: CredentialValues
  onChange: (key: keyof CredentialValues, value: string) => void
  disabled?: boolean
  showValidation?: boolean
  existing?: boolean
}) {
  const [visible, setVisible] = useState(false)
  const emailInvalid = showValidation && !values.email.trim()
  const passwordInvalid = showValidation && !values.password.trim()

  return (
    <div className="space-y-4">
      {existing ? (
        <p className="rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-xs text-brand-deep">
          Credentials are already set and cannot be read again. Fill in the fields below only if you want to replace them.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="credential-email">Email / Username</Label>
          <Input
            id="credential-email"
            maxLength={200}
            value={values.email}
            onChange={(event) => onChange('email', event.target.value)}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={emailInvalid}
            className="h-10"
          />
          {emailInvalid ? <p className="text-[11px] text-destructive">Required.</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="credential-password">Password</Label>
          <div className="relative">
            <Input
              id="credential-password"
              type={visible ? 'text' : 'password'}
              maxLength={300}
              value={values.password}
              onChange={(event) => onChange('password', event.target.value)}
              disabled={disabled}
              autoComplete="new-password"
              spellCheck={false}
              aria-invalid={passwordInvalid}
              className="h-10 pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              onClick={() => setVisible((current) => !current)}
              aria-label={visible ? 'Hide password' : 'Show password'}
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
          {passwordInvalid ? <p className="text-[11px] text-destructive">Required.</p> : null}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="credential-note">
          Note <span className="font-normal text-muted-foreground">optional</span>
        </Label>
        <textarea
          id="credential-note"
          className="field min-h-20 py-2"
          maxLength={1000}
          value={values.note}
          onChange={(event) => onChange('note', event.target.value)}
          disabled={disabled}
          placeholder="Example: recovery email, backup codes, or extra login info."
        />
      </div>
    </div>
  )
}
