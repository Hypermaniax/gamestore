import { prisma } from '../lib/prisma'
import type { Prisma } from '../../generated/client'

type Db = typeof prisma | Prisma.TransactionClient

export function findVersionNumber(code: string, db: Db = prisma) {
  return db.staticPage.findUnique({ where: { code }, select: { version: true } })
}

export function findByCode(code: string) {
  return prisma.staticPageVersion.findFirst({
    where: { page: { code } },
    orderBy: { version: 'desc' },
    select: { title: true, bodyMarkdown: true, version: true },
  })
}

export function listAdmin() {
  return prisma.staticPage.findMany({
    orderBy: { code: 'asc' },
    select: { code: true, title: true, version: true, updatedAt: true },
  })
}

export function findDraft(code: string) {
  return prisma.staticPage.findUnique({
    where: { code },
    select: { code: true, title: true, bodyMarkdown: true, version: true, updatedAt: true },
  })
}

export function updateDraft(code: string, data: { title: string; bodyMarkdown: string }) {
  return prisma.staticPage.update({
    where: { code },
    data,
    select: { code: true, title: true, version: true, updatedAt: true },
  })
}

export function listVersions(code: string) {
  return prisma.staticPageVersion.findMany({
    where: { page: { code } },
    orderBy: { version: 'desc' },
    select: {
      version: true,
      title: true,
      publishedAt: true,
      publisher: { select: { username: true } },
    },
  })
}

export function findVersion(code: string, version: number) {
  return prisma.staticPageVersion.findFirst({
    where: { version, page: { code } },
    select: {
      version: true,
      title: true,
      bodyMarkdown: true,
      publishedAt: true,
      publisher: { select: { username: true } },
    },
  })
}

export function publish(code: string, adminId: bigint) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM static_pages WHERE code = ${code} FOR UPDATE`
    const page = await tx.staticPage.findUnique({
      where: { code },
      select: { id: true, title: true, bodyMarkdown: true, version: true },
    })
    if (!page) return null

    const version = page.version + 1
    const published = await tx.staticPageVersion.create({
      data: {
        pageId: page.id,
        version,
        title: page.title,
        bodyMarkdown: page.bodyMarkdown,
        publishedBy: adminId,
      },
      select: {
        version: true,
        title: true,
        publishedAt: true,
        publisher: { select: { username: true } },
      },
    })
    await tx.staticPage.update({ where: { id: page.id }, data: { version } })
    return published
  })
}
