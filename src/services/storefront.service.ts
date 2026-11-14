import {
  getGamesCached,
  getGameTypesCached,
  getKatalogCached,
  getPromoAktifCached,
} from '../lib/cache/catalog'
import {
  ALL_CATEGORY,
  buildStorefrontCatalog,
  type StorefrontCatalog,
  type StorefrontSort,
} from '../lib/storefront-catalog'

type CatalogQuery = {
  q?: string
  type?: string
  sort: StorefrontSort
  page: number
  size: number
}

export const storefrontService = {
  async getCatalogSummary() {
    const katalog = await getKatalogCached({ page: 1, size: 1, sort: 'terbaru' })
    return { total: katalog.ok ? katalog.data.total : 0 }
  },

  async getCatalogPage(query: CatalogQuery): Promise<StorefrontCatalog> {
    const [katalog, games, type, promos] = await Promise.all([
      getKatalogCached(query),
      getGamesCached(),
      getGameTypesCached(),
      getPromoAktifCached(),
    ])

    const jenisRows = type.ok ? type.data : []
    const countResults = await Promise.all(
      jenisRows.map(async (item) => {
        const result = await getKatalogCached({
          q: query.q,
          type: item.code,
          sort: 'terbaru',
          page: 1,
          size: 1,
        })
        return [item.code, result.ok ? result.data.total : 0] as const
      }),
    )
    const counts = new Map(countResults)
    const total = katalog.ok ? katalog.data.total : 0

    return buildStorefrontCatalog({
      accounts: katalog.ok ? katalog.data.items : [],
      games: games.ok ? games.data : [],
      type: jenisRows,
      promos: promos.ok ? promos.data : [],
      total,
      categories: [
        { code: ALL_CATEGORY, name: 'All', count: total },
        ...jenisRows.map((item) => ({
          code: item.code,
          name: item.name,
          count: counts.get(item.code) ?? 0,
        })),
      ],
    })
  },

  async listSitemapAccounts() {
    const size = 100
    const first = await getKatalogCached({ page: 1, size, sort: 'terbaru' })
    if (!first.ok) return []

    const pages = Math.ceil(first.data.total / size)
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
        getKatalogCached({ page: index + 2, size, sort: 'terbaru' }),
      ),
    )

    return [first, ...rest].flatMap((result) =>
      result.ok
        ? result.data.items.map((item) => ({ slug: item.slug, listedAt: item.listedAt }))
        : [],
    )
  },
}
