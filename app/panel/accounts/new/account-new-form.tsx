'use client'

import { useActionState, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Gamepad2,
  Images,
  KeyRound,
  ListChecks,
  LoaderCircle,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AttributeFields } from '@/components/panel/attribute-fields'
import { PhotoUploader } from '@/components/panel/photo-uploader'
import { CredentialFields } from '@/components/panel/credential-fields'
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_COUNT,
  isPhotoMime,
} from '@/src/lib/photo'
import {
  EMPTY_CREDENTIALS,
  formatCredentials,
  isCredentialComplete,
  type CredentialValues,
} from '@/src/lib/credential'
import {
  buildAttributeValues,
  invalidNumericFields,
  parseAttributeSchema,
} from '@/src/lib/attribute'
import {
  createAccountAction,
  relistAccountAction,
  setAccountCredentialsAction,
  uploadAccountPhotoAction,
} from '@/src/controllers/account.controller'

type Game = { id: string; name: string; code: string; attributeSchema: unknown }

function formatPrice(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function AccountNewForm({
  games,
  initialGameId,
}: {
  games: Game[]
  initialGameId?: string
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    gameId: games.some((game) => game.id === initialGameId) ? initialGameId! : (games[0]?.id ?? ''),
    title: '',
    description: '',
    price: '',
  })
  const [attributes, setAtribut] = useState<Record<string, string>>({})
  const [credentials, setKredensial] = useState<CredentialValues>(EMPTY_CREDENTIALS)
  const [photo, setFoto] = useState<File[]>([])
  const [progress, setProgress] = useState<string | null>(null)
  const [showValidation, setShowValidation] = useState(false)
  const [publishAttempted, setPublishAttempted] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [errorDismissed, setErrorDismissed] = useState(false)

  const game = games.find((item) => item.id === form.gameId)
  const fields = useMemo(() => parseAttributeSchema(game?.attributeSchema), [game?.attributeSchema])
  const requiredFields = fields.filter((field) => field.wajib)
  const filledRequired = requiredFields.filter((field) => attributes[field.kunci]?.trim()).length
  const progressSpesifikasi =
    requiredFields.length === 0 ? 100 : (filledRequired / requiredFields.length) * 100
  const kredensialSiap = isCredentialComplete(credentials)
  const kredensialSebagian =
    Boolean(credentials.email.trim() || credentials.password.trim()) && !kredensialSiap


  function validasi(publish: boolean): string[] {
    const missing = requiredFields.filter((field) => !attributes[field.kunci]?.trim())
    const nonNumeric = invalidNumericFields(fields, attributes)
    const fotoTidakValid = photo.find(
      (file) => !isPhotoMime(file.type) || file.size > MAX_PHOTO_BYTES,
    )
    const problems: string[] = []

    if (!form.title.trim()) problems.push('Account title is required.')
    if (!form.price || form.price === '0') problems.push('Account price must be greater than 0.')
    if (missing.length > 0) {
      problems.push(`Complete the required specs: ${missing.map((field) => field.label).join(', ')}.`)
    }
    if (nonNumeric.length > 0) {
      problems.push(`Enter valid numbers for: ${nonNumeric.map((field) => field.label).join(', ')}.`)
    }
    if (kredensialSebagian) {
      problems.push('Complete the email/username and password, or leave both empty.')
    }
    if (publish && !kredensialSiap) {
      problems.push('Credentials are required to publish the account immediately.')
    }
    if (photo.length > MAX_PHOTO_COUNT) {
      problems.push(`Maximum ${MAX_PHOTO_COUNT} photos.`)
    }
    if (fotoTidakValid) {
      problems.push(`Photo ${fotoTidakValid.name} is invalid or exceeds 5 MB.`)
    }
    if (publish && photo.length === 0) {
      problems.push('Add at least one photo to publish the account immediately.')
    }
    return problems
  }

  const [state, formAction, pending] = useActionState<{ error: string | null }, FormData>(
    async (_prevState, formData) => {
      if (createdId) return { error: null }

      const publish = formData.get('mode') === 'publish'
      setPublishAttempted(publish)
      setProgress(null)

      const problems = validasi(publish)
      if (problems.length > 0) {
        setShowValidation(true)
        return { error: problems.join(' ') }
      }

      setProgress('Creating account...')
      const created = await createAccountAction({
        gameId: form.gameId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        price: form.price,
        attributes: buildAttributeValues(fields, attributes),
      })
      if (!created.ok) {
        setProgress(null)
        return { error: created.message }
      }
      setCreatedId(created.id)

      for (const [index, file] of photo.entries()) {
        setProgress(`Uploading photo ${index + 1} of ${photo.length}...`)
        const data = new FormData()
        data.set('akunId', created.id)
        data.set('file', file)
        const uploaded = await uploadAccountPhotoAction(data)
        if (!uploaded.ok) {
          setProgress(null)
          return { error: `Account saved as a draft, but photos failed to upload: ${uploaded.message}` }
        }
      }

      if (kredensialSiap) {
        setProgress('Saving credentials...')
        const saved = await setAccountCredentialsAction({
          id: created.id,
          credentials: formatCredentials(credentials),
        })
        if (!saved.ok) {
          setProgress(null)
          return { error: `Account saved as a draft, but credentials failed to save: ${saved.message}` }
        }
      }

      if (publish) {
        setProgress('Publishing account...')
        const relisted = await relistAccountAction({ id: created.id })
        if (!relisted.ok) {
          setProgress(null)
          return { error: `Account saved as a draft, but publishing failed: ${relisted.message}` }
        }
      }

      router.push(`/panel/accounts/${created.id}`)
      return { error: null }
    },
    { error: null },
  )
  const error = state.error && !errorDismissed ? state.error : null

  if (games.length === 0) {
    return (
      <div className="max-w-2xl rounded-2xl border border-dashed p-8">
        <p className="font-display text-lg font-semibold">No active games yet</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Activate at least one game in Game Master before adding accounts.
        </p>
        <Button className="mt-4" render={<Link href="/panel/games" />}>
          Open Game Master
        </Button>
      </div>
    )
  }

  return (
    <form
      noValidate
      action={formAction}
      onSubmit={() => setErrorDismissed(false)}
      className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div className="space-y-5">
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/20 text-brand-deep">
              <Gamepad2 className="size-4" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Sale info</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Choose a game, set the price, and write a clear title.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="space-y-1.5">
                <Label htmlFor="gameId">Game</Label>
                <Select
                  value={form.gameId}
                  onValueChange={(value) => {
                    if (!value) return
                    setForm((current) => ({ ...current, gameId: value }))
                    setAtribut({})
                    setShowValidation(false)
                    setErrorDismissed(true)
                  }}
                >
                  <SelectTrigger id="gameId" className="h-10 w-full">
                    <SelectValue>{game?.name ?? 'Select game'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {games.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {fields.length > 0
                    ? `${fields.length} specs, ${requiredFields.length} required.`
                    : 'This game has no additional specs.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="harga">Price</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    id="harga"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="850.000"
                    value={formatPrice(form.price)}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, '').slice(0, 14)
                      setForm((current) => ({ ...current, price: digits }))
                    }}
                    aria-invalid={showValidation && !form.price}
                    className="h-10 pl-9 text-base font-semibold tabular-nums"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Automatic Rupiah formatting.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="judul">Title</Label>
              <Input
                id="judul"
                maxLength={200}
                placeholder={`Example: ${game?.name ?? 'Game'} account, Mythic rank`}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                aria-invalid={showValidation && !form.title.trim()}
                className="h-10"
              />
              <p className="text-[11px] text-muted-foreground">
                Include rank, level, or key highlights so buyers understand quickly.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="deskripsi">
                  Description <span className="font-normal text-muted-foreground">optional</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  {form.description.length.toLocaleString('id-ID')}/5.000
                </span>
              </div>
              <textarea
                id="deskripsi"
                maxLength={5000}
                placeholder="Add important notes about this account."
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="field min-h-24 py-2"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/20 text-brand-deep">
              <ListChecks className="size-4" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Account specs</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Fields follow the schema for {game?.name ?? 'the selected game'}.
              </p>
            </div>
          </div>

          <AttributeFields
            fields={fields}
            values={attributes}
            onChange={(kunci, value) =>
              setAtribut((current) => ({ ...current, [kunci]: value }))
            }
            showValidation={showValidation}
            emptyText="No additional specs. You can create the account right away."
          />
        </section>

        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/20 text-brand-deep">
              <KeyRound className="size-4" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Account credentials</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Stored encrypted and cannot be read again. Leave empty if you are only saving a draft.
              </p>
            </div>
          </div>
          <CredentialFields
            values={credentials}
            onChange={(kunci, value) => setKredensial((current) => ({ ...current, [kunci]: value }))}
            showValidation={showValidation && publishAttempted}
          />
        </section>

        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/20 text-brand-deep">
              <Images className="size-4" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Account photos</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add screenshots of rank, inventory, or account proof. At least one photo is required to publish immediately.
              </p>
            </div>
          </div>
          <PhotoUploader files={photo} onChange={setFoto} disabled={pending || Boolean(createdId)} />
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24">
        <section className="rounded-2xl bg-brand-ink p-5 text-white">
          <p className="text-xs font-semibold text-white/60">Summary</p>
          <p className="mt-3 text-xs text-white/45">Account title</p>
          <p className="mt-0.5 font-display text-lg font-semibold leading-snug">
            {form.title.trim() || 'Not filled in'}
          </p>
          <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
            <div>
              <p className="text-xs text-white/45">Price</p>
              <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">
                {form.price ? `Rp${formatPrice(form.price)}` : '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/45">Game</p>
              <p className="mt-0.5 text-sm font-semibold">{game?.name ?? '—'}</p>
              <p className="font-mono text-[10px] tracking-[.14em] text-brand">{game?.code ?? ''}</p>
            </div>
          </div>
          {requiredFields.length > 0 ? (
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between text-xs text-white/55">
                <span>Required specs</span>
                <span className="tabular-nums">
                  {filledRequired}/{requiredFields.length}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-300"
                  style={{ width: `${progressSpesifikasi}%` }}
                />
              </div>
            </div>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4 text-xs">
            <div>
              <p className="text-white/45">Credentials</p>
              <p className="mt-0.5 font-semibold">{kredensialSiap ? 'Ready' : 'Not set'}</p>
            </div>
            <div className="text-right">
              <p className="text-white/45">Photos</p>
              <p className="mt-0.5 font-semibold tabular-nums">
                {photo.length}/{MAX_PHOTO_COUNT}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <p className="text-xs font-semibold">Publishing</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">Save & publish</strong> requires credentials and at least one photo.
            Choose <strong className="font-semibold text-foreground">Save draft</strong> to complete it later.
          </p>

          {error ? (
            <p
              role="alert"
              aria-live="polite"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </p>
          ) : null}

          {createdId ? (
            <Button className="h-10 w-full" render={<Link href={`/panel/accounts/${createdId}`} />}>
              Open draft account
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                type="submit"
                name="mode"
                value="publish"
                disabled={pending}
                className="h-10 w-full bg-brand text-brand-ink hover:bg-brand/90"
              >
                {pending && progress ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
                {pending && progress ? progress : 'Save & publish'}
              </Button>
              <Button
                type="submit"
                name="mode"
                value="draft"
                variant="outline"
                disabled={pending}
                className="h-10 w-full"
              >
                {pending && progress ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                {pending && progress ? 'Saving...' : 'Save draft'}
              </Button>
            </div>
          )}
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            You can always complete the account from its detail page.
          </p>
        </section>
      </aside>
    </form>
  )
}
