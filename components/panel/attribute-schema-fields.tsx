'use client'

import { useState } from 'react'
import { Plus, Trash2, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseAttributeSchema, type AttributeField } from '@/src/lib/attribute'

export type AttributeType = AttributeField['tipe']

export type SchemaFieldDraft = {
  id: string
  kunci: string
  label: string
  tipe: AttributeType
  wajib: boolean
  opsiText: string
  asli: boolean
}

export type SchemaPayload = {
  kunci: string
  label: string
  tipe: AttributeType
  wajib: boolean
  opsi?: string[]
}

const TYPE_OPTIONS: Array<{ value: AttributeType; label: string }> = [
  { value: 'teks', label: 'Text' },
  { value: 'angka', label: 'Number' },
  { value: 'pilihan', label: 'Choice (dropdown)' },
  { value: 'teks_panjang', label: 'Long text' },
]

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `field-${Date.now()}-${Math.random()}`
}

export function emptyField(): SchemaFieldDraft {
  return {
    id: newId(),
    kunci: '',
    label: '',
    tipe: 'teks',
    wajib: false,
    opsiText: '',
    asli: false,
  }
}

export function schemaToDraft(value: unknown): SchemaFieldDraft[] {
  return parseAttributeSchema(value).map((field) => ({
    id: newId(),
    kunci: field.kunci,
    label: field.label,
    tipe: field.tipe,
    wajib: field.wajib,
    opsiText: (field.opsi ?? []).join('\n'),
    asli: true,
  }))
}

export function draftToSchema(
  fields: SchemaFieldDraft[],
): { ok: true; data: SchemaPayload[] } | { ok: false; message: string } {
  const result: SchemaPayload[] = []
  const used = new Set<string>()

  for (const [index, field] of fields.entries()) {
    const kunci = field.kunci.trim().toLowerCase()
    const label = field.label.trim()
    if (!kunci) return { ok: false, message: `Field key #${index + 1} is required.` }
    if (!/^[a-z0-9_]{1,30}$/.test(kunci)) {
      return {
        ok: false,
        message: `Key "${kunci}" is invalid. Use lowercase letters, numbers, or underscores (max 30).`,
      }
    }
    if (used.has(kunci)) return { ok: false, message: `Key "${kunci}" is used by more than one field.` }
    used.add(kunci)
    if (!label) return { ok: false, message: `Field label "${kunci}" is required.` }
    if (label.length > 60) return { ok: false, message: `Label "${label}" must be at most 60 characters.` }

    if (field.tipe === 'pilihan') {
      const opsi = field.opsiText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
      if (opsi.length === 0) {
        return { ok: false, message: `Field "${label}" is a choice type, so it needs at least one option.` }
      }
      if (opsi.length > 50) return { ok: false, message: `Field "${label}" allows at most 50 options.` }
      if (opsi.some((item) => item.length > 60)) {
        return { ok: false, message: `Each option for "${label}" must be at most 60 characters.` }
      }
      result.push({ kunci, label, tipe: field.tipe, wajib: field.wajib, opsi })
      continue
    }

    result.push({ kunci, label, tipe: field.tipe, wajib: field.wajib })
  }

  return { ok: true, data: result }
}

function autoKey(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30)
}

export function AttributeSchemaFields({
  fields,
  onChange,
  disabled = false,
}: {
  fields: SchemaFieldDraft[]
  onChange: (fields: SchemaFieldDraft[]) => void
  disabled?: boolean
}) {
  const [openOptions, setOpenOptions] = useState<Record<string, boolean>>({})

  function updateField(id: string, patch: Partial<SchemaFieldDraft>) {
    onChange(fields.map((field) => (field.id === id ? { ...field, ...patch } : field)))
  }

  function updateLabel(field: SchemaFieldDraft, label: string) {
    const previousAutoKey = autoKey(field.label)
    const patch: Partial<SchemaFieldDraft> = { label }
    if (!field.asli && (!field.kunci || field.kunci === previousAutoKey)) {
      patch.kunci = autoKey(label)
    }
    updateField(field.id, patch)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Account form fields</p>
          <p className="text-xs text-muted-foreground">
            Choice-type fields appear as dropdowns in the account form.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...fields, emptyField()])}
        >
          <Plus className="size-4" />
          Add field
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
          No fields yet. Add e.g. rank, level, or login type.
        </p>
      ) : null}

      <div className="grid items-start gap-3 lg:grid-cols-2 xl:grid-cols-3">
      {fields.map((field, index) => {
        const id = `schema-`
        return (
          <div key={field.id} className="space-y-3 rounded-lg border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Field {index + 1}</span>
                {field.asli ? (
                  <Badge variant="outline">
                    <Lock className="size-3" />
                    Saved
                  </Badge>
                ) : null}
              </div>
              {field.asli ? (
                <p className="text-[11px] text-muted-foreground">Key and type are locked so existing accounts stay valid.</p>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  disabled={disabled}
                  onClick={() => onChange(fields.filter((item) => item.id !== field.id))}
                  aria-label={`Delete field ${index + 1}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-label`}>Label</Label>
                <Input
                  id={`${id}-label`}
                  value={field.label}
                  maxLength={60}
                  disabled={disabled}
                  placeholder="Example: Login Type"
                  onChange={(event) => updateLabel(field, event.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-kunci`}>Key</Label>
                <Input
                  id={`${id}-kunci`}
                  value={field.kunci}
                  maxLength={30}
                  disabled={disabled || field.asli}
                  placeholder="tipe_login"
                  onChange={(event) => updateField(field.id, { kunci: event.target.value })}
                  className="h-9 font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-tipe`}>Form type</Label>
                <select
                  id={`${id}-tipe`}
                  className="field h-9 px-3"
                  value={field.tipe}
                  disabled={disabled || field.asli}
                  onChange={(event) => updateField(field.id, { tipe: event.target.value as AttributeType })}
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.wajib}
                    disabled={disabled}
                    onChange={(event) => updateField(field.id, { wajib: event.target.checked })}
                  />
                  Required when adding an account
                </label>
              </div>
            </div>

            {field.tipe === 'pilihan' ? (
              <details
                className="rounded-lg bg-muted/25 p-3"
                open={openOptions[field.id] ?? field.opsiText.trim() === ''}
                onToggle={(event) => {
                  const terbuka = event.currentTarget.open
                  setOpenOptions((current) => ({ ...current, [field.id]: terbuka }))
                }}
              >
                <summary className="cursor-pointer select-none text-xs font-medium">
                  Dropdown options
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    · {field.opsiText.split('\n').filter((item) => item.trim()).length} options
                  </span>
                </summary>
                <div className="mt-2 space-y-1.5">
                  <Label htmlFor={`${id}-opsi`} className="sr-only">Dropdown options</Label>
                  <textarea
                    id={`${id}-opsi`}
                    className="field min-h-24 py-2 font-mono text-xs"
                    value={field.opsiText}
                    disabled={disabled}
                    placeholder={'One option per line, e.g.:\nMoonton\nGoogle\nFacebook'}
                    onChange={(event) => updateField(field.id, { opsiText: event.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">One option per line. Maximum 50 options.</p>
                </div>
              </details>
            ) : null}
          </div>
        )
      })}
      </div>
    </div>
  )
}
