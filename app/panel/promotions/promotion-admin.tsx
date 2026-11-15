'use client'

import { useActionState, useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BadgePercent,
  Banknote,
  CalendarDays,
  Check,
  CircleAlert,
  Gamepad2,
  Globe2,
  Info,
  LoaderCircle,
  Pencil,
  Percent,
  Plus,
  Power,
  PowerOff,
  Search,
  UserRound,
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
  createPromotionAction,
  setPromoActiveAction,
  updatePromotionAction,
} from '@/src/controllers/discount.controller'
import { DEFAULT_PAGE_SIZE } from '@/src/lib/pagination'
import { rupiah, waktu } from '@/src/lib/pesanan'

type GameOption = {
  id: string
  name: string
  active: boolean
}

type Promotion = {
  id: string
  name: string
  type: string
  value: string
  maxDiscount: string | null
  scope: string
  targetId: string | null
  targetLabel: string | null
  startsAt: string
  endsAt: string
  active: boolean
}

type PromotionForm = {
  name: string
  type: 'PERSEN' | 'NOMINAL'
  value: string
  maxDiscount: string
  scope: 'SEMUA' | 'GAME' | 'AKUN'
  targetId: string
  startsAt: string
  endsAt: string
  active: boolean
}

type FormErrors = Partial<Record<keyof PromotionForm, string>>
type PromotionEditor = {
  mode: 'create' | 'edit'
  id?: string
  targetLabel: string | null
  form: PromotionForm
}
type PromotionStatus = {
  label: 'Live' | 'Scheduled' | 'Paused' | 'Ended' | 'Draft'
  tone: 'live' | 'scheduled' | 'paused' | 'ended'
}

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Enabled' },
  { value: 'false', label: 'Paused' },
] as const

function toLocalInput(value: string | Date): string {
  const date = new Date(value)
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIso(localInput: string): string {
  return new Date(localInput).toISOString()
}

function defaultStart(now: number): string {
  const date = new Date(now)
  date.setSeconds(0, 0)
  return toLocalInput(date)
}

function defaultEnd(now: number): string {
  const date = new Date(now)
  date.setDate(date.getDate() + 7)
  date.setHours(23, 59, 0, 0)
  return toLocalInput(date)
}

function emptyPromotion(now: number): PromotionForm {
  return {
    name: '',
    type: 'PERSEN',
    value: '',
    maxDiscount: '',
    scope: 'SEMUA',
    targetId: '',
    startsAt: defaultStart(now),
    endsAt: defaultEnd(now),
    active: true,
  }
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

function formatDateTime(value: string): string {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not set'
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(date)
}

function discountLabel(type: PromotionForm['type'], value: string): string {
  if (!value) return 'Set a discount'
  return type === 'PERSEN' ? `${value}% off` : `${rupiah(value)} off`
}

function statusFor(
  value: { active: boolean; startsAt: string; endsAt: string },
  now: number,
): PromotionStatus {
  if (!value.startsAt || !value.endsAt) return { label: 'Draft', tone: 'paused' }
  const startsAt = new Date(value.startsAt).getTime()
  const endsAt = new Date(value.endsAt).getTime()
  if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) {
    return { label: 'Draft', tone: 'paused' }
  }
  if (!value.active) return { label: 'Paused', tone: 'paused' }
  if (startsAt > now) return { label: 'Scheduled', tone: 'scheduled' }
  if (endsAt < now) return { label: 'Ended', tone: 'ended' }
  return { label: 'Live', tone: 'live' }
}

function StatusBadge({ status }: { status: PromotionStatus }) {
  const style =
    status.tone === 'live'
      ? 'border-transparent bg-brand text-brand-ink'
      : status.tone === 'scheduled'
        ? 'border-brand-deep/25 bg-brand/12 text-brand-deep'
        : 'bg-muted text-muted-foreground'
  return (
    <Badge variant="outline" className={style}>
      {status.label}
    </Badge>
  )
}

function scopeLabel(scope: string): string {
  if (scope === 'AKUN') return 'Account-specific'
  if (scope === 'GAME') return 'Game-specific'
  return 'Catalog-wide'
}

function targetLabel(promotion: Promotion): string {
  if (promotion.scope === 'SEMUA') return 'Entire catalog'
  const prefix = promotion.scope === 'GAME' ? 'Game' : 'Account'
  return promotion.targetLabel ?? `${prefix} #${promotion.targetId ?? '—'}`
}

function ScopeIcon({ scope }: { scope: string }) {
  if (scope === 'AKUN') return <UserRound className="size-4 text-muted-foreground" />
  if (scope === 'GAME') return <Gamepad2 className="size-4 text-muted-foreground" />
  return <Globe2 className="size-4 text-muted-foreground" />
}

function previewTarget(
  form: PromotionForm,
  games: GameOption[],
  currentLabel: string | null,
): string {
  if (form.scope === 'SEMUA') return 'Entire catalog'
  if (form.scope === 'GAME') {
    const game = games.find((item) => item.id === form.targetId)
    if (game) return game.name
    if (currentLabel) return currentLabel
    return form.targetId ? `Game #${form.targetId}` : 'Choose a game'
  }
  if (currentLabel) return currentLabel
  return form.targetId ? `Account #${form.targetId}` : 'Choose an account'
}

function validateForm(form: PromotionForm): FormErrors {
  const errors: FormErrors = {}
  const value = Number(form.value)
  const valuePattern =
    form.type === 'PERSEN' ? /^\d{1,14}(\.\d{1,2})?$/ : /^\d{1,14}$/

  if (!form.name.trim()) {
    errors.name = 'Promotion name is required.'
  } else if (form.name.trim().length > 100) {
    errors.name = 'Keep the promotion name under 100 characters.'
  }
  if (!form.value || !valuePattern.test(form.value) || !Number.isFinite(value) || value <= 0) {
    errors.value = 'Enter a valid discount greater than 0.'
  } else if (form.type === 'PERSEN' && value > 100) {
    errors.value = 'Percentage discount cannot exceed 100.'
  }
  if (
    form.type === 'PERSEN' &&
    form.maxDiscount &&
    (!/^\d{1,14}$/.test(form.maxDiscount) || Number(form.maxDiscount) <= 0)
  ) {
    errors.maxDiscount = 'Maximum discount must be greater than 0.'
  }
  if (form.scope !== 'SEMUA') {
    if (!form.targetId) {
      errors.targetId = form.scope === 'GAME' ? 'Choose a target game.' : 'Enter a target account ID.'
    } else if (!/^\d+$/.test(form.targetId)) {
      errors.targetId = 'Use the numeric ID from the target record.'
    }
  }

  const startsAt = new Date(form.startsAt)
  const endsAt = new Date(form.endsAt)
  if (!form.startsAt || Number.isNaN(startsAt.getTime())) {
    errors.startsAt = 'Choose a valid start date.'
  }
  if (!form.endsAt || Number.isNaN(endsAt.getTime())) {
    errors.endsAt = 'Choose a valid end date.'
  } else if (!Number.isNaN(startsAt.getTime()) && startsAt >= endsAt) {
    errors.endsAt = 'End time must be after the start time.'
  }

  return errors
}

function buildPayload(form: PromotionForm) {
  return {
    name: form.name.trim(),
    type: form.type,
    value: form.value,
    maxDiscount: form.type === 'PERSEN' && form.maxDiscount ? form.maxDiscount : null,
    scope: form.scope,
    targetId: form.scope === 'SEMUA' ? null : form.targetId,
    startsAt: toIso(form.startsAt),
    endsAt: toIso(form.endsAt),
    active: form.active,
  }
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
  children: ReactNode
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

function PromotionPreview({
  form,
  games,
  currentLabel,
  now,
}: {
  form: PromotionForm
  games: GameOption[]
  currentLabel: string | null
  now: number
}) {
  const status = statusFor(form, now)
  const target = previewTarget(form, games, currentLabel)
  const name = form.name.trim() || 'Untitled promotion'

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
          Live preview
        </p>
        <StatusBadge status={status} />
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl bg-brand-ink p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/45">
              Automatic offer
            </p>
            <h3 className="mt-2 break-words font-display text-xl font-semibold tracking-[-0.03em]">
              {name}
            </h3>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-ink">
            <BadgePercent className="size-5" />
          </span>
        </div>

        <p className="mt-7 font-display text-3xl font-semibold tracking-[-0.04em] text-brand">
          {discountLabel(form.type, form.value)}
        </p>
        {form.type === 'PERSEN' && form.maxDiscount ? (
          <p className="mt-1 text-xs text-white/55">
            Capped at {rupiah(form.maxDiscount)} per order
          </p>
        ) : null}

        <dl className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 border-t border-white/15 pt-4 text-xs">
          <dt className="text-white/45">Applies to</dt>
          <dd className="truncate text-right font-medium">{target}</dd>
          <dt className="text-white/45">Starts</dt>
          <dd className="text-right font-medium">{formatDateTime(form.startsAt)}</dd>
          <dt className="text-white/45">Ends</dt>
          <dd className="text-right font-medium">{formatDateTime(form.endsAt)}</dd>
        </dl>
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Promotions apply automatically. The most specific eligible offer wins at checkout:
        account, then game, then catalog-wide.
      </p>
    </div>
  )
}

export function PromotionAdmin({
  promotions,
  games,
  total,
  initialQuery,
  initialActive,
  initialSize,
  now,
}: {
  promotions: Promotion[]
  games: GameOption[]
  total: number
  initialQuery: string
  initialActive: string
  initialSize: number
  now: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [editor, setEditor] = useState<PromotionEditor | null>(null)
  const [query, setQuery] = useState(initialQuery)
  const [formErrorDismissed, setFormErrorDismissed] = useState(true)
  const [formState, formAction, formPending] = useActionState<
    { error: string | null },
    FormData
  >(
    async () => {
      if (!editor) return { error: null }
      const nextErrors = validateForm(editor.form)
      setFieldErrors(nextErrors)
      if (Object.keys(nextErrors).length > 0) {
        return { error: 'Check the highlighted fields before saving this promotion.' }
      }

      const payload = buildPayload(editor.form)
      const result =
        editor.mode === 'edit' && editor.id
          ? await updatePromotionAction({ id: editor.id, ...payload })
          : await createPromotionAction(payload)
      if (!result.ok) return { error: result.message ?? 'Action failed.' }

      setNotice(`Promotion “${payload.name}” ${editor.mode === 'edit' ? 'updated' : 'created'}.`)
      setEditor(null)
      router.refresh()
      return { error: null }
    },
    { error: null },
  )
  const formError = formState.error && !formErrorDismissed ? formState.error : null

  const isEditing = editor?.mode === 'edit'
  const hasFilters = Boolean(initialQuery || initialActive)

  function run(
    task: () => Promise<{ ok: boolean; message?: string }>,
    message: string,
    options: { close?: boolean } = {},
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
      if (options.close) setEditor(null)
      router.refresh()
    })
  }

  function openCreate() {
    setError(null)
    setNotice(null)
    setFieldErrors({})
    setFormErrorDismissed(true)
    setEditor({ mode: 'create', targetLabel: null, form: emptyPromotion(Date.now()) })
  }

  function openEdit(promotion: Promotion) {
    setError(null)
    setNotice(null)
    setFieldErrors({})
    setFormErrorDismissed(true)
    setEditor({
      mode: 'edit',
      id: promotion.id,
      targetLabel: promotion.targetLabel,
      form: {
        name: promotion.name,
        type: promotion.type === 'NOMINAL' ? 'NOMINAL' : 'PERSEN',
        value: promotion.value,
        maxDiscount: promotion.maxDiscount ?? '',
        scope: promotion.scope === 'AKUN' || promotion.scope === 'GAME' ? promotion.scope : 'SEMUA',
        targetId: promotion.targetId ?? '',
        startsAt: toLocalInput(promotion.startsAt),
        endsAt: toLocalInput(promotion.endsAt),
        active: promotion.active,
      },
    })
  }

  function closeEditor() {
    if (pending || formPending) return
    setEditor(null)
    setFieldErrors({})
    setError(null)
    setFormErrorDismissed(true)
  }

  function updateField<K extends keyof PromotionForm>(key: K, value: PromotionForm[K]) {
    setEditor((current) =>
      current ? { ...current, form: { ...current.form, [key]: value } } : current,
    )
    setFieldErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current,
    )
  }

  function changeType(type: PromotionForm['type']) {
    if (editor?.form.type === type) return
    setEditor((current) =>
      current
        ? { ...current, form: { ...current.form, type, value: '', maxDiscount: '' } }
        : current,
    )
    setFieldErrors((current) => ({
      ...current,
      value: undefined,
      maxDiscount: undefined,
    }))
  }

  function changeScope(scope: PromotionForm['scope']) {
    setEditor((current) =>
      current
        ? {
            ...current,
            targetLabel: null,
            form: { ...current.form, scope, targetId: '' },
          }
        : current,
    )
    setFieldErrors((current) => ({ ...current, targetId: undefined }))
  }

  function changeTarget(value: string) {
    if (!editor) return
    const targetId =
      editor.form.scope === 'GAME' ? value : digitsOnly(value, 20)
    const targetGame =
      editor.form.scope === 'GAME'
        ? games.find((game) => game.id === targetId)
        : null
    setEditor((current) =>
      current
        ? {
            ...current,
            targetLabel: targetGame?.name ?? null,
            form: { ...current.form, targetId },
          }
        : current,
    )
    setFieldErrors((current) => ({ ...current, targetId: undefined }))
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams(window.location.search)
    if (query.trim()) params.set('q', query.trim())
    else params.delete('q')
    params.delete('page')
    const suffix = params.toString()
    startTransition(() => {
      router.push(`/panel/promotions${suffix ? `?${suffix}` : ''}`, { scroll: false })
    })
  }

  function clearSearch() {
    setQuery('')
    const params = new URLSearchParams(window.location.search)
    params.delete('q')
    params.delete('page')
    const suffix = params.toString()
    startTransition(() => {
      router.push(`/panel/promotions${suffix ? `?${suffix}` : ''}`, { scroll: false })
    })
  }

  function clearFilters() {
    setQuery('')
    const params = new URLSearchParams()
    if (initialSize !== DEFAULT_PAGE_SIZE) params.set('size', String(initialSize))
    const suffix = params.toString()
    startTransition(() => {
      router.push(`/panel/promotions${suffix ? `?${suffix}` : ''}`, { scroll: false })
    })
  }

  function filterHref(active: string) {
    const params = new URLSearchParams()
    if (initialQuery) params.set('q', initialQuery)
    if (active) params.set('active', active)
    if (initialSize !== DEFAULT_PAGE_SIZE) params.set('size', String(initialSize))
    const suffix = params.toString()
    return `/panel/promotions${suffix ? `?${suffix}` : ''}`
  }

  function toggleActive(promotion: Promotion) {
    run(
      () => setPromoActiveAction({ id: promotion.id, active: !promotion.active }),
      promotion.active
        ? `Promotion “${promotion.name}” paused.`
        : `Promotion “${promotion.name}” enabled.`,
    )
  }

  function rowActions(promotion: Promotion) {
    return (
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => openEdit(promotion)}
        >
          <Pencil className="size-3.5" />
          Edit
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => toggleActive(promotion)}
        >
          {promotion.active ? (
            <PowerOff className="size-3.5" />
          ) : (
            <Power className="size-3.5" />
          )}
          {promotion.active ? 'Pause' : 'Enable'}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && !editor ? (
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

      <Dialog open={editor !== null} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        >
          <div className="flex shrink-0 items-start gap-3 border-b px-5 py-4 sm:px-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/20 text-brand-deep">
              <BadgePercent className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="font-display text-lg font-semibold tracking-[-0.03em]">
                  {isEditing ? `Edit ${editor?.form.name || 'promotion'}` : 'Create a promotion'}
                </DialogTitle>
                <Badge variant={isEditing ? 'secondary' : 'outline'}>
                  {isEditing ? 'Editing' : 'New'}
                </Badge>
              </div>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                {isEditing
                  ? 'Update the offer, audience, or schedule. Changes apply at checkout immediately.'
                  : 'Set an automatic discount and choose where it applies. The most specific eligible offer wins.'}
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={closeEditor}
              disabled={pending || formPending}
              aria-label="Close promotion form"
              className="shrink-0"
            >
              <X className="size-4" />
            </Button>
          </div>

          <form
            id="promotion-form"
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
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
                  Offer
                </p>
                <Field
                  id="promotion-name"
                  label="Promotion name"
                  hint="Internal label shown in reports and the promotion list."
                  error={fieldErrors.name}
                >
                  <Input
                    id="promotion-name"
                    value={editor?.form.name ?? ''}
                    onChange={(event) => updateField('name', event.target.value)}
                    aria-invalid={Boolean(fieldErrors.name)}
                    aria-describedby="promotion-name-help"
                    placeholder="e.g. Weekend flash sale"
                    maxLength={100}
                    className="h-11"
                    required
                  />
                </Field>
              </div>

              <div className="space-y-4 border-t pt-5">
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
                  Discount
                </p>
                <div>
                  <p id="promotion-type-label" className="text-sm font-medium">
                    Discount type
                  </p>
                  <div
                    role="group"
                    aria-labelledby="promotion-type-label"
                    className="mt-2 grid grid-cols-2 gap-1 rounded-xl border bg-muted/35 p-1"
                  >
                    <button
                      type="button"
                      aria-pressed={editor?.form.type === 'PERSEN'}
                      onClick={() => changeType('PERSEN')}
                      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        editor?.form.type === 'PERSEN'
                          ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Percent className="size-4" />
                      Percentage
                    </button>
                    <button
                      type="button"
                      aria-pressed={editor?.form.type === 'NOMINAL'}
                      onClick={() => changeType('NOMINAL')}
                      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        editor?.form.type === 'NOMINAL'
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
                    id="promotion-value"
                    label={editor?.form.type === 'PERSEN' ? 'Percentage off' : 'Amount off'}
                    hint={
                      editor?.form.type === 'PERSEN'
                        ? 'Whole or decimal value, up to 100%.'
                        : 'Discount in rupiah before any caps.'
                    }
                    error={fieldErrors.value}
                  >
                    <div className="relative">
                      {editor?.form.type === 'NOMINAL' ? (
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          Rp
                        </span>
                      ) : null}
                      <Input
                        id="promotion-value"
                        inputMode={editor?.form.type === 'PERSEN' ? 'decimal' : 'numeric'}
                        value={editor?.form.value ?? ''}
                        onChange={(event) =>
                          updateField(
                            'value',
                            editor?.form.type === 'PERSEN'
                              ? percentValue(event.target.value)
                              : digitsOnly(event.target.value),
                          )
                        }
                        aria-invalid={Boolean(fieldErrors.value)}
                        aria-describedby="promotion-value-help"
                        placeholder={editor?.form.type === 'PERSEN' ? 'e.g. 20' : 'e.g. 50000'}
                        className={`h-11 ${editor?.form.type === 'NOMINAL' ? 'pl-10' : 'pr-10'}`}
                        required
                      />
                      {editor?.form.type === 'PERSEN' ? (
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                          %
                        </span>
                      ) : null}
                    </div>
                  </Field>

                  {editor?.form.type === 'PERSEN' ? (
                    <Field
                      id="promotion-max-discount"
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
                          id="promotion-max-discount"
                          inputMode="numeric"
                          value={editor?.form.maxDiscount ?? ''}
                          onChange={(event) =>
                            updateField('maxDiscount', digitsOnly(event.target.value))
                          }
                          aria-invalid={Boolean(fieldErrors.maxDiscount)}
                          aria-describedby="promotion-max-discount-help"
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
                  Applies to
                </p>
                <div>
                  <p id="promotion-scope-label" className="text-sm font-medium">
                    Audience
                  </p>
                  <div
                    role="group"
                    aria-labelledby="promotion-scope-label"
                    className="mt-2 grid grid-cols-3 gap-1 rounded-xl border bg-muted/35 p-1"
                  >
                    {(
                      [
                        { value: 'SEMUA', label: 'All catalog', icon: Globe2 },
                        { value: 'GAME', label: 'Game', icon: Gamepad2 },
                        { value: 'AKUN', label: 'Account', icon: UserRound },
                      ] as const
                    ).map((option) => {
                      const Icon = option.icon
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={editor?.form.scope === option.value}
                          onClick={() => changeScope(option.value)}
                          className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition sm:text-sm ${
                            editor?.form.scope === option.value
                              ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Icon className="size-4" />
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {editor?.form.scope === 'GAME' ? (
                  <Field
                    id="promotion-target-game"
                    label="Target game"
                    hint="This promotion applies only to accounts from the selected game."
                    error={fieldErrors.targetId}
                  >
                    <select
                      id="promotion-target-game"
                      value={editor.form.targetId}
                      onChange={(event) => changeTarget(event.target.value)}
                      aria-invalid={Boolean(fieldErrors.targetId)}
                      aria-describedby="promotion-target-game-help"
                      className="field h-11 px-3"
                      required
                    >
                      <option value="">Select a game</option>
                      {editor.form.targetId && !games.some((game) => game.id === editor.form.targetId) ? (
                        <option value={editor.form.targetId}>
                          Game #{editor.form.targetId} (not found)
                        </option>
                      ) : null}
                      {games.map((game) => (
                        <option key={game.id} value={game.id}>
                          {game.name}
                          {game.active ? '' : ' (inactive)'}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                {editor?.form.scope === 'AKUN' ? (
                  <Field
                    id="promotion-target-account"
                    label="Target account ID"
                    hint="Use the numeric ID shown in Accounts. Only this account receives the offer."
                    error={fieldErrors.targetId}
                  >
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        #
                      </span>
                      <Input
                        id="promotion-target-account"
                        inputMode="numeric"
                        value={editor.form.targetId}
                        onChange={(event) => changeTarget(event.target.value)}
                        aria-invalid={Boolean(fieldErrors.targetId)}
                        aria-describedby="promotion-target-account-help"
                        placeholder="e.g. 86"
                        className="h-11 pl-8"
                        required
                      />
                    </div>
                  </Field>
                ) : null}
              </div>

              <div className="space-y-4 border-t pt-5">
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
                  Schedule
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="promotion-starts"
                    label="Starts"
                    hint="The offer becomes eligible at this local date and time."
                    error={fieldErrors.startsAt}
                  >
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="promotion-starts"
                        type="datetime-local"
                        value={editor?.form.startsAt ?? ''}
                        onChange={(event) => updateField('startsAt', event.target.value)}
                        aria-invalid={Boolean(fieldErrors.startsAt)}
                        aria-describedby="promotion-starts-help"
                        className="h-11 pl-9"
                        required
                      />
                    </div>
                  </Field>
                  <Field
                    id="promotion-ends"
                    label="Ends"
                    hint="The offer stops applying after this local date and time."
                    error={fieldErrors.endsAt}
                  >
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="promotion-ends"
                        type="datetime-local"
                        value={editor?.form.endsAt ?? ''}
                        onChange={(event) => updateField('endsAt', event.target.value)}
                        aria-invalid={Boolean(fieldErrors.endsAt)}
                        aria-describedby="promotion-ends-help"
                        className="h-11 pl-9"
                        required
                      />
                    </div>
                  </Field>
                </div>

                <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border bg-muted/25 px-3">
                  <div>
                    <p className="text-sm font-medium">
                      {editor?.form.active ? 'Enabled at checkout' : 'Paused'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {editor?.form.active
                        ? 'The offer applies automatically while its schedule is active.'
                        : 'Saved, but never applied to an order.'}
                    </p>
                  </div>
                  <button
                    id="promotion-active"
                    type="button"
                    role="switch"
                    aria-checked={editor?.form.active ?? false}
                    aria-label="Promotion enabled at checkout"
                    onClick={() => updateField('active', !editor?.form.active)}
                    className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
                      editor?.form.active
                        ? 'border-brand-deep/30 bg-brand'
                        : 'border-border bg-muted-foreground/25'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all ${
                        editor?.form.active ? 'left-[1.375rem]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <aside className="border-t bg-muted/20 p-5 sm:p-6 lg:border-l lg:border-t-0">
              {editor ? (
                <PromotionPreview
                  form={editor.form}
                  games={games}
                  currentLabel={editor.targetLabel}
                  now={now}
                />
              ) : null}
            </aside>
          </form>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <Button
              type="button"
              variant="ghost"
              onClick={closeEditor}
              disabled={pending || formPending}
            >
              {isEditing ? 'Discard changes' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              form="promotion-form"
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
              {isEditing ? 'Save changes' : 'Create promotion'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-[-0.03em]">
                All promotions
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {total.toLocaleString('id-ID')} {total === 1 ? 'promotion' : 'promotions'}
                {initialQuery ? ` matching “${initialQuery}”` : ''}
                {initialActive === 'true'
                  ? ' · enabled'
                  : initialActive === 'false'
                    ? ' · paused'
                    : ''}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
              <form onSubmit={submitSearch} className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search promotions"
                  placeholder="Search promotions"
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
                onClick={openCreate}
                disabled={pending}
                className="h-9 shrink-0 bg-brand text-brand-ink hover:bg-brand/85"
              >
                <Plus className="size-4" />
                New promotion
              </Button>
            </div>
          </div>

          <nav aria-label="Promotion status filter" className="mt-4 flex flex-wrap gap-1.5">
            {FILTERS.map((filter) => {
              const active = initialActive === filter.value
              return (
                <Link
                  key={filter.label}
                  href={filterHref(filter.value)}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? 'border-brand bg-brand text-brand-ink'
                      : 'bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground'
                  }`}
                >
                  {filter.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {promotions.length === 0 ? (
          <div className="p-4 sm:p-5">
            <PanelEmpty
              title={hasFilters ? 'No matching promotions' : 'No promotions yet'}
              description={
                hasFilters
                  ? 'Change the search or status filter to see other promotions.'
                  : 'Create an automatic discount to apply an offer to the catalog, a game, or a single account.'
              }
              action={
                hasFilters ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="size-3.5" />
                    New promotion
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <>
            <div className="divide-y lg:hidden">
              {promotions.map((promotion) => {
                const status = statusFor(promotion, now)
                return (
                  <article key={promotion.id} className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand-deep">
                        {promotion.type === 'PERSEN' ? (
                          <Percent className="size-4" />
                        ) : (
                          <Banknote className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{promotion.name}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {scopeLabel(promotion.scope)}
                            </p>
                          </div>
                          <StatusBadge status={status} />
                        </div>

                        <div className="mt-3 flex items-end justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold tabular-nums">
                              {discountLabel(
                                promotion.type === 'NOMINAL' ? 'NOMINAL' : 'PERSEN',
                                promotion.value,
                              )}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {targetLabel(promotion)}
                              {promotion.maxDiscount
                                ? ` · max ${rupiah(promotion.maxDiscount)}`
                                : ''}
                            </p>
                          </div>
                          <p className="shrink-0 text-right text-[11px] leading-4 text-muted-foreground">
                            {waktu(promotion.startsAt)}
                            <br />
                            {waktu(promotion.endsAt)}
                          </p>
                        </div>

                        <div className="mt-3">{rowActions(promotion)}</div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-[.1em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium sm:px-5">Promotion</th>
                    <th className="px-4 py-3 font-medium">Offer</th>
                    <th className="px-4 py-3 font-medium">Applies to</th>
                    <th className="w-[190px] px-4 py-3 font-medium">Schedule</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {promotions.map((promotion) => {
                    const status = statusFor(promotion, now)
                    return (
                      <tr key={promotion.id} className="transition hover:bg-muted/25">
                        <td className="px-4 py-3 sm:px-5">
                          <div className="flex items-center gap-2.5">
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand-deep">
                              {promotion.type === 'PERSEN' ? (
                                <Percent className="size-4" />
                              ) : (
                                <Banknote className="size-4" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="max-w-56 truncate font-medium">{promotion.name}</p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {promotion.type === 'PERSEN' ? 'Percentage' : 'Fixed amount'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium tabular-nums">
                            {discountLabel(
                              promotion.type === 'NOMINAL' ? 'NOMINAL' : 'PERSEN',
                              promotion.value,
                            )}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {promotion.maxDiscount
                              ? `Capped at ${rupiah(promotion.maxDiscount)}`
                              : 'No cap'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ScopeIcon scope={promotion.scope} />
                            <div className="min-w-0">
                              <p className="max-w-48 truncate text-xs font-medium">
                                {targetLabel(promotion)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {scopeLabel(promotion.scope)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <p className="text-xs">{waktu(promotion.startsAt)}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            to {waktu(promotion.endsAt)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-4 py-3 sm:px-5">{rowActions(promotion)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
