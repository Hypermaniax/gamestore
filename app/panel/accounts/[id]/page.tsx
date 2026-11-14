import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { accountService } from '@/src/services/account.service'
import { catalogService } from '@/src/services/catalog.service'
import { waktu } from '@/src/lib/pesanan'
import { PanelPageHeader, PanelStatus } from '@/components/panel/panel-ui'
import { Button } from '@/components/ui/button'
import { AccountAdmin } from './account-admin'

export const instant = false

export default async function PanelAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [account, games] = await Promise.all([accountService.getAdmin({ id }), catalogService.listGamesAdmin()])
  if (!account.ok) {
    return (
      <div>
        <PanelPageHeader title="Account not found" description={account.message} />
        <Button variant="outline" render={<Link href="/panel/accounts" />}>Back</Button>
      </div>
    )
  }
  if (!games.ok) {
    return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{games.message}</div>
  }

  return (
    <div>
      <Link href="/panel/accounts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="size-4" /> All accounts
      </Link>
      <PanelPageHeader
        title={account.data.title}
        description={`${account.data.slug} · ${account.data.game.name} · updated ${waktu(account.data.updatedAt)}`}
        action={
          <div className="flex items-center gap-2">
            <PanelStatus status={account.data.status} />
            {account.data.status === 'AVAILABLE' ? (
              <Button variant="outline" render={<Link href={`/accounts/${account.data.slug}`} target="_blank" />}>
                 View public <ExternalLink className="size-3.5" />
              </Button>
            ) : null}
          </div>
        }
      />
      <AccountAdmin
        account={{
          id: account.data.id,
          slug: account.data.slug,
          title: account.data.title,
          description: account.data.description,
          price: account.data.price,
          attributes: account.data.attributes,
          status: account.data.status,
          kredensialTerisi: account.data.kredensialTerisi,
          game: account.data.game,
          photos: account.data.photos,
        }}
        games={games.data
          .filter((game) => game.active || game.id === account.data.game.id)
          .map((game) => ({ id: game.id, name: game.name, attributeSchema: game.attributeSchema }))}
      />
    </div>
  )
}
