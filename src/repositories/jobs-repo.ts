// Job heartbeat storage (reuses settings, no schema growth) + DB ping for health.

import { prisma } from '../lib/prisma'

const PREFIX = 'job_heartbeat:'

export function catatHeartbeat(name: string, hasil: 'OK' | 'GAGAL') {
  return prisma.setting.upsert({
    where: { key: `${PREFIX}${name}` },
    update: { value: hasil },
    create: { key: `${PREFIX}${name}`, value: hasil },
  })
}

export function semuaHeartbeat() {
  return prisma.setting.findMany({
    where: { key: { startsWith: PREFIX } },
    select: { key: true, value: true, updatedAt: true },
  })
}

export async function ping(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`
}
