# 🗺️ PHASES.md — Rencana Fase Pengerjaan

> Pendamping `PLAN.md` (v13) — pecahan §12 menjadi checklist kerja.
> Sumber kebenaran endpoint: `API.md` (v10); skema: `ERD.md` (v10, **29 tabel — MVP 27**).
> Satu fase = satu cabang kerja. Jangan naik fase sebelum "Selesai bila" terpenuhi.
> Status: ⬜ belum mulai · 🔄 sedang · ✅ selesai

## Definition of Done (global, berlaku tiap fase)

1. Tes fase itu hijau
2. Perubahan skema = migration baru, bukan edit file lama
3. Endpoint baru tercatat di `API.md` dan permission-nya ada di seed
4. Aksi admin tercatat di audit log
5. Tidak ada data sensitif di log
6. `API.md` diperbarui bila endpoint berevolusi
7. Catatan di Riwayat `PLAN.md` diperbarui

## Ringkasan

| Fase | Nama | Fokus inti | Tergantung |
|---|---|---|---|
| 0 | Reset | Bersihkan scaffold & database | — |
| 1 | Scaffold app | Next.js + shadcn/ui + Prisma (27 tabel) + Postgres lokal + seed | 0 · ⛔ keputusan fee |
| 2 | Auth + RBAC | Register/verifikasi/JWT/refresh + TOTP + users + audit | 1 |
| 3 | Katalog | Master + akun + kredensial AES-GCM + foto + slug | 1 |
| 4 | Diskon | Strategy promo & voucher + kuota atomik + CRUD | 1 |
| 5 | Transaksi + Pembayaran | Checkout 3 fase + Xendit + webhook + refund + garansi | 2, 3, 4 |
| 6 | Konten + laporan | Halaman statis versi beku + tema + 3 laporan | 1 |
| 7 | Frontend toko | Next.js: beli end-to-end di browser | 2–6 |
| 8 | Frontend admin | Panel admin dari menu database | 7 |
| 9 | Integrasi & regresi | Vitest + DB test lokal + mock Xendit + migrasi dari nol | 1–8 |
| 10 | Hardening produksi | Checklist keamanan + TOTP wajib | 9 |
| 11–14 | Fase 2 🔵 | Komplain, RBAC CRUD, wishlist, dashboard | 10 |

> **v13 — tanpa lapisan API publik (Server Actions)**: seluruh "endpoint" dalam checklist kini adalah **aksi server/server component**; dua pengecualian tetap HTTP (webhook Xendit, health). Access JWT di **cookie httpOnly**; error = **typed-union + kode machine**; idempotency = field `kunciIdempoten`. **UI panel admin di `/panel/*`** (bukan `/admin`). Detail: PLAN v13 / API.md v10.

---

## Fase 0 — Reset ✅

- [x] ✅ Bersihkan scaffold lama di `be/` dan `fe/` (jaga `docs/`) — sudah beres; penggantinya **satu aplikasi Next.js di root repo**
- [x] Drop schema database lama (mulai dari nol)
- [x] Struktur repo final: `app/`, `lib/`, `prisma/`, `docs/`, `.env.example` (aplikasi di root, tanpa Docker)

**Selesai bila:** `be/` bersih, tidak ada sisa migration/data lama.

## Fase 1 — Scaffold backend ✅ · ⛔ gate keputusan

- [x] ⛔ **Keputusan fee pembelian** (PLAN §2 "Perlu dikonfirmasi" #2) diputuskan **sebelum migration pertama Prisma** — ✅ **opsi B: toko tanggung** (default ERD, tanpa kolom `biaya_layanan`; reversible via 1 migration, ingatkan user sebelum go-live)
- [x] Inisialisasi Next.js (App Router + TypeScript) di root repo + **shadcn/ui init** + Prisma + PostgreSQL; Route Handlers `app/api/v1/*` di **Node runtime**; struktur: Route Handler → service (`lib/`) → Prisma; zod + tipe shared untuk fe & API
- [x] Migration pertama Prisma: **27 tabel MVP** + seluruh index & CHECK (migration `init` + `hardening_constraints`):
  - unique parsial anti double-buy `transactions(account_id) WHERE status IN ('RESERVED','PAID','DISPUTED')` ✅
  - satu tagihan aktif `payments(transaction_id) WHERE status='PENDING'`; satu tema aktif ✅
  - `payments(external_id)` unique; `incoming_fund_id` unique parsial; index biasa `xendit_id` ✅
  - `CHECK (used BETWEEN 0 AND quota)`; dua `CHECK receipt_confirmed`/`confirmed_*`; CHECK akun siap jual wajib berkredensial ✅
  - partial index job: `expired_at WHERE RESERVED`, `warranty_start WHERE PAID & belum dikonfirmasi`; GIN atribut/cari ✅
  - index relasi sesuai daftar PLAN §6 (incl. `refunds(transaction_id)`, `email_tokens(user_id)`, `totp_recoveries(user_id)`) ✅
- [x] Seed (script seed Prisma, idempoten; semua `is_system`): role ADMIN & PEMBELI, menu awal (11), permission (27, incl. `totp:reset` + `:read`), matriks grant, 5 jenis game & 5 game awal, tema default, 4 halaman statis **terbit sebagai versi 1 di `static_page_versions`**; superadmin dari env `SUPERADMIN_*`
- [x] Seeder testing (`prisma/seed-testing.ts` + modul `prisma/seed/testing/*`): 35 akun (25 AVAILABLE, 5 RESERVED, 5 DELISTED), 85 foto, promo aktif/kedaluwarsa/nonaktif, 6 voucher (termasuk habis/kedaluwarsa/nonaktif), 3 buyer `@nexaplay.test`; akun dimiliki **superadmin dari `SUPERADMIN_*` (.env)**, `npm run db:seed:test` idempoten, `:reset` aman (menolak bila ada transaksi)
- [x] Tabel audit append-only: REVOKE UPDATE/DELETE untuk user aplikasi (`admin_audit_logs`, `audit_reveals`, `static_page_versions`) — terverifikasi `permissions denied`
- [x] Config dev/prod; secret fail-fast (baca dari file/`.env`, gagal start bila kosong — saat ini warn starter, fail-start aktif saat Fase 2 memasang JWT); modul `Clock` (injeksi waktu untuk tes); health route `/api/v1/health` tanpa detail internal; log query Prisma mati di prod
- [x] Infra job: `instrumentation.ts` dibuat (audit env startup); node-cron + advisory lock dipasang mulai fase 5
- [x] Postgres 18 lokal (sudah berjalan, **tanpa Docker**): buat DB `gamestore_dev` (+ shadow + `gamestore_test`) + user aplikasi (DML-only) + user migrasi (DDL) via SQL
- [x] `.env.example` lengkap tanpa nilai rahasia (sesuai §13); data contoh dev — **game_accounts contoh ditunda ke Fase 3** (butuh AES keyring untuk kredensial)

**Selesai bila:** `npm run build` sukses ✅; `\dt` menampilkan 27 tabel MVP ✅; seed terisi ✅.

## Fase 2 — Auth + RBAC-resolve 🔄

- [x] Register (BCrypt ≥ 8, role PEMBELI) + verifikasi email (token hash, kedaluwarsa, kirim-ulang)
- [x] Ganti email dua-tahap (`new_email` + konfirmasi); lupa/reset/ganti password
- [x] Login: JWT 15–30 menit + `token_version` + cek `active` tiap aksi/access-request
- [x] Refresh: cookie httpOnly + Secure + SameSite=Strict, **rotasi + toleransi 10–30 dtk**; logout satu-sesi & logout-semua
- [x] RBAC resolve dari database (menu + permission, hormati `revoked_at`); guard anti-kunci diri; CRUD RBAC tetap 🔵
- [x] TOTP di balik flag `TOTP_WAJIB_ADMIN`: setup/aktifkan (recovery tampil sekali), login/totp (anti-replay `totp_last_step`, terima recovery code), `recovery-baru` (password + TOTP, kode lama `revoked_at`), `reset-totp` (permission + re-auth + email target), alur `perlu_setup_totp` (token 15 menit terbatas), kunci `totp_failures`/`totp_locked_until` di DB; prosedur darurat CLI 🔴 (uji di fase 10)
- [x] Rate limit rate-limiter-flexible (in-memory) per bucket: login, register, email, token, refresh, totp (bucket checkout/reveal/polling/webhook dipasang di fase terkait)
- [x] Email admin infra (event operasional → inbox admin)
- [x] `admin_audit_logs` (INSERT/SELECT) + aksi pembaca audit-log
- [x] Aksi users: list, ubah role, aktif/nonaktif, `force-logout`, reset TOTP (UI panel menyusul Fase 8)

**Selesai bila:** cabut grant → akses tertutup; user nonaktif → token ditolak; dua tab refresh tidak saling rotasi; kunci TOTP bertahan lintas restart.

> Progres 2026-11-11: backend selesai (TOTP, rate limit, audit, users admin, email admin); UI akun pembeli `/account` selesai (profil, ganti email, ganti password, setup/regenerate TOTP, logout semua perangkat); login TOTP dua langkah + setup paksa admin selesai. Tinggal UI users di panel (Fase 8) — lihat PLAN v22.

## Fase 3 — Katalog 🔄

- [x] Master jenis-game & game (CRUD admin; "DELETE" = flip `active`; skema atribut dinamis per game — hanya boleh tumbuh)
- [x] Akun: mulai **draf → relist wajib kredensial**; state machine lengkap (`AVAILABLE/RESERVED/SOLD/DELISTED`); `release()` terpisah dari `relist()`; `restore()` wajib ganti kredensial 🔵
- [x] `DELETE /panel/accounts` **hanya saat `DELISTED`** (soft delete `deleted_at`); `RESERVED` tak bisa di-edit/delist
- [x] Kredensial tulis-saja: AES-GCM (IV 12 byte acak, AAD = `akun:<id>`, keyring `key_version`); tanpa GET; ditolak saat `RESERVED/SOLD`; flag `credentials_present`
- [x] Foto: URL + urutan; DELETE = soft (`account_photos.deleted_at`) — upload storage menyusul Fase 7
- [x] Slug unik + browse publik: hanya `AVAILABLE` dan `deleted_at IS NULL`; filter jenis/game/harga/atribut, urutan whitelist, `size` maks 100, `?q=` full-text
- [x] GIN `attributes` & `search_vector`; `use cache` + `cacheTag`/`updateTag` untuk data master

**Selesai bila:** unit test state machine hijau; DB berisi ciphertext (bukan plaintext); relist tanpa kredensial ditolak.

> Progres 2026-11-12: backend selesai + smoke katalog 33/33; UI katalog storefront sudah membaca 100 akun AVAILABLE pertama dari database (search/filter/sort client-side). Pagination, filter harga/atribut, full-text UI, promo/diskon, dan checkout menyusul Fase 7/5. Lihat PLAN v22.

## Fase 4 — Diskon 🔄

- [x] Strategy promo: persen/nominal + `max_discount`, cakupan AKUN > GAME > SEMUA (paling spesifik menang; **seri → potongan rupiah terbesar → `id` terbesar**), rentang `starts_at`–`ends_at`
- [x] Voucher: kode, `min_purchase`, kuota, `valid_until`, 1× per user (`voucher_usages` baris tak pernah dihapus)
- [x] Konsumsi kuota **atomik**: `UPDATE ... SET used = used + 1 WHERE id = ? AND used < quota` (0 baris → `VOUCHER_EXHAUSTED`)
- [x] Pratinjau total: promo dulu, voucher di atas harga setelah promo; persen **floor** ke rupiah; total akhir > 0
- [x] Pelepasan saat gagal/expire: usage → `DIPULIHKAN` + `used` turun (flip status, bukan hapus)
- [x] CRUD `/panel/vouchers` & `/panel/promotions`; publik: `/promo/aktif`, `/beranda` (cache promo aktif)

**Selesai bila:** unit test semua kasus batas hijau, termasuk 2 thread memperebutkan kuota terakhir.

> Progres 2026-11-11: backend selesai; smoke diskon 39/39 (termasuk race kuota terakhir, floor persen, tie-break promo, preview tanpa konsumsi, release/re-consume). UI checkout & panel voucher/promo menyusul Fase 5/7. Lihat PLAN v20.

## Fase 5 — Transaksi + Pembayaran 🔄 (fase terbesar)

**Checkout & idempotency**
- [x] Checkout 3 fase: klaim key (`$transaction` Prisma terpisah/pola REQUIRES_NEW, commit sendiri, `valid_until` = TTL 5 menit, `request_hash` = nama aksi + argumen serial) → transaksi DB (kunci user, batas 2 PENDING, reserve, hitung diskon vs `totalPratinjau` → `PRICE_CHANGED`, simpan `terms_version`) → panggil Xendit; facade `transaksiService.checkout()` + controller selesai
- [x] Hasil final apa pun → key `SELESAI` + snapshot; replay key mengembalikan snapshot; error final disimpan
- [x] `IdempotencyJob`: `PROCESSING` tanpa `transaction_id` lewat TTL → `KEDALUWARSA` (klaim ulang = overwrite)
- [x] Saklar `checkout_aktif` (tabel `settings`): mati → kode `CHECKOUT_CLOSED`; service pengaturan publik/admin selesai

**Xendit & webhook**
- [x] QRIS & VA API langsung + mock dev; `external_id` per tagihan (kode + nomor urut); kedaluwarsa tagihan = `transactions.expired_at`
- [x] Webhook satu pintu **dua-fase**: fase-1 `$transaction` Prisma terpisah (pola REQUIRES_NEW) simpan event (`DITERIMA`) → fase-2 cocokkan `amount` + `external_id` → efek atomik → `DIPROSES`/`GAGAL` (5xx agar retry); adapter per jenis callback di balik interface
- [x] Dedup `UNIQUE(type, incoming_fund_id)`; event `DIPROSES` dianggap duplikat, `GAGAL`/`DITERIMA` diproses ulang
- [x] `WebhookRetryJob` mengulang event `GAGAL`; [x] admin `/panel/webhook` + tombol `retry` (payload mentah, permission `webhook:retry`, audit)

**Status & uang**
- [x] `ExpiryJob` dasar (RESERVED lewat `expired_at` → `EXPIRED`, release akun/voucher, tagihan PENDING dibatalkan); [ ] pre-check tagihan ke Xendit + masa tenggang
- [x] Telat-bayar generik (EXPIRED/CANCELLED/FAILED): reserve-ulang bila `AVAILABLE` + **re-konsumsi voucher** (gagal → `NEEDS_REFUND` + email admin); jalur webhook + job expiry dasar selesai
- [x] Dana masuk tagihan lama saat `RESERVED` (changeMethod): terima → `PAID`, tagihan PENDING lain dibatalkan; gagal cancel & dana ikut masuk → `DUPLIKAT`
- [x] Aksi `batal` (tagihan lama dibatalkan ke Xendit best-effort)
- [x] `changeMethod` (QRIS ↔ VA, idempotent, satu tagihan PENDING, tagihan lama di-cancel, dana tagihan lama tetap diterima)
- [x] `DUPLIKAT`: pembayaran sendiri dengan `incoming_fund_id` sendiri; tak mengubah transaksi utama
- [x] Tabel `refunds` per pembayaran; `refund-complete`: `REFUNDED` **hanya bila Σ refund pembayaran utama = jumlah dibayar** (sisa tampil di ringkasan); transfer manual (rekening = catatan)
- [x] `mark-dispute` / `close-dispute` (tanpa refund → kembali `PAID`)
- [x] Reveal (aksi, rate-limited, tulis `audit_reveals` IP+UA); garansi dari **reveal pertama**
- [x] `paid_at`+`GARANSI_MAKS_TANPA_REVEAL_HARI` oleh AutoKonfirmasiJob; skip `DISPUTED`; [x] `allow-reveal` admin
- [x] Konfirmasi diterima (CHECK `receipt_confirmed`/`confirmed_*` konsisten); teks peringatan UI menyusul
- [x] `settings` publik & admin + `method` pembayaran
- [x] Admin: list/detail transaksi + linimasa webhook, aksi `sinkron`, `ringkasan` (+ sisa refund), `audit-reveal`

**Selesai bila:** tes konkurensi 2 thread hijau; webhook duplikat & tak berurutan & GAGAL→retry benar; dana menetap saat FAILED lewat jalur benar; kuota terakhir diperebutkan 2 thread; dana masuk tagihan lama setelah changeMethod; refund parsial.

> Progres 2026-11-12: core checkout, idempotency replay, reserve, harga server, voucher atomik, QRIS/VA (mock + adapter Xendit), webhook dua-fase, dedup, batal, reveal, konfirmasi, telat-bayar, `NEEDS_REFUND`, pengaturan, `changeMethod`, serta job `Idempotency`, `Expiry`, `WebhookRetry`, dan `AutoKonfirmasi` selesai. Smoke: checkout QRIS/VA, replay key, webhook PAID/duplikat, late-pay, cancel, reveal, konfirmasi, ganti QRIS→VA, dana masuk tagihan lama, no-op metode sama, replay changeMethod, expiry, retry webhook GAGAL→PAID, auto-konfirmasi. Data uji dibersihkan. Sisa: pre-check Expiry ke Xendit + masa tenggang, rekonsiliasi, retensi, refund/sengketa, admin transaksi/ringkasan/webhook-event, UI Fase 7/8.

## Fase 6 — Konten + laporan MVP 🔄

- [x] Halaman statis: edit draf (`static_pages`) → **terbit = versi naik + salinan beku ke `static_page_versions`**; baca versi lama (aksi/server component — bukti sengketa); checkout mengirim `terms_version`
- [x] Tema statis seed + terang/gelap pembeli (token jsonb validasi ketat: warna hex, font whitelist, URL https whitelist); editor tema tetap 🔵
- [x] Laporan: `penjualan`, `penjualan-per-games`, `refunds` — basis `paid_at`/`refunded_at`, zona Asia/Jakarta

**Selesai bila:** tes dengan `Clock` yang dimanipulasi hijau (kedaluwarsa, garansi, retensi).

> Progres 2026-11-13: backend konten + laporan selesai. `halamanService`/`halaman.controller` menyediakan list draf, edit draf, publish versi beku, daftar versi, dan baca versi lama; publik membaca versi terbit terakhir (draf tidak bocor). `laporanService` + `laporan.controller` menghitung penjualan harian, penjualan per game, dan refund per periode Jakarta. Tema MVP tetap statis (seed + toggle terang/gelap); editor dinamis tetap Fase 2. Verifikasi: `tsc`, `lint`, `build`; publish/version repo + laporan SQL smoke; checkout tetap 200. Sisa: tes unit dengan Clock/manipulasi waktu formal.

## Fase 7 — Frontend toko (Next.js) 🔄

- [x] Scaffold sudah dari Fase 1 (root: Next.js + TypeScript + Tailwind + shadcn/ui, **satu aplikasi**); skema/tipe/validasi zod **dibagikan** dari `lib/`
- [x] Halaman 🟢: beranda, katalog, auth, checkout (pratinjau, voucher, QRIS/VA + bank, centang S&K), halaman bayar (QR/VA, hitung mundur, polling status, ganti metode/batal), pesanan saya (list + detail + reveal + konfirmasi diterima + peringatan), akun saya
- [x] Halaman detail akun publik `/accounts/[slug]` dengan galeri, deskripsi lengkap, spesifikasi, promo, dan checkout popup (QRIS/VA, voucher, S&K) untuk user login
- [x] Halaman statis S&K/privasi/FAQ (+garansi), harga coret promo di katalog, paging/pencarian full-text server-side
- [x] Aturan: tombol disabled saat aksi berjalan; `kunciIdempoten` (`crypto.randomUUID()`) per niat checkout dan changeMethod; polling berhenti saat status final
- [x] Keamanan fe: kredensial hanya muncul dari respons aksi reveal di client, tidak masuk cache/URL/log; SSR katalog
- [x] Sanitasi markdown halaman statis + `sitemap.xml` + `robots.txt`

**Selesai bila:** alur beli end-to-end di browser dengan simulasi webhook (mock Xendit/dev).

> Progres 2026-11-13: checklist Fase 7 selesai. Halaman publik `/pages/{terms-and-conditions,privacy,warranty,faq}` membaca versi terbit, dirender markdown dengan `rehype-sanitize`; footer menautkannya dan `sitemap.xml` + `robots.txt` tersedia. Katalog sekarang memakai pencarian full-text, filter kategori, sorting, dan pagination 9 item/halaman di server; harga coret/diskon promo dihitung dari promo aktif. `tsc`/`lint`/`build` hijau; HTTP 200 untuk beranda, search, page 2, halaman statis, sitemap, robots; detail login/anonim dan checkout login tetap 200. Sisa: verifikasi alur beli end-to-end di browser (gate Fase 7).

## Fase 8 — Frontend admin ✅

- [x] Panel admin dirender dari menu database (server component, tabel `role_menus` — sidebar dinamis)
- [x] Kelola: akun (draf/relist/delist/kredensial/foto), jenis game, game, voucher, promo, halaman statis (terbit + riwayat versi), user, pengaturan
- [x] Transaksi: daftar + detail + linimasa webhook + antrean **refund/sengketa/DUPLIKAT** dari dashboard operasional
- [x] Audit-log reader; editor tema ditandai disabled (Fase 2)
- [x] Sinkron status Xendit dari detail transaksi (polling pembayaran QRIS; VA tetap lewat webhook)

**Selesai bila:** admin menjalankan semua kelola lewat UI admin.

> Progres 2026-11-13: panel responsif + sidebar ikon dari DB; dashboard operasional; transaksi list/detail/ringkasan + aksi sengketa/tutup/refund/izin reveal + **sinkron QRIS**; akun list/baru/detail (edit, kredensial, foto, status); master jenis/game dengan editor penuh; voucher/promo dengan editor penuh; halaman draf/terbit/riwayat teks; users; pengaturan + penanda tema Fase 2; audit; webhook inbox + proses ulang manual. Verifikasi: `tsc`, `lint`, `build`; seluruh halaman panel GET 200 dengan sesi admin; aksi `updateVoucherAction`, `updatePromoAction`, `updateGameAction`, dan `sinkronTransaksiAdminAction` dipanggil lewat protokol Server Action dengan sesi admin — data uji dibuat, diubah, lalu dibersihkan. Verifikasi visual browser belum dilakukan karena environment tanpa browser.

## Fase 9 — Integrasi & regresi ✅
- [x] DB test lokal (Postgres native): `gamestore_test` — global setup drop schema + `prisma migrate deploy` dari nol + grant user DML; `TRUNCATE ... CASCADE` antar-test; email dev tetap log transport

- [x] Mock payload Xendit + route handler HTTP: suite webhook (duplikat, tak berurutan, GAGAL→retry job, telat-bayar + re-konsumsi voucher, NEEDS_REFUND, DUPLIKAT, changeMethod, terminal EXPIRED, auth token)
- [x] Regression: migrasi, diskon, katalog publik, halaman versi beku, laporan, webhook, dan job hijau bersama-sama

**Selesai bila:** `npm run test` hijau.

> Progres 2026-11-13: Fase 9 ✅. `npm run test` menjalankan Vitest dengan global setup yang menghapus schema `gamestore_test`, menerapkan seluruh migration dari nol via `prisma migrate deploy`, lalu memberi grant DML ke user aplikasi. `tests/integration/webhook.test.ts` menguji state machine lengkap + job retry/expiry/auto-konfirmasi; `webhook-route.test.ts` menguji route HTTP (401/400/200/500). Regression tambahan mencakup diskon, katalog publik, publish halaman beku, dan laporan Jakarta. **49 tes / 15 file hijau**; `tsc`, `lint`, `build` juga hijau.

## Fase 10 — Hardening produksi 🟡 ⬜

- [x] Checklist keamanan §14: HSTS/CSP/frame-deny/nosniff di `next.config.ts` (terverifikasi lewat `next start` + `curl -I`); `poweredByHeader=false`; typed-union tetap; object-level transaksi diuji; log JSON ter-redaksi + correlation id webhook; query Prisma tidak di-log
- [x] Email: SMTP Nodemailer via `MAIL_*`, preview dev ke `.next/dev/mail` (0600), error generik, `lower(email)`; **SPF/DKIM/DMARC tetap tugas operator DNS**
- [x] Backup/alert: `deploy/backup-db.sh`, `restore-test.sh`, systemd unit/timer, Dependabot, alert job/webhook/RESERVED + heartbeat health; **instalasi server + uji restore staging tetap operator**
- [x] **Wajibkan TOTP admin** (`TOTP_WAJIB_ADMIN=true` divalidasi saat startup produksi) + CLI darurat `npm run totp:darurat` (audit, cabut sesi/recovery, email) + tes integrasi
- [x] Retensi `RetensiJob` aktif (payload 90 hari hanya `DIPROSES`, snapshot 30 hari, token teknis, heartbeat) + `pdp:anonim-audit` & `pdp:hapus` (DDL user, audit `actor_id NULL`) + tes integrasi

**Selesai bila:** semua butir checklist §14 tercentang.

> Progres 2026-11-13: kode hardening selesai; `npm run test` = 49 tes / 15 file hijau, `tsc`/`lint`/`build` hijau, header produksi terverifikasi. Sisa Fase 10 hanya butir operator: DNS SPF/DKIM/DMARC, inbox alert nyata, user non-root/Postgres localhost/secret file, instalasi systemd + backup/restore staging, uptime eksternal, dan teks final S&K/privasi.

---

## Fase 2 produk 🔵 (setelah MVP hidup)

| # | Fase | Isi |
|---|---|---|
| 11 | Komplain | `/panel/complaints` + `decide` (TOLAK/REFUND/GANTI_AKUN), `restore()`, tes E2E Playwright |
| 12 | RBAC & laporan penuh | CRUD `/rbac/*`, editor tema, laporan per-jenis/lama-terjual/stale/diskon, audit reader fe |
| 13 | Wishlist & cache | Wishlist (+slug), cache katalog, retry webhook UI |
| 14 | Pertumbuhan | Dashboard grafis, ulasan/testimoni, notifikasi Telegram |
