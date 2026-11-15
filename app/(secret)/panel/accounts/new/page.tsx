import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { catalogService } from '@/src/services/catalog.service'
import { PanelPageHeader } from '@/components/panel/panel-ui'
import { Button } from '@/components/ui/button'
import { AccountNewForm } from './account-new-form'

export const instant = false

export default async function PanelAccountNewPage({
  searchParams,
}: {
  searchParams: Promise<{ gameId?: string }>
}) {
  const params = await searchParams
  const games = await catalogService.listGamesAdmin()
  if (!games.ok) {
    return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{games.message}</div>
  }
  return (
    <div>
      <Link href="/panel/accounts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> All accounts</Link>
      <PanelPageHeader
        title="New account"
        description="Fill in details, specs, credentials, and photos on one page. Save as a draft or publish immediately."
        action={<Button variant="outline" render={<Link href="/panel/accounts" />}>Cancel</Button>}
      />
      <AccountNewForm
        games={games.data
          .filter((game) => game.active)
          .map((game) => ({
            id: game.id,
            name: game.name,
            code: game.code,
            attributeSchema: game.attributeSchema,
          }))}
        initialGameId={params.gameId}
      />
    </div>
  )
}
