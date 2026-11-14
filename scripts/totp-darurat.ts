// Break-glass CLI — usage:
//   TOTP_EMERGENCY_TOKEN_FILE=/etc/gamestore/totp-emergency.token \
//   TOTP_DARURAT_TOKEN=... npm run totp:darurat -- --username superadmin --alasan "perangkat hilang"
//
// The token is read from the environment (not argv) so it does not land in shell history.

import 'dotenv/config'
import { totpDarurat } from '../src/services/totp-darurat.service'

function arg(name: string): string | null {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? (process.argv[index + 1] ?? null) : null
}

const username = arg('username')
const alasan = arg('alasan')
const token = process.env.TOTP_DARURAT_TOKEN

if (!username || !alasan || !token) {
  console.error('Usage: npm run totp:darurat -- --username <admin> --alasan "<alasan>" (env TOTP_DARURAT_TOKEN wajib)')
  process.exit(2)
}

const result = await totpDarurat({ username, alasan, token })
console.log(JSON.stringify(result))
process.exit(result.ok ? 0 : 1)
