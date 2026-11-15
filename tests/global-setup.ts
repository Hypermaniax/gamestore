import 'dotenv/config'
import { execFileSync } from 'node:child_process'
import { Client } from 'pg'

function wajib(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} wajib diisi untuk tes integrasi.`)
  return value
}

export default async function globalSetup() {
  const databaseUrl = wajib('DATABASE_URL')

  if (process.env.ALLOW_DESTRUCTIVE_TESTS !== '1')
    throw new Error(
      'Tes akan DROP SCHEMA public pada DATABASE_URL. Set ALLOW_DESTRUCTIVE_TESTS=1 untuk melanjutkan.',
    )

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE')
    await client.query('CREATE SCHEMA public')
  } finally {
    await client.end()
  }

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  })
}
