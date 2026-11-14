// Store settings — public read, admin read/write, and the checkout kill switch.

import { authService } from './auth.service'
import { rbacService } from './rbac.service'
import { auditService } from './audit.service'
import * as settingRepo from '../repositories/setting-repo'
import {
  settingUpdateSchema,
  type SettingUpdateInput,
} from '../validation/transaksi'
import { parseInput, type UnionError } from '../validation/parse'
import type { SessionClaims } from '../lib/session'
import { MIN_PEMBAYARAN } from '../lib/pembayaran/metode'

const fail = (code: string, message: string): UnionError => ({ ok: false, code, message })
const SESSION: UnionError = fail('INVALID_SESSION', 'Your session is no longer valid. Please log in again.')
const FORBIDDEN: UnionError = fail('FORBIDDEN', 'You do not have permission to perform this action.')
const isError = (value: SessionClaims | UnionError): value is UnionError => 'code' in value

async function requirePermission(code: string): Promise<SessionClaims | UnionError> {
  const session = await authService.verifySession()
  if (!session) return SESSION
  if (!(await rbacService.hasPermission(session.userId, code))) return FORBIDDEN
  return session
}

const DEFAULT_SETTINGS: Record<settingRepo.SettingKey, string> = {
  checkout_aktif: 'true',
  nama_toko: 'GameStore',
  kontak_cs: '',
  pesan_pengumuman: '',
}

const envNumber = (name: string, fallback: number): number => {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function toMap(rows: Array<{ key: string; value: string | null }>) {
  return new Map(rows.map((row) => [row.key, row.value ?? '']))
}

export const settingService = {
  async getPublic() {
    const rows = await settingRepo.findMany()
    const map = toMap(rows)
    return {
      ok: true as const,
      data: {
        namaToko: map.get('nama_toko') || DEFAULT_SETTINGS.nama_toko,
        kontakCs: map.get('kontak_cs') ?? '',
        pesanPengumuman: map.get('pesan_pengumuman') ?? '',
        checkoutAktif: (map.get('checkout_aktif') ?? DEFAULT_SETTINGS.checkout_aktif) !== 'false',
        garansiHari: envNumber('GARANSI_HARI', 3),
        expiryMenit: envNumber('EXPIRY_MENIT', 30),
        minimalPembayaran: MIN_PEMBAYARAN.toString(),
      },
    }
  },

  async isCheckoutActive(): Promise<boolean> {
    const row = await settingRepo.findByKey('checkout_aktif')
    return (row?.value ?? DEFAULT_SETTINGS.checkout_aktif) !== 'false'
  },

  async getAdmin() {
    const session = await requirePermission('setting:read')
    if (isError(session)) return session
    return settingService.getPublic()
  },

  async update(input: SettingUpdateInput) {
    const session = await requirePermission('setting:write')
    if (isError(session)) return session
    const parsed = parseInput(settingUpdateSchema, input)
    if (!parsed.ok) return parsed

    const entries: Array<{ key: settingRepo.SettingKey; value: string }> = []
    if (parsed.data.checkoutAktif !== undefined)
      entries.push({ key: 'checkout_aktif', value: String(parsed.data.checkoutAktif) })
    if (parsed.data.namaToko !== undefined) entries.push({ key: 'nama_toko', value: parsed.data.namaToko })
    if (parsed.data.kontakCs !== undefined) entries.push({ key: 'kontak_cs', value: parsed.data.kontakCs })
    if (parsed.data.pesanPengumuman !== undefined)
      entries.push({ key: 'pesan_pengumuman', value: parsed.data.pesanPengumuman })

    for (const entry of entries) {
      await settingRepo.upsert(entry.key, entry.value, session.userId)
    }
    await auditService.log(session.userId, 'setting.update', 'setting', {
      fields: entries.map((entry) => entry.key),
    })
    return settingService.getPublic()
  },
}
