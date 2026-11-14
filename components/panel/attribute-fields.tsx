import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AttributeField } from '@/src/lib/attribute'

export function AttributeFields({
  fields,
  values,
  onChange,
  showValidation,
  emptyText,
}: {
  fields: AttributeField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  showValidation: boolean
  emptyText: string
}) {
  if (fields.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
        {emptyText}
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const value = values[field.kunci] ?? ''
        const invalid = showValidation && field.wajib && !value.trim()
        return (
          <div
            key={field.kunci}
            className={field.tipe === 'teks_panjang' ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}
          >
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`attribute-${field.kunci}`}>{field.label}</Label>
              {field.wajib ? (
                <span className="text-[10px] font-semibold text-brand-deep">Required</span>
              ) : null}
            </div>
            {field.tipe === 'pilihan' ? (
              <select
                id={`attribute-${field.kunci}`}
                className="field h-10 px-3"
                value={value}
                onChange={(event) => onChange(field.kunci, event.target.value)}
                aria-invalid={invalid}
              >
                <option value="">Select {field.label.toLowerCase()}</option>
                {(field.opsi ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.tipe === 'teks_panjang' ? (
              <textarea
                id={`attribute-${field.kunci}`}
                className="field min-h-28 py-2"
                maxLength={2000}
                value={value}
                onChange={(event) => onChange(field.kunci, event.target.value)}
                placeholder={`Enter ${field.label.toLowerCase()}`}
                aria-invalid={invalid}
              />
            ) : (
              <Input
                id={`attribute-${field.kunci}`}
                inputMode={field.tipe === 'angka' ? 'numeric' : 'text'}
                maxLength={200}
                value={value}
                onChange={(event) => onChange(field.kunci, event.target.value)}
                placeholder={field.tipe === 'angka' ? '0' : `Enter ${field.label.toLowerCase()}`}
                aria-invalid={invalid}
                className="h-10"
              />
            )}
            {invalid ? <p className="text-[11px] text-destructive">Required.</p> : null}
          </div>
        )
      })}
    </div>
  )
}
