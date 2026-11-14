import { describe, expect, it } from 'vitest'
import {
  draftToSchema,
  emptyField,
  schemaToDraft,
} from '../../components/panel/attribute-schema-fields'

describe('builder skema atribut game', () => {
  it('mengubah skema tersimpan menjadi draft dengan opsi per baris', () => {
    const drafts = schemaToDraft([
      {
        kunci: 'tipe_login',
        label: 'Tipe Login',
        tipe: 'pilihan',
        wajib: true,
        opsi: ['Moonton', 'Google'],
      },
    ])

    expect(drafts).toHaveLength(1)
    expect(drafts[0]).toMatchObject({
      kunci: 'tipe_login',
      label: 'Tipe Login',
      tipe: 'pilihan',
      wajib: true,
      opsiText: 'Moonton\nGoogle',
      asli: true,
    })
  })

  it('menghasilkan payload pilihan yang siap disimpan', () => {
    const field = emptyField()
    const result = draftToSchema([
      {
        ...field,
        kunci: 'tipe_login',
        label: 'Tipe Login',
        tipe: 'pilihan',
        wajib: true,
        opsiText: ' Moonton \nGoogle\n\nFacebook ',
      },
    ])

    expect(result).toEqual({
      ok: true,
      data: [
        {
          kunci: 'tipe_login',
          label: 'Tipe Login',
          tipe: 'pilihan',
          wajib: true,
          opsi: ['Moonton', 'Google', 'Facebook'],
        },
      ],
    })
  })

  it('menolak pilihan tanpa opsi dan kunci duplikat', () => {
    const baseField = emptyField()

    expect(
      draftToSchema([
        {
          ...baseField,
          kunci: 'tipe_login',
          label: 'Tipe Login',
          tipe: 'pilihan',
          opsiText: '',
        },
      ]),
    ).toMatchObject({ ok: false })

    expect(
      draftToSchema([
        { ...baseField, kunci: 'rank', label: 'Rank' },
        { ...baseField, kunci: 'rank', label: 'Rank Lain' },
      ]),
    ).toMatchObject({ ok: false, message: 'Key "rank" is used by more than one field.' })
  })
})
