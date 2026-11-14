import { describe, expect, it } from 'vitest'
import { hitungDiskon, pilihPromo, toRupiah } from '../../src/lib/diskon'

describe('hitungDiskon', () => {
  it('memotong persen dan floor ke rupiah', () => {
    expect(hitungDiskon(BigInt(100_001), { type: 'PERSEN', value: '12.5' })).toBe(BigInt(12_500))
  })

  it('membatasi persen dengan maks potongan', () => {
    expect(
      hitungDiskon(BigInt(1_000_000), { type: 'PERSEN', value: '50', maxDiscount: '100000' }),
    ).toBe(BigInt(100_000))
  })

  it('tidak pernah melebihi harga dasar', () => {
    expect(hitungDiskon(BigInt(50_000), { type: 'NOMINAL', value: '80000' })).toBe(BigInt(50_000))
  })

  it('mengembalikan nol untuk harga atau nilai tidak valid', () => {
    expect(hitungDiskon(BigInt(0), { type: 'PERSEN', value: '10' })).toBe(BigInt(0))
    expect(hitungDiskon(BigInt(10_000), { type: 'PERSEN', value: '-1' })).toBe(BigInt(0))
  })
})

describe('pilihPromo', () => {
  it('memilih cakupan paling spesifik', () => {
    const hasil = pilihPromo(
      [
        { id: BigInt(1), scope: 'SEMUA', targetId: null, type: 'PERSEN', value: '50' },
        { id: BigInt(2), scope: 'GAME', targetId: BigInt(10), type: 'PERSEN', value: '20' },
        { id: BigInt(3), scope: 'AKUN', targetId: BigInt(100), type: 'PERSEN', value: '10' },
      ],
      { price: BigInt(100_000), accountId: BigInt(100), gameId: BigInt(10) },
    )
    expect(hasil?.promotion.id).toBe(BigInt(3))
    expect(hasil?.potongan).toBe(BigInt(10_000))
  })

  it('seri spesifisitas dipecah oleh potongan terbesar lalu id terbesar', () => {
    const hasil = pilihPromo(
      [
        { id: BigInt(7), scope: 'GAME', targetId: BigInt(10), type: 'PERSEN', value: '20' },
        { id: BigInt(8), scope: 'GAME', targetId: BigInt(10), type: 'PERSEN', value: '20' },
        { id: BigInt(9), scope: 'SEMUA', targetId: null, type: 'NOMINAL', value: '90000' },
      ],
      { price: BigInt(100_000), accountId: BigInt(100), gameId: BigInt(10) },
    )
    expect(hasil?.promotion.id).toBe(BigInt(8))
  })

  it('mengembalikan null saat tidak ada promo cocok', () => {
    expect(
      pilihPromo(
        [{ id: BigInt(1), scope: 'AKUN', targetId: BigInt(99), type: 'PERSEN', value: '10' }],
        { price: BigInt(100_000), accountId: BigInt(100), gameId: BigInt(10) },
      ),
    ).toBeNull()
  })
})

describe('toRupiah', () => {
  it('memotong desimal tanpa membulatkan', () => {
    expect(toRupiah('12345.99')).toBe(BigInt(12345))
    expect(toRupiah(0.9)).toBe(BigInt(0))
  })
})
