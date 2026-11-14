import { settingService } from '@/src/services/setting.service'
import { PanelPageHeader } from '@/components/panel/panel-ui'
import { SettingsForm } from './settings-form'

export const instant = false

export default async function PanelSettingsPage() {
  const result = await settingService.getAdmin()
  if (!result.ok) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {result.message}
      </div>
    )
  }

  return (
    <div>
      <PanelPageHeader
        title="Store settings"
        description="Store name, support contact, announcement, and checkout emergency switch."
      />
      <SettingsForm
        namaToko={result.data.namaToko}
        kontakCs={result.data.kontakCs}
        pesanPengumuman={result.data.pesanPengumuman}
        checkoutAktif={result.data.checkoutAktif}
      />
      <div className="mt-5 max-w-2xl rounded-xl border border-dashed p-4">
        <p className="text-sm font-semibold">Theme editor</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The theme uses static tokens from the seed. A dynamic theme editor and token validation are planned for Phase 2.
        </p>
        <button type="button" disabled className="mt-3 rounded-lg border px-3 py-1.5 text-sm opacity-50">
          Open theme editor (Phase 2)
        </button>
      </div>
    </div>
  )
}
