import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const testUrl = process.env.TEST_DATABASE_URL
if (!testUrl) throw new Error('TEST_DATABASE_URL wajib diisi untuk menjalankan tes.')

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    globalSetup: ['./tests/global-setup.ts'],
    env: {
      DATABASE_URL: testUrl,
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
