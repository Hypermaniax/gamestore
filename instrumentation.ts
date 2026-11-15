// Startup audit — ref: docs/PLAN.md §8.1 "Langkah 0" + §13/§14.
// Scheduled jobs (node-cron + DB advisory lock) get installed here in Fase 5.

const isBuild = process.env.NEXT_PHASE === 'phase-production-build'
const isProdServer = process.env.NODE_ENV === 'production' && !isBuild


export async function register() {
  const required = ['DATABASE_URL', 'JWT_SECRET_FILE', 'AES_KEYRING_FILE'] as const
  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    console.warn(`[startup] required env not yet set: ${missing.join(', ')} — related features will fail when used`)
  }

  if (isProdServer && process.env.NEXT_RUNTIME === 'nodejs') {
    const productionRequired = [
      'JWT_SECRET_FILE',
      'AES_KEYRING_FILE',
      'APP_BASE_URL',
      'MAIL_HOST',
      'MAIL_FROM',
      'ADMIN_EMAIL',
      'XENDIT_CALLBACK_TOKEN',
    ] as const
    const absent = productionRequired.filter((key) => !process.env[key])
    if (absent.length > 0)
      throw new Error(`[startup] env produksi wajib belum diisi: ${absent.join(', ')}`)
    if (process.env.TOTP_WAJIB_ADMIN !== 'true')
      throw new Error('[startup] TOTP_WAJIB_ADMIN wajib true di produksi')
    if (!process.env.APP_BASE_URL?.startsWith('https://'))
      throw new Error('[startup] APP_BASE_URL produksi wajib https://')

    const hops = process.env.TRUST_PROXY_HOPS
    if (hops !== undefined && hops !== '' && !/^(10|\d)$/.test(hops))
      throw new Error('[startup] TRUST_PROXY_HOPS wajib integer 0–10')
    if (hops === undefined || hops === '')
      console.warn(
        '[startup] TRUST_PROXY_HOPS tidak diisi — X-Forwarded-For diabaikan (fail-closed). ' +
          'Set 1 bila di belakang satu reverse proxy.',
      )
  }

  if (process.env.NEXT_RUNTIME === 'nodejs' && !isBuild) {
    const { registerJobs } = await import('./src/jobs')
    registerJobs()
  }
}
