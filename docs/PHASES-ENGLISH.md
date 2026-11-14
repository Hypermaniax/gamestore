# 🗺️ PHASES-ENGLISH.md — Rename Panel & Data Model ke Bahasa Inggris

> Rencana kerja bertahap untuk mengganti **route panel**, **nama function/variable**, **file/component**, **kontrak internal**, dan **data model** ke bahasa Inggris.
> Dokumen ini adalah rencana. Belum ada rename yang dijalankan sampai fase disetujui.
>
> Status: ⬜ belum mulai · 🔄 sedang · ✅ selesai

## Tujuan

1. Semua route `app/panel/*` memakai segmen bahasa Inggris.
2. Semua route publik dan auth memakai segmen bahasa Inggris, dengan redirect 308 dari URL lama.
3. Semua nama function, helper, component, type, file, dan variabel di area panel memakai bahasa Inggris.
4. Nama service/controller/repository yang dipakai panel memakai bahasa Inggris.
5. Nama Prisma model, field, tabel, kolom, permission code, menu code, dan audit action memakai bahasa Inggris.
6. Tidak ada data hilang, tidak ada URL lama yang langsung 404, dan semua tes tetap hijau.

## Keputusan Lingkup

| Area | Termasuk | Catatan |
|---|---|---|
| Route `/panel/*` | Ya | `/panel/akun` → `/panel/accounts`, dst. |
| Nama file/folder/component panel | Ya | Termasuk test dan import. |
| Nama function/helper/variable panel | Ya | Termasuk identifier lokal, bukan hanya export. |
| Service/controller/repository panel | Ya | Satu fase = satu file utama atau satu domain kecil. |
| Kontrak Server Action / zod / error | Ya | Ditunda ke fase kontrak agar UI tidak putus di tengah jalan. |
| Prisma model/field + tabel/kolom DB | Ya | Expand → backfill → cutover → contract. |
| Permission/menu/audit code | Ya | Perlu kompatibilitas karena tersimpan di DB/audit append-only. |
| Path aset upload | Ya | `/uploads/akun` → `/uploads/accounts` + rewrite URL DB. |
| Copy UI bahasa Indonesia | Tidak | Label/pesan UI Inggris sejak Fase 21; konten produk/legal/admin tetap mengikuti data. |
| Route toko/API publik | Ya | Fase 22: route publik + kode halaman statis; redirect URL lama dipertahankan. |

## Aturan Global

- Satu fase = satu branch/PR kecil yang bisa direview sendiri.
- **Nama function dan variable lokal di file target diubah lebih dulu.** Payload, response, error code, dan kolom DB ditunda ke fase kontrak/DB agar tidak breaking.
- Rename mekanis tidak dicampur dengan perubahan perilaku.
- Nama lama hanya boleh tersisa di redirect, compatibility alias, dokumentasi migrasi, dan data historis append-only.
- Copy UI tetap bahasa Indonesia; identifier kode berbahasa Inggris.
- Semua fase wajib melewati gerbang:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm test`
  - `npm run build`
- Fase DB wajib backup, migration baru, verifikasi row count, dan rollback yang sudah diuji.
- Audit log append-only: data lama **tidak ditulis ulang**. Penulisan baru memakai nama Inggris; UI memetakan nama lama dan baru.

## Prinsip Fase per File

- Fase 1 sampai fase domain adalah **vertical slice**: file service utama dulu, lalu repo/controller, lalu panel UI/file route.
- Setiap fase harus bisa selesai tanpa menunggu fase lain.
- Jika satu file dipakai dua domain, rename file itu di fase pertama yang memakainya dan update semua pemanggil.
- Function yang sudah Inggris tidak dipaksa berubah; cukup function/helper/variable yang masih Indonesia.
- Error code seperti `SESI_TIDAK_VALID`, payload key seperti `pesan`/`aktif`, dan kolom DB **tidak diubah** di fase function, kecuali fase itu memang fase kontrak.
- Contoh: Fase 1 hanya menyentuh `src/services/user-admin.service.ts`; route `/panel/users` dan payload user tetap sampai fase user companions/contract.

## Peta Route Panel

| Lama | Baru | Fase |
|---|---|---|
| `/panel/akun` | `/panel/accounts` | Account panel |
| `/panel/akun/baru` | `/panel/accounts/new` | Account panel |
| `/panel/akun/[id]` | `/panel/accounts/[id]` | Account panel |
| `/panel/game` | `/panel/games` | Catalog panel |
| `/panel/voucher` | `/panel/vouchers` | Voucher panel |
| `/panel/promo` | `/panel/promotions` | Promotion panel |
| `/panel/transaksi` | `/panel/transactions` | Transaction panel |
| `/panel/transaksi/[kode]` | `/panel/transactions/[code]` | Transaction panel |
| `/panel/laporan` | `/panel/reports` | Report panel |
| `/panel/halaman` | `/panel/pages` | Page panel |
| `/panel/halaman/[kode]` | `/panel/pages/[code]` | Page panel |
| `/panel/pengaturan` | `/panel/settings` | Setting panel |
| `/panel/webhook` | `/panel/webhooks` | Webhook panel |
| `/panel/audit` | `/panel/audit` | Tidak berubah |
| `/panel/users` | `/panel/users` | Tidak berubah |
| `/panel/dashboard` | `/panel/dashboard` | Tidak berubah |

## Kamus Identifier Umum

| Indonesia | Inggris |
|---|---|
| `akun` | `account` |
| `atribut` | `attributes` |
| `kredensial` | `credentials` |
| `foto` | `photos` |
| `harga` | `price` |
| `judul` | `title` |
| `deskripsi` | `description` |
| `pesan` | `message` |
| `kode` | `code` |
| `nama` | `name` |
| `jenis` | `type` / `gameType` |
| `skema` | `schema` |
| `simpan` | `save` |
| `unggah` | `upload` |
| `tambah` | `add` |
| `hapus` | `delete` |
| `ubah` | `update` |
| `pilih` | `select` |
| `cari` | `search` |
| `daftar` | `list` |
| `buat` | `create` |
| `muat` | `load` |
| `kirim` | `send` |
| `ambil` | `get` |
| `validasi` | `validate` |
| `gagal` | `fail` |
| `sesi` | `session` |
| `izin` | `permission` / `forbidden` |
| `aktor` | `actor` |
| `pulihkan` | `restore` |
| `relis` | `relist` |

---

## Ringkasan Fase

| Fase | Target utama | Fokus |
|---|---|---|
| 0 | Baseline | Backup, inventory, snapshot test |
| 1 | `src/services/user-admin.service.ts` | Function & variable user service |
| 2 | `user-repo.ts`, `admin-user.controller.ts`, panel users | User domain companions |
| 3 | `src/services/auth.service.ts` | Auth service functions |
| 4 | Auth companions | Controller, email, token/TOTP repo |
| 5 | RBAC & audit | Service/repo/controller |
| 6 | `src/services/akun.service.ts` | Account service |
| 7 | Account companions + panel | Repo/controller/route/component |
| 8 | Catalog + games panel | Service/repo/controller/route/component |
| 9 | Voucher + panel | Service/repo/controller/route |
| 10 | Promotion + panel | Service/repo/controller/route |
| 11 | Transaction + panel | Service/repo/controller/route |
| 12 | Payment, checkout, webhook + panel | Service/repo/controller/route |
| 13 | Page, setting, report + panel | Service/repo/controller/route |
| 14 | Kontrak internal | Payload, error, zod, path aset |
| 15 | Prisma logical DB | Model/field Inggris dengan `@map` lama |
| 16 | DB fisik RBAC/auth | Tabel/kolom + permission/menu code |
| 17 | DB fisik katalog | Game type, game, account, photo |
| 18 | DB fisik diskon/transaksi | Promotion, voucher, transaction, payment |
| 19 | DB fisik konten/audit | Theme, page, setting, audit, sisa |
| 20 | Cleanup | Hapus alias/redirect, docs, raw SQL |
| 21 | Copy UI Inggris (opsional) | Terjemahkan teks produk |

---

## Fase 0 — Baseline ⬜

**Tujuan:** mengunci kondisi awal sebelum rename.

- [ ] Buat branch kerja dan snapshot commit awal.
- [ ] Backup DB dev/test: `pg_dump`.
- [ ] Backup folder upload dan catat jumlah file.
- [ ] Inventory route, link, function, component, service, dan path DB dengan `rg`.
- [ ] Jalankan baseline `tsc`, `lint`, `test`, `build`; simpan hasilnya.
- [ ] Catat path menu aktual di DB dan jumlah row per tabel.

**Selesai bila:** baseline hijau, backup tersedia, inventory tersimpan.

**Rollback:** tidak ada perubahan kode.

## Fase 1 — `src/services/user-admin.service.ts` ✅

**Tujuan:** hanya file service user. Tidak menyentuh route, repo, controller, payload, atau DB.

**File target:** `src/services/user-admin.service.ts`

**Rename function/helper/constant:**

| Lama | Baru | Catatan |
|---|---|---|
| `gagal` | `fail` | Helper lokal; isi error code tetap |
| `serialize` | `serializeUser` | Output key tetap |
| `SESI` | `INVALID_SESSION` | Nama konstanta saja |
| `IZIN` | `FORBIDDEN` | Nama konstanta saja |
| `requirePermission` | tetap | Sudah Inggris |
| `isError` | tetap | Sudah Inggris |
| `list` | tetap | Sudah Inggris |
| `changeRole` | tetap | Sudah Inggris |
| `setActive` | tetap | Sudah Inggris |
| `forceLogout` | tetap | Sudah Inggris |
| `resetTotp` | tetap | Sudah Inggris |

**Rename variable lokal:**

| Lama | Baru |
|---|---|
| `sesi` | `session` |
| `aktor` | `actor` |
| `roleKode` | `roleCode` |
| `aktif` (hasil destructure) | `active` |
| `admins` | tetap |
| `target` | tetap |

**Jangan ubah di fase ini:**

- Error code: `SESI_TIDAK_VALID`, `TIDAK_DIIZINKAN`, `USER_TIDAK_DITEMUKAN`, `ROLE_TIDAK_DITEMUKAN`, `TIDAK_BOLEH_AKU_SENDIRI`, `ADMIN_TERAKHIR`, `PASSWORD_SALAH`.
- Payload/response key: `kode`, `pesan`, `aktif`, `emailTerverifikasi`, `totpAktif`, `role.kode`.
- Audit metadata key: `dari`, `ke`, `aktif`.
- Nama property Prisma/repo.

**Verifikasi:**

- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `npm run build`
- Smoke halaman `/panel/users` (belum berubah).

**Selesai bila:** file target tidak punya function/helper/constant/variable lokal Indonesia; perilaku dan API sama.

**Rollback:** revert satu file.

## Fase 2 — User Companions ✅

**File target:**

- `src/repositories/user-repo.ts`
- `src/controllers/admin-user.controller.ts`
- `app/panel/users/page.tsx`
- `app/panel/users/users-admin.tsx`
- Test terkait bila ada.

**Fokus:**

- Rename variable lokal Indonesia (`pesan` → `message`, `daftar` → `list`, dsb.).
- Rename helper/function lokal yang masih Indonesia.
- Nama function export yang sudah Inggris dipertahankan.
- Jangan ubah route `/panel/users`; route sudah Inggris.
- Jangan ubah response key/DB field; itu fase kontrak/DB.
- Rename action controller bila perlu: `changeUserRoleAction` (tetap), `setUserActiveAction` (tetap), `forceLogoutUserAction` (tetap), `resetUserTotpAction` (tetap).

**Selesai bila:** file user companions bersih dari identifier lokal Indonesia.

**Rollback:** revert file fase ini.

## Fase 3 — `src/services/auth.service.ts` ✅

**File target:** `src/services/auth.service.ts`

- [ ] Rename helper `gagal` → `fail`.
- [ ] Rename helper `keSession` → `toSession`.
- [ ] Rename helper pengirim email lokal → nama Inggris.
- [ ] Rename konstanta `SESI`/`IZIN` bila ada.
- [ ] Rename variable lokal Indonesia (`sesi`, `pengguna`, `perangkat`, `cocok`, `kedaluwarsa`, dsb.).
- [ ] Pertahankan error code, payload key, dan nama method publik yang sudah Inggris.

**Selesai bila:** service auth bersih dari identifier lokal Indonesia; API belum berubah.

## Fase 4 — Auth Companions ✅

**File target:**

- `src/controllers/auth.controller.ts`
- `src/services/email.service.ts`
- `src/repositories/email-token-repo.ts`
- `src/repositories/refresh-token-repo.ts`
- `src/repositories/totp-repo.ts`
- `src/repositories/user-repo.ts` bagian auth bila belum selesai
- `src/validation/admin.ts` bagian auth/user
- Halaman auth/storefront yang memanggil action tersebut

**Fokus:**

- Rename function/helper/variable lokal.
- Rename file bila masih Indonesia.
- Jangan ubah route toko pada fase ini.
- Jangan ubah payload/error code dulu.

## Fase 5 — RBAC & Audit ✅

**File target:**

- `src/services/rbac.service.ts`
- `src/services/audit.service.ts`
- `src/repositories/rbac-repo.ts`
- `src/repositories/admin-audit-repo.ts`
- `src/repositories/audit-reveal-repo.ts`
- `app/panel/audit/page.tsx`
- Komponen sidebar/panel yang memakai menu.

**Fokus:**

- Rename function/helper/variable lokal Indonesia.
- Rename helper `gagal` → `fail`, `sesi` → `session`.
- Jangan ubah route `/panel/audit`.
- Jangan ubah menu/permission code di DB; itu fase DB RBAC.

## Fase 6 — `src/services/akun.service.ts` ✅

**File target:** `src/services/akun.service.ts` → `account.service.ts`

| Lama | Baru |
|---|---|
| `akunService` | `accountService` |
| `ringkasanAdmin` | `summaryAdmin` |
| `gagal` | `fail` |
| `validateAtribut` | `validateAttributes` |
| `fotoDomainAllowed` | `isPhotoDomainAllowed` |
| `serializePublic` | tetap |
| `serializeAdmin` | tetap |
| `akunAad` | `accountAad` |
| `sesi` | `session` |
| `atribut` | `attributes` |
| `foto` | `photos` |
| `harga` | `price` |

**Jangan ubah:** error code, payload key, nama kolom Prisma, dan path route.

**Selesai bila:** service account bersih dari identifier lokal Indonesia dan semua pemanggil memakai nama baru.

## Fase 7 — Account Companions + Panel ✅

**File target:**

- `src/repositories/akun-repo.ts` → `account-repo.ts`
- `src/controllers/akun.controller.ts` → `account.controller.ts`
- `app/panel/akun/` → `app/panel/accounts/`
- `components/panel/akun-filter.tsx` → `account-filter.tsx`
- `atribut-fields.tsx` → `attribute-fields.tsx`
- `foto-uploader.tsx` → `photo-uploader.tsx`
- `kredensial-fields.tsx` → `credential-fields.tsx`
- Test account/upload/credential.

**Rename component/function:**

- `AkunFilter` → `AccountFilter`
- `AkunAdmin` → `AccountAdmin`
- `AkunBaruForm` → `AccountNewForm`
- `AtributFields` → `AttributeFields`
- `FotoUploader` → `PhotoUploader`
- `KredensialFields` → `CredentialFields`
- `formatHarga` → `formatPrice`
- `simpanKredensial` → `saveCredentials`
- `unggahFoto` → `uploadPhotos`
- `tambahFotoUrl` → `addPhotoUrl`
- `pilihFoto` → `selectPhotos`

**Route:**

- `/panel/akun` → `/panel/accounts`
- `/panel/akun/baru` → `/panel/accounts/new`
- Tambahkan redirect lama.

**Jangan ubah:** payload key, error code, path upload, kolom DB.

## Fase 8 — Catalog + Games Panel ✅

**File target:**

- `src/services/catalog.service.ts`
- `src/repositories/game-repo.ts`
- `src/repositories/jenis-game-repo.ts` → `game-type-repo.ts`
- `src/controllers/catalog.controller.ts`
- `app/panel/game/` → `app/panel/games/`
- `components/panel/skema-atribut-fields.tsx` → `attribute-schema-fields.tsx`

**Rename function/helper:**

- `listJenisAdmin` → `listGameTypesAdmin`
- `gameKosong` → `emptyGame`
- `jenisKosong` → `emptyGameType`
- `bukaTambahGame` → `openCreateGame`
- `bukaEditGame` → `openEditGame`
- `bukaTambahJenis` → `openCreateGameType`
- `bukaEditJenis` → `openEditGameType`
- `simpanGame` → `saveGame`
- `simpanJenis` → `saveGameType`
- `idBaru` → `newId`
- `fieldKosong` → `emptyField`
- `skemaKeDraft` → `schemaToDraft`
- `draftKeSkema` → `draftToSchema`
- `kunciOtomatis` → `autoKey`

**Route:** `/panel/game` → `/panel/games` + redirect.

**Jangan ubah:** payload key, error code, kolom DB.

## Fase 9 — Voucher + Panel ✅

**File target:**

- `src/services/voucher.service.ts`
- `src/repositories/voucher-repo.ts`
- `src/controllers/diskon.controller.ts` → `discount.controller.ts`
- `app/panel/voucher/` → `app/panel/vouchers/`

**Fokus:** rename helper/variable lokal Indonesia, rename controller file, route `/panel/voucher` → `/panel/vouchers` + redirect. Jangan ubah kode voucher/DB.

## Fase 10 — Promotion + Panel ✅

**File target:**

- `src/services/promo.service.ts` → `promotion.service.ts`
- `src/repositories/promo-repo.ts` → `promotion-repo.ts`
- `src/controllers/diskon.controller.ts` (lanjutan)
- `app/panel/promo/` → `app/panel/promotions/`
- `promo-admin.tsx` → `promotion-admin.tsx`

**Rename function/helper:**

- `promoService` → `promotionService`
- `PromoAdmin` → `PromotionAdmin`
- `muatEdit` → `loadForEdit`
- `badan` → `buildPayload`
- `lokal` → `toLocalDateTime`
- `iso` → `toIsoDateTime`

**Route:** `/panel/promo` → `/panel/promotions` + redirect.

## Fase 11 — Transaction + Panel ✅

**File target:**

- `src/services/transaksi.service.ts` → `transaction.service.ts`
- `src/repositories/transaksi-repo.ts` → `transaction-repo.ts`
- `src/controllers/transaksi.controller.ts` → `transaction.controller.ts`
- `app/panel/transaksi/` → `app/panel/transactions/`
- `app/panel/transaksi/[kode]/` → `app/panel/transactions/[code]/`
- `transaksi-actions.tsx` → `transaction-actions.tsx`

**Rename:** `transaksiService` → `transactionService`, `TransaksiActions` → `TransactionActions`, `ringkasanAdmin` → `summaryAdmin`, helper/variable lokal Indonesia.

**Route:** `/panel/transaksi` → `/panel/transactions`; `[kode]` → `[code]` + redirect.

## Fase 12 — Payment, Checkout, Webhook + Panel ✅

**File target:**

- `src/services/pembayaran.service.ts` → `payment.service.ts`
- `src/services/checkout.service.ts`
- `src/services/webhook.service.ts`
- `src/repositories/pembayaran-repo.ts` → `payment-repo.ts`
- `src/repositories/refund-repo.ts`
- `src/repositories/webhook-repo.ts`
- `src/controllers/webhook.controller.ts`
- `app/panel/webhook/` → `app/panel/webhooks/`

**Rename:** helper/variable lokal Indonesia, `WebhookRetryButton` tetap, route `/panel/webhook` → `/panel/webhooks` + redirect. Jangan ubah API webhook Xendit pada fase ini.

## Fase 13 — Page, Setting, Report + Panel ✅

**File target:**

- `src/services/halaman.service.ts` → `page.service.ts`
- `src/repositories/halaman-repo.ts` → `page-repo.ts`
- `src/controllers/halaman.controller.ts` → `page.controller.ts`
- `src/services/pengaturan.service.ts` → `setting.service.ts`
- `src/repositories/pengaturan-repo.ts` → `setting-repo.ts`
- `src/services/laporan.service.ts` → `report.service.ts`
- `src/repositories/laporan-repo.ts` → `report-repo.ts`
- `src/controllers/laporan.controller.ts` → `report.controller.ts`
- `app/panel/halaman/` → `app/panel/pages/`
- `app/panel/pengaturan/` → `app/panel/settings/`
- `app/panel/laporan/` → `app/panel/reports/`
- `halaman-editor.tsx` → `page-editor.tsx`
- `pengaturan-form.tsx` → `settings-form.tsx`

**Rename:** `halamanService` → `pageService`, `pengaturanService` → `settingService`, `laporanService` → `reportService`, `HalamanEditor` → `PageEditor`, `PengaturanForm` → `SettingsForm`, `LaporanError` → `ReportError`.

**Route:** `/panel/halaman` → `/panel/pages`, `/panel/pengaturan` → `/panel/settings`, `/panel/laporan` → `/panel/reports`; `[kode]` → `[code]` + redirect.

## Fase 14 — Kontrak Internal & Path Aset ✅

- [x] Rename payload Server Action: `judul` → `title`, `deskripsi` → `description`, `harga` → `price`, `atribut` → `attributes`, `kredensial` → `credentials`.
- [x] Rename typed-union error: `{ kode, pesan }` → `{ code, message }`.
- [x] Rename error code machine ke Inggris dan update semua UI/test.
- [x] Rename zod schema/type yang masih Indonesia.
- [x] Rename upload path `/uploads/akun` → `/uploads/accounts`, rewrite URL DB dan validasi.
- [x] Pertahankan fallback baca path lama selama transisi.

**Selesai bila:** kontrak baru dipakai penuh dan tidak ada fallback yang masih dibutuhkan.

## Fase 15 — Prisma Logical DB ✅

- [x] Rename model/field Prisma ke Inggris.
- [x] Pertahankan tabel/kolom lama dengan `@@map`/`@map`.
- [x] Contoh: `AkunGame` → `GameAccount` (`@@map("akun_game")`), `judul` → `title` (`@map("judul")`), `harga` → `price` (`@map("harga")`).
- [x] Rename akses repo/service/seed.
- [x] Regenerate Prisma client.
- [x] Jangan rename fisik DB.

**Selesai bila:** semua kode Prisma berbahasa Inggris; DB fisik belum berubah.

## Fase 16 — DB Fisik RBAC, Auth, Menu, Permission ✅

- [x] Rename tabel/kolom role, users, menu, permission, role_menu, role_permission, email_token, refresh_token, users_totp_recovery.
- [x] Backfill permission code: `akun:*` → `account:*`, `kredensial:write` → `credential:write`, `halaman:*` → `page:*`, `pengaturan:*` → `setting:*`, `transaksi:*` → `transaction:*`, `laporan:read` → `report:read`, `promo:*` → `promotion:*`, `tema:write` → `theme:write`, `komplain:decide` → `complaint:decide`.
- [x] Backfill menu code: `akun` → `accounts`, `game` → `games`, `voucher` → `vouchers`, `promo` → `promotions`, `transaksi` → `transactions`, `laporan` → `reports`, `halaman` → `pages`, `pengaturan` → `settings`, `webhook` → `webhooks`.
- [x] Audit action baru memakai nama Inggris; audit lama tidak diubah.
- [x] Update seed dan uji login/RBAC/sidebar.

## Fase 17 — DB Fisik Katalog ✅

- [x] `jenis_game` → `game_types`, `game` → `games`, `akun_game` → `game_accounts`, `akun_foto` → `account_photos`.
- [x] Rename kolom katalog/akun (`kode`, `nama`, `jenis_id`, `ikon_url`, `skema_atribut`, `judul`, `deskripsi`, `harga`, `atribut`, `kredensial_encrypted`, `dilist_pada`, `dihapus_pada`, `urutan`, `aktif`, `cari`).
- [x] Rename index/constraint/sequence.
- [x] Uji CRUD akun, upload, publish, delist, katalog publik.

## Fase 18 — DB Fisik Diskon & Transaksi ✅

- [x] `promo` → `promotions`, `voucher` → `vouchers`, `voucher_usage` → `voucher_usages`.
- [x] `transaksi` → `transactions`, `pembayaran` → `payments`, `refund` → `refunds`, `webhook_event` → `webhook_events`, `idempotency_key` → `idempotency_keys`.
- [x] Rename kolom domain dan constraint/index parsial.
- [x] Uji checkout, webhook, refund, expiry, laporan.

## Fase 19 — DB Fisik Konten, Setting, Audit ✅

- [x] `tema` → `themes`, `halaman_statis` → `static_pages`, `halaman_statis_versi` → `static_page_versions`.
- [x] `email_token` → `email_tokens`, `admin_audit_log` → `admin_audit_logs`, `audit_reveal` → `audit_reveals`, `pengaturan` → `settings`.
- [x] Rename kolom, index, constraint, trigger/function SQL.
- [x] Uji halaman, tema, laporan, audit, pengaturan.

## Fase 20 — Cleanup ✅

- [x] Hapus redirect path lama setelah masa transisi.
- [x] Hapus alias/dual-read/dual-write.
- [x] Update `docs/API.md`, `docs/PLAN.md`, `docs/PHASES.md`, `docs/CHECKLIST-FITUR.md` (plus ERD/DEPLOYMENT).
- [x] Pastikan `rg` nama lama hanya menemukan data historis.
- [x] Full test, build, smoke semua menu, restore DB dari backup ke env bersih.

## Fase 21 — Copy UI Inggris (Opsional) ✅

- [x] Terjemahkan label, tombol, pesan validasi, empty state, dan konfirmasi.
- [x] Sesuaikan format tanggal/angka bila perlu.
- [x] Jangan ubah identifier lagi di fase ini.

> Progres 2026-11-13: copy UI storefront, auth, akun, pesanan, panel, email, validasi, dan pesan error diterjemahkan ke Inggris. Tanggal memakai `en-GB` dengan zona `Asia/Jakarta`; Rupiah tetap `id-ID`. Label menu/permission/role di seed diperbarui; migration `20261113170000_english_ui_labels` menyinkronkan data system yang sudah ada. Konten produk, halaman legal, dan data admin (judul/deskripsi akun, label skema game, pesan pengumuman) sengaja tetap sesuai data. Verifikasi: 49 tes / 15 file, `tsc`, `lint`, `build`, seluruh halaman publik/auth/panel GET 200; label sidebar Inggris terverifikasi.

---

## Fase 22 — Public Routes English ✅

- [x] Rename route publik: `/akun` → `/account`, `/akun-game` → `/accounts`, `/pesanan` → `/orders`, `/halaman` → `/pages`.
- [x] Rename route auth: `/daftar` → `/register`, `/lupa-password` → `/forgot-password`, `/verifikasi-email` → `/verify-email`, `/ganti-email/konfirmasi` → `/change-email/confirm`.
- [x] Rename parameter dinamis `[kode]` → `[code]` pada halaman publik.
- [x] Rename kode halaman statis: `syarat-ketentuan` → `terms-and-conditions`, `privasi` → `privacy`, `garansi` → `warranty`.
- [x] Tambahkan redirect 308 dari seluruh URL lama, termasuk redirect kode halaman lama.
- [x] Pindahkan callback Xendit ke `/api/v1/payments/webhook/xendit`; path lama tetap tersedia sebagai alias kompatibilitas.
- [x] Perbarui link internal, email, sitemap, robots, dan dokumentasi route.

> Progres 2026-11-13: route publik dan auth kini memakai bahasa Inggris. Migration `20261113180000_english_page_codes` mengubah `static_pages.code`; redirect lama diverifikasi 308 ke tujuan baru. Path lama tetap kompatibel, termasuk callback Xendit lama.

---

## Strategi DB Expand → Contract

1. **Expand**: rename fisik dengan migration baru; jangan hapus data.
2. **Backfill**: isi data baru dari data lama; verifikasi row count/checksum.
3. **Dual-write**: sementara tulis ke nama lama dan baru bila ada aplikasi lain.
4. **Cutover read**: kode membaca nama baru; tes penuh.
5. **Contract**: hentikan tulis lama; backup; drop/rename nama lama.

Untuk single-app maintenance window, dual-write bisa disederhanakan, tetapi backup dan rollback tetap wajib.

## Verifikasi Wajib

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Fase DB tambahan:

- `pg_dump` sebelum migration.
- `prisma migrate deploy` di DB salinan.
- Bandingkan row count tabel domain sebelum/sesudah.
- Smoke login, sidebar, akun, katalog, checkout, webhook, laporan, setting.

## Risiko Utama

| Risiko | Mitigasi |
|---|---|
| Rename setengah jalan | Satu fase satu file/domain; commit kecil |
| Menu DB masih path lama | Update seed + audit `menu.path`; redirect sementara |
| Link internal terlewat | `rg` path lama; smoke semua menu |
| Permission code berubah → admin kehilangan akses | Backfill role_permission + uji RBAC |
| Audit historis rusak | Jangan rewrite audit lama; mapping baca |
| Data transaksi rusak | Backup + staging migration + row count check |
| Upload lama 404 | Pindahkan file + rewrite URL + fallback baca |
| Redirect loop | Urutkan redirect spesifik sebelum wildcard |
| UI copy ikut berubah | Copy UI Inggris baru dimulai Fase 21; konten data tidak diubah. |

## Catatan

- Fase 1 adalah contoh paling kecil: hanya `src/services/user-admin.service.ts`.
- Fase 2–13 mengikuti pola yang sama per file/domain.
- Fase 14 baru mengubah kontrak yang terlihat oleh UI/API.
- Fase 15 jembatan aman: kode Prisma Inggris, nama DB lama.
- Fase 16–19 perubahan fisik DB, satu domain per PR.
- Fase 20 baru menghapus kompatibilitas.
