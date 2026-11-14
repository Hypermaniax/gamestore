import type { MetadataRoute } from 'next'
import { storefrontService } from '@/src/services/storefront.service'

const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000'

const STATIC_ROUTES = [
  { path: '', changeFrequency: 'daily' as const, priority: 1 },
  { path: '/login', changeFrequency: 'monthly' as const, priority: 0.4 },
  { path: '/register', changeFrequency: 'monthly' as const, priority: 0.4 },
  { path: '/help', changeFrequency: 'monthly' as const, priority: 0.7 },
  { path: '/pages/terms-and-conditions', changeFrequency: 'yearly' as const, priority: 0.5 },
  { path: '/pages/privacy', changeFrequency: 'yearly' as const, priority: 0.5 },
  { path: '/pages/warranty', changeFrequency: 'yearly' as const, priority: 0.5 },
  { path: '/pages/faq', changeFrequency: 'monthly' as const, priority: 0.6 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const accounts = await storefrontService.listSitemapAccounts()

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${baseUrl}${route.path}`,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...accounts.map((account) => ({
      url: `${baseUrl}/accounts/${account.slug}`,
      lastModified: account.listedAt ?? undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
