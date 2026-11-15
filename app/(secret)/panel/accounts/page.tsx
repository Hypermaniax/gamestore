import Image from 'next/image'
import Link from 'next/link'
import { AlertCircle, ArrowUpRight, ImageOff, Plus } from 'lucide-react'
import { accountService } from '@/src/services/account.service'
import { catalogService } from '@/src/services/catalog.service'
import { rupiah, waktu } from '@/src/lib/pesanan'
import { PanelEmpty, PanelPageHeader, PanelStatus } from '@/components/panel/panel-ui'
import { TablePagination } from '@/components/panel/table-pagination'
import { Button } from '@/components/ui/button'
import { AccountFilter } from '@/components/panel/account-filter'
import { DEFAULT_PAGE_SIZE, parsePageSize } from '@/src/lib/pagination'

export const instant = false

const STATUS_VALUES = ['AVAILABLE', 'RESERVED', 'SOLD', 'DELISTED'] as const
type StatusFilter = (typeof STATUS_VALUES)[number]

const STATUS_TABS = [
  { value: '', label: 'All', key: 'total' },
  { value: 'AVAILABLE', label: 'Available', key: 'AVAILABLE' },
  { value: 'RESERVED', label: 'Reserved', key: 'RESERVED' },
  { value: 'SOLD', label: 'Sold', key: 'SOLD' },
  { value: 'DELISTED', label: 'Draft', key: 'DELISTED' },
] as const

const KOSONG = { total: 0, AVAILABLE: 0, RESERVED: 0, SOLD: 0, DELISTED: 0 }

function buildHref(params: { q?: string; status?: string; gameId?: string; size: number; page: number }) {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  if (params.status) query.set('status', params.status)
  if (params.gameId) query.set('gameId', params.gameId)
  if (params.size !== DEFAULT_PAGE_SIZE) query.set('size', String(params.size))
  if (params.page > 1) query.set('page', String(params.page))
  const suffix = query.toString()
  return suffix ? `/panel/accounts?${suffix}` : '/panel/accounts'
}

function Thumbnail({ url, title }: { url?: string; title: string }) {
  return (
    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
      {url ? (
        <Image src={url} alt="" width={112} height={112} className="size-full object-cover" />
      ) : (
        <span role="img" className="grid size-full place-items-center" aria-label={`${title} has no photo`}>
          <ImageOff className="size-5 text-muted-foreground" />
        </span>
      )}
    </div>
  )
}

export default async function PanelAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; gameId?: string; size?: string; page?: string }>
}) {
  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const rawStatus = params.status ?? ''
  const status: StatusFilter | '' = (STATUS_VALUES as readonly string[]).includes(rawStatus)
    ? (rawStatus as StatusFilter)
    : ''
  const rawGameId = params.gameId?.trim() ?? ''
  const gameId = /^\d+$/.test(rawGameId) ? rawGameId : ''
  const size = parsePageSize(params.size)
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1)
  const [result, gamesResult, summaryResult] = await Promise.all([
    accountService.listAdmin({ q, gameId: gameId || undefined, status: status || undefined, page: currentPage, size }),
    catalogService.listGamesAdmin(),
    accountService.summaryAdmin({ q, gameId: gameId || undefined }),
  ])

  if (!result.ok) {
    return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{result.message}</div>
  }
  const { items, total } = result.data
  const summary = summaryResult.ok ? summaryResult.data : { ...KOSONG, total }
  const games = gamesResult.ok ? gamesResult.data : []
  const selectedGame = games.find((game) => game.id === gameId)
  const statusLabel = STATUS_TABS.find((tab) => tab.value === status)?.label ?? 'All'
  const adaFilter = Boolean(q || gameId || status)

  return (
    <div>
      <PanelPageHeader
        title="Accounts"
        description="Monitor stock readiness, status, and account completeness before they go live in the store."
        action={
          <Button render={<Link href={gameId ? `/panel/accounts/new?gameId=${gameId}` : '/panel/accounts/new'} />}>
            <Plus className="size-4" />
            New account
          </Button>
        }
      />

      <AccountFilter
        initialQuery={q}
        initialGameId={gameId}
        games={games.map(({ id, name, active }) => ({ id, name, active }))}
      />

      <nav aria-label="Account status filter" className="mb-5 flex flex-wrap gap-1.5">
        {STATUS_TABS.map((tab) => {
          const active = status === tab.value
          return (
            <Link
              key={tab.key}
              href={buildHref({ q, status: tab.value, gameId, size, page: 1 })}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? 'border-brand bg-brand text-brand-ink'
                  : 'bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground'
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                  active ? 'bg-brand-ink/10 text-brand-ink' : 'bg-muted text-muted-foreground'
                }`}
              >
                {summary[tab.key].toLocaleString('id-ID')}
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{total.toLocaleString('id-ID')} accounts</span>
          {status ? ` · status ${statusLabel}` : ''}
          {selectedGame ? ` · ${selectedGame.name}` : ''}
        </p>
        {adaFilter ? (
          <Link href="/panel/accounts" className="text-xs text-muted-foreground transition hover:text-foreground">
            Reset filters
          </Link>
        ) : null}
      </div>

      {items.length === 0 ? (
        <PanelEmpty
          title={adaFilter ? 'No matching accounts' : 'No accounts yet'}
          description={
            adaFilter
              ? 'Change the search, game, or status to see other accounts.'
              : 'Create the first account to start stocking the store.'
          }
          action={
            adaFilter ? (
              <Button variant="outline" render={<Link href="/panel/accounts" />}>
                Reset filters
              </Button>
            ) : (
              <Button render={<Link href="/panel/accounts/new" />}>
                <Plus className="size-4" />
                Create account
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border bg-card xl:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-[.1em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Account</th>
                    <th className="px-4 py-3 font-medium">Game</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((row) => (
                    <tr key={row.id} className="transition hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Thumbnail url={row.photos[0]?.url} title={row.title} />
                          <div className="min-w-0">
                            <Link
                              href={`/panel/accounts/${row.id}`}
                              className="block max-w-[34ch] truncate font-medium transition hover:text-brand-deep"
                            >
                              {row.title}
                            </Link>
                            <p className="mt-0.5 max-w-[34ch] truncate font-mono text-[11px] text-muted-foreground">
                              {row.slug}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{row.photos.length} photos</span>
                              <span aria-hidden>·</span>
                              {row.kredensialTerisi ? (
                                <span>Credentials ready</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-destructive">
                                  <AlertCircle className="size-3" />
                                  Credentials missing
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p>{row.game.name}</p>
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">
                          {row.game.code}
                        </p>
                      </td>
                      <td className="px-4 py-3"><PanelStatus status={row.status} /></td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{rupiah(row.price)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{waktu(row.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          render={<Link href={`/panel/accounts/${row.id}`} aria-label={`Manage ${row.title}`} />}
                        >
                          Manage
                          <ArrowUpRight className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-3 xl:hidden">
            {items.map((row) => (
              <Link
                key={row.id}
                href={`/panel/accounts/${row.id}`}
                className="group flex gap-3 rounded-2xl border bg-card p-3 transition hover:border-foreground/20 hover:bg-muted/20"
              >
                <Thumbnail url={row.photos[0]?.url} title={row.title} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 font-medium leading-snug transition group-hover:text-brand-deep">
                      {row.title}
                    </p>
                    <PanelStatus status={row.status} />
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {row.game.name} · {row.photos.length} photos
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <p className="font-display text-base font-semibold tabular-nums">{rupiah(row.price)}</p>
                    <span className={`text-[11px] ${row.kredensialTerisi ? 'text-muted-foreground' : 'text-destructive'}`}>
                      {row.kredensialTerisi ? 'Credentials ready' : 'Credentials missing'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>{waktu(row.updatedAt)}</span>
                    <span className="inline-flex items-center gap-1 transition group-hover:text-foreground">
                      Manage <ArrowUpRight className="size-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
      <TablePagination
        page={currentPage}
        size={size}
        total={total}
        basePath="/panel/accounts"
        query={{ q, status, gameId }}
        label="accounts"
      />
    </div>
  )
}
