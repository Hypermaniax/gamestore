export type CredentialValues = {
  email: string
  password: string
  note: string
}

export const EMPTY_CREDENTIALS: CredentialValues = {
  email: '',
  password: '',
  note: '',
}

export function isCredentialComplete(values: CredentialValues): boolean {
  return Boolean(values.email.trim() && values.password.trim())
}

export function formatCredentials(values: CredentialValues): string {
  const lines = [`Email/Username: ${values.email.trim()}`, `Password: ${values.password}`]
  const note = values.note.trim()
  if (note) lines.push(`Note: ${note}`)
  return lines.join('\n')
}
