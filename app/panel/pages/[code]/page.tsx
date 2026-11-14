import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { pageService } from '@/src/services/page.service'
import { waktu } from '@/src/lib/pesanan'
import { PanelPageHeader } from '@/components/panel/panel-ui'
import { Button } from '@/components/ui/button'
import { PageEditor } from './page-editor'

export const instant = false

export default async function PanelPageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ version?: string }>
}) {
  const { code } = await params
  const { version: versiParam } = await searchParams
  const [draft, versions] = await Promise.all([
    pageService.getDraft({ code: code }),
    pageService.listVersions({ code: code }),
  ])

  if (!draft.ok) {
    return (
      <div>
        <PanelPageHeader title="Page not found" description={draft.message} />
        <Button variant="outline" render={<Link href="/panel/pages" />}>Back</Button>
      </div>
    )
  }

  const version = Number(versiParam)
  const versiLama = Number.isInteger(version) && version > 0 ? await pageService.getVersion({ code: code, version }) : null

  return (
    <div>
      <Link
        href="/panel/pages"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All pages
      </Link>
      <PanelPageHeader
        title={draft.data.title}
        description={`${code} · draft updated ${waktu(draft.data.updatedAt)}`}
        action={
          <Button variant="outline" render={<Link href={`/pages/${code}`} target="_blank" />}>
            View public <ExternalLink className="size-3.5" />
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <PageEditor
          code={code}
          title={draft.data.title}
          bodyMarkdown={draft.data.bodyMarkdown}
          version={draft.data.version}
        />

        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Version history</h2>
            {versions.ok && versions.data.length > 0 ? (
              <div className="mt-3 space-y-2 text-sm">
                {versions.data.map((item) => (
                  <Link
                    key={item.version}
                    href={`/panel/pages/${code}?versi=${item.version}`}
                    className={`block rounded-lg border px-3 py-2 transition hover:bg-muted/40 ${version === item.version ? 'border-brand-deep bg-brand/10' : ''}`}
                  >
                    <p className="font-medium">Version {item.version}</p>
                    <p className="text-xs text-muted-foreground">{item.publisher} · {waktu(item.publishedAt)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No published versions yet.</p>
            )}
          </section>

          {versiLama?.ok ? (
            <section className="rounded-xl border bg-card p-4">
              <h2 className="font-display text-base font-semibold tracking-[-0.02em]">
                Version {versiLama.data.version} text
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {versiLama.data.publisher} · {waktu(versiLama.data.publishedAt)}
              </p>
              <pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                {versiLama.data.bodyMarkdown}
              </pre>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
