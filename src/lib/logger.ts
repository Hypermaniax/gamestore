// Structured, redacted logging — ref: docs/PLAN.md §14.
// Every line is JSON so log shippers can index it; secrets and PII are never emitted.

type Level = 'info' | 'warn' | 'error'
type Fields = Record<string, unknown>

const SENSITIVE = /(password|token|secret|authorization|cookie|keyring|ciphertext|kredensial|payload|email)/i

export function maskEmail(value: string): string {
  const [local, domain] = value.split('@')
  if (!domain) return '***'
  return `${local?.slice(0, 1) ?? ''}***@${domain.slice(0, 1)}***`
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE.test(key) ? '[redacted]' : redact(item),
      ]),
    )
  }
  return value
}

/** Safe error shape: stack/message only in development, never raw payloads. */
export function errorDetail(error: unknown): Fields {
  const base: Fields = {
    name: error instanceof Error ? error.name : 'UnknownError',
    code:
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code: unknown }).code)
        : undefined,
  }
  if (process.env.NODE_ENV !== 'production' && error instanceof Error) base.message = error.message
  return base
}

function emit(level: Level, event: string, fields: Fields = {}): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...(redact(fields) as Fields),
  })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  info: (event: string, fields?: Fields) => emit('info', event, fields),
  warn: (event: string, fields?: Fields) => emit('warn', event, fields),
  error: (event: string, fields?: Fields) => emit('error', event, fields),
}
