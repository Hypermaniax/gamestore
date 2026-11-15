import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const source = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
if (!source) throw new Error('DATABASE_URL wajib diisi untuk menjalankan tes.')

const parsed = new URL(source)
const name = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
if (!name) throw new Error('DATABASE_URL harus menyertakan nama database.')

// Never let a stray `npm test` point at the development database.
const testName = name.endsWith('_test') ? name : `${name.replace(/_dev$/, '')}_test`
parsed.pathname = `/${testName}`
const databaseUrl = parsed.toString()
process.env.DATABASE_URL = databaseUrl

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    globalSetup: ['./tests/global-setup.ts'],
    env: {
      DATABASE_URL: databaseUrl,
      NODE_ENV: 'test',
      XENDIT_SECRET_KEY: '',
      ADMIN_EMAIL: '',
      GARANSI_HARI: '3',
      GARANSI_MAKS_TANPA_REVEAL_HARI: '30',
    },
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
})
