'use client'

import { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Gamepad2,
  Images,
  KeyRound,
  ListChecks,
  LoaderCircle,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AttributeFields } from '@/components/panel/attribute-fields'
import { PhotoUploader } from '@/components/panel/photo-uploader'
import { CredentialFields } from '@/components/panel/credential-fields'
import { PanelStatus } from '@/components/panel/panel-ui'
import {
  attributeToFormValues,
  buildAttributeValues,
  invalidNumericFields,
  parseAttributeSchema,
} from '@/src/lib/attribute'
import {
  EMPTY_CREDENTIALS,
  formatCredentials,
  isCredentialComplete,
  type CredentialValues,
} from '@/src/lib/credential'
import {
  addAccountPhotoAction,
  deleteAccountAction,
  delistAccountAction,
  restoreAccountAction,
  relistAccountAction,
  removeAccountPhotoAction,
  setAccountCredentialsAction,
  updateAccountAction,
  uploadAccountPhotoAction,
} from '@/src/controllers/account.controller'

type Game = { id: string; name: string; attributeSchema: unknown }

type Account = {
  id: string
  slug: string
  title: string
  description: string | null
  price: string
  attributes: unknown
  status: string
  kredensialTerisi: boolean
  game: { id: string; code: string; name: string }
  photos: { id: string; url: string; order: number }[]
}

const STATUS_HINT: Record<string, string> = {
  AVAILABLE: 'Live in the store. Hide temporarily if stock is on hold.',
  RESERVED: 'Locked by an active transaction. Editing and credentials are disabled.',
  SOLD: 'Already sold. Restore with new credentials to sell it again.',
  DELISTED: 'Not live in the store. Complete credentials and photos before publishing.',
}

function formatPrice(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/20 text-brand-deep">
        <Icon className="size-4" />
      </span>
      <div>
        <h2 className="font-display text-base font-semibold tracking-[-0.02em]">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  )
}

export function AccountAdmin({ account, games }: { account: Account; games: Game[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [form, setForm] = useState({
    gameId: account.game.id,
    title: account.title,
    description: account.description ?? '',
    price: account.price,
  })
  const [attributes, setAtribut] = useState(() => attributeToFormValues(account.attributes))
  const [showValidation, setShowValidation] = useState(false)
  const [credentials, setKredensial] = useState<CredentialValues>(EMPTY_CREDENTIALS)
  const [showKredensialValidation, setShowKredensialValidation] = useState(false)
  const [fotoBaru, setFotoBaru] = useState<File[]>([])
  const [pulihkan, setPulihkan] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [hapusTerbuka, setHapusTerbuka] = useState(false)

  const game = games.find((item) => item.id === form.gameId)
  const fields = useMemo(() => parseAttributeSchema(game?.attributeSchema), [game?.attributeSchema])
  const kredensialTerkunci = account.status === 'RESERVED' || account.status === 'SOLD'
  const kredensialSiap = isCredentialComplete(credentials)
  const siapTampil = account.kredensialTerisi && account.photos.length > 0

  function run(task: () => Promise<{ ok: boolean; message?: string }>, message: string, redirect?: string) {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await task()
      if (!result.ok) {
        setError(result.message ?? 'Action failed.')
        return
      }
      setNotice(message)
      if (redirect) router.push(redirect)
      else router.refresh()
    })
  }

  function saveCredentials() {
    setShowKredensialValidation(true)
    if (!kredensialSiap) return
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await setAccountCredentialsAction({
        id: account.id,
        credentials: formatCredentials(credentials),
      })
      if (!result.ok) {
        setError(result.message)
        return
      }
      setKredensial(EMPTY_CREDENTIALS)
      setShowKredensialValidation(false)
      setNotice('Credentials saved.')
      router.refresh()
    })
  }

  function uploadPhotos() {
    if (fotoBaru.length === 0) return
    setError(null)
    setNotice(null)
    const daftar = fotoBaru
    startTransition(async () => {
      let berhasil = 0
      for (const [index, file] of daftar.entries()) {
        const data = new FormData()
        data.set('akunId', account.id)
        data.set('file', file)
        const result = await uploadAccountPhotoAction(data)
        if (!result.ok) {
          setFotoBaru(daftar.slice(index))
          setError(`${berhasil} photos uploaded. ${result.message}`)
          router.refresh()
          return
        }
        berhasil++
      }
      setFotoBaru([])
      setNotice(`${berhasil} photos uploaded.`)
      router.refresh()
    })
  }

  function addPhotoUrl() {
    if (!fotoUrl.trim()) return
    setError(null)
    setNotice(null)
    const url = fotoUrl.trim()
    startTransition(async () => {
      const result = await addAccountPhotoAction({ accountId: account.id, url })
      if (!result.ok) {
        setError(result.message)
        return
      }
      setFotoUrl('')
      setNotice('Photo added.')
      router.refresh()
    })
  }

  return (
    <>
      {error || notice ? (
        <div
          role={error ? 'alert' : 'status'}
          className={`mb-5 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
            error
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-brand/30 bg-brand/10 text-brand-deep'
          }`}
        >
          {error ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <Check className="mt-0.5 size-4 shrink-0" />}
          <p>{error ?? notice}</p>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <form
            className="order-1 space-y-5 rounded-2xl border bg-card p-5 sm:p-6 xl:col-start-1 xl:row-start-1"
            onSubmit={(event) => {
              event.preventDefault()
              const missing = fields.filter(
                (field) => field.wajib && !attributes[field.kunci]?.trim(),
              )
              const nonNumeric = invalidNumericFields(fields, attributes)
              const problems: string[] = []
              if (!form.title.trim()) problems.push('Account title is required.')
              if (!form.price || form.price === '0') problems.push('Account price must be greater than 0.')
              if (missing.length > 0) {
                problems.push(
                  `Complete the required specs: ${missing.map((field) => field.label).join(', ')}.`,
                )
              }
              if (nonNumeric.length > 0) {
                problems.push(
                  `Enter valid numbers for: ${nonNumeric.map((field) => field.label).join(', ')}.`,
                )
              }
              if (problems.length > 0) {
                setShowValidation(true)
                setError(problems.join(' '))
                return
              }
              run(
                () =>
                  updateAccountAction({
                    id: account.id,
                    gameId: form.gameId,
                    title: form.title,
                    description: form.description || null,
                    price: form.price,
                    attributes: buildAttributeValues(fields, attributes),
                  }),
                'Account changes saved.',
              )
            }}
          >
            <SectionHeading
              icon={Gamepad2}
              title="Account details"
              description="Update the sale info, price, and specs shown in the store."
            />

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
                    setError(null)
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
                    value={formatPrice(form.price)}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, '').slice(0, 14)
                      setForm((current) => ({ ...current, price: digits }))
                    }}
                    aria-invalid={showValidation && (!form.price || form.price === '0')}
                    className="h-10 pl-9 text-base font-semibold tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="judul">Title</Label>
              <Input
                id="judul"
                maxLength={200}
                value={form.title}
                onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
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
                className="field min-h-24 py-2"
                value={form.description}
                onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
              />
            </div>

            <div className="space-y-4 border-t pt-5">
              <SectionHeading
                icon={ListChecks}
                title="Account specs"
                description={`Fields follow the schema for ${game?.name ?? 'the selected game'}.`}
              />
              <AttributeFields
                fields={fields}
                values={attributes}
                onChange={(kunci, value) =>
                  setAtribut((current) => ({ ...current, [kunci]: value }))
                }
                showValidation={showValidation}
                emptyText="This game has no additional specs yet."
              />
            </div>

            <div className="flex items-center justify-end border-t pt-4">
              <Button type="submit" disabled={pending}>
                {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                {pending ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>

          <section className="order-3 space-y-5 rounded-2xl border bg-card p-5 sm:p-6 xl:col-start-1 xl:row-start-2">
            <div className="flex items-start justify-between gap-3">
              <SectionHeading
                icon={Images}
                title="Photo gallery"
                description="Upload screenshots of rank, inventory, or account proof."
              />
              <Badge variant="outline" className="shrink-0 tabular-nums">
                {account.photos.length} photos
              </Badge>
            </div>

            {account.photos.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center">
                <Images className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No photos yet</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  At least one photo is required before the account can be published.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {account.photos.map((photo, index) => (
                  <div key={photo.id} className="group relative overflow-hidden rounded-xl border bg-muted">
                    <Image
                      src={photo.url}
                      alt={`Account photo ${index + 1}`}
                      width={480}
                      height={360}
                      className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      className="absolute right-2 top-2"
                      disabled={pending}
                      onClick={() => run(() => removeAccountPhotoAction({ accountId: account.id, fotoId: photo.id }), 'Photo deleted.')}
                      aria-label={`Delete photo ${index + 1}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 border-t pt-5">
              <div>
                <h3 className="text-sm font-semibold">Upload new photos</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Select files, then click upload.</p>
              </div>
              <PhotoUploader files={fotoBaru} onChange={setFotoBaru} disabled={pending} />
              <Button
                type="button"
                variant="outline"
                disabled={pending || fotoBaru.length === 0}
                onClick={uploadPhotos}
              >
                {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Upload {fotoBaru.length > 0 ? `${fotoBaru.length} photos` : 'photos'}
              </Button>
            </div>

            <div className="space-y-2 border-t pt-5">
              <Label htmlFor="fotoUrl">Or paste a photo URL</Label>
              <div className="flex gap-2">
                <Input
                  id="fotoUrl"
                  placeholder="https://images.unsplash.com/..."
                  value={fotoUrl}
                  onChange={(event) => setFotoUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addPhotoUrl()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || !fotoUrl.trim()}
                  onClick={addPhotoUrl}
                >
                  Add
                </Button>
              </div>
            </div>
          </section>

        <div className="order-2 space-y-5 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:sticky xl:top-24 xl:self-start">
          <section className="space-y-4 rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-[-0.02em]">
                <KeyRound className="size-4 text-brand-deep" />
                Credentials
              </h2>
              <Badge variant={account.kredensialTerisi ? 'secondary' : 'outline'}>
                {account.kredensialTerisi ? 'Set' : 'Not set'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {account.kredensialTerisi
                ? 'Stored credentials are encrypted and cannot be read again.'
                : 'Complete the credentials so the account can be published.'}
            </p>
            {kredensialTerkunci ? (
              <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                Credentials cannot be changed while the status is {account.status}.
              </p>
            ) : null}
            <CredentialFields
              values={credentials}
              onChange={(kunci, value) => setKredensial((current) => ({ ...current, [kunci]: value }))}
              disabled={pending || kredensialTerkunci}
              showValidation={showKredensialValidation}
              existing={account.kredensialTerisi}
            />
            <Button
              variant="outline"
              className="w-full"
              disabled={pending || kredensialTerkunci}
              onClick={saveCredentials}
            >
              {pending ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              Save credentials
            </Button>
          </section>

          <section className="space-y-4 rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Status</h2>
              <PanelStatus status={account.status} />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {STATUS_HINT[account.status] ?? 'Account status is being updated.'}
            </p>

            <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-3 text-xs">
              <div>
                <p className="text-muted-foreground">Credentials</p>
                <p className={`mt-1 font-semibold ${account.kredensialTerisi ? 'text-brand-deep' : 'text-destructive'}`}>
                  {account.kredensialTerisi ? 'Ready' : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Photos</p>
                <p className={`mt-1 font-semibold ${account.photos.length > 0 ? 'text-brand-deep' : 'text-destructive'}`}>
                  {account.photos.length > 0 ? `${account.photos.length} ready` : 'None'}
                </p>
              </div>
            </div>

            {account.status === 'AVAILABLE' ? (
              <Button
                variant="outline"
                className="w-full"
                disabled={pending}
                onClick={() => run(() => delistAccountAction({ id: account.id }), 'Account hidden from the store.')}
              >
                <EyeOff className="size-4" />
                Hide from store
              </Button>
            ) : null}

            {account.status === 'DELISTED' ? (
              <div className="space-y-2">
                <Button
                  className="w-full bg-brand text-brand-ink hover:bg-brand/90"
                  disabled={pending || !siapTampil}
                  onClick={() => run(() => relistAccountAction({ id: account.id }), 'Account published.')}
                >
                  <Eye className="size-4" />
                  Publish to store
                </Button>
                {!siapTampil ? (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Complete credentials and add at least one photo before publishing.
                  </p>
                ) : null}
              </div>
            ) : null}

            {account.status === 'SOLD' ? (
              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="pulihkan">New credentials to restore</Label>
                <Input
                  id="pulihkan"
                  value={pulihkan}
                  onChange={(event) => setPulihkan(event.target.value)}
                  placeholder="Email / username and password"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={pending || !pulihkan.trim()}
                  onClick={() => run(() => restoreAccountAction({ id: account.id, credentials: pulihkan }), 'Account restored.')}
                >
                  <RotateCcw className="size-4" />
                  Restore to available
                </Button>
              </div>
            ) : null}

            {account.status === 'DELISTED' ? (
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-destructive">Delete account</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  The account is permanently deleted from the panel and cannot be recovered.
                </p>
                <Button
                  variant="destructive"
                  className="mt-2 w-full"
                  disabled={pending}
                  onClick={() => setHapusTerbuka(true)}
                >
                  <Trash2 className="size-4" />
                  Delete permanently
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <Dialog open={hapusTerbuka} onOpenChange={setHapusTerbuka}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this account?</DialogTitle>
            <DialogDescription>
              “{account.title}” will be permanently deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHapusTerbuka(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setHapusTerbuka(false)
                run(() => deleteAccountAction({ id: account.id }), 'Account deleted.', '/panel/accounts')
              }}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
