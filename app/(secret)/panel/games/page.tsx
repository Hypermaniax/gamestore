import { catalogService } from '@/src/services/catalog.service'
import { PanelPageHeader } from '@/components/panel/panel-ui'
import { TablePagination } from '@/components/panel/table-pagination'
import { parsePageSize } from '@/src/lib/pagination'
import { GameAdmin } from './game-admin'

export const instant = false

export default async function PanelGamesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? '1') || 1)
  const size = parsePageSize(params.size)
  const [gameTypes, games] = await Promise.all([catalogService.listGameTypesAdmin(), catalogService.listGamesAdmin()])
  if (!gameTypes.ok) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{gameTypes.message}</div>
  if (!games.ok) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{games.message}</div>

  const total = games.data.length
  const totalPages = Math.max(1, Math.ceil(total / size))
  const currentPage = Math.min(page, totalPages)
  const pagedGames = games.data.slice((currentPage - 1) * size, currentPage * size)
  const activeGames = games.data.filter((game) => game.active).length

  return (
    <div>
      <PanelPageHeader title="Game Master" description="Manage game types, games, and account attribute schemas." />
      <GameAdmin
        gameTypes={gameTypes.data}
        games={pagedGames}
        totalGames={total}
        activeGames={activeGames}
        pagination={
          <TablePagination
            page={currentPage}
            size={size}
            total={total}
            basePath="/panel/games"
            label="games"
            embedded
          />
        }
      />
    </div>
  )
}
