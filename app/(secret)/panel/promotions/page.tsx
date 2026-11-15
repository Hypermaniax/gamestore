import { catalogService } from '@/src/services/catalog.service'
import { promotionService } from '@/src/services/promotion.service'
import { PanelPageHeader } from '@/components/panel/panel-ui'
import { TablePagination } from '@/components/panel/table-pagination'
import { PromotionAdmin } from './promotion-admin'
import { parsePageSize } from '@/src/lib/pagination'
import { realClock } from '@/src/lib/clock'

export const instant = false

export default async function PanelPromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; active?: string; page?: string; size?: string }>
}) {
  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const active =
    params.active === 'true' ? true : params.active === 'false' ? false : undefined
  const page = Math.max(1, Number(params.page ?? '1') || 1)
  const size = parsePageSize(params.size)
  const [result, gamesResult] = await Promise.all([
    promotionService.listAdmin({ q, active, page, size }),
    catalogService.listGamesAdmin(),
  ])
  if (!result.ok) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{result.message}</div>

  const games = gamesResult.ok
    ? gamesResult.data.map(({ id, name, active: gameActive }) => ({
        id,
        name,
        active: gameActive,
      }))
    : []

  return (
    <div>
      <PanelPageHeader
        title="Promotions"
        description="Automatic discounts that apply at checkout, scoped to an account, a game, or the whole catalog."
      />
      <PromotionAdmin
        promotions={result.data.items}
        games={games}
        total={result.data.total}
        initialQuery={q}
        initialActive={active === undefined ? '' : String(active)}
        initialSize={size}
        now={realClock.now().getTime()}
      />
      <TablePagination
        page={page}
        size={size}
        total={result.data.total}
        basePath="/panel/promotions"
        query={{ q, active: active === undefined ? undefined : String(active) }}
        label="promotions"
      />
    </div>
  )
}
