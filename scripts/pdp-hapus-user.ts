// PDP manual deletion — usage:
//   PDP_KONFIRMASI=HAPUS-DATA npm run pdp:hapus -- --identitas <username/email> --alasan "<alasan>"

import 'dotenv/config'
import { hapusDataPribadi } from '../src/services/pdp.service'

function arg(name: string): string | null {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? (process.argv[index + 1] ?? null) : null
}

const identitas = arg('identitas')
const alasan = arg('alasan')
if (!identitas || !alasan) {
  console.error('Usage: npm run pdp:hapus -- --identitas <username/email> --alasan "<alasan>"')
  process.exit(2)
}

const result = await hapusDataPribadi({
  identitas,
  alasan,
  konfirmasi: process.env.PDP_KONFIRMASI ?? '',
})
console.log(JSON.stringify(result))
process.exit(result.ok ? 0 : 1)
