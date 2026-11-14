import type { PrismaClient } from '../../../generated/client'

export type SeedDb = PrismaClient

export type Variant = {
  title: string
  rank: string
  level: number
  extra: Record<string, string | number>
  price: number
}

export type GameFixture = { code: string; variant: (index: number) => Variant }
