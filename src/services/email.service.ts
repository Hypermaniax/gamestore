// Email transport — ref: docs/PLAN.md §7.10 "Email transaksional".
// Development without SMTP writes previews to .next/dev/mail (no tokens in logs);
// production uses SMTP configured through MAIL_* (validated at startup).

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import nodemailer, { type Transporter } from 'nodemailer'
import { errorDetail, logger, maskEmail } from '../lib/logger'

let cached: Transporter | null = null

function baseUrl(): string {
  return process.env.APP_BASE_URL ?? 'http://localhost:3000'
}

function smtp(): Transporter | null {
  const host = process.env.MAIL_HOST
  if (!host) return null
  if (cached) return cached
  const port = Number(process.env.MAIL_PORT ?? 1025)
  const user = process.env.MAIL_USER
  cached = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    ...(user ? { auth: { user, pass: process.env.MAIL_PASSWORD ?? '' } } : {}),
  })
  return cached
}

async function savePreview(to: string, subject: string, body: string): Promise<void> {
  const dir = join(process.cwd(), '.next', 'dev', 'mail')
  await mkdir(dir, { recursive: true })
  const file = join(dir, `${Date.now()}-${randomBytes(4).toString('hex')}.txt`)
  await writeFile(file, `To: ${to}\nSubject: ${subject}\n\n${body}\n`, { mode: 0o600 })
  logger.info('email.preview', { file, to: maskEmail(to) })
}

async function deliver(to: string, subject: string, body: string): Promise<void> {
  const transport = smtp()
  if (transport) {
    try {
      await transport.sendMail({
        from: process.env.MAIL_FROM ?? process.env.MAIL_USER ?? 'no-reply@localhost',
        to,
        subject,
        text: body,
      })
      logger.info('email.terkirim', { to: maskEmail(to) })
      return
    } catch (err) {
      logger.error('email.gagal', { to: maskEmail(to), error: errorDetail(err) })
      return
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    try {
      await savePreview(to, subject, body)
    } catch (err) {
      logger.error('email.preview-gagal', { error: errorDetail(err) })
    }
    return
  }

  logger.error('email.terlewat', { to: maskEmail(to), reason: 'MAIL_HOST kosong' })
}

export const emailService = {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    await deliver(to, subject, body)
  },

  verificationLink(token: string): string {
    return `${baseUrl()}/verify-email?token=${token}`
  },

  passwordResetLink(token: string): string {
    return `${baseUrl()}/reset-password?token=${token}`
  },

  /** Old address confirms `lama`, new address confirms `baru` — both are required. */
  emailChangeLink(token: string): string {
    return `${baseUrl()}/change-email/confirm?token=${token}`
  },

  /** Operational alert to the admin inbox — no-op when ADMIN_EMAIL is not configured. */
  async sendAdminAlert(subject: string, body: string): Promise<void> {
    const to = process.env.ADMIN_EMAIL
    if (!to) return
    await deliver(to, `[NEXAPLAY operations] ${subject}`, body)
  },
}
