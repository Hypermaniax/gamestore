'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { publishPageAction, updatePageDraftAction } from '@/src/controllers/page.controller'

export function PageEditor({
  code,
  title,
  bodyMarkdown,
  version,
}: {
  code: string
  title: string
  bodyMarkdown: string
  version: number
}) {
  const router = useRouter()
  const [form, setForm] = useState({ title, bodyMarkdown })
  const [state, formAction, pending] = useActionState<
    { error: string | null; notice: string | null },
    FormData
  >(
    async (_prevState, formData) => {
      const publish = formData.get('intent') === 'publish'
      const saved = await updatePageDraftAction({ code, ...form })
      if (!saved.ok) return { error: saved.message, notice: null }

      if (!publish) {
        router.refresh()
        return {
          error: null,
          notice: 'Draft saved. The public page will not change until published.',
        }
      }

      const result = await publishPageAction({ code })
      if (!result.ok) return { error: result.message, notice: null }

      router.refresh()
      return { error: null, notice: `Version ${result.data.version} published.` }
    },
    { error: null, notice: null },
  )
  const { error, notice } = state

  return (
    <form action={formAction} className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Draft editor</h2>
          <p className="text-xs text-muted-foreground">Current published version: {version}.</p>
        </div>
        <div className="flex gap-2">
          <Button type="submit" name="intent" value="save" variant="outline" disabled={pending}>
            Save draft
          </Button>
          <Button type="submit" name="intent" value="publish" disabled={pending}>
            Publish
          </Button>
        </div>
      </div>

      {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="rounded-lg bg-brand/15 px-3 py-2 text-sm">{notice}</p> : null}

      <div className="space-y-1.5">
        <Label htmlFor="judul">Title</Label>
        <Input
          id="judul"
          value={form.title}
          onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="isi">Markdown content</Label>
        <textarea
          id="isi"
          className="field min-h-[28rem] py-3 font-mono text-xs leading-relaxed"
          value={form.bodyMarkdown}
          onChange={(event) => setForm((value) => ({ ...value, bodyMarkdown: event.target.value }))}
        />
      </div>
    </form>
  )
}
