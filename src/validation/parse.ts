// Input validation boundary — the typed-union contract never leaks zod internals.
// Controllers pass raw client data; services call parseInput() before business rules.

import type { z } from 'zod'

export type UnionError = { ok: false; code: string; message: string }

export type ParseResult<T> = { ok: true; data: T } | UnionError

/**
 * Validate untrusted input against a shared schema. The first issue becomes the
 * single `message` carried by the typed-union error (same contract as before zod).
 */
export function parseInput<T extends z.ZodType>(schema: T, input: unknown): ParseResult<z.output<T>> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      code: 'INPUT_INVALID',
      message: parsed.error.issues[0]?.message ?? 'The submitted data is invalid.',
    }
  }
  return { ok: true, data: parsed.data }
}
