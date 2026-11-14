import { describe, expect, it } from 'vitest'
import { parseFaqMarkdown } from '../../src/lib/faq'

describe('parseFaqMarkdown', () => {
  it('memecah heading level-2 menjadi pertanyaan dan jawaban', () => {
    const items = parseFaqMarkdown(`Pembuka singkat.

## Bagaimana cara membeli?

Pilih akun, lalu lanjut ke checkout.

## Kapan kredensial diterima?

Setelah pembayaran **terverifikasi**.
`)

    expect(items).toEqual([
      {
        question: 'Bagaimana cara membeli?',
        answer: 'Pilih akun, lalu lanjut ke checkout.',
      },
      {
        question: 'Kapan kredensial diterima?',
        answer: 'Setelah pembayaran **terverifikasi**.',
      },
    ])
  })

  it('mengabaikan section tanpa jawaban dan heading level-3', () => {
    const items = parseFaqMarkdown(`## Pertanyaan kosong

## Apakah akun aman?

### Catatan

Kredensial disimpan terenkripsi.
`)

    expect(items).toEqual([
      {
        question: 'Apakah akun aman?',
        answer: '### Catatan\n\nKredensial disimpan terenkripsi.',
      },
    ])
  })

  it('mengembalikan daftar kosong untuk konten tanpa pertanyaan', () => {
    expect(parseFaqMarkdown('Hanya paragraf biasa.')).toEqual([])
  })
})
