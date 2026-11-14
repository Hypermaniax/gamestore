'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  AttributeSchemaFields,
  draftToSchema,
  schemaToDraft,
  type SchemaFieldDraft,
} from '@/components/panel/attribute-schema-fields'
import {
  createGameAction,
  createGameTypeAction,
  updateGameAction,
  updateGameTypeAction,
} from '@/src/controllers/catalog.controller'

type GameType = { id: string; code: string; name: string; order: number; active: boolean }
type Game = {
  id: string
  code: string
  name: string
  type: { id: string; name: string }
  iconUrl: string | null
  attributeSchema: unknown
  active: boolean
  jumlahAkun: number
}

type GameForm = {
  code: string
  name: string
  typeId: string
  iconUrl: string
  skema: SchemaFieldDraft[]
}

type GameTypeForm = {
  code: string
  name: string
  order: string
  active: boolean
}

type GameEditor = { mode: 'create' | 'edit'; id?: string; form: GameForm }
type GameTypeEditor = { mode: 'create' | 'edit'; id?: string; form: GameTypeForm }
type NewGameType = { code: string; name: string }

function emptyGame(gameTypes: GameType[]): GameForm {
  return {
    code: '',
    name: '',
    typeId: gameTypes.find((item) => item.active)?.id ?? gameTypes[0]?.id ?? '',
    iconUrl: '',
    skema: [],
  }
}

function emptyGameType(): GameTypeForm {
  return { code: '', name: '', order: '0', active: true }
}

function emptyNewGameType(): NewGameType {
  return { code: '', name: '' }
}

export function GameAdmin({
  gameTypes,
  games,
  totalGames,
  activeGames,
  pagination,
}: {
  gameTypes: GameType[]
  games: Game[]
  totalGames: number
  activeGames: number
  pagination?: ReactNode
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [gameEditor, setGameEditor] = useState<GameEditor | null>(null)
  const [gameTypeEditor, setGameTypeEditor] = useState<GameTypeEditor | null>(null)
  const [createdGameTypes, setCreatedGameTypes] = useState<GameType[]>([])
  const [newTypeOpen, setNewTypeOpen] = useState(false)
  const [newType, setNewType] = useState<NewGameType>(emptyNewGameType)
  const [newTypeError, setNewTypeError] = useState<string | null>(null)

  const availableGameTypes = [
    ...gameTypes,
    ...createdGameTypes.filter((created) => !gameTypes.some((item) => item.id === created.id)),
  ]
  const activeGameTypes = availableGameTypes.filter((item) => item.active).length

  function resetNewType() {
    setNewTypeOpen(false)
    setNewType(emptyNewGameType())
    setNewTypeError(null)
  }

  function run(task: () => Promise<{ ok: boolean; message?: string }>, message: string) {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await task()
      if (!result.ok) {
        setError(result.message ?? 'Action failed.')
        return
      }
      setNotice(message)
      setGameEditor(null)
      setGameTypeEditor(null)
      resetNewType()
      router.refresh()
    })
  }

  function openCreateGame() {
    setError(null)
    setNotice(null)
    resetNewType()
    setGameEditor({ mode: 'create', form: emptyGame(availableGameTypes) })
  }

  function openEditGame(game: Game) {
    setError(null)
    setNotice(null)
    resetNewType()
    setGameEditor({
      mode: 'edit',
      id: game.id,
      form: {
        code: game.code,
        name: game.name,
        typeId: game.type.id,
        iconUrl: game.iconUrl ?? '',
        skema: schemaToDraft(game.attributeSchema),
      },
    })
  }

  function openCreateGameType() {
    setError(null)
    setNotice(null)
    setGameTypeEditor({ mode: 'create', form: emptyGameType() })
  }

  function createInlineGameType() {
    const code = newType.code.trim().toLowerCase()
    const name = newType.name.trim()
    const order = Math.min(9999, availableGameTypes.reduce((max, item) => Math.max(max, item.order), 0) + 1)
    setNewTypeError(null)
    startTransition(async () => {
      const result = await createGameTypeAction({ code, name, order })
      if (!result.ok) {
        setNewTypeError(result.message ?? 'Could not create game type.')
        return
      }
      const created: GameType = { id: result.id, code, name, order, active: true }
      setCreatedGameTypes((items) => [...items, created])
      setGameEditor((value) => value ? { ...value, form: { ...value.form, typeId: created.id } } : value)
      setNewType(emptyNewGameType())
      setNewTypeOpen(false)
      router.refresh()
    })
  }

  function openEditGameType(item: GameType) {
    setError(null)
    setNotice(null)
    setGameTypeEditor({
      mode: 'edit',
      id: item.id,
      form: {
        code: item.code,
        name: item.name,
        order: String(item.order),
        active: item.active,
      },
    })
  }

  function saveGame(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!gameEditor) return
    const skema = draftToSchema(gameEditor.form.skema)
    if (!skema.ok) {
      setError(skema.message)
      return
    }

    const { form } = gameEditor
    const input = {
      code: form.code,
      name: form.name,
      typeId: form.typeId,
      iconUrl: form.iconUrl || undefined,
      attributeSchema: skema.data,
    }

    run(
      () =>
        gameEditor.mode === 'create'
          ? createGameAction(input)
          : updateGameAction({
              id: gameEditor.id!,
              ...input,
              iconUrl: form.iconUrl || null,
            }),
      gameEditor.mode === 'create' ? 'Game created.' : 'Game updated.',
    )
  }

  function saveGameType(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!gameTypeEditor) return
    const { form } = gameTypeEditor

    run(
      () =>
        gameTypeEditor.mode === 'create'
          ? createGameTypeAction({
              code: form.code,
              name: form.name,
              order: Number(form.order),
            })
          : updateGameTypeAction({
              id: gameTypeEditor.id!,
              code: form.code,
              name: form.name,
              order: Number(form.order),
              active: form.active,
            }),
      gameTypeEditor.mode === 'create' ? 'Game type created.' : 'Game type updated.',
    )
  }

  return (
    <div className="space-y-6">
      {error && !gameEditor && !gameTypeEditor ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}
      {notice ? <p className="rounded-lg bg-brand/15 px-3 py-2 text-sm">{notice}</p> : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b px-4 py-4 sm:px-5">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-[-0.03em]">Game list</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {totalGames} games · {activeGames} active · account field schema per game
              </p>
            </div>
            <Button size="sm" className="w-full sm:w-auto" onClick={openCreateGame} disabled={pending}>
              <Plus className="size-4" />
              Add game
            </Button>
          </div>

          {games.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-medium">No games yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add the first game and set up its account form fields.</p>
              <Button className="mt-4" size="sm" onClick={openCreateGame} disabled={pending}>
                <Plus className="size-4" />
                Add game
              </Button>
            </div>
          ) : (
            <>
              <div className="divide-y md:hidden">
                {games.map((game) => (
                  <div key={game.id} className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/15 font-display text-[11px] font-bold uppercase text-brand-deep">
                        {game.code.slice(0, 2)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{game.name}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">{game.code}</p>
                          </div>
                          <Badge variant={game.active ? 'secondary' : 'outline'}>
                            {game.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {game.type.name} · {game.jumlahAkun} accounts
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" disabled={pending} onClick={() => openEditGame(game)}>
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={game.active ? 'flex-1 text-muted-foreground' : 'flex-1 text-brand-deep'}
                        disabled={pending}
                        onClick={() => run(() => updateGameAction({ id: game.id, active: !game.active }), game.active ? 'Game deactivated.' : 'Game activated.')}
                      >
                        {game.active ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
                        {game.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="panel-scroll hidden overflow-x-auto md:block">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b text-[11px] uppercase tracking-[.12em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Game</th>
                    <th className="px-3 py-2.5 font-medium">Type</th>
                    <th className="px-3 py-2.5 text-right font-medium">Accounts</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {games.map((game) => (
                    <tr key={game.id} className="transition-colors hover:bg-muted/35">
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex items-center gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/15 font-display text-[11px] font-bold uppercase text-brand-deep">
                            {game.code.slice(0, 2)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{game.name}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">{game.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{game.type.name}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{game.jumlahAkun}</td>
                      <td className="px-3 py-3">
                        <Badge variant={game.active ? 'secondary' : 'outline'}>
                          {game.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="outline" size="sm" disabled={pending} onClick={() => openEditGame(game)}>
                            <Pencil className="size-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className={game.active ? 'text-muted-foreground' : 'text-brand-deep'}
                            disabled={pending}
                            onClick={() => run(() => updateGameAction({ id: game.id, active: !game.active }), game.active ? 'Game deactivated.' : 'Game activated.')}
                            aria-label={game.active ? `Deactivate ${game.name}` : `Activate ${game.name}`}
                            title={game.active ? 'Deactivate' : 'Activate'}
                          >
                            {game.active ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
          {pagination}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <section className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex items-start justify-between gap-3 border-b px-4 py-4">
              <div>
                <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Game types</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {availableGameTypes.length} categories · {activeGameTypes} active
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={openCreateGameType} disabled={pending}>
                <Plus className="size-4" />
                Add
              </Button>
            </div>
            {availableGameTypes.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No game types yet.</p>
            ) : (
              <div className="divide-y">
                {availableGameTypes.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{item.code}</p>
                    </div>
                    <Badge variant={item.active ? 'secondary' : 'outline'}>
                      {item.active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button variant="ghost" size="icon-sm" disabled={pending} onClick={() => openEditGameType(item)} aria-label={`Edit ${item.name}`}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={item.active ? 'text-muted-foreground' : 'text-brand-deep'}
                      disabled={pending}
                      onClick={() => run(() => updateGameTypeAction({ id: item.id, active: !item.active }), item.active ? 'Game type deactivated.' : 'Game type activated.')}
                      aria-label={item.active ? `Deactivate ${item.name}` : `Activate ${item.name}`}
                      title={item.active ? 'Deactivate' : 'Activate'}
                    >
                      {item.active ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      <Dialog
        open={Boolean(gameEditor)}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setGameEditor(null)
            setError(null)
            resetNewType()
          }
        }}
      >
        <DialogContent className="panel-scroll max-h-[92dvh] w-[min(72rem,calc(100vw-2rem))] max-w-none overflow-y-auto sm:max-w-none">
          <form className="space-y-5" onSubmit={saveGame}>
            <DialogHeader>
              <DialogTitle>{gameEditor?.mode === 'create' ? 'Add game' : 'Edit game'}</DialogTitle>
              <DialogDescription>
                Set the game identity and the fields that appear in the account form.
              </DialogDescription>
            </DialogHeader>

            {gameEditor ? (
              <>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <Input
                    aria-label="Game code"
                    placeholder="Code, e.g. ML"
                    value={gameEditor.form.code}
                    onChange={(event) => setGameEditor((value) => value ? { ...value, form: { ...value.form, code: event.target.value } } : value)}
                    required
                  />
                  <Input
                    aria-label="Game name"
                    placeholder="Game name"
                    value={gameEditor.form.name}
                    onChange={(event) => setGameEditor((value) => value ? { ...value, form: { ...value.form, name: event.target.value } } : value)}
                    required
                  />
                  <div className="flex gap-2">
                    <select
                      aria-label="Game type"
                      className="field h-10 min-w-0 flex-1 px-3"
                      value={gameEditor.form.typeId}
                      onChange={(event) => setGameEditor((value) => value ? { ...value, form: { ...value.form, typeId: event.target.value } } : value)}
                    >
                      {availableGameTypes.filter((item) => item.active || item.id === gameEditor.form.typeId).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 shrink-0"
                      aria-expanded={newTypeOpen}
                      disabled={pending}
                      onClick={() => {
                        if (newTypeOpen) {
                          resetNewType()
                          return
                        }
                        setNewTypeError(null)
                        setNewTypeOpen(true)
                      }}
                    >
                      <Plus className="size-4" />
                      New type
                    </Button>
                  </div>
                  <Input
                    aria-label="Game icon URL"
                    placeholder="Icon URL (optional)"
                    value={gameEditor.form.iconUrl}
                    onChange={(event) => setGameEditor((value) => value ? { ...value, form: { ...value.form, iconUrl: event.target.value } } : value)}
                  />
                </div>

                {newTypeOpen ? (
                  <div className="space-y-3 rounded-xl border bg-muted/25 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">New game type</p>
                        <p className="text-xs text-muted-foreground">It will be selected automatically for this game.</p>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]">
                      <Input
                        aria-label="New game type code"
                        placeholder="Code, e.g. MOBA"
                        value={newType.code}
                        onChange={(event) => setNewType((value) => ({ ...value, code: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            if (!pending && newType.code.trim() && newType.name.trim()) createInlineGameType()
                          }
                        }}
                        disabled={pending}
                        required
                      />
                      <Input
                        aria-label="New game type name"
                        placeholder="Type name"
                        value={newType.name}
                        onChange={(event) => setNewType((value) => ({ ...value, name: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            if (!pending && newType.code.trim() && newType.name.trim()) createInlineGameType()
                          }
                        }}
                        disabled={pending}
                        required
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-10 flex-1 sm:flex-none"
                          disabled={pending || !newType.code.trim() || !newType.name.trim()}
                          onClick={createInlineGameType}
                        >
                          Create type
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="h-10" disabled={pending} onClick={resetNewType}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                    {newTypeError ? (
                      <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{newTypeError}</p>
                    ) : null}
                  </div>
                ) : null}

                <AttributeSchemaFields
                  fields={gameEditor.form.skema}
                  onChange={(skema) => setGameEditor((value) => value ? { ...value, form: { ...value.form, skema } } : value)}
                  disabled={pending}
                />

                {error ? (
                  <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                  <Button type="button" variant="ghost" disabled={pending} onClick={() => { setGameEditor(null); setError(null); resetNewType() }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {gameEditor.mode === 'create' ? 'Add game' : 'Save changes'}
                  </Button>
                </div>
              </>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(gameTypeEditor)}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setGameTypeEditor(null)
            setError(null)
          }
        }}
      >
        <DialogContent className="w-[min(32rem,calc(100vw-2rem))] max-w-none sm:max-w-none">
          <form className="space-y-4" onSubmit={saveGameType}>
            <DialogHeader>
              <DialogTitle>{gameTypeEditor?.mode === 'create' ? 'Add game type' : 'Edit game type'}</DialogTitle>
              <DialogDescription>
                Game types are used to group the catalog.
              </DialogDescription>
            </DialogHeader>

            {gameTypeEditor ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    aria-label="Game type code"
                    placeholder="Code, e.g. MOBA"
                    value={gameTypeEditor.form.code}
                    onChange={(event) => setGameTypeEditor((value) => value ? { ...value, form: { ...value.form, code: event.target.value } } : value)}
                    required
                  />
                  <Input
                    aria-label="Game type name"
                    placeholder="Type name"
                    value={gameTypeEditor.form.name}
                    onChange={(event) => setGameTypeEditor((value) => value ? { ...value, form: { ...value.form, name: event.target.value } } : value)}
                    required
                  />
                  <Input
                    aria-label="Game type order"
                    inputMode="numeric"
                    placeholder="Order"
                    value={gameTypeEditor.form.order}
                    onChange={(event) => setGameTypeEditor((value) => value ? { ...value, form: { ...value.form, order: event.target.value } } : value)}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={gameTypeEditor.form.active}
                      onChange={(event) => setGameTypeEditor((value) => value ? { ...value, form: { ...value.form, active: event.target.checked } } : value)}
                    />
                    Active
                  </label>
                </div>

                {error ? (
                  <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
                ) : null}

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button type="button" variant="ghost" disabled={pending} onClick={() => { setGameTypeEditor(null); setError(null) }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {gameTypeEditor.mode === 'create' ? 'Add type' : 'Save changes'}
                  </Button>
                </div>
              </>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
