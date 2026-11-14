import { authService } from './auth.service'
import { rbacService } from './rbac.service'
import { auditService } from './audit.service'
import { getPageCached } from '../lib/cache/content'
import * as pageRepo from '../repositories/page-repo'
import {
  pageCodeInputSchema,
  pageUpdateSchema,
  pageVersionSchema,
  type PageUpdateInput,
  type PageVersionInput,
} from '../validation/halaman'
import { parseInput, type UnionError } from '../validation/parse'
import type { SessionClaims } from '../lib/session'

const CODE = /^[a-z0-9-]{2,50}$/
const fail = (code: string, message: string): UnionError => ({ ok: false, code, message })
const SESSION: UnionError = fail('INVALID_SESSION', 'Your session is no longer valid. Please log in again.')
const FORBIDDEN: UnionError = fail('FORBIDDEN', 'You do not have permission to perform this action.')
const isError = (value: SessionClaims | UnionError): value is UnionError => 'code' in value

async function requirePermission(code: string): Promise<SessionClaims | UnionError> {
  const session = await authService.verifySession()
  if (!session) return SESSION
  if (!(await rbacService.hasPermission(session.userId, code))) return FORBIDDEN
  return session
}

export const pageService = {
  async getPublished(code: string) {
    if (!CODE.test(code)) return fail('PAGE_NOT_FOUND', 'Page not found.')
    const row = await getPageCached(code)
    if (!row || row.version < 1)
      return fail('PAGE_NOT_FOUND', 'Page not found.')

    return {
      ok: true as const,
      data: {
        code,
        title: row.title,
        isi: row.bodyMarkdown,
        version: row.version,
      },
    }
  },

  async listAdmin() {
    const session = await requirePermission('page:read')
    if (isError(session)) return session

    const rows = await pageRepo.listAdmin()
    return {
      ok: true as const,
      data: rows.map((row) => ({
        code: row.code,
        title: row.title,
        version: row.version,
        updatedAt: row.updatedAt.toISOString(),
      })),
    }
  },

  async getDraft(input: { code: string }) {
    const session = await requirePermission('page:read')
    if (isError(session)) return session
    const parsed = parseInput(pageCodeInputSchema, input)
    if (!parsed.ok) return parsed

    const row = await pageRepo.findDraft(parsed.data.code)
    if (!row) return fail('PAGE_NOT_FOUND', 'Page not found.')

    return {
      ok: true as const,
      data: { ...row, updatedAt: row.updatedAt.toISOString() },
    }
  },

  async updateDraft(input: PageUpdateInput) {
    const session = await requirePermission('page:write')
    if (isError(session)) return session
    const parsed = parseInput(pageUpdateSchema, input)
    if (!parsed.ok) return parsed

    const existing = await pageRepo.findDraft(parsed.data.code)
    if (!existing) return fail('PAGE_NOT_FOUND', 'Page not found.')

    const row = await pageRepo.updateDraft(parsed.data.code, {
      title: parsed.data.title,
      bodyMarkdown: parsed.data.bodyMarkdown,
    })
    await auditService.log(session.userId, 'page.update', `page:${row.code}`, {
      version: row.version,
    })
    return {
      ok: true as const,
      data: { ...row, updatedAt: row.updatedAt.toISOString() },
    }
  },

  async publish(input: { code: string }) {
    const session = await requirePermission('page:write')
    if (isError(session)) return session
    const parsed = parseInput(pageCodeInputSchema, input)
    if (!parsed.ok) return parsed

    const published = await pageRepo.publish(parsed.data.code, session.userId)
    if (!published) return fail('PAGE_NOT_FOUND', 'Page not found.')

    await auditService.log(session.userId, 'page.publish', `page:${parsed.data.code}`, {
      version: published.version,
    })
    return {
      ok: true as const,
      data: {
        code: parsed.data.code,
        version: published.version,
        title: published.title,
        publishedAt: published.publishedAt.toISOString(),
        publisher: published.publisher.username,
      },
    }
  },

  async listVersions(input: { code: string }) {
    const session = await requirePermission('page:read')
    if (isError(session)) return session
    const parsed = parseInput(pageCodeInputSchema, input)
    if (!parsed.ok) return parsed

    const rows = await pageRepo.listVersions(parsed.data.code)
    return {
      ok: true as const,
      data: rows.map((row) => ({
        version: row.version,
        title: row.title,
        publishedAt: row.publishedAt.toISOString(),
        publisher: row.publisher.username,
      })),
    }
  },

  async getVersion(input: PageVersionInput) {
    const session = await requirePermission('page:read')
    if (isError(session)) return session
    const parsed = parseInput(pageVersionSchema, input)
    if (!parsed.ok) return parsed

    const row = await pageRepo.findVersion(parsed.data.code, parsed.data.version)
    if (!row) return fail('VERSION_NOT_FOUND', 'Page version not found.')

    return {
      ok: true as const,
      data: {
        ...row,
        publishedAt: row.publishedAt.toISOString(),
        publisher: row.publisher.username,
      },
    }
  },
}
