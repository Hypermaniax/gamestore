// Payment channels — the server is the source of truth for the UI (docs/API.md §2).

export const VA_BANKS = ['BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA'] as const
export type VABank = (typeof VA_BANKS)[number]
export type MetodePembayaran = 'QRIS' | 'VA'

export const MIN_PEMBAYARAN = BigInt(10_000)

export const CHANNEL_PEMBAYARAN = [
  { code: 'QRIS', method: 'QRIS' as const, name: 'QRIS', bank: null, minimal: MIN_PEMBAYARAN.toString() },
  ...VA_BANKS.map((bank) => ({
    code: `VA-${bank}`,
    method: 'VA' as const,
    name: `Virtual Account ${bank}`,
    bank,
    minimal: MIN_PEMBAYARAN.toString(),
  })),
]
