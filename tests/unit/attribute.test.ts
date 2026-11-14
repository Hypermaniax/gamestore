import { describe, expect, it } from 'vitest'
import {
  attributeToFormValues,
  buildAttributeValues,
  invalidNumericFields,
  parseAttributeSchema,
} from '../../src/lib/attribute'

describe('dynamic attribute schema', () => {
  it('reads every field type including long text and options', () => {
    const fields = parseAttributeSchema([
      { kunci: 'rank', label: 'Rank', tipe: 'teks', wajib: true },
      { kunci: 'level', label: 'Level', tipe: 'angka', wajib: true },
      { kunci: 'server', label: 'Server', tipe: 'pilihan', wajib: false, opsi: ['Asia', 'Global'] },
      { kunci: 'skin', label: 'Daftar Skin', tipe: 'teks_panjang', wajib: false },
    ])

    expect(fields.map((field) => field.tipe)).toEqual([
      'teks',
      'angka',
      'pilihan',
      'teks_panjang',
    ])
    expect(fields[2].opsi).toEqual(['Asia', 'Global'])
  })

  it('builds numeric values and keeps long text', () => {
    const fields = parseAttributeSchema([
      { kunci: 'level', label: 'Level', tipe: 'angka', wajib: true },
      { kunci: 'skin', label: 'Daftar Skin', tipe: 'teks_panjang', wajib: false },
    ])
    const values = { level: '40', skin: 'Dragon, Frost, Lunar' }

    expect(buildAttributeValues(fields, values)).toEqual({
      level: 40,
      skin: 'Dragon, Frost, Lunar',
    })
    expect(attributeToFormValues({ level: 40, skin: 'Dragon' })).toEqual({
      level: '40',
      skin: 'Dragon',
    })
  })

  it('flags invalid numbers but ignores empty fields', () => {
    const fields = parseAttributeSchema([
      { kunci: 'level', label: 'Level', tipe: 'angka', wajib: true },
      { kunci: 'diamond', label: 'Diamond', tipe: 'angka', wajib: false },
    ])

    expect(invalidNumericFields(fields, { level: 'abc', diamond: '' })).toEqual([fields[0]])
  })
})
