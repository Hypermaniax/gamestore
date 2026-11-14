// URL slug generation — stable, lowercase, ASCII-ish. Uniqueness is enforced by the
// caller with a short random suffix (game_accounts.slug has a UNIQUE constraint).

import { randomBytes } from 'node:crypto'

export function slugify(value: string, maxLength = 100): string {
  const base = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '')
  return base || 'akun'
}

export function withSuffix(base: string, maxLength = 100): string {
  const suffix = randomBytes(3).toString('hex')
  return `${slugify(base, maxLength - suffix.length - 1)}-${suffix}`
}
