export type AttributeField = {
  kunci: string
  label: string
  tipe: 'teks' | 'angka' | 'pilihan' | 'teks_panjang'
  wajib: boolean
  opsi?: string[]
}

export function parseAttributeSchema(value: unknown): AttributeField[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const field = raw as Record<string, unknown>
    if (typeof field.kunci !== 'string' || typeof field.label !== 'string') return []
    const options = Array.isArray(field.opsi)
      ? field.opsi.filter((item): item is string => typeof item === 'string')
      : undefined
    return [
      {
        kunci: field.kunci,
        label: field.label,
        tipe:
          field.tipe === 'angka' || field.tipe === 'pilihan' || field.tipe === 'teks_panjang'
            ? field.tipe
            : 'teks',
        wajib: field.wajib === true,
        opsi: options,
      },
    ]
  })
}

export function attributeToFormValues(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value)) {
    if (raw === null || raw === undefined) continue
    result[key] = String(raw)
  }
  return result
}

export function buildAttributeValues(
  fields: AttributeField[],
  values: Record<string, string>,
): Record<string, string | number> {
  const result: Record<string, string | number> = {}
  for (const field of fields) {
    const raw = values[field.kunci]?.trim()
    if (!raw) continue
    result[field.kunci] = field.tipe === 'angka' ? Number(raw) : raw
  }
  return result
}

export function invalidNumericFields(
  fields: AttributeField[],
  values: Record<string, string>,
): AttributeField[] {
  return fields.filter((field) => {
    const raw = values[field.kunci]?.trim()
    return field.tipe === 'angka' && Boolean(raw) && !Number.isFinite(Number(raw))
  })
}
