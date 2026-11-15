// Anonymise old audit_reveal IP/UA — usage:
//   PDP_KONFIRMASI=ANONIMISASI-AUDIT npm run pdp:anonim-audit [-- --dry-run]
// Uses DATABASE_URL.

import 'dotenv/config'
import { anonimkanAuditReveal } from '../src/services/pdp.service'

const result = await anonimkanAuditReveal({
  konfirmasi: process.env.PDP_KONFIRMASI ?? '',
  dryRun: process.argv.includes('--dry-run'),
})
console.log(JSON.stringify(result))
process.exit(result.ok ? 0 : 1)
