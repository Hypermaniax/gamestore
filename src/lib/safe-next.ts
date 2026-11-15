// Internal redirect targets — shared by the login and verify-email pages so the
// whitelist rules never drift between entry points.

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/

/** Accept only same-origin app paths; anything ambiguous falls back to the default route. */
export function safeNextPath(value: string | string[] | null | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
  if (raw.includes('\\') || CONTROL_CHARS.test(raw)) return null

  try {
    const url = new URL(raw, 'http://local.invalid')
    if (url.origin !== 'http://local.invalid') return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}
