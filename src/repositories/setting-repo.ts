// Store settings data access — simple key/value rows.

import { prisma } from '../lib/prisma'

export const SETTING_KEYS = [
  'checkout_aktif',
  'nama_toko',
  'kontak_cs',
  'pesan_pengumuman',
] as const

export type SettingKey = (typeof SETTING_KEYS)[number]

export function findMany(keys: readonly SettingKey[] = SETTING_KEYS) {
  return prisma.setting.findMany({
    where: { key: { in: [...keys] } },
    select: { key: true, value: true },
  })
}

export function findByKey(key: string) {
  return prisma.setting.findUnique({ where: { key: key }, select: { key: true, value: true } })
}

export function upsert(key: string, value: string, updatedBy?: bigint) {
  return prisma.setting.upsert({
    where: { key: key },
    update: { value: value, updatedBy: updatedBy ?? null },
    create: { key: key, value: value, updatedBy: updatedBy ?? null },
  })
}
