'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateSettingAction } from '@/src/controllers/transaction.controller'

export function SettingsForm({
  namaToko,
  kontakCs,
  pesanPengumuman,
  checkoutAktif,
}: {
  namaToko: string
  kontakCs: string
  pesanPengumuman: string
  checkoutAktif: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ namaToko, kontakCs, pesanPengumuman, checkoutAktif })
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <form
      className="max-w-2xl space-y-5 rounded-xl border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault()
        setError(null)
        setNotice(null)
        startTransition(async () => {
          const result = await updateSettingAction(form)
          if (!result.ok) {
            setError(result.message)
            return
          }
          setNotice('Settings saved.')
          router.refresh()
        })
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="namaToko">Store name</Label>
        <Input
          id="namaToko"
          value={form.namaToko}
          onChange={(event) => setForm((value) => ({ ...value, namaToko: event.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="kontakCs">Support contact</Label>
        <Input
          id="kontakCs"
          placeholder="WhatsApp, email, or link"
          value={form.kontakCs}
          onChange={(event) => setForm((value) => ({ ...value, kontakCs: event.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pesanPengumuman">Announcement message</Label>
        <textarea
          id="pesanPengumuman"
          className="field min-h-24 py-2"
          value={form.pesanPengumuman}
          onChange={(event) => setForm((value) => ({ ...value, pesanPengumuman: event.target.value }))}
        />
      </div>
      <label className="flex items-start gap-3 rounded-lg border p-3">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-[var(--brand-deep)]"
          checked={form.checkoutAktif}
          onChange={(event) => setForm((value) => ({ ...value, checkoutAktif: event.target.checked }))}
        />
        <span>
          <span className="block text-sm font-medium">Checkout active</span>
          <span className="block text-xs text-muted-foreground">
            Turn off to close checkout during an emergency. The catalog and credential reveal stay available.
          </span>
        </span>
      </label>

      {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="rounded-lg bg-brand/15 px-3 py-2 text-sm">{notice}</p> : null}
      <Button type="submit" disabled={pending}>
        Save settings
      </Button>
    </form>
  )
}
