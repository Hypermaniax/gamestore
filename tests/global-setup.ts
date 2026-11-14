import 'dotenv/config'
import { execFileSync } from 'node:child_process'
import { Client } from 'pg'

function wajib(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} wajib diisi untuk tes integrasi.`)
  return value
}

export default async function globalSetup() {
  const migrationUrl = wajib('TEST_MIGRATION_DATABASE_URL')
  const appUrl = wajib('TEST_DATABASE_URL')
  const appUser = decodeURIComponent(new URL(appUrl).username)

  const client = new Client({ connectionString: migrationUrl })
  await client.connect()
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE')
    await client.query('CREATE SCHEMA public')
  } finally {
    await client.end()
  }

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      MIGRATION_DATABASE_URL: migrationUrl,
      DATABASE_URL: appUrl,
    },
  })

  const grant = new Client({ connectionString: migrationUrl })
  await grant.connect()
  try {
    await grant.query(`GRANT USAGE ON SCHEMA public TO "${appUser}"`)
    await grant.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public TO "${appUser}"`,
    )
    await grant.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${appUser}"`)
  } finally {
    await grant.end()
  }
}
