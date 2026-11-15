import 'dotenv/config'
import { execFileSync } from 'node:child_process'
import { Client } from 'pg'

function wajib(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} wajib diisi untuk tes integrasi.`)
  return value
}

function databaseName(databaseUrl: string): string {
  const name = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ''))
  if (!/^[A-Za-z0-9_]+$/.test(name))
    throw new Error('Nama database tes hanya boleh berisi huruf, angka, dan garis bawah.')
  if (!name.endsWith('_test'))
    throw new Error(`Tes hanya boleh berjalan pada database berakhiran "_test" (got "${name}").`)
  return name
}

async function ensureDatabase(databaseUrl: string, name: string): Promise<void> {
  const adminUrl = new URL(databaseUrl)
  adminUrl.pathname = '/postgres'
  adminUrl.search = ''

  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()
  try {
    const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name])
    if (existing.rowCount === 0) await admin.query(`CREATE DATABASE "${name}"`)
  } finally {
    await admin.end()
  }
}

export default async function globalSetup() {
  const databaseUrl = wajib('DATABASE_URL')
  const name = databaseName(databaseUrl)

  if (process.env.ALLOW_DESTRUCTIVE_TESTS !== '1')
    throw new Error(
      'Tes akan DROP SCHEMA public pada database tes. Set ALLOW_DESTRUCTIVE_TESTS=1 untuk melanjutkan.',
    )

  await ensureDatabase(databaseUrl, name)

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
