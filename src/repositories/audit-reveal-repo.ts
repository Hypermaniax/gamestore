// Reveal audit trail — append-only evidence for credential handover.

import { prisma } from '../lib/prisma'

export function create(input: {
  transactionId: bigint
  buyerId: bigint
  ip: string | null
  userAgent: string | null
}) {
  return prisma.auditReveal.create({ data: input })
}
