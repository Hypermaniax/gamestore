'use client'

import { useActionState, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Banknote,
  CalendarDays,
  Check,
  CircleAlert,
  Info,
  LoaderCircle,
  Pencil,
  Percent,
  Plus,
  Power,
  PowerOff,
  Search,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PanelEmpty } from '@/components/panel/panel-ui'
import {
  createVoucherAction,
  setVoucherActiveAction,
  updateVoucherAction,
} from '@/src/controllers/discount.controller'
import { rupiah, waktu } from '@/src/lib/pesanan'

type Voucher = {
  id: string
  code: string
  type: string
  value: string
  quota: number
  used: number
  sisa: number
  minPurchase: string | null
  maxDiscount: string | null
  validUntil: string
  active: boolean
}

type VoucherForm = {
  code: string
  type: 'PERSEN' | 'NOMINAL'
  value: string
  quota: string
  minPurchase: string
  maxDiscount: string
  validUntil: string
  active: boolean
}

type FormErrors = Partial<Record<keyof VoucherForm, string>>

const CODE_PATTERN = /^[A-Z0-9-]{3,50}$/

function toLocalInput(value: string | Date): string {
  const date = new Date(value)
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIso(localInput: string): string {
  return new Date(localInput).toISOString()
}

function defaultValidUntil(at: number): string {
  const date = new Date(at)
  date.setDate(date.getDate() + 7)
  date.setHours(23, 59, 0, 0)
  return toLocalInput(date)
}

function emptyVoucher(): VoucherForm {
  return {
    code: '',
    type: 'PERSEN',
    value: '',
    quota: '25',
    minPurchase: '',
    maxDiscount: '',
    validUntil: '',
    active: true,
  }
}

function emptyVoucherWithDefaultDate(at: number): VoucherForm {
  return { ...emptyVoucher(), validUntil: defaultValidUntil(at) }
}

function sanitizeCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 50)
}

function digitsOnly(value: string, maxLength = 14): string {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

function percentValue(value: string): string {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '')
  const [whole, ...rest] = normalized.split('.')
  const fraction = rest.join('').slice(0, 2)
  return `${whole.slice(0, 14)}${normalized.includes('.') ? `.${fraction}` : ''}`
}

function discountLabel(type: VoucherForm['type'], value: string): string {
  if (!value) return 'Set a discount'
  return type === 'PERSEN' ? `${value}% off` : `${rupiah(value)} off`
}

function expiryLabel(localInput: string): string {
  if (!localInput) return 'Not scheduled'
  const date = new Date(localInput)
  if (Number.isNaN(date.getTime())) return 'Not scheduled'
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(date)
}

function validateForm(form: VoucherForm): FormErrors {
  const errors: FormErrors = {}
  const value = Number(form.value)
  const quota = Number(form.quota)
  const valuePattern =
    form.type === 'PERSEN' ? /^\d{1,14}(\.\d{1,2})?$/ : /^\d{1,14}$/

  if (!CODE_PATTERN.test(form.code)) {
    errors.code = 'Use 3–50 uppercase letters, numbers, or hyphens.'
  }
  if (!form.value || !valuePattern.test(form.value) || !Number.isFinite(value) || value <= 0) {
    errors.value = 'Enter a valid discount greater than 0.'
  } else if (form.type === 'PERSEN' && value > 100) {
    errors.value = 'Percentage discount cannot exceed 100.'
  }
  if (!form.quota || !Number.isInteger(quota) || quota < 0) {
    errors.quota = 'Quota must be 0 or more.'
  }
  if (form.minPurchase && Number(form.minPurchase) <= 0) {
    errors.minPurchase = 'Minimum spend must be greater than 0.'
  }
  if (form.maxDiscount && Number(form.maxDiscount) <= 0) {
    errors.maxDiscount = 'Maximum discount must be greater than 0.'
  }
  if (!form.validUntil || Number.isNaN(new Date(form.validUntil).getTime())) {
    errors.validUntil = 'Choose a valid expiry date.'
  }

  return errors
}

function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: {
  id: string
  label: string
  hint: string
  error?: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {optional ? (
          <span className="text-[11px] font-medium text-muted-foreground">Optional</span>
        ) : null}
      </div>
      {children}
      <p
        id={`${id}-help`}
        className={error ? 'text-xs text-destructive' : 'text-xs leading-5 text-muted-foreground'}
      >
        {error ?? hint}
      </p>
    </div>
  )
}

function VoucherPreview({ form, now }: { form: VoucherForm; now: number }) {
  const expired = form.validUntil ? new Date(form.validUntil).getTime() <= now : false
  const status = form.active ? (expired ? 'Expired' : 'Active') : 'Paused'

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
        Live preview
      </p>
      <div className="mt-3 overflow-hidden rounded-xl bg-brand-ink p-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[.18em] text-white/55">
            Nexaplay voucher
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[.1em]">
            <span className={`size-1.5 rounded-full ${form.active && !expired ? 'bg-brand' : 'bg-white/40'}`} />
            {status}
          </span>
        </div>

        <p className="mt-8 break-all font-mono text-xl font-bold tracking-[.14em] text-brand">
          {form.code || 'NEXA-XXXXXX'}
        </p>

        <div className="my-5 flex items-center gap-3 text-white/35">
          <span className="h-px flex-1 border-t border-dashed border-white/20" />
          <Ticket className="size-4" />
          <span className="h-px flex-1 border-t border-dashed border-white/20" />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-[.14em] text-white/45">Discount</p>
            <p className="mt-1 text-sm font-semibold">{discountLabel(form.type, form.value)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[.14em] text-white/45">Minimum spend</p>
            <p className="mt-1 text-sm font-semibold">
              {form.minPurchase ? rupiah(form.minPurchase) : 'No minimum'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[.14em] text-white/45">Quota</p>
            <p className="mt-1 text-sm font-semibold">
              {form.quota ? `${Number(form.quota).toLocaleString('id-ID')} uses` : 'Set a quota'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[.14em] text-white/45">Valid until</p>
            <p className="mt-1 text-sm font-semibold">{expiryLabel(form.validUntil)}</p>
          </div>
        </div>
      </div>
      <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Vouchers are applied after active promotions at checkout. Quota is only used when a payment is created.
      </p>
    </div>
  )
}

export function VoucherAdmin({
  vouchers,
  total,
  initialQuery,
  now,
}: {
  vouchers: Voucher[]
  total: number
  initialQuery: string
  now: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [form, setForm] = useState<VoucherForm>(() => emptyVoucherWithDefaultDate(now))
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [query, setQuery] = useState(initialQuery)
  const [formErrorDismissed, setFormErrorDismissed] = useState(true)
  const [formState, formAction, formPending] = useActionState<
    { error: string | null },
    FormData
  >(
    async () => {
      const nextErrors = validateForm(form)
      setFieldErrors(nextErrors)
      if (Object.keys(nextErrors).length > 0) {
        return { error: 'Check the highlighted fields before saving this voucher.' }
      }

      const common = {
        code: form.code,
        type: form.type,
        value: form.value,
        quota: Number(form.quota),
        validUntil: toIso(form.validUntil),
        active: form.active,
      }

      setError(null)
      const result = editingId
        ? await updateVoucherAction({
            id: editingId,
            ...common,
            minPurchase: form.minPurchase || null,
            maxDiscount: form.maxDiscount || null,
          })
        : await createVoucherAction({
            ...common,
            minPurchase: form.minPurchase || undefined,
            maxDiscount: form.maxDiscount || undefined,
          })
      if (!result.ok) return { error: result.message ?? 'Action failed.' }

      setNotice(`Voucher ${form.code} ${editingId ? 'updated' : 'created'}.`)
      setForm(emptyVoucherWithDefaultDate(Date.now()))
      setFieldErrors({})
      setEditingId(null)
      setComposerOpen(false)
      router.refresh()
      return { error: null }
    },
    { error: null },
  )
  const formError = formState.error && !formErrorDismissed ? formState.error : null

  const isEditing = editingId !== null
  const expiresSoon =
    form.validUntil && !Number.isNaN(new Date(form.validUntil).getTime())
      ? new Date(form.validUntil).getTime() <= now
      : false

  function run(
    task: () => Promise<{ ok: boolean; message?: string }>,
    message: string,
    options: { reset?: boolean } = {},
  ) {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await task()
      if (!result.ok) {
        setError(result.message ?? 'Action failed.')
        return
      }
      setNotice(message)
      if (options.reset) {
        setForm(emptyVoucherWithDefaultDate(Date.now()))
        setFieldErrors({})
        setEditingId(null)
        setComposerOpen(false)
      }
      router.refresh()
    })
  }

  function updateField<K extends keyof VoucherForm>(key: K, value: VoucherForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current,
    )
  }

  function changeType(type: VoucherForm['type']) {
    if (type === form.type) return
    setForm((current) => ({ ...current, type, value: '', maxDiscount: '' }))
    setFieldErrors((current) => ({ ...current, value: undefined, maxDiscount: undefined }))
  }

  function generateCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const bytes = crypto.getRandomValues(new Uint8Array(6))
    const suffix = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
    updateField('code', `NEXA-${suffix}`)
  }

  function startCreate() {
    setError(null)
    setNotice(null)
    setFieldErrors({})
    setFormErrorDismissed(true)
    setEditingId(null)
    setForm(emptyVoucherWithDefaultDate(Date.now()))
    setComposerOpen(true)
  }

  function startEdit(voucher: Voucher) {
    setError(null)
    setNotice(null)
    setFieldErrors({})
    setFormErrorDismissed(true)
    setEditingId(voucher.id)
    setForm({
      code: voucher.code,
      type: voucher.type === 'NOMINAL' ? 'NOMINAL' : 'PERSEN',
      value: voucher.value,
      quota: String(voucher.quota),
      minPurchase: voucher.minPurchase ?? '',
      maxDiscount: voucher.maxDiscount ?? '',
      validUntil: toLocalInput(voucher.validUntil),
      active: voucher.active,
    })
    setComposerOpen(true)
  }

  function closeComposer() {
    if (pending || formPending) return
    setComposerOpen(false)
    setForm(emptyVoucherWithDefaultDate(Date.now()))
    setFieldErrors({})
    setEditingId(null)
    setError(null)
    setFormErrorDismissed(true)
  }

  function clearForm() {
    setForm(emptyVoucherWithDefaultDate(Date.now()))
    setFieldErrors({})
    setError(null)
    setFormErrorDismissed(true)
  }

  function handleOpenChange(open: boolean) {
    if (open) {
      setComposerOpen(true)
      return
    }
    closeComposer()
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams(window.location.search)
    if (query.trim()) params.set('q', query.trim())
    else params.delete('q')
    params.delete('page')
    const suffix = params.toString()
    startTransition(() => {
      router.push(`/panel/vouchers${suffix ? `?${suffix}` : ''}`, { scroll: false })
    })
  }

  function clearSearch() {
    setQuery('')
    const params = new URLSearchParams(window.location.search)
    params.delete('q')
    params.delete('page')
    const suffix = params.toString()
    startTransition(() => {
      router.push(`/panel/vouchers${suffix ? `?${suffix}` : ''}`, { scroll: false })
    })
  }

  return (
    <div className="space-y-6">
      {error && !composerOpen ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}
      {notice ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-brand-deep/20 bg-brand/12 px-4 py-3 text-sm"
        >
          <Check className="mt-0.5 size-4 shrink-0 text-brand-deep" />
          <p>{notice}</p>
        </div>
      ) : null}

      <Dialog open={composerOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        >
          <div className="flex shrink-0 items-start gap-3 border-b px-5 py-4 sm:px-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/20 text-brand-deep">
              <Ticket className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="font-display text-lg font-semibold tracking-[-0.03em]">
                  {isEditing ? `Edit ${form.code}` : 'Create a voucher'}
                </DialogTitle>
                <Badge variant={isEditing ? 'secondary' : 'outline'}>
                  {isEditing ? 'Editing' : 'New'}
                </Badge>
              </div>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                {isEditing
                  ? 'Update the code, limits, or schedule. Changes apply immediately at checkout.'
                  : 'Build a discount code with clear limits and an expiry date. Shoppers apply it at checkout.'}
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={closeComposer}
              disabled={pending || formPending}
              aria-label="Close voucher form"
              className="shrink-0"
            >
              <X className="size-4" />
            </Button>
          </div>

          <form
            id="voucher-form"
            action={formAction}
            onSubmit={() => setFormErrorDismissed(false)}
            className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_22rem]"
            noValidate
          >
            <div className="min-w-0 space-y-6 p-5 sm:p-6">
              {(error ?? formError) ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                >
                  <CircleAlert className="mt-0.5 size-4 shrink-0" />
                  <p>{error ?? formError}</p>
                </div>
              ) : null}
              <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
                  Code
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={generateCode}>
                  <Sparkles className="size-3.5" />
                  Generate
                </Button>
              </div>
              <Field
                id="voucher-code"
                label="Voucher code"
                hint="3–50 characters. Letters, numbers, and hyphens only."
                error={fieldErrors.code}
              >
                <Input
                  id="voucher-code"
                  value={form.code}
                  onChange={(event) => updateField('code', sanitizeCode(event.target.value))}
                  aria-invalid={Boolean(fieldErrors.code)}
                  aria-describedby="voucher-code-help"
                  placeholder="NEXA-XXXXXX"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-11 font-mono text-sm font-semibold uppercase tracking-[.1em]"
                  maxLength={50}
                  required
                />
              </Field>
            </div>

            <div className="space-y-4 border-t pt-5">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
                Discount
              </p>
              <div>
                <p id="voucher-type-label" className="text-sm font-medium">Discount type</p>
                <div
                  role="group"
                  aria-labelledby="voucher-type-label"
                  className="mt-2 grid grid-cols-2 gap-1 rounded-xl border bg-muted/35 p-1"
                >
                  <button
                    type="button"
                    aria-pressed={form.type === 'PERSEN'}
                    onClick={() => changeType('PERSEN')}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      form.type === 'PERSEN'
                        ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Percent className="size-4" />
                    Percentage
                  </button>
                  <button
                    type="button"
                    aria-pressed={form.type === 'NOMINAL'}
                    onClick={() => changeType('NOMINAL')}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      form.type === 'NOMINAL'
                        ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Banknote className="size-4" />
                    Fixed amount
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="voucher-value"
                  label={form.type === 'PERSEN' ? 'Percentage off' : 'Amount off'}
                  hint={
                    form.type === 'PERSEN'
                      ? 'Whole or decimal value, up to 100%.'
                      : 'Discount in rupiah, before optional caps.'
                  }
                  error={fieldErrors.value}
                >
                  <div className="relative">
                    {form.type === 'NOMINAL' ? (
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        Rp
                      </span>
                    ) : null}
                    <Input
                      id="voucher-value"
                      inputMode={form.type === 'PERSEN' ? 'decimal' : 'numeric'}
                      value={form.value}
                      onChange={(event) =>
                        updateField(
                          'value',
                          form.type === 'PERSEN'
                            ? percentValue(event.target.value)
                            : digitsOnly(event.target.value),
                        )
                      }
                      aria-invalid={Boolean(fieldErrors.value)}
                      aria-describedby="voucher-value-help"
                      placeholder={form.type === 'PERSEN' ? 'e.g. 10' : 'e.g. 25000'}
                      className={`h-11 ${form.type === 'NOMINAL' ? 'pl-10' : 'pr-10'}`}
                      required
                    />
                    {form.type === 'PERSEN' ? (
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                        %
                      </span>
                    ) : null}
                  </div>
                </Field>

                {form.type === 'PERSEN' ? (
                  <Field
                    id="voucher-max-discount"
                    label="Maximum discount"
                    hint="Caps the percentage discount per order."
                    error={fieldErrors.maxDiscount}
                    optional
                  >
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        Rp
                      </span>
                      <Input
                        id="voucher-max-discount"
                        inputMode="numeric"
                        value={form.maxDiscount}
                        onChange={(event) =>
                          updateField('maxDiscount', digitsOnly(event.target.value))
                        }
                        aria-invalid={Boolean(fieldErrors.maxDiscount)}
                        aria-describedby="voucher-max-discount-help"
                        placeholder="No cap"
                        className="h-11 pl-10"
                      />
                    </div>
                  </Field>
                ) : (
                  <div className="hidden sm:block" />
                )}
              </div>
            </div>

            <div className="space-y-4 border-t pt-5">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
                Limits
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="voucher-quota"
                  label="Usage quota"
                  hint="Total payments that can use this code."
                  error={fieldErrors.quota}
                >
                  <Input
                    id="voucher-quota"
                    inputMode="numeric"
                    value={form.quota}
                    onChange={(event) => updateField('quota', digitsOnly(event.target.value, 7))}
                    aria-invalid={Boolean(fieldErrors.quota)}
                    aria-describedby="voucher-quota-help"
                    placeholder="25"
                    className="h-11"
                    required
                  />
                </Field>
                <Field
                  id="voucher-min-purchase"
                  label="Minimum spend"
                  hint="The order subtotal must reach this amount."
                  error={fieldErrors.minPurchase}
                  optional
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      Rp
                    </span>
                    <Input
                      id="voucher-min-purchase"
                      inputMode="numeric"
                      value={form.minPurchase}
                      onChange={(event) =>
                        updateField('minPurchase', digitsOnly(event.target.value))
                      }
                      aria-invalid={Boolean(fieldErrors.minPurchase)}
                      aria-describedby="voucher-min-purchase-help"
                      placeholder="No minimum"
                      className="h-11 pl-10"
                    />
                  </div>
                </Field>
              </div>
            </div>

            <div className="space-y-4 border-t pt-5">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
                Availability
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="voucher-valid-until"
                  label="Valid until"
                  hint={
                    expiresSoon
                      ? 'This date is in the past. The voucher will not be redeemable.'
                      : 'The code stops working at this local date and time.'
                  }
                  error={fieldErrors.validUntil}
                >
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="voucher-valid-until"
                      type="datetime-local"
                      value={form.validUntil}
                      onChange={(event) => updateField('validUntil', event.target.value)}
                      aria-invalid={Boolean(fieldErrors.validUntil)}
                      aria-describedby="voucher-valid-until-help"
                      className="h-11 pl-9"
                      required
                    />
                  </div>
                </Field>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Status</p>
                  <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border bg-muted/25 px-3">
                    <div>
                      <p className="text-sm font-medium">
                        {form.active ? 'Active at checkout' : 'Paused'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {form.active ? 'Shoppers can redeem this code.' : 'Saved, but not redeemable.'}
                      </p>
                    </div>
                    <button
                      id="voucher-active"
                      type="button"
                      role="switch"
                      aria-checked={form.active}
                      aria-label="Voucher active at checkout"
                      onClick={() => updateField('active', !form.active)}
                      className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
                        form.active
                          ? 'border-brand-deep/30 bg-brand'
                          : 'border-border bg-muted-foreground/25'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all ${
                          form.active ? 'left-[1.375rem]' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            </div>

            <aside className="border-t bg-muted/20 p-5 sm:p-6 lg:border-l lg:border-t-0">
              <VoucherPreview form={form} now={now} />
            </aside>
          </form>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <Button
              type="button"
              variant="ghost"
              onClick={isEditing ? closeComposer : clearForm}
              disabled={pending || formPending}
            >
              {isEditing ? 'Discard changes' : 'Clear form'}
            </Button>
            <Button
              type="submit"
              form="voucher-form"
              disabled={formPending}
              className="h-10 bg-brand text-brand-ink hover:bg-brand/85"
            >
              {formPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : isEditing ? (
                <Check className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {isEditing ? 'Save changes' : 'Create voucher'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-[-0.03em]">All vouchers</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {total.toLocaleString('id-ID')} {total === 1 ? 'voucher' : 'vouchers'}
              {initialQuery ? ` matching “${initialQuery}”` : ''}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <form onSubmit={submitSearch} className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search voucher code"
                placeholder="Search voucher code"
                className="h-9 pr-8 pl-8"
              />
              {query ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </form>
            <Button
              type="button"
              onClick={startCreate}
              disabled={pending}
              className="h-9 shrink-0 bg-brand text-brand-ink hover:bg-brand/85"
            >
              <Plus className="size-4" />
              New voucher
            </Button>
          </div>
        </div>

        {vouchers.length === 0 ? (
          <div className="p-4 sm:p-5">
            <PanelEmpty
              title={initialQuery ? 'No vouchers found' : 'No vouchers yet'}
              description={
                initialQuery
                  ? `No voucher codes match “${initialQuery}”. Try a different code or clear the search.`
                  : 'Create a voucher to offer a percentage or fixed discount at checkout.'
              }
              action={
                initialQuery ? (
                  <Button variant="outline" size="sm" onClick={clearSearch}>
                    Clear search
                  </Button>
                ) : (
                  <Button size="sm" onClick={startCreate}>
                    <Plus className="size-3.5" />
                    New voucher
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-[.1em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium sm:px-5">Voucher</th>
                  <th className="px-4 py-3 font-medium">Discount</th>
                  <th className="px-4 py-3 font-medium">Usage</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium sm:px-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {vouchers.map((voucher) => {
                  const expired = new Date(voucher.validUntil).getTime() <= now
                  const progress =
                    voucher.quota === 0
                      ? 0
                      : Math.min(100, Math.round((voucher.used / voucher.quota) * 100))
                  const status = expired
                    ? { label: 'Expired', variant: 'outline' as const }
                    : voucher.active
                      ? { label: 'Active', variant: 'secondary' as const }
                      : { label: 'Paused', variant: 'outline' as const }

                  return (
                    <tr key={voucher.id} className="transition hover:bg-muted/25">
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand-deep">
                            <Ticket className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-mono text-xs font-semibold tracking-[.06em]">
                              {voucher.code}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {voucher.minPurchase
                                ? `Min ${rupiah(voucher.minPurchase)}`
                                : 'No minimum'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {voucher.type === 'PERSEN'
                            ? `${voucher.value}% off`
                            : `${rupiah(voucher.value)} off`}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {voucher.maxDiscount
                            ? `Capped at ${rupiah(voucher.maxDiscount)}`
                            : 'No cap'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="tabular-nums">
                            {voucher.used}
                            <span className="text-muted-foreground"> / {voucher.quota}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {voucher.sisa} left
                          </p>
                        </div>
                        <div
                          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${voucher.code} quota used`}
                        >
                          <span
                            className="block h-full rounded-full bg-brand-deep transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs">{waktu(voucher.validUntil)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() => startEdit(voucher)}
                          >
                            <Pencil className="size-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () =>
                                  setVoucherActiveAction({
                                    id: voucher.id,
                                    active: !voucher.active,
                                  }),
                                voucher.active
                                  ? `Voucher ${voucher.code} paused.`
                                  : `Voucher ${voucher.code} activated.`,
                              )
                            }
                          >
                            {voucher.active ? (
                              <PowerOff className="size-3.5" />
                            ) : (
                              <Power className="size-3.5" />
                            )}
                            {voucher.active ? 'Pause' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
