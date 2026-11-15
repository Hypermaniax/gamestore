# 📋 PLAN.md — Toko Online Akun Game (Full-stack Next.js) — v29

> Website toko online penjualan akun game (Mobile Legends, Clash of Clans, Genshin, PUBG, dll).
> **Satu aplikasi Next.js** (halaman + aksi server). Dirancang production-grade sejak awal, sekaligus
> sarana belajar full-stack TypeScript dalam konteks nyata.
>
> **Spesifikasi kontrak server tidak lagi diulang di dokumen ini** — `API.md` (v11)
> adalah **sumber kebenaran modul & aksi server** yang disepakati bersama; PLAN hanya merujuk.
> **Label:** 🟢 **MVP** = wajib untuk toko bisa jualan · 🔵 **Fase 2** = peningkatan
> setelah MVP jalan · 🔴 **Wajib sebelum go-live** = boleh dikerjakan belakangan,
> tapi tidak boleh dilewati sebelum toko dibuka untuk publik.

---

## 1. Ringkasan & Ruang Lingkup

Prinsip utama: **1 akun game = barang unik, stok selalu 1.** Setelah terjual, akun hilang dari katalog.

Satu aplikasi full-stack dalam satu repo:

- **Root repo** — Next.js (App Router): halaman toko + panel admin; logika domain dijalankan lewat **Server Actions** & server component (domain, pembayaran Xendit, keamanan, RBAC dari database) — berjalan di **Node.js**, bukan Edge (driver PostgreSQL + `node:crypto` tidak tersedia di Edge); UI pakai **shadcn/ui**
- **Tidak ada lapisan API HTTP publik**: logika server dipanggil **langsung** — server component memanggil service, komponen klien via **Server Actions** (`"use server"`). Dua pengecualian yang tetap HTTP: webhook Xendit (callback dari luar) dan `/api/v1/health` (uptime check). Lebih aman: tak ada endpoint enumerasi, Server Actions menolak request lintas-origin + POST saja

### Fitur inti (permintaan)

| Fitur | Ringkasan |
|---|---|
| Pembeli wajib punya akun | Daftar + verifikasi email; belum verifikasi = boleh lihat, tidak boleh checkout |
| Diskon | Voucher (pakai kode) + Promo otomatis (per akun / game / semua) |
| Tema website | Tema disimpan di database, admin ganti tanpa deploy; pembeli pilih terang/gelap |
| Pembayaran tidak dobel | Idempotency, satu tagihan aktif, webhook idempotent, penanganan bayar ganda |
| Pembayaran gagal = digagalkan | Status `FAILED`; akun, voucher, dan promo otomatis dikembalikan |
| Jenis game | Master `game_types` dan `games`; atribut akun fleksibel per game |

### Peningkatan v6 (dibanding v4 — hasil review integrasi)

| # | Peningkatan | Alasan |
|---|---|---|
| 1 | **`webhook_events` dua-fase**: payload mentah disimpan langsung di transaksi terpisah (`REQUIRES_NEW`, status `DITERIMA`) → proses → `DIPROSES/GAGAL`; dedup **`type + incoming_fund_id`** | Event yang gagal jadi tersimpan dan bisa `retry` + linimasa debugging benar-benar bekerja |
| 2 | **`close-dispute`** (`DISPUTED → PAID` tanpa refund); `AutoKonfirmasiJob` skip `DISPUTED` | Transaksi tidak macet & akun tidak terkunci selamanya oleh unique index |
| 3 | **Akun baru = `DELISTED` (draf)**; `relist()` wajib kredensial terisi; `PUT credentials` ditolak saat `RESERVED/SOLD`; flag `credentials_present` di admin | Tidak ada akun terjual dengan kredensial kosong |
| 4 | **`idempotency_keys` lengkap**: `request_hash`, snapshot respons, job pembersih; `changeMethod` ikut memakai key | "key sama isi beda → 422" dan "respons sama" jadi mungkin |
| 5 | **Rotasi refresh token ber-toleransi 10–30 dtk** | Dua tab refresh bersamaan tidak dianggap pencurian (logout acak) |
| 6 | **Kolom refund**: `refund_ref`, `refund_jumlah`, `refund_fee`, `refunded_at` | `refund-complete` & `/panel/reports/refund` punya basis data |
| 7 | **Telat-bayar generik**: dana masuk saat `EXPIRED`/`CANCELLED`/`FAILED` diperlakukan sama | QR/VA bisa saja belum mati di Xendit walau transaksi sudah diputus |
| 8 | **`restore()` wajib kredensial diganti** | Kredensial lama sudah pernah direveal pembeli sebelumnya |
| 9 | **TOTP rapi**: permission `totp:reset` + re-autentikasi + email pemberitahuan + recovery code jadi **tabel `totp_recoveries`** + **prosedur darurat CLI** | "Super admin" melanggar model permission; satu kolom hash tidak cukup; admin tunggal kehilangan perangkat harus punya jalan keluar |
| 10 | **Alur refund eksplisit** (manual admin; rekening tujuan sebagai catatan bebas) + email notifikasi admin masuk MVP | NEEDS_REFUND harus punya cara dijalankan; metrik saja tak ada yang membaca |
| 11 | **Rate limit per bucket**: polling status & webhook punya bucket/whitelist sendiri | Polling 30 menit & retry Xendit jangan kena limit umum |
| 12 | **Garansi dari reveal pertama**; `audit_reveals` + IP & user-agent; SPF/DKIM/DMARC; ganti-email; email unik via `lower(email)`; wishlist pakai slug | Keadilan garansi, bukti sengketa, email sampai, enumerasi |
| 13 | **MVP dirampingkan**: /rbac CRUD, editor tema, dan 3 laporan endpoint pindah Fase 2 (seed & aturan RBAC tetap MVP) | Skema lengkap tetap; scope kerja MVP fokus jualan |
| 14 | **`API.md` jadi sumber kebenaran API; OpenAPI springdoc → generate tipe TS** | Dua dokumen tidak lagi saling bertentangan; kode error & skema respons di-generate |

### Peningkatan v7 (dibanding v6 — review konsistensi dokumen & celah desain)

| # | Peningkatan | Alasan |
|---|---|---|
| 1 | **Tabel `refunds` per pembayaran** (menggantikan kolom `refund_*` di `transactions`) | Refund pembayaran `DUPLIKAT` tidak boleh mengubah transaksi utama menjadi `REFUNDED`; mendukung refund parsial/ganda; laporan akurat |
| 2 | **`release()`** (`RESERVED → AVAILABLE`) terpisah dari `relist()`; CHECK DB: akun `AVAILABLE/RESERVED` wajib berkredensial | Job expiry/FAILED sebelumnya memakai `relist()` yang berarti `DELISTED → AVAILABLE` dan wajib kredensial; ERD tak punya panah pelepasan |
| 3 | **Batas garansi tanpa reveal**: `warranty_start = paid_at + 30 hari` (diisi job) bila tak pernah reveal | Garansi dari reveal pertama tak pernah mulai jika pembeli tak reveal → `AutoKonfirmasiJob` tak pernah jalan |
| 4 | **Matriks transisi transaksi eksplisit** (dari → ke, pemicu, efek samping) | Status asal tiap aksi admin sebelumnya tak tertulis; `PAID → REFUNDED` langsung dilarang (wajib lewat `DISPUTED`) |
| 5 | **Idempotency**: PK `(user_id, key)`, klaim key di awal, status `PROCESSING/SELESAI`, 409 bila permintaan sama masih berjalan | ERD memakai `key` sebagai PK tunggal; snapshot respons baru ada setelah fase 2 (Xendit) selesai |
| 6 | **`totalPratinjau`** dikirim saat checkout → `422 PRICE_CHANGED` bila beda | Promo/harga bisa berubah antara pratinjau dan bayar; cegah sengketa "harga beda" |
| 7 | **Ganti email lengkap**: `email_tokens.new_email`, jenis `GANTI_EMAIL_LAMA/BARU`, endpoint konfirmasi, wajib password | Tabel sebelumnya tak punya tempat menyimpan email tujuan |
| 8 | **`refresh_tokens`**: `family_id`, `replaced_at`, `replaced_by_token_id`, hash unik | Toleransi rotasi + deteksi pemakaian ulang butuh rantai token |
| 9 | **TOTP**: anti-replay (`totp_last_step`), `totp_key_version`, token sementara 5 menit + rate limit; **endpoint TOTP dibangun di tahap 2**, diwajibkan di tahap 10 (`TOTP_WAJIB_ADMIN`) | Kontrak login berubah; membangun di tahap 10 memaksa rework panel admin tahap 8 |
| 10 | **`payments.incoming_fund_id`** terpisah dari `xendit_id` (ID tagihan) | Dana kedua ke QR/VA yang sama (DUPLIKAT) punya ID pembayaran sendiri; **verifikasi payload Xendit di tahap 5** |
| 11 | **Tabel `settings`** + saklar `checkout_aktif` | `/settings/public` tak punya sumber; perlu tombol darurat (Xendit down / lonjakan NEEDS_REFUND) |
| 12 | **`WebhookRetryJob`** + `retry` jadi endpoint MVP; `ExpiryJob` cek status Xendit sebelum `EXPIRED` | Event `GAGAL` tak menunggu admin; kurangi kasus telat-bayar |
| 13 | **Audit append-only** (REVOKE UPDATE/DELETE), alert webhook GAGAL + uptime check, prosedur PDP manual | Log bukti tak boleh diubah; v6 menghapus butir "alert dasar" |
| 14 | **Sinkron dokumen**: `user_id` seragam, katalog permission (`totp:reset`, `transaction:refund`, …) + matriks endpoint↔permission, label fase API ikut v6, kardinalitas ERD diperbaiki | Dokumen tidak saling bertentangan |

### Peningkatan v9 (dibanding v8 — review celah logika & konsistensi dokumen)

| # | Peningkatan | Alasan |
|---|---|---|
| 1 | **Telat-bayar → reserve-ulang `PAID` mengonsumsi ulang voucher** (usage → `TERPAKAI`, `used`++); rumusan "tidak menambah potongan"; re-konsumsi gagal → `NEEDS_REFUND` | v8 mem-flip usage jadi `DIPULIHKAN` saat `EXPIRED`, tetapi transaksi `PAID` tetap membawa potongan → voucher bisa dipakai lagi (double-dip) |
| 2 | **Aturan dana masuk di tagihan lama saat `RESERVED`** (setelah `changeMethod`): diterima otomatis → `PAID`, tagihan `PENDING` lain dibatalkan, gagal batal → `DUPLIKAT` | Kasus ini tak punya aturan: telat-bayar hanya untuk `EXPIRED/CANCELLED/FAILED`, `DUPLIKAT` hanya untuk transaksi `PAID` |
| 3 | **Idempotency**: klaim key `REQUIRES_NEW`; respons final (4xx fase-1, error Xendit) → `SELESAI` + snapshot error; `PROCESSING` ber-TTL 5 menit; `request_hash` memuat metode + path | Key bisa nyangkut `PROCESSING` bila fase-1 gagal / timeout / crash |
| 4 | **`REFUNDED` hanya bila Σ refund = jumlah dibayar**; ringkasan menampilkan sisa refund | Tabel `refunds` mendukung parsial, tapi v7/v8 langsung `REFUNDED` pada refund pertama |
| 5 | **Tabel `static_page_versions`** (append-only) — skema **30 tabel (MVP 28)** | `terms_version` hanya angka; teks yang disetujui hilang saat halaman diedit (bukti sengketa) |
| 6 | **Kuota voucher atomik + CHECK**; **`payments.external_id` per tagihan**; `webhook_events.xendit_id` → **`incoming_fund_id`** | Race kuota terakhir; `changeMethod` membuat tagihan baru dengan `external_id` sama; `xendit_id` berarti dua hal berbeda |
| 7 | **TOTP**: alur `perlu_setup_totp` saat wajib, `totp_failures`/`totp_locked_until`, `/auth/totp/recovery-baru` | Admin baru tak punya jalan setup saat flag wajib; kunci sementara tak punya penyimpanan; recovery code tak bisa diregenerasi |
| 8 | **Retensi data** (§6) + `RetensiJob` + prosedur anonimisasi audit via `DATABASE_URL` | `idempotency_keys`/`webhook_events` tumbuh tanpa batas (v8 melarang hapus); IP/UA di bukti audit vs UU PDP |
| 9 | **Aturan hapus**: akun hanya saat `DELISTED`, master = flip `active`, katalog memfilter `deleted_at` | Soft delete akun `AVAILABLE` tetap tampil di katalog; "CRUD" master tak jelas artinya |
| 10 | **Promo seri** → potongan rupiah terbesar; potongan persen **floor** | Tie-break & pembulatan belum ditentukan |
| 11 | **Sinkron dokumen**: kardinalitas ERD, string versi, label fase (tema), tahap tiap endpoint MVP, permission `:read`, 4 index baru, CHECK `receipt_confirmed`/`confirmed_*`, keputusan #2/#3 pindah ke Terkunci | Dokumen saling bertentangan / ada endpoint tanpa tahap |

## 2. Keputusan

### Terkunci

- Toko pribadi: hanya ADMIN yang memasarkan akun; pembeli berperan PEMBELI
- 1 transaksi = 1 akun; anti double-buy dijamin di database (partial unique index)
- Xendit: **QRIS dan Virtual Account API langsung** (bukan invoice)
- Expiry pembayaran **30 menit**; maksimum **2 transaksi PENDING** per user
- Reveal kredensial boleh diulang; **garansi dihitung dari reveal pertama** (bukan paid_at), rate-limited, selalu tercatat (IP + user-agent)
- **Full-stack Next.js** (App Router + TypeScript; logika di **Server Actions** + server component) — versi dibuktikan lewat build nyata di tahap 1; tanpa lapisan API HTTP publik (webhook + health saja)
- RBAC dinamis dari database (menu dan permission), `is_system`, guard anti-kunci diri; **CRUD aksi admin-nya Fase 2 🔵** (seed tetap MVP)
- **`webhook_events` dua-fase**, dedup `type + incoming_fund_id`; webhook atomik untuk efek status
- **Telat/dana-menetap (EXPIRED/CANCELLED/FAILED) → aturan yang sama** (reserve ulang bila akun masih AVAILABLE, kalau tidak `NEEDS_REFUND`)
- **Refund = manual admin**; rekening tujuan ditulis sebagai **catatan bebas** (tidak disimpan sebagai data bank — hemat UU PDP); opsinya terhadap Xendit diperiksa saat tahap 5
- **Tabel `Komplain`/`wishlist` tetap dari Fase 2**, jalur sengketa manual (`mark-dispute` + `close-dispute` + `refund-complete`) sudah di MVP
- Kredensial tidak pernah dikirim lewat email atau ditampilkan di URL
- **`API.md` = sumber kebenaran modul & aksi server (v10); React Server Components + Server Actions — tanpa lapisan API publik; webhook Xendit + health tetap HTTP**
- **Refund dicatat per pembayaran** (tabel `refunds`): satu pembayaran boleh punya lebih dari satu refund; refund pembayaran `DUPLIKAT` tidak mengubah status transaksi utama
- **Akun**: `RESERVED → AVAILABLE` lewat `release()` (bukan `relist()`); DB menjaga `AVAILABLE/RESERVED` selalu berkredensial (CHECK)
- **Garansi**: mulai dari reveal pertama, atau `paid_at + 30 hari` bila tak pernah reveal (diisi job)
- **Saklar `checkout_aktif`** (tabel `settings`) untuk menutup checkout saat darurat
- **Aksi TOTP dibangun di tahap 2** (flag `TOTP_WAJIB_ADMIN`), diwajibkan sebelum go-live; TOTP diminta pada semua aksi admin sensitif
- **Email wajib terverifikasi sebelum checkout** (mengurangi akun palsu/griefing, memungkinkan lupa password)
- **Promo dan voucher boleh digabung**: promo dulu, voucher di atas harga setelah promo; total akhir tetap > 0
- **Voucher dikonsumsi ulang saat telat-bayar** (reserve-ulang → `PAID`); gagal → `NEEDS_REFUND`
- **`REFUNDED` hanya bila Σ refund pembayaran utama = jumlah dibayar**; refund parsial menyisakan "sisa refund"
- **`external_id` Xendit per tagihan** (kode transaksi + nomor urut), bukan per transaksi
- **Panel admin di URL `/panel`** (bukan `/admin`): folder `app/(secret)/panel/`; guard = server component di layout (sesi ADMIN; bila bukan → redirect login); halaman dalam panel juga dicek per permission; sidebar = tabel `menus`+`role_menus` dari DB
- **Teks S&K yang disetujui disimpan** di `static_page_versions` (append-only)
- **Framework frontend: Next.js (React + TypeScript) + Tailwind CSS + shadcn/ui** — zod + tipe shared untuk fe & API (satu aplikasi); frontend tidak memuat logika harga/status

### Perlu dikonfirmasi (rekomendasi di kanan)

| # | Pertanyaan | Rekomendasi |
|---|---|---|
| 1 | Siapa yang menanggung biaya refund (fee Xendit)? | Putuskan di kebijakan refund (halaman statis) sebelum go-live |
| 2 | Fee Xendit saat **pembelian**: diserap penjual atau dibebankan ke pembeli? | Hitung margin untuk akun murah (fee flat VA bisa besar). **Putuskan sebelum migration pertama Prisma (tahap 1)** karena memengaruhi skema: bila dibebankan, tambah `biaya_layanan` di snapshot `transactions`, `payments.amount` = total + biaya, dan di rumus harga. Bila belum diputuskan saat tahap 1, kolom ditambah lewat migration baru sebelum tahap 5 |

(Keputusan "email wajib terverifikasi", "promo + voucher boleh digabung", dan "framework frontend Next.js" sudah dipindah ke **Terkunci**.)

## 3. Arsitektur & Layout Repo

```
Browser
  │ HTTPS
  ▼
Reverse proxy (Caddy/Nginx)  ── satu domain
  └──► next start  (Next.js: halaman toko + admin + Server Actions) ◄── webhook ── Xendit
                      │
                      ▼
              PostgreSQL native di host (tidak diekspos ke luar)
```

```
repo/                    # aplikasi di ROOT (tanpa subfolder be/fe/web)
├── app/                 # RUTE & HALAMAN SAJA (SSR) + app/(secret)/panel/ + 2 rute HTTP: webhook xendit & health
├── components/           # UI: shadcn (`ui/`) + `storefront/` (header, hero, katalog, modal, footer)
├── src/                  # BACKEND (3 layer)
│   ├── controllers/      # layer 1: Server Actions ("use server") — terima dari client, mis. auth.controller.ts
│   ├── services/         # layer 2: aturan bisnis + objek publik (authService, rbacService, emailService)
│   ├── repositories/     # layer 3: satu-satunya yang import lib/prisma — mis. user-repo.ts
│   ├── validation/       # skema zod bersama server + client (pure) — mis. auth.ts, common.ts, parse.ts
│   └── lib/              # infra bersama: prisma.ts, clock.ts, secret.ts, session.ts, utils.ts
├── prisma/               # schema + migrations + seed
├── generated/            # Prisma client (output build schema — tetap di root)
├── public/
├── docs/                 # PLAN.md (dokumen ini), API.md, ERD.md, PHASES.md (checklist fase)
└── .env.example          # daftar variabel (tanpa nilai rahasia)
```

Struktur kode 3 layer (v13): halaman/controller → service → repository → Prisma.
- **Controller** (`src/controllers/`, Server Actions): menerima payload dari client, TIDAK memuat validasi bisnis — langsung delegasi ke service.
- **Service** (`src/services/`): permukaan publik diekspor sebagai object (`authService`, `rbacService`, `emailService`); memvalidasi input lewat skema zod bersama (`src/validation/`), menjalankan aturan domain, state machine, `$transaction`, cookie/j_token — TIDAK menyentuh `prisma` langsung, dan TIDAK tahu bentuk UI.
- **Repository** (`src/repositories/`, `*-repo.ts`): murni query; di sinilah operasi data-level atomik (mis. rotasi refresh token, konsumsi token verifikasi) dibungkus `$transaction`; TIDAK memiliki aturan bisnis dan TIDAK menyentuh cookie.
Logika domain dan validasi (zod) dibagikan antara server dan client component; frontend tidak memuat logika harga atau status.
Sebagian segmen di panel memakai `export const instant = false` (akses cookie harus blocking — guard auth).

## 4. Tech Stack

### Aplikasi (Next.js full-stack)

| Teknologi | Catatan |
|---|---|
| Next.js (App Router) + TypeScript | Halaman (SSR katalog/detail untuk SEO) — logika via **Server Actions** & server component (Node.js, bukan Edge: driver PostgreSQL + `node:crypto` tidak tersedia di Edge); webhook & health tetap Route Handler |
| PostgreSQL + Prisma | `prisma migrate` berversi; file migration yang sudah di-apply **tidak pernah diedit**; CHECK & partial index ditulis lewat SQL mentah di migration |
| zod + tipe shared | Satu definisi skema/tipe untuk Server Action **dan** server/client component — tidak perlu generate OpenAPI; hasil aksi = typed-union `{ ok, code, pesan }` (BigInt dikonversi string di boundary) |
| jose (JWT HS256) | Secret fail-fast, token pendek + `token_version`; middleware auth di Node runtime |
| bcrypt | Hash password (minimal 8 karakter) |
| otplib | TOTP 2FA admin (🔴 sebelum go-live) |
| Nodemailer | Verifikasi, ganti email, reset password, notifikasi transaksi & admin (dev: log transport, opsional Mailpit binary) |
| rate-limiter-flexible (in-memory) | Rate limit per-IP dan per-user — **bucket terpisah: login, checkout, polling, webhook**; cukup single-instance |
| node:crypto (AES-GCM) | IV 12 byte acak, AAD = `akun:<id>`, keyring `key_version → key`, key dari file/secret |
| node-cron + `instrumentation.ts` | Job terjadwal (Expiry, AutoKonfirmasi, Rekonsiliasi, Retensi, WebhookRetry, Idempotency); lock job di database (pg advisory lock) — relevan bila multi-instance |
| Vitest + DB lokal | Integration test memakai `DATABASE_URL` yang sama; global setup drop schema + `prisma migrate deploy`; wajib `ALLOW_DESTRUCTIVE_TESTS=1`; mock server Xendit untuk webhook suite |
| PostgreSQL 18 native | Server berjalan di host — **tanpa Docker**; satu database dev dipakai aplikasi, migration, seed, dan test |
| Docker | ~~dibuang~~ — Postgres, Mailpit, dan app semuanya berjalan native di host (keputusan v11: Docker terlalu berat) |

### Frontend (bagian dari aplikasi yang sama)

| Teknologi | Catatan |
|---|---|
| Tailwind CSS + CSS variables | Token tema dari API dipetakan ke variabel CSS |
| shadcn/ui | Komponen UI siap pakai (Button, Dialog, Table, Form, Toast, dsb.) di atas Tailwind — cepat & konsisten; token tema tetap via CSS variables |
| TanStack Query | Cache data klien, polling status pembayaran (interval ringan) |
| Playwright | Tes E2E (🔵) |
| Token | Access token di memori; refresh di cookie httpOnly + Secure + SameSite=Strict; rotasi + toleransi 10–30 dtk |

## 5. Domain

### 5.1 Jenis game dan game 🟢
- `game_types`: kategori besar (MOBA, Battle Royale, Strategi, RPG/Gacha, FPS, dst)
- `games`: Mobile Legends, Clash of Clans, Genshin Impact, dst; setiap game punya satu jenis
- Atribut berbeda per game (rank ML, TH level CoC, Adventure Rank Genshin): `game.attribute_schema` (jsonb: daftar field + tipe + wajib/opsional) dan `game_accounts.attributes` (jsonb) **divalidasi terhadap skema game** saat disimpan. Jenis dan game baru ditambah lewat data, tanpa ubah kode.

### 5.2 Status akun (state machine) 🟢
**Akun baru selalu mulai dari `DELISTED` (draf)** — tidak bisa tampil/terjual sebelum kredensial diisi.

`DELISTED → AVAILABLE` (via `relist()`, **wajib kredensial terisi**) → `RESERVED` → `SOLD`;
`AVAILABLE → DELISTED` (via `delist()`); **`RESERVED → AVAILABLE` (via `release()`)** saat transaksi `EXPIRED`/`FAILED`/`CANCELLED` — `relist()` khusus untuk `DELISTED → AVAILABLE` dan tidak dipakai untuk melepas reservasi.
Transisi hanya lewat `reserve()`, `release()`, `markSold()`, `relist()`, `delist()`, `restore()`; **tidak ada setter publik** untuk status.
Database ikut menjaga: `CHECK (status NOT IN ('AVAILABLE','RESERVED') OR credentials_encrypted IS NOT NULL)`.

- `RESERVED` tidak boleh di-edit atau di-delist
- **`PUT credentials` ditolak saat `RESERVED`/`SOLD`** — kredensial jangan berubah saat transaksi berjalan
- **`restore()` (`SOLD → AVAILABLE`) wajib kredensial diganti dulu** — yang lama sudah pernah direveal
- Tidak ada hard-delete (soft delete lewat `deleted_at`); **`DELETE` hanya boleh saat `DELISTED`** — `SOLD` tidak boleh dihapus (riwayat transaksi), `AVAILABLE`/`RESERVED` harus di-delist dulu; query katalog publik, `/beranda`, dan `sitemap.xml` selalu memfilter `deleted_at IS NULL`
- Admin melihat flag **`credentials_present`** di detail (dari kolom: `credentials_encrypted IS NOT NULL`) — karena admin tidak bisa membaca isinya

### 5.3 Harga dan diskon 🟢
```
initial_price        (snapshot harga akun saat checkout)
− promotion_discount (promo otomatis, bila ada)
− voucher_discount   (kode voucher, bila dipakai)
= total              (wajib > 0 dan ≥ minimum nominal Xendit)
```
Semua rincian disimpan di `transactions` sebagai snapshot; laporan tidak berubah walau harga/promo diubah kemudian. Potongan persen **dibulatkan ke bawah (floor)** ke rupiah penuh, lalu dibatasi `max_discount`.

### 5.4 Status transaksi (state machine) 🟢

| Status | Arti |
|---|---|
| `RESERVED` | Akun ditahan, menunggu pembayaran |
| `PAID` | Lunas; kredensial bisa direveal |
| `EXPIRED` | Lewat batas waktu tanpa pembayaran |
| `FAILED` | Pembayaran gagal/ditolak, atau pembuatan tagihan gagal pasti |
| `CANCELLED` | Dibatalkan sebelum lunas |
| `NEEDS_REFUND` | Dana masuk tetapi tidak bisa dipenuhi (telat bayar & akun sudah dijual) |
| `REFUNDED` | Refund diselesaikan admin (tercatat di tabel `refunds`) |
| `DISPUTED` | Sengketa (manual admin di MVP) — **`AutoKonfirmasiJob` tidak menyentuh status ini** |

Transisi hanya lewat method domain: `pay()`, `expire()`, `fail()`, `cancel()`, `markRefund()`, `markRefunded()`, `dispute()`, `tutupSengketa()` (kembali `PAID`), `resolveDispute()` 🔵.

**Telat/dana-menetap (EXPIRED/CANCELLED/FAILED, QR/VA ternyata belum mati):**
1. Akun masih `AVAILABLE` → reserve ulang atomik → `PAID` + akun `SOLD`
2. Akun sudah dipegang/dijual orang lain → `NEEDS_REFUND` + email admin

Aturan tambahan telat-bayar: jumlah yang sudah dibayar **final** (snapshot tidak berubah; **tidak ada potongan tambahan**), tetapi voucher **dikonsumsi ulang** saat reserve-ulang → `PAID`: baris `voucher_usages` di-overwrite jadi `TERPAKAI` (`transaction_id` transaksi ini) dan `used` naik lewat `UPDATE ... WHERE used < quota`. Bila re-konsumsi tidak mungkin (kuota sudah habis, atau voucher sudah `TERPAKAI` oleh transaksi aktif lain milik pembeli yang sama) → `NEEDS_REFUND` (diselesaikan admin lewat CS). Bila pembeli yang sama sudah memegang transaksi `RESERVED` baru untuk akun yang sama, dana lama tetap `NEEDS_REFUND` (kasus langka, diselesaikan admin lewat CS).

**Dana masuk di tagihan lama saat transaksi masih `RESERVED`** (setelah `changeMethod`, tagihan lama berstatus `CANCELLED` tapi QR/VA-nya ternyata belum mati): dana **diterima** — pembayaran lama itu menjadi `PAID`, transaksi `PAID`, akun `SOLD`, dan tagihan `PENDING` yang sedang aktif dibatalkan ke Xendit (jadi `CANCELLED`). Bila tagihan itu gagal dibatalkan dan dananya ikut masuk, dana kedua dicatat pembayaran `DUPLIKAT`. Pencocokan lewat `external_id` per tagihan. Voucher tidak berubah (transaksi tak pernah keluar dari `RESERVED`).

**Matriks transisi transaksi** (satu method domain + satu tes unit per baris):

| Dari | Ke | Pemicu / aktor | Efek samping |
|---|---|---|---|
| `RESERVED` | `PAID` | webhook lunas (tagihan aktif **atau tagihan lama `CANCELLED` akibat changeMethod**) / `sync` / rekonsiliasi | akun `SOLD`, `paid_at`, email pembeli; tagihan `PENDING` lain dibatalkan |
| `RESERVED` | `EXPIRED` | `ExpiryJob` | akun `release()`, voucher dikembalikan (usage → `DIPULIHKAN`) |
| `RESERVED` | `FAILED` | Xendit gagal / 4xx saat buat tagihan | akun `release()`, voucher dikembalikan (usage → `DIPULIHKAN`) |
| `RESERVED` | `CANCELLED` | pembeli `/batal` | tagihan dibatalkan di Xendit, `release()`, voucher dikembalikan (usage → `DIPULIHKAN`) |
| `EXPIRED`/`CANCELLED`/`FAILED` | `PAID` | dana masuk & akun masih `AVAILABLE` | reserve ulang atomik, akun `SOLD`, voucher **dikonsumsi ulang** (usage → `TERPAKAI`, `used`++; gagal → `NEEDS_REFUND`) |
| `EXPIRED`/`CANCELLED`/`FAILED` | `NEEDS_REFUND` | dana masuk & akun tidak tersedia (atau re-konsumsi voucher gagal) | email admin, masuk antrean refund |
| `PAID` | `DISPUTED` | admin `mark-dispute` (boleh juga setelah konfirmasi diterima) | `AutoKonfirmasiJob` melewati transaksi ini |
| `DISPUTED` | `PAID` | admin `close-dispute` | audit log |
| `NEEDS_REFUND`/`DISPUTED` | `REFUNDED` | admin `refund-complete` hingga **Σ `refund.amount` = `payments.amount`** (pembayaran utama) | baris `refunds`, email pembeli, audit log |
| `NEEDS_REFUND`/`DISPUTED` | (tetap) | `refund-complete` parsial (Σ < jumlah) | baris `refunds`; ringkasan menampilkan **sisa refund** |
| `PAID` | `PAID` (tetap) | dana ganda (termasuk dana di tagihan lama yang gagal dibatalkan) → pembayaran `DUPLIKAT` | refund dicatat pada pembayaran `DUPLIKAT`, status transaksi tidak berubah |

`PAID → REFUNDED` langsung **tidak diizinkan**; wajib lewat `DISPUTED` agar ada jejak keputusan.

### 5.5 Status pembayaran 🟢
`PENDING`, `PAID`, `EXPIRED`, `FAILED`, `CANCELLED`, `DUPLIKAT`. Satu transaksi hanya boleh punya **satu** pembayaran `PENDING`. `DUPLIKAT` = dana masuk tambahan untuk transaksi yang sudah `PAID` (termasuk dana di tagihan lama yang gagal dibatalkan, setelah satu tagihan lain diterima); barisnya punya `incoming_fund_id` sendiri (ID tagihan `xendit_id` bisa sama dengan pembayaran utama).

### 5.6 Serah terima dan garansi 🟢
- Garansi **dihitung dari reveal pertama** (kolom `warranty_start`) selama `GARANSI_HARI` (default 14) — pembeli yang reveal di hari ke-3 tidak kehilangan 3 hari
- **Batas tanpa reveal:** bila pembeli tidak pernah reveal, job mengisi `warranty_start = paid_at + GARANSI_MAKS_TANPA_REVEAL_HARI` (default 30). Tanpa batas ini garansi tidak pernah mulai dan `AutoKonfirmasiJob` tidak pernah jalan
- Reveal diizinkan bila transaksi `PAID`, milik sendiri, dan (`warranty_start IS NULL` atau `now < warranty_start + GARANSI_HARI` atau `now < reveal_until`)
- Setelah reveal, frontend menampilkan **panduan serah terima** (ganti email/password, cabut login lain, cek binding, simpan bukti)
- Pembeli menekan **"Akun sudah saya terima"** → `receipt_confirmed` terisi (+ `confirmed_at`, `confirmed_by` = `PEMBELI`/`OTOMATIS`), jendela komplain ditutup — di sini tampilkan **teks peringatan jelas** ("tindakan ini mengakhiri hak komplain") 🔵
- Job harian: transaksi `PAID` (bukan `DISPUTED`) yang garansinya habis + belum dikonfirmasi → dianggap diterima (`confirmed_by = OTOMATIS`)

## 6. Skema Database (30 tabel; MVP = 28, Fase 2 menambah 2)

Aturan umum: rupiah `numeric(14,0)`; semua waktu `timestamptz`; `CHECK` constraint di database (`harga > 0`, `potongan >= 0`, `total > 0`, status dibatasi enum, persen 1–100). Development memakai satu `DATABASE_URL`; production sebaiknya memakai user aplikasi **DML-only** dan user **DDL** terpisah untuk `prisma migrate`. Email unik tanpa peduli besar-kecil huruf: unique index pada `lower(email)` ( atau kolom citext).

**Kebijakan soft delete (v8): rekord bisnis tidak pernah dihapus fisik** — penghapusan memakai penanda: kolom `deleted_at`, flip `status`, flip `active` (tabel master: `game_types`, `games`, `vouchers`, `promotions`, `themes`, `menus`, `users` — "DELETE" di API = `active=false`), atau `revoked_at` (grant RBAC). Pengecualian mutlak: tabel audit (`admin_audit_logs`, `audit_reveals`) dan `static_page_versions` **tidak bisa dihapus sama sekali** — bahkan soft delete tidak ada (append-only, REVOKE UPDATE/DELETE). **Data teknis sementara** (`refresh_tokens`, `email_tokens`, `email_otps`) bukan rekord bisnis — dibersihkan `RetensiJob` (lihat "Retensi data").

### RBAC dan pengguna (6)
| Tabel | Kolom utama |
|---|---|
| `roles` | id, code (unique), name, is_system |
| `users` | id, username (unique via lower(username)), email (unique via lower(email)), email_verified, password_hash, role_id, active, token_version, totp_secret_encrypted, **totp_key_version, totp_last_step**, totp_active, **totp_failures, totp_locked_until**, created_at, updated_at |
| `menus` | id, code, name, path, icon, sort_order, parent_id, active, is_system |
| `permissions` | id, code (unique), name, is_system — termasuk **`totp:reset`, `credential:write`, `transaction:dispute`, `transaction:refund`, `reveal:grant`, `setting:write`** (katalog lengkap: `API.md` §8) |
| `role_menus` | role_id, menu_id, **revoked_at (NULL = grant active)** — cabut = isi timestamp, beri ulang = reset NULL |
| `role_permissions` | role_id, permission_id, **revoked_at (NULL = grant active)** |

### Katalog (4)
| Tabel | Kolom utama |
|---|---|
| `game_types` | id, code (unique), name, sort_order, active |
| `games` | id, code (unique), name, type_id, icon_url, attribute_schema (jsonb), active |
| `game_accounts` | id, **slug (unique)**, game_id, title, description, price, attributes (jsonb), status, credentials_encrypted (bytea), key_version, listed_at, deleted_at, admin_id, version, created_at, updated_at, **search_vector (tsvector, generated)** — flag credentials_present **derived** (`credentials_encrypted IS NOT NULL`, bukan kolom) |
| `account_photos` | id, account_id, url (https + domain whitelist), sort_order, **deleted_at (soft delete — baris tetap tersimpan)** |

### Diskon (3)
| Tabel | Kolom utama |
|---|---|
| `promotions` | id, name, type (PERSEN/NOMINAL), value, max_discount, scope (AKUN/GAME/SEMUA), target_id, starts_at, ends_at, active |
| `vouchers` | id, code (unique), type, value, quota, used, min_purchase, max_discount, active, valid_until; **`CHECK (used BETWEEN 0 AND quota)`**; konsumsi quota atomik: `UPDATE vouchers SET used = used + 1 WHERE id = ? AND used < quota` (0 baris → `VOUCHER_EXHAUSTED`) |
| `voucher_usages` | voucher_id, user_id, transaction_id, used_at, **status (TERPAKAI/DIPULIHKAN), restored_at**; PK (voucher_id, user_id) — **baris tidak pernah dihapus**; "1× per user" = tidak ada baris `TERPAKAI`; pengembalian = flip status + quota `used` turun; konsumsi ulang = overwrite baris (termasuk `transaction_id` baru; juga pada reserve-ulang telat-bayar); CHECK `(status = 'DIPULIHKAN') = (restored_at IS NOT NULL)` |

### Transaksi dan pembayaran (6)
| Tabel | Kolom utama |
|---|---|
| `transactions` | id, code (unique, acak), account_id, buyer_id, initial_price, promo_id, promotion_discount, voucher_id, voucher_discount, total, status, note, **terms_version, terms_accepted_at, receipt_confirmed, confirmed_at, confirmed_by, reveal_until, warranty_start**, version, created_at, expired_at, paid_at; **`CHECK (receipt_confirmed = (confirmed_at IS NOT NULL))`** dan **`CHECK (receipt_confirmed = (confirmed_by IS NOT NULL))`**; `terms_version` merujuk `static_page_versions` (`syarat-ketentuan`, version itu) |
| `payments` | id, transaction_id, method (QRIS/VA), **external_id (unique; code transaksi + `-` + nomor urut tagihan, mis. `TRX…-1`; dikirim ke Xendit, key pencocokan webhook/rekonsiliasi)**, xendit_id (ID tagihan; index, **bukan unique**), **incoming_fund_id (unique, nullable — ID dana masuk dari callback; dasar `DUPLIKAT`)**, status, reference (qr_string / nomor VA), amount, expired_at, created_at |
| `idempotency_keys` | key, user_id, transaction_id, **status (PROCESSING/SELESAI/KEDALUWARSA), request_hash, response_status, response_snapshot, valid_until**, created_at; **PK (user_id, key)**; job pembersih **menandai `KEDALUWARSA`, bukan menghapus**; key expires_at dipakai ulang = baris di-overwrite sebagai klaim baru; `PROCESSING` ber-TTL 5 menit (lihat 7.3); `request_hash` = hash(method + path + body); `response_snapshot` dikosongkan setelah masa retensi |
| `webhook_events` | id, **type**, **incoming_fund_id**, raw_payload (jsonb, nullable — dikosongkan setelah masa retensi; baris & key dedup tetap), **status (DITERIMA/DIPROSES/GAGAL)**, processed_at; **UNIQUE(type, incoming_fund_id)** |
| `audit_reveals` | id, transaction_id, buyer_id, revealed_at, **ip, user_agent** |
| **`refunds`** | id, payment_id, transaction_id, amount, fee, reference, note, admin_id, refunded_at, created_at — satu pembayaran boleh >1 refund; total `amount` ≤ `payments.amount` dijaga service (key baris pembayaran); rekening tujuan hanya sebagai note bebas |

### Sistem dan konten (8)
| Tabel | Kolom utama |
|---|---|
| `themes` | id, code (unique), name, tokens (jsonb), logo_url, banner_url, active (maks satu), is_system — MVP hanya seed statis + terang/gelap; **editor Fase 2** |
| `static_pages` | id, code (unique), title + body_markdown (**draf kerja**), version (**nomor version terbit terakhir**, 0 = belum terbit), updated_at |
| **`static_page_versions`** | page_id, version (**PK gabungan**), title, body_markdown, published_at, published_by — **salinan beku saat terbit, append-only** (bukti persetujuan S&K; user aplikasi hanya `INSERT`/`SELECT`) |
| `email_tokens` | id, user_id, type (RESET/**GANTI_EMAIL_LAMA/GANTI_EMAIL_BARU**), **new_email (nullable)**, token_hash, valid_until, used_at |
| **`email_otps`** | id, user_id, purpose (VERIFY_EMAIL), code_hash (HMAC), expires_at, attempts, consumed_at, created_at — kode verifikasi email sekali pakai |
| `admin_audit_logs` | id, actor_id, action, target, detail, created_at |
| **`refresh_tokens`** | id, user_id, hash (unique), **family_id, replaced_at, replaced_by_token_id**, device, expires_at, revoked, created_at |
| **`totp_recoveries`** | id, user_id, hash, used_at, **revoked_at** (banyak code, hash bukan plaintext; regenerasi mencabut code lama) |
| **`settings`** | key (PK), value, updated_at, updated_by — `checkout_aktif`, `nama_toko`, `kontak_cs`, `pesan_pengumuman`; angka aturan bisnis (garansi, expiry) tetap di env |

### Fase 2 (2)
| Tabel | Kolom utama |
|---|---|
| `komplain` 🔵 | id, transaction_id, buyer_id, alasan, bukti_url, status (BARU/DIPROSES/SELESAI), keputusan (TOLAK/REFUND/GANTI_AKUN), catatan_admin, created_at, selesai_pada, **deleted_at (soft delete)** |
| `wishlist` 🔵 | user_id, account_id, created_at; PK (user_id, account_id) |

### Index dan constraint key
- **Anti double-buy di database:** unique parsial `transactions(account_id) WHERE status IN ('RESERVED','PAID','DISPUTED')`
- **Satu tagihan active:** unique parsial `payments(transaction_id) WHERE status = 'PENDING'`
- **Satu tema active:** unique parsial pada `themes(active) WHERE active`
- **Dedup webhook:** unique `(type, incoming_fund_id)` di `webhook_events`
- `transactions(expired_at) WHERE status = 'RESERVED'`, `transactions(paid_at)`, `transactions(warranty_start) WHERE status = 'PAID' AND receipt_confirmed = false` (AutoKonfirmasiJob), `game_accounts(status, game_id) WHERE deleted_at IS NULL`
- GIN pada `game_accounts.attributes` dan `game_accounts.search_vector` (full-text — sudah masuk MVP)
- `size` halaman maksimum 100; field sorting di-whitelist
- **Akun siap jual wajib berkredensial:** `CHECK (status NOT IN ('AVAILABLE','RESERVED') OR credentials_encrypted IS NOT NULL)` pada `game_accounts`
- **External ID unik:** `payments(external_id)` unique
- **Kuota voucher & konfirmasi:** `CHECK (used BETWEEN 0 AND quota)` pada `vouchers`; dua `CHECK` konsistensi `receipt_confirmed`/`confirmed_*` pada `transactions`
- **Versi halaman:** PK `static_page_versions(page_id, version)`
- **ID dana masuk unik:** unique parsial `payments(incoming_fund_id) WHERE incoming_fund_id IS NOT NULL`; index biasa `payments(xendit_id)`
- **Refund:** `CHECK (amount > 0 AND fee >= 0)`; index `refunds(payment_id)`, `refunds(refunded_at)`
- Token unik: `refresh_tokens(hash)`, `email_tokens(token_hash)`
- Index relasi (Postgres tidak membuat index FK otomatis): `transactions(buyer_id, created_at)`, `payments(transaction_id)`, `refresh_tokens(user_id, family_id)`, `account_photos(account_id, sort_order)`, `audit_reveals(transaction_id)`, `admin_audit_logs(actor_id, created_at)`, `idempotency_keys(created_at)`, `webhook_events(status)`, `refunds(transaction_id)`, `email_tokens(user_id)`, `totp_recoveries(user_id)`
- **Tabel bukti append-only:** user aplikasi hanya `INSERT`/`SELECT` pada `admin_audit_logs`, `audit_reveals`, dan `static_page_versions` (REVOKE UPDATE, DELETE)

Seed (script seed Prisma, idempoten): role ADMIN dan PEMBELI, menu awal, katalog permission (termasuk `totp:reset`), matriks grant, type game dan game awal, satu tema default, empat halaman statis awal (masing-masing langsung terbit sebagai version 1 di `static_page_versions`) — semua `is_system`.

### Retensi data

Tanpa aturan ini `idempotency_keys`, `webhook_events`, dan `refresh_tokens` tumbuh tanpa batas (v8 melarang hapus rekord bisnis). `RetensiJob` harian menjalankan aturan di bawah; semua masa retensi dapat diubah lewat env (§13).

| Data | Aturan (default) | Eksekutor |
|---|---|---|
| `webhook_events.raw_payload` | di-NULL-kan **90 hari** setelah `DIPROSES`; baris dan key dedup `(type, incoming_fund_id)` tetap; `GAGAL` ditahan sampai selesai | `RetensiJob` |
| `idempotency_keys.response_snapshot` | di-NULL-kan **30 hari** setelah `KEDALUWARSA`; baris tetap (tidak dihapus) | `RetensiJob` |
| `refresh_tokens` | data teknis: dihapus fisik **per `family_id`** setelah seluruh anggota expires_at/revoked + **30 hari** | `RetensiJob` |
| `email_tokens` | data teknis: dihapus fisik **30 hari** setelah `valid_until` / `used_at` | `RetensiJob` |
| `email_otps` | data teknis: dihapus fisik **30 hari** setelah `expires_at` / `consumed_at` | `RetensiJob` |
| `audit_reveals.ip`, `user_agent` | tabel append-only, aplikasi tidak bisa mengubah. Setelah **24 bulan** atau atas permintaan PDP: anonimisasi (NULL-kan `ip`, `user_agent`; `buyer_id` tetap) lewat **prosedur DDL khusus** oleh user migrasi (skrip di repo), tiap eksekusi dicatat di `admin_audit_logs` (`actor_id` NULL, `action` = `PDP_ANONIMISASI`) | admin/DBA manual |
| `users` (permintaan hapus data) | `DELETE /auth/account` 🔵 menganonimkan `username`/`email`/`password_hash` (UPDATE; transaksi tetap ada); sebelum endpoint ada: prosedur PDP manual yang sama | manual |
| `admin_audit_logs`, `static_page_versions`, `refunds`, `payments`, `transactions` | tidak dihapus; `admin_audit_logs.detail` tidak boleh memuat data pribadi | — |

## 7. Alur Bisnis

### 7.1 Registrasi, verifikasi, ganti email, lupa password 🟢
1. Daftar: username, email, password (BCrypt, minimal 8 karakter) → role selalu PEMBELI
2. Email berisi kode verifikasi 6 digit (disimpan sebagai HMAC hash, berlaku 15 menit, maksimal 5 percobaan, sekali pakai)
3. Belum terverifikasi: boleh browse dan login, **tidak boleh checkout**
4. **Ganti email**: wajib password saat ini; email tujuan disimpan di `email_tokens.new_email`; token dikirim ke email lama + baru (`GANTI_EMAIL_LAMA`/`GANTI_EMAIL_BARU`); email berganti setelah **keduanya** dikonfirmasi (`POST /auth/change-email/confirm`); email unik (abaikan kapital); sesi lain dicabut dan pemberitahuan dikirim ke alamat lama
5. Lupa password: token reset sekali pakai; berhasil → `token_version` naik (semua sesi lama mati)
6. Pesan error login/lupa password/ganti email **generik** (anti user enumeration)

### 7.2 Browse katalog (publik) 🟢
- URL memakai slug: `/accounts/ml-mythic-rank-62-ab12`
- Filter: jenis game, game, rentang harga, atribut game; urutan terbaru/harga; pencarian teks `q`
- Status selalu dipaksa `AVAILABLE` dan `deleted_at IS NULL`; detail akun non-AVAILABLE atau terhapus → tampilan tidak ditemukan (404)
- Harga tampil sudah memperhitungkan promo (harga coret + harga promo); kredensial tidak pernah ada di data publik
- Data master dibaca di server component dengan `use cache` + `revalidateTag` (ETag HTTP tidak dipakai lagi)

### 7.3 Checkout (3 fase) 🟢
Panggilan aksi membawa argumen **`kunciIdempoten`**, **persetujuan syarat versi terbaru**, dan **`totalPratinjau`**. Tulis kegagalan sebagai **kode machine lewat typed-union** (`{ ok: false, code, pesan }`) — semantik lama 409/422/503 hanya penamaan asalnya. Sebelum fase 1: cek saklar `pengaturan.checkout_aktif` (mati → kode `CHECKOUT_CLOSED`) dan **klaim key** (`INSERT idempotency_keys` status `PROCESSING`, `valid_until` = sekarang + **TTL 5 menit**, di **`$transaction` Prisma terpisah yang langsung commit** (pola REQUIRES_NEW — supaya terlihat oleh aksi paralel dan tidak ikut rollback fase 1; `request_hash` = hash(nama aksi + argumen serial); key sudah ada → `SELESAI`: ulang hasil tersimpan, `PROCESSING`: kode `REQUEST_IN_PROGRESS`, `request_hash` beda: kode kontras isi, `KEDALUWARSA`/`valid_until` lewat: **baris di-overwrite** sebagai klaim baru).

1. **Transaksi database 1 (commit):** kunci baris user (`SELECT ... FOR UPDATE`) untuk menegakkan batas 2 PENDING → validasi akun `AVAILABLE` → `akun.reserve()` (optimistic lock) → hitung promo dan voucher (**total server dibandingkan `totalPratinjau`; beda → 422 `PRICE_CHANGED`**) → simpan transaksi `RESERVED` (+ `terms_version`) → konsumsi kuota voucher → tautkan `transaction_id` ke `idempotency_keys`
2. **Panggil Xendit** (QRIS atau VA) dengan `external_id` = `payments.external_id` (kode transaksi + nomor urut tagihan; unik per tagihan, juga untuk tagihan hasil `changeMethod`) dan idempotency key → simpan `reference` dan `expired_at` (**kedaluwarsa tagihan di Xendit = `transactions.expired_at`**) → `idempotency_keys` jadi `SELESAI` (perpanjang `valid_until`) + simpan snapshot hasil
3. **Gagal pasti (bug Xendit 4xx):** transaksi `FAILED`, akun `release()`, voucher dikembalikan (usage → `DIPULIHKAN`), `idempotency_keys` jadi `SELESAI` (error tersimpan). **Timeout:** jangan dibatalkan dulu; `RekonsiliasiJob` mencari status via `external_id`
4. **Kegagalan fase-1 lain (kode `ACCOUNT_UNAVAILABLE`, `PRICE_CHANGED`, voucher/minimum nominal, dst):** → `idempotency_keys` jadi `SELESAI` dengan error tersimpan (ulang dengan key sama = hasil sama; niat baru = key baru).
5. **TTL `PROCESSING`:** key `PROCESSING` yang lewat TTL **tanpa** `transaction_id` → job menandai `KEDALUWARSA` (klien boleh retry). **Dengan** `transaction_id` (timeout Xendit / crash setelah fase 1) → tidak dilepas: `RekonsiliasiJob` menyelesaikannya — tagihan ditemukan via `external_id` → simpan `reference`, key `SELESAI` + snapshot; tidak ada tagihan → transaksi `FAILED` (`release()`, voucher `DIPULIHKAN`), key `SELESAI` + snapshot error.

### 7.4 Jaminan pembayaran tidak terbayar dua kali 🟢

| Skenario | Pencegahan | Hasil |
|---|---|---|
| Klik checkout dua kali / retry jaringan | `kunciIdempoten` (request_hash + snapshot hasil) | Hasil sama, transaksi tetap satu; isi beda → kode kontras-isi; niat pertama masih berjalan → kode `REQUEST_IN_PROGRESS` |
| Dua pembeli membeli akun yang sama | Unique parsial + optimistic lock | Satu sukses, yang lain kode `ACCOUNT_UNAVAILABLE` |
| Dua pembeli memperebutkan kuota voucher terakhir | `UPDATE ... WHERE used < quota` + `CHECK (used BETWEEN 0 AND quota)` | Satu sukses, yang lain kode `VOUCHER_EXHAUSTED` |
| Ganti metode QRIS ↔ VA | `kunciIdempoten` + hanya 1 pembayaran `PENDING`; tagihan lama dibatalkan ke Xendit dulu | Hanya satu tagihan hidup; dana yang telanjur masuk ke tagihan lama saat `RESERVED` diterima (5.4), dana ganda → `DUPLIKAT` |
| Webhook PAID dikirim ulang | `webhook_events` UNIQUE(type, incoming_fund_id) + state machine | Dibalas 200, tanpa efek kedua |
| Dana masuk lagi untuk transaksi yang sudah `PAID` | Pembayaran kedua dicatat `DUPLIKAT` (punya `incoming_fund_id` sendiri), transaksi tetap `PAID`, omzet dihitung sekali | Antrean refund admin; refund dicatat di tabel `refunds` pada pembayaran `DUPLIKAT` |
| Bayar setelah EXPIRED/CANCELLED/FAILED | Alur telat-bayar generik (5.4) | Diproses atau di-refund |
| Bayar tapi webhook hilang / proses gagal | `RekonsiliasiJob` + `webhook_events.status = DITERIMA/GAGAL` + `retry` | Status tersinkron |

QRIS/VA dinamis umumnya sekali pakai, tetapi sistem tidak boleh bergantung pada asumsi itu.

### 7.5 Pembayaran gagal 🟢
- Xendit melaporkan gagal/ditolak, atau pembuatan tagihan gagal pasti → pembayaran `FAILED`, transaksi `FAILED`
- Otomatis: akun `release()` → `AVAILABLE`; kuota voucher dan `voucher_usages` dikembalikan (v8: baris `voucher_usages` jadi `DIPULIHKAN` + kuota `used` turun — **bukan dihapus**); slot PENDING bebas
- Frontend menampilkan alasan yang jelas dan tombol **Coba lagi**
- **Dana ternyata tetap masuk** alih-alih gagal → alur telat-bayar generik (5.4)

### 7.6 Webhook, expiry, rekonsiliasi 🟢
**Webhook Xendit** (`POST /api/v1/payments/webhook/xendit`), **dua-fase + atomik**:
1. Verifikasi callback token secara constant-time
2. **Fase-1 (`$transaction` Prisma terpisah, commit sendiri):** insert `webhook_events` (`type` + `incoming_fund_id`, payload mentah, status `DITERIMA`) — event tampak **sebelum** diproses
3. **Fase-2:** cocokkan `amount` dan `external_id` (→ baris `payments` per tagihan; isi `payments.incoming_fund_id`), status lunas = `PAID`/`SETTLED`, terapkan efek status dalam transaksi atomik → update `webhook_events.status = DIPROSES`; gagal → status `GAGAL` (dibalut 5xx agar Xendit retry; juga bisa `retry` dari admin)
4. Event tak berurutan ditolak oleh state machine; duplikat (sudah ada `DIPROSES`) dibalas 200 tanpa efek; event `GAGAL`/`DITERIMA` yang datang lagi diproses ulang dengan kunci baris (`SELECT ... FOR UPDATE`) agar tidak ganda. `incoming_fund_id` = ID unik dari payload callback; bila payload suatu jenis tidak punya ID unik, pakai hash payload; bila satu ID mengirim beberapa status, status callback ikut kunci dedup — **verifikasi ke dokumentasi Xendit di tahap 5**

**Job terjadwal** (memakai `Clock` yang di-inject agar bisa dites):
- `ExpiryJob`: RESERVED lewat `expired_at` + **masa tenggang 2–3 menit** → cek status **semua tagihan** transaksi itu ke Xendit sekali → bila belum lunas: `EXPIRED`, akun `release()`, voucher dikembalikan (usage → `DIPULIHKAN`) (mengurangi kasus telat-bayar)
- `RekonsiliasiJob`: transaksi menggantung dicek ke Xendit per `external_id` (semua tagihan transaksi); **juga menyelesaikan key `PROCESSING` yang lewat TTL dan sudah punya `transaction_id`** (7.3)
- `WebhookRetryJob`: `webhook_events` berstatus `GAGAL` diproses ulang otomatis (backoff, batas percobaan; lewat batas → email admin); `retry` manual tetap ada
- `IdempotencyJob`: `PROCESSING` lewat TTL tanpa `transaction_id` → `KEDALUWARSA`; `SELESAI` yang `valid_until`-nya lewat → `KEDALUWARSA` (menandai, bukan menghapus)
- `RetensiJob`: aturan "Retensi data" (§6) — kosongkan payload/snapshot lama, bersihkan token kedaluwarsa
- `AutoKonfirmasiJob`: (1) transaksi `PAID` yang tak pernah reveal sampai `paid_at + GARANSI_MAKS_TANPA_REVEAL_HARI` → isi `warranty_start`; (2) garansi habis (`warranty_start + GARANSI_HARI`) → dianggap diterima (`confirmed_by = OTOMATIS`) — **skip `DISPUTED`**

**Telat bayar / dana menetap (EXPIRED/CANCELLED/FAILED)**: lihat 5.4 — reserve-ulang bila `AVAILABLE` (voucher dikonsumsi ulang), kalau tidak `NEEDS_REFUND` (+ **email admin**); dana di tagihan lama saat `RESERVED`: lihat 5.4.

### 7.7 Refund 🟢
1. Admin melihat antrean lewat `GET /panel` + `/panel/transactions?status=NEEDS_REFUND`
2. Eksekusi **manual**: VA/QRIS umumnya tidak punya auto-refund — pembeli dikonfirmasi lewat CS, rekening tujuan **ditulis admin sebagai catatan** (tidak disimpan sebagai data bank — UU PDP)
3. `refund-complete` (per **pembayaran**): admin mengisi `payment_id`, `amount`, `fee`, `ref` (referensi transfer), `note` → baris baru di tabel `refunds` (total ≤ jumlah dibayar). Transaksi `NEEDS_REFUND`/`DISPUTED` jadi `REFUNDED` **hanya bila Σ `refund.amount` pada pembayaran utama = `payments.amount`**; refund parsial (Σ < jumlah) membiarkan status dan menyisakan **sisa refund** di ringkasan; bila pembayaran `DUPLIKAT` → transaksi tetap `PAID`. Tercatat audit; email ke pembeli
4. Bila akun layak dijual ulang: ganti kredensial → `restore()` 🔵
5. `/panel/reports/refund` = agregasi tabel `refunds` berbasis **`refunded_at`**; "DUPLIKAT belum di-refund" di ringkasan = pembayaran `DUPLIKAT` yang Σ refund-nya < `amount` (sisa refund > 0)

### 7.8 Reveal kredensial 🟢
- Hanya transaksi `PAID` milik sendiri; dekripsi AES-GCM on-demand; header `Cache-Control: no-store`
- **Garansi sejak reveal pertama** (`warranty_start`, diisi dengan `UPDATE ... WHERE warranty_start IS NULL` agar dua reveal bersamaan tidak berebut) atau `paid_at + GARANSI_MAKS_TANPA_REVEAL_HARI` bila tak pernah reveal (diisi job); boleh diulang selama garansi, rate-limited (bucket sendiri), setiap akses masuk `audit_reveals` **+ IP + user-agent**
- Setelah garansi habis, reveal hanya dengan `allow-reveal` admin (kolom `reveal_until`)

### 7.9 Sengketa (manual MVP; komplain 🔵 Fase 2)
- MVP: pembeli menghubungi CS (kontak CS tertulis di halaman garansi) → admin `mark-dispute` → `DISPUTED`; penyelesaian lewat `refund-complete` atau `close-dispute` (kembali `PAID`) — **tidak ada jalan buntu**
- 🔵 `komplain` + `putuskan` (TOLAK / REFUND / GANTI_AKUN), `bukti_pembeli`, alasan & bukti URL

### 7.10 Email transaksional & admin 🟢
- Dikirim setelah commit (`@TransactionalEventListener(AFTER_COMMIT)`, async + retry): verifikasi, ganti email, reset password, pembayaran berhasil (tautan pesanan), expired/gagal, refund selesai, sengketa
- **Email ke ADMIN masuk MVP**: NEEDS_REFUND, DISPUTED, DUPLIKAT belum selesai (endpoint health saja tidak ada yang membaca)
- **Kredensial akun tidak pernah dikirim lewat email**
- Deliverability: verifikasi & reset password bergantung email sampai ke kotak masuk — SPF/DKIM/DMARC di checklist produksi

### 7.11 Admin 🟢
- Kelola akun (mulai draf; kredensial tulis-saja; soft delete hanya saat `DELISTED`; `RESERVED` tidak bisa di-edit/delist), foto, jenis game, game, halaman statis (draf → terbit = versi beku di `static_page_versions`)
- Kelola voucher dan promo
- Kelola tema: **editor 🔵 Fase 2** (7.12); MVP memakai tema statis dari seed
- Kelola transaksi: daftar per status, `mark-dispute`, `close-dispute`, `refund-complete`, `allow-reveal`, `sync`
- Kelola user (list, ubah role, aktif/nonaktif, `force-logout`, `reset-totp`) dengan guard anti-kunci diri; semua perubahan tercatat di `admin_audit_logs` (tabel bisa dibaca via `/panel/audit`)
- /rbac CRUD 🔵 Fase 2 (seed & aturan tetap MVP)
- Pengaturan toko: saklar `checkout_aktif`, `nama_toko`, `kontak_cs`, `pesan_pengumuman` (`PUT /panel/settings`, permission `setting:write`)
- Login admin wajib **TOTP** 🔴; admin yang belum setup saat flag wajib → `perlu_setup_totp` (token terbatas 15 menit) → setup → recovery code tampil sekali; regenerasi lewat `/auth/totp/recovery-baru`

### 7.12 Tema website 🟢
- MVP: tema statis dari seed + **pilihan terang/gelap** pembeli; `.tokens` jsonb validasi ketat (warna hex, font dari whitelist, URL https whitelist)
- 🔵 Editor tema (CRUD admin, aktifkan satu) — tabel tetap disiapkan

### 7.13 Pengaturan & mode darurat 🟢
- Tabel `settings` (key-value kecil) menjadi sumber `GET /settings/public`: `nama_toko`, `kontak_cs`, `pesan_pengumuman`, `checkout_aktif`; angka garansi/expiry dibaca dari konfigurasi (env)
- **`checkout_aktif = false`** → `POST /transaksi` ditolak `503 CHECKOUT_CLOSED`; katalog tetap tampil dan pesanan berjalan tetap bisa dibayar/di-reveal. Dipakai saat Xendit bermasalah, lonjakan `NEEDS_REFUND`, atau admin tidak bisa melayani
- Perubahan pengaturan tercatat di `admin_audit_logs`

## 8. Diskon (Strategy Pattern) 🟢

- `interface Diskon { hitungPotongan(hargaDasar) }` → `DiskonPersen`, `DiskonNominal`
- Dipakai oleh `promotions` maupun `vouchers`; urutan: promo dulu, lalu voucher
- Validasi voucher: aktif, belum kedaluwarsa, kuota, `min_purchase`, `max_discount`, 1× per user, persen ≤ 100, nominal ≤ harga, total akhir > 0 dan ≥ minimum Xendit
- Promo hanya yang `active` dan dalam rentang `starts_at`–`ends_at`; **promo paling spesifik menang** (AKUN > GAME > SEMUA), tidak ditumpuk antar-promo; **seri pada tingkat yang sama → potongan rupiah terbesar menang, seri lagi → `id` terbesar**; potongan persen dibulatkan ke bawah (floor)
- Voucher dikonsumsi saat checkout dan **dikembalikan** saat `EXPIRED`/`CANCELLED`/`FAILED` (v8: baris `voucher_usages` jadi `DIPULIHKAN` — tidak dihapus — dan kuota `used` turun)
- `POST /checkout/pratinjau` memvalidasi semua di atas **tanpa mengonsumsi kuota**
- Konsumsi kuota **atomik** (`UPDATE ... WHERE used < quota` + CHECK); voucher juga **dikonsumsi ulang** saat telat-bayar reserve-ulang → `PAID` (5.4)

## 9. Modul Server (Aksi) — lihat `API.md` (sumber kebenaran)

| Area | Ringkasan |
|---|---|
| Auth | register, login (+TOTP dua-langkah; `perlu_setup_totp` bila wajib belum aktif), login/totp, totp setup/aktifkan/**recovery-baru**, refresh (rotasi + toleransi), logout satu-sesi, logout-semua, verifikasi & kirim-ulang, ganti-email, lupa/reset/ganti-password, me/menu, DELETE /auth/account 🔵 |
| Publik | jenis-game, game (+`/game/{kode}` skema atribut), beranda, katalog (`?q=`), akun/{slug}, promo/aktif, **pembayaran/metode**, tema/aktif, halaman/{kode}, **pengaturan/publik** |
| Pembeli | checkout/pratinjau, transaksi (idempotency), riwayat/detail, **status ringan untuk polling**, batal, changeMethod, **reveal (POST)**, confirm-receipt, komplain 🔵, bukti 🔵, wishlist 🔵 (slug) |
| Webhook | satu pintu + adapter per callback, dua-fase, dedup (type+incoming_fund_id) |
| Admin | akun (mulai draf; kredensial tulis-saja; delist/relist/restore), foto, jenis-game & game, voucher & promo (+pemakaian 🔵), tema & halaman (publish → versi beku; baca versi lama), transaksi (detail + linimasa webhook, sync, **close-dispute**, refund-complete, mark-dispute, allow-reveal), **ringkasan** (kotak masuk), **pengaturan**, audit-log & audit-reveal, users & RBAC (CRUD 🔵), force-logout, reset-totp, laporan (penjualan, per-game, **refund**; per-jenis, lama-terjual, stale 🔵) |

Aturan lintas (kontrak typed-union + kode machine, idempotency via field klien, rate limit per aksi, daftar permission) — detail di `API.md` §0. Data master publik (jenis-game, game, tema, halaman) **bukan aksi**: dibaca langsung di server component dengan `use cache` + `revalidateTag`.

## 10. Frontend

### Halaman pembeli
| Halaman | Isi | Label |
|---|---|---|
| Beranda | Banner dari tema, promo aktif, game populer, akun terbaru (server component, satu sumber data, `use cache`) | 🟢 |
| Katalog | Filter jenis/game/harga/atribut dinamis (dari skema game), urutan, paging; pencarian teks | 🟢 |
| Detail akun | Galeri foto, atribut, harga coret + promo, tombol Beli, favorit 🔵 | 🟢 |
| Daftar / Masuk / Verifikasi / Lupa password / Ganti email | Alur akun pembeli | 🟢 |
| Checkout | Ringkasan (via pratinjau), voucher, pilih QRIS/VA (+bank), **centang setuju S&K** | 🟢 |
| Halaman bayar | QR/nomor VA, hitung mundur, **polling aksi `transaksiStatus`** (interval beberapa detik), ganti metode/batal | 🟢 |
| Pesanan saya | Riwayat dan status; detail dengan Lihat Akun, panduan serah terima, konfirmasi diterima (+**teks peringatan**), komplain | 🟢 / 🔵 |
| Akun saya | Profil, ganti password, ganti email, terang/gelap | 🟢 |
| Halaman statis | S&K, privasi, garansi/refund (termasuk jalur CS sengketa manual), FAQ | 🟢 |

### Panel admin
Sidebar dirender dari menu di database (server component, tabel `role_menus`): akun, jenis game, game, voucher, promo, tema 🔵 (MVP: statis), halaman statis (+ riwayat versi), **transaksi + kotak masuk ringkasan (NEEDS_REFUND/DISPUTED/DUPLIKAT)**, user, laporan (tabel dan angka; grafik nanti), audit-log 🔵.

### Aturan frontend
- Tombol aksi dinonaktifkan saat aksi server berjalan; `kunciIdempoten` (`crypto.randomUUID()`) dibuat per niat checkout (juga pada changeMethod) dan dikirim sebagai argumen
- Tipe & validasi zod **dibagikan antara server dan client** (satu aplikasi) — skema/tipe tidak di-tulis dua kali
- Halaman bayar memanggil aksi `transaksiStatus` (interval beberapa detik, berhenti saat PAID/FAILED/EXPIRED)
- Tidak ada kredensial di cache, URL, atau log; halaman reveal tidak di-cache (`no-store` bila di-cache)
- Semua teks dari API dirender sebagai teks (tanpa `dangerouslySetInnerHTML`); konten markdown halaman statis disanitasi
- SEO: SSR untuk katalog dan detail, tag OpenGraph, `sitemap.xml` dari akun `AVAILABLE`

### Pengecualian HTTP (satu-satunya Route Handler)
| Rute | Kenapa tetap HTTP |
|---|---|
| `POST /api/v1/webhook/xendit` | Callback dari server Xendit (di luar browser) — tak mungkin via Server Action; verifikasi callback token tetap di sini |
| `GET /api/v1/health` | Uptime check systemd/monitor eksternal — tanpa detail internal |

## 11. Keamanan

- JWT HS256, secret ≥ 256 bit fail-fast, token 15–30 menit; `token_version` dan status `active` dicek tiap request
- Refresh token di cookie httpOnly + Secure + SameSite=Strict; **rotasi + toleransi 10–30 dtk**; endpoint refresh menolak permintaan tanpa header kustom
- Rate limit (rate-limiter-flexible, in-memory): **bucket berbeda per jenis** — login, register, checkout, reveal, polling status, webhook (longgar/whitelist Xendit); IP hanya dari `X-Forwarded-For` yang dikonfigurasi benar; cukup untuk single-instance
- Anti-griefing: expiry 30 menit, maks 2 PENDING (atomik), email wajib terverifikasi, limit checkout per IP
- Kredensial: AES-GCM (IV 12 byte acak, AAD = `akun:<id>`, keyring `key_version`), tulis-saja via admin (tanpa GET), ditolak saat `RESERVED/SOLD`; tidak masuk DTO/log; log query Prisma mati di prod; backup key terpisah dari backup database
- Mekanisme **prosedur darurat TOTP**: env var darurat + CLI (satu-satunya admin kehilangan perangkat & recovery) — wajib ganti password setelahnya, tercatat audit
- Webhook: token constant-time, cocokkan amount dan external_id, **dua-fase + atomik**, dedup (type+incoming_fund_id)
- ADMIN: TOTP wajib 🔴; `reset-totp` = permission `totp:reset` + **re-autentikasi + email pemberitahuan ke target**
- TOTP: kode yang sudah dipakai ditolak (`totp_last_step`); token sementara `perlu_totp` berlaku 5 menit dan hanya valid untuk `/auth/login/totp`; rate limit + kunci sementara setelah N gagal (`totp_failures`/`totp_locked_until` di database — bertahan lintas restart); token `perlu_setup_totp` 15 menit hanya valid untuk setup/aktifkan; regenerasi recovery code wajib password + kode TOTP (kode lama `revoked_at`); secret dienkripsi dengan keyring (`totp_key_version`)
- Tabel bukti (`admin_audit_logs`, `audit_reveals`): user aplikasi hanya `INSERT`/`SELECT`
- Header keamanan (HSTS, CSP, frame-deny, nosniff); kontrak error typed-union + kode machine (webhook memakai status HTTP nyata untuk retry Xendit); object-level authorization
- Email & akun: error generik, email unik `lower(email)`, ganti email dua-tahap

## 12. Tahap Pengerjaan & Definition of Done

**Definition of Done (berlaku di setiap tahap):** (1) tes tahap itu hijau; (2) perubahan skema = migration Prisma baru, bukan edit file lama; (3) endpoint baru tercatat di `API.md` dan permission-nya ada di seed; (4) aksi admin tercatat di audit log; (5) tidak ada data sensitif di log; (6) `API.md` diperbarui bila endpoint berevolusi; (7) catatan di Riwayat diperbarui.

### Fase MVP 🟢 (dirampingkan — lihat "Peningkatan v6" §1)

| # | Tahap | Fokus | Verifikasi |
|---|---|---|---|
| 0 | Reset | Bersihkan scaffold lama (`be/`, `fe/`) dan database | Root aplikasi siap dikerjakan, tidak ada sisa scaffold |
| 1 | Scaffold app | Next.js App Router + TypeScript + shadcn/ui + Prisma (skema **28 tabel MVP** + CHECK & partial index lewat SQL migration + seed script termasuk `totp:reset`, permission `:read`, 4 halaman statis terbit sebagai versi 1), config dev/prod, Postgres 18 lokal (tanpa Docker), health route `/api/v1/health`, modul `Clock` (injeksi waktu untuk tes), `.env.example`, data contoh dev | `npm run build` sukses; `\dt` menampilkan tabel MVP |
| 2 | Auth + RBAC-resolve | Register, verifikasi & **ganti email**, lupa password, JWT, refresh (rotasi+toleransi), logout-semua, RBAC dari database (**resolve saja — CRUD 🔵**), **endpoint TOTP (setup/aktifkan/login/recovery-baru/reset-totp, alur `perlu_setup_totp`, kunci `totp_failures`/`totp_locked_until`) di balik flag `TOTP_WAJIB_ADMIN`**, rate limit per bucket, **email admin infra**, audit log + `GET /panel/audit`, `/panel/users*` (list, ubah role, aktif/nonaktif, `force-logout`) | Cabut grant → akses tertutup; user nonaktif → token ditolak; dua tab refresh tidak saling rotasi |
| 3 | Katalog | Master jenis/game, akun **mulai draf → relist wajib kredensial**, kredensial tulis-saja (ditolak saat RESERVED/SOLD), foto, slug, state machine, AES-GCM, browse publik (filter `deleted_at IS NULL`), `DELETE` akun hanya saat `DELISTED` | Unit test state machine; DB berisi ciphertext; relist tanpa kredensial ditolak |
| 4 | Diskon | Strategy promo dan voucher, aturan batas + **pratinjau**, pelepasan saat gagal/expire, kuota atomik, tie-break + floor, CRUD `/panel/vouchers` & `/panel/promotions`, `/promo/aktif`, `/beranda` | Unit test semua kasus batas |
| 5 | Transaksi + Pembayaran | Checkout 3 fase, idempotency (request_hash+snapshot+job pembersih), Xendit (mock), webhook **dua-fase + atomik** (`$transaction` terpisah + atomik), expiry/rekonsiliasi, telat-bayar generik, FAILED, DUPLIKAT, refund per pembayaran (tabel `refunds`) + `close-dispute`, `release()`, `WebhookRetryJob`, `PRICE_CHANGED`, saklar `checkout_aktif`, reveal (POST) + garansi reveal, konfirmasi diterima, admin email, endpoint admin transaksi + **ringkasan** (+ sisa refund), `/pembayaran/metode`, `/panel/settings` + `/settings/public`, `/panel/webhooks` (+ `retry`), `/panel/audit`; `payments.external_id` per tagihan; klaim key `$transaction` terpisah + TTL `PROCESSING`; dana di tagihan lama saat `RESERVED`; `REFUNDED` hanya bila Σ refund = dibayar; re-konsumsi voucher pada telat-bayar; job berjalan via `instrumentation.ts` + node-cron + advisory lock | Tes konkurensi 2 thread; webhook duplikat & tak berurutan & GAGAL→retry; dana menetap saat FAILED → jalur benar; kuota voucher terakhir diperebutkan 2 thread; dana masuk tagihan lama setelah changeMethod; refund parsial |
| 6 | Konten + laporan MVP | Halaman statis (draf → terbit = versi beku di `static_page_versions`, baca versi lama, persetujuan), tema **statis** seed + terang/gelap, laporan: **penjualan + penjualan-per-game + refund** (per-jenis/lama-terjual/stale/diskon 🔵) | Tes dengan `Clock` yang dimanipulasi |
| 7 | Frontend toko | Katalog, detail, auth, checkout, halaman bayar, pesanan, reveal, tema; **tipe & validasi zod dibagikan** (satu aplikasi) | Alur beli end-to-end di browser dengan simulasi webhook |
| 8 | Frontend admin | Panel admin dari menu database; antrean refund/sengketa | Admin menjalankan semua kelola tanpa curl |
| 9 | Integrasi dan regresi | DB lokal yang sama via `DATABASE_URL` (migrasi dari nol), mock Xendit, tes `prisma migrate deploy` dari nol, regresi seluruh suite | `ALLOW_DESTRUCTIVE_TESTS=1 npm run test` hijau |
| 10 | Hardening produksi | Checklist bagian 14, **Wajibkan TOTP admin (`TOTP_WAJIB_ADMIN=true`) + uji prosedur darurat CLI** 🔴 | Semua tercentang |

### Fase 2 🔵 (setelah MVP hidup)

| # | Fokus |
|---|---|
| 11 | Komplain + `restore()` + tes E2E Playwright |
| 12 | RBAC CRUD (`/rbac/*`), editor tema, laporan penuh (per-jenis, lama-terjual, stale, diskon), audit reader fe |
| 13 | Wishlist, cache katalog, retry webhook UI |
| 14 | Dashboard grafis, ulasan/testimoni, notifikasi Telegram |

## 13. Konfigurasi (`.env.example`)

| Variabel | Fungsi |
|---|---|
| `DATABASE_URL` | Satu koneksi untuk aplikasi, migration, seed, dan test (dev) |
| `JWT_SECRET_FILE` | Secret JWT (≥ 256 bit); app gagal start bila kosong/default |
| `AES_KEYRING_FILE` | Keyring `key_version → key` |
| `XENDIT_SECRET_KEY`, `XENDIT_CALLBACK_TOKEN`, `XENDIT_BASE_URL` | Sandbox → live cukup ganti nilai |
| `SUPERADMIN_USERNAME`, `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` | Seeder, hanya jalan bila belum ada ADMIN |
| `TOTP_EMERGENCY_TOKEN_FILE` | Prosedur darurat CLI bila satu-satunya admin kehilangan perangkat & recovery code (berlaku singkat, tercatat audit, wajib ganti password setelahnya) |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM` | SMTP (dev: Mailpit) |
| `APP_BASE_URL` | Tautan email & verifikasi (API same-origin dengan halaman — tanpa CORS) |
| `ADMIN_EMAIL` | Inbox operasional admin (alert reset TOTP, kegagalan webhook, dst); kosong = alert dimatikan |
| `GARANSI_HARI`, `GARANSI_MAKS_TANPA_REVEAL_HARI`, `EXPIRY_MENIT`, `MAKS_PENDING_PER_USER`, `REFRESH_TOLERANSI_DETIK`, `IDEMPOTENCY_PROCESSING_TTL_MENIT` (5), `TOTP_WAJIB_ADMIN` | Aturan bisnis yang bisa diubah; `TOTP_WAJIB_ADMIN=false` di dev, **true di prod** |
| `FOTO_DOMAIN_WHITELIST` | Domain gambar yang diizinkan |
| `RETENSI_WEBHOOK_PAYLOAD_HARI` (90), `RETENSI_IDEMPOTENCY_SNAPSHOT_HARI` (30), `RETENSI_TOKEN_HARI` (30), `RETENSI_AUDIT_PII_BULAN` (24) | Masa retensi data (§6 "Retensi data") |

Nilai rahasia tidak pernah di-commit; di produksi memakai file read-only (`chmod 600`) atau secret manager.

## 14. Checklist Hardening Produksi

- [ ] Proses berjalan sebagai user non-root; Postgres hanya listen `127.0.0.1` (tidak diekspos) — unit systemd disediakan; verifikasi operator
- [ ] Dua user Postgres: migrasi (DDL) dan aplikasi (DML)
- [ ] Secret AES/JWT/Xendit/darurat via file read-only `chmod 600` (bukan env biasa) — langkah deploy tersedia; verifikasi operator
- [ ] HTTPS lewat reverse proxy; HSTS dan header keamanan aktif (header selesai di repo; verifikasi HTTPS operator)
- [x] Tidak ada debug UI atau endpoint debug di prod; `/api/v1/health` tidak membocorkan detail internal
- [x] Log terstruktur + correlation id + masking; kredensial tidak pernah masuk log
- [ ] **Email deliverability: SPF/DKIM/DMARC aktif untuk domain pengirim**
- [ ] **Email notifikasi admin (NEEDS_REFUND/DISPUTED/DUPLIKAT) berjalan**
- [ ] TOTP aktif untuk semua user ADMIN 🔴; prosedur darurat pernah diuji di staging (kode + tes DB siap; staging operator)
- [ ] `pg_dump` terjadwal + **uji restore berkala**; key AES di-backup terpisah
- [x] Dependabot atau OWASP dependency-check aktif (`dependabot.yml`)
- [x] Proses prod: systemd unit (`Restart=always`), limit memori; health dipantau via `/api/v1/health`; konfigurasi dev via `.env` (unit + timer disediakan)
- [ ] Halaman S&K, privasi, garansi/refund (termasuk jalur CS sengketa) sudah diisi (bukan placeholder)
- [ ] File migration Prisma yang sudah di-apply tidak pernah diedit
- [x] **Alert dasar**: webhook `GAGAL` melewati batas percobaan, `RESERVED` menggantung, job terjadwal berhenti (heartbeat); **uptime check eksternal** ke endpoint health (monitor eksternal operator)
- [x] **Tabel bukti append-only** (`admin_audit_logs`, `audit_reveals`, `static_page_versions`): REVOKE UPDATE/DELETE untuk user aplikasi
- [ ] **Prosedur PDP manual**: permintaan penghapusan data lewat CS + kebijakan retensi (transaksi tetap disimpan tanpa identitas) tertulis sebelum go-live; **prosedur anonimisasi `audit_reveals` (via `DATABASE_URL`) pernah diuji di staging dan `RetensiJob` berjalan** (CLI + tes DB selesai; uji staging operator)

## 15. Risiko Bisnis (sebelum go-live)

- **ToS publisher game:** Moonton, Supercell, HoYoverse umumnya melarang jual-beli akun; risiko akun dibanned dan sengketa. Tampilkan peringatan risiko di halaman toko dan S&K, dan simpan persetujuan pembeli (`terms_version` + teks versinya di `static_page_versions`).
- **Kebijakan merchant Xendit:** pastikan kategori jual akun game diizinkan sebelum produksi.
- **Syarat kepatuhan e-commerce Indonesia:** verifikasi sendiri kebutuhan **pendaftaran PSE**, **identitas usaha/NIB**, dan **KYC Xendit** untuk penjual perorangan sebelum go-live — tidak bisa diasumsikan dari dokumen ini.
- **Eksekusi refund:** VA/QRIS umumnya tanpa auto-refund — tentukan alur manual dengan Xendit: kapan rekening tujuan ditanyakan, verifikasi berapa lama prosesnya; kumpulkan data pembeli seminimal mungkin (UU PDP).
- **UU PDP:** kumpulkan data pembeli seperlunya (kini termasuk email & IP/UA audit), siapkan kebijakan privasi dan retensi data + hak penghapusan (`DELETE /auth/account` 🔵).
- **Dokumentasi Xendit:** baca versi terkini sebelum menulis `XenditClient` dan adapter webhook; API pembayaran Xendit punya beberapa generasi.
- **Kebijakan refund:** tentukan siapa menanggung fee dan kapan refund diberikan sebelum produksi.

## 16. Di Luar Scope

- Escrow penuh (fondasi: `receipt_confirmed`, `DISPUTED`, komplain 🔵)
- Multi-seller marketplace dan payout seller
- WhatsApp/Telegram (Telegram masuk Fase 2 opsional)
- Upload file screenshot fisik (sementara URL https dari domain yang diizinkan)
- CI/CD dan hosting sendiri
- Lock job di database (pg advisory lock; hanya relevan bila jalan lebih dari satu instance)

## 17. Riwayat

- 2026-11-10: pivot domain dari toko baju ke jual akun game; hardening produksi (Flyway, idempotent webhook, optimistic lock, Docker).
- 2026-11-10: review pertama dan kedua digabung (Boot 4.1.x, telat-PAID dua jalur, timeout ≠ gagal, voucher dikembalikan, satu tagihan aktif, endpoint admin transaksi, refresh/logout, masa garansi, testing per tahap).
- 2026-11-10: **v3** — frontend masuk scope; jenis game & game; promo + voucher; tema dari database; verifikasi email; lapisan anti bayar dua kali; status `FAILED`/`DUPLIKAT`; galeri foto.
- 2026-11-10: **v4** — MVP/Fase 2; halaman statis + persetujuan; konfirmasi diterima & garansi otomatis; TOTP; slug + SEO; DoD; `.env.example`.
- 2026-11-10: `API.md` dihasilkan (v5 API) — endpoint dua-langkah TOTP, refresh rotasi, polling ringan, reveal POST, tulis-saja kredensial, ringkasan, `/api/v1`.
- 2026-11-10: **v6** (review integrasi) — `API.md` jadi sumber kebenaran endpoint; `webhook_event` **dua-fase** (REQUIRES_NEW + `DITERIMA/DIPROSES/GAGAL`, dedup `jenis+id_xendit`); `tutup-sengketa` + AutoKonfirmasiJob skip DISPUTED; akun mulai **draf → relist wajib kredensial**, `PUT kredensial` ditolak saat RESERVED/SOLD, flag `kredensial_terisi`; `idempotency_key` + `request_hash`/snapshot/job pembersih + dipakai `ganti-metode`; refresh toleransi 10–30 dtk; kolom refund (`refund_ref/jumlah/fee/refunded_at`); telat-bayar generik EXPIRED/CANCELLED/FAILED; `pulihkan()` wajib ganti kredensial; `reset-totp` permission+re-autentikasi+email+ tabel `users_totp_recovery` + prosedur darurat CLI; alur refund manual (rekening = catatan) + email admin MVP; bucket rate limit terpisah (polling/webhook); SPF/DKIM/DMARC; ganti-email; email `lower()`; wishlist slug; audit_reveal IP+UA; garansi dari **reveal pertama**; MVP dirampingkan (RBAC-CRUD, editor tema, 3 laporan → Fase 2); skema **26 tabel** (MVP 24); OpenAPI → tipe TS.
- 2026-11-10: **v7** (review konsistensi ERD/PLAN/API) — tabel `refund` per pembayaran (menggantikan kolom `refund_*`; refund `DUPLIKAT` tak mengubah transaksi utama); `release()` terpisah dari `relist()` + CHECK DB akun siap jual wajib berkredensial; batas garansi tanpa reveal (30 hari); matriks transisi transaksi; idempotency PK `(user_id, key)` + klaim key + status `PROCESSING/SELESAI`; `totalPratinjau` → `HARGA_BERUBAH`; ganti-email lengkap (`email_baru`, konfirmasi); `refresh_token` family; TOTP anti-replay + endpoint dibangun tahap 2; `pembayaran.id_dana_masuk`; tabel `pengaturan` + saklar `checkout_aktif`; `WebhookRetryJob`; audit append-only; alert dasar + uptime check; `user_id` seragam; skema **28 tabel** (MVP 26).
- 2026-11-10: **v8** (kebijakan soft delete global) — rekord bisnis tidak pernah dihapus fisik: `voucher_usage.status` (`TERPAKAI/DIPULIHKAN`) + `dipulihkan_pada` (pengembalian = flip status + `terpakai` turun, konsumsi ulang = overwrite baris); `idempotency_key.berlaku_hingga` + status `KEDALUWARSA` (job pembersih menandai, klaim kedaluwarsa = overwrite); `akun_foto.dihapus_pada` (DELETE foto = soft); `role_menu`/`role_permission.dicabut_pada` (NULL = grant aktif); `komplain.dihapus_pada` 🔵; baris `pembayaran` tidak pernah dihapus fisik; **pengecualian: `admin_audit_log` & `audit_reveal` tidak bisa dihapus sama sekali (tanpa soft delete)**; index `transaksi(refunded_at)` dibersihkan dari daftar (kolom kini di tabel `refund`).
- 2026-11-10: **v9** (review celah logika + konsistensi; API.md → v8, ERD → v9) — telat-bayar → reserve-ulang **mengonsumsi ulang voucher** (gagal → `NEEDS_REFUND`); aturan **dana masuk di tagihan lama saat `RESERVED`** (ganti-metode) → `PAID`/`DUPLIKAT`; idempotency: klaim `REQUIRES_NEW`, respons final → `SELESAI`, TTL `PROCESSING` 5 menit + `IdempotencyJob`, `request_hash` memuat metode+path; **`REFUNDED` hanya bila Σ refund = jumlah dibayar** + sisa refund di ringkasan; tabel **`halaman_statis_versi`** (skema **29 tabel**, MVP 27); kuota voucher atomik + CHECK; **`pembayaran.external_id`** per tagihan; `webhook_event.id_xendit` → **`id_dana_masuk`**; TOTP: `perlu_setup_totp`, `totp_gagal`/`totp_terkunci_hingga`, `recovery-baru`; **retensi data** + `RetensiJob` + prosedur anonimisasi audit; aturan hapus (akun hanya `DELISTED`, master = `aktif`, filter katalog); tie-break promo + floor; sinkron dokumen (kardinalitas ERD §2/§4, string versi, label tema 🔵, endpoint↔tahap, permission `:read`, 4 index, CHECK `dikonfirmasi_*`, keputusan #2/#3 → Terkunci).
- 2026-11-10: keputusan framework frontend **dikunci: Next.js (React + TypeScript) + Tailwind** — dipindah dari "Perlu dikonfirmasi" ke Terkunci; tanpa perubahan skema/endpoint (PLAN tetap v9, API v8, ERD v9).
- 2026-11-10: `PHASES.md` dihasilkan — §12 dipecah jadi checklist fase 0–10 + Fase 2 (DoD global, gate keputusan fee, sub-grup fase 5); tree §3 diperbarui (folder `docs/`).
- 2026-11-10: **v10** (pivot full-stack Next.js) — **Spring Boot/Java dibuang; satu aplikasi Next.js (App Router) di `web/`**: halaman toko + admin **dan** Route Handlers `app/api/v1/*` (Node runtime) — webhook Xendit tetap langsung ke route API, tidak ada lapisan API ganda; **Prisma** menggantikan Flyway (disiplin migration tetap: file yang di-apply tidak pernah diedit; DDL/DML dua user tetap); stack: `jose` (JWT), bcrypt, otplib, Nodemailer, rate-limiter-flexible, `node:crypto` AES-GCM (keyring tetap), node-cron + `instrumentation.ts` + advisory lock (pengganti ShedLock); **zod + tipe shared** menggantikan generate OpenAPI (fe & API satu codebase); Vitest + Testcontainers (node) + mock Xendit menggantikan Gradle/WireMock; klaim idempotency & webhook fase-1 = `$transaction` Prisma terpisah (pola REQUIRES_NEW); health route `/api/v1/health`; `API.md` → v9, `ERD.md` → v10. Logika domain tidak berubah (state machine, idempotency, webhook dua-fase, retensi, RBAC, TOTP).
- 2026-11-10: **v11** (tanpa Docker + aplikasi di root + shadcn/ui) — **Docker dibuang** (dianggap memberatkan host): PostgreSQL 18 berjalan **native** di mesin (sudah live di port 5432), dev DB + user DML/DDL dibuat via SQL, prod = `next start` + systemd + Caddy binary native; secret via file read-only `chmod 600` (bukan Docker Secrets); **Testcontainers dibuang** → integration test memakai **DB test lokal** (`gamestore_test`, migrasi dari nol tiap suite); aplikasi berada di **root repo** (bukan `web/` — mengikuti scaffold yang sudah berdiri: Next.js 16.4.6 + React 19 + Tailwind 4); **UI memakai shadcn/ui** (keputusan terkunci). Fee pembelian: **opsi B (toko tanggung)** mengikuti ERD — bila berubah jadi opsi A, tambah 1 migration `biaya_layanan`.
- 2026-11-10: **v12** (tanpa lapisan API publik — Server Actions) — **Route Handlers `/api/v1/*` dibatalkan sebagai kontrak publik**; permintaan user: "pakai server secara langsung supaya lebih aman". Logika: server component → service langsung; komponen klien → **Server Actions** (`app/actions/*`); **dua pengecualian tetap HTTP**: webhook Xendit (callback dari luar) + `/health` (uptime check). Keamanan naik: tanpa enumerasi endpoint, Server Actions menolak lintas-origin + POST saja; **sesi = access JWT di cookie httpOnly** (bukan Authorization); notifikasi status = **polling aksi `transaksiStatus`**; idempotency: header `Idempotency-Key` → **field** `kunciIdempoten` (`crypto.randomUUID()` klien), arbitrase tabel & `$transaction` tidak berubah; kontrak error = **typed-union `{ ok, kode, pesan }`** (kode machine dipertahankan; RFC 7807/429-Retry-After tidak lagi berlaku); data master publik = server component `use cache` + `revalidateTag`. `API.md` → v10 (kontrak modul & aksi), ERD tidak berubah. Progres Fase 0–1 selesai: Next 16.4.6 + shadcn (base-nova/@base-ui/react — prop `render`, bukan `asChild`), Prisma 7.10.1 (config `prisma.config.ts`, CLI tak lagi auto-load `.env`, generator `prisma-client` output flat `generated/client.ts`), 27 tabel + 28 CHECK + partial index + GIN + REVOKE append-only, seed idempoten.
Progres Fase 0–1 selesai: Next 16.4.6 + shadcn (base-nova), Prisma 7.10.1, 27 tabel + REVOKE append-only, seed idempoten. Konvensi bahasa: **kode 100% Inggris** (komentar, identifier, pesan); **docs & chat tetap bahasa Indonesia**.
- 2026-11-11: **v13** (backend 3 layer dalam `src/`) — permintaan user: back-end terlapis **controller → service → repository** dan backend dipisah dari `app/` ("app hanya untuk halaman"). **`src/` murni backend**: `src/controllers/` (Server Actions, pindah dari `app/actions/`), `src/services/` (dari `lib/`), `src/repositories/` (`*-repo.ts`, BARU — satu-satunya yang import prisma; operasi data-level atomik dibungkus `$transaction` di repo, aturan bisnis tetap di service), `src/lib/` (infra). Alias `@/*` → `./src/*` lalu `./*`; `generated/` tetap root. Segmen panel gel `instant = false` (akses cookie harus blocking — cache components Next 16). URL panel `/panel`; ERD & API tidak berubah kontraknya.- 2026-11-11: **v14** (adopsi UI Figma Make "NEXAPLAY") — `project.zip` (ekspor Figma Make: Vite SPA satu file) di-refactor ke App Router: `app/page.tsx` tetap server component yang membaca sesi (`instant = false`), UI dipecah ke `components/storefront/` (header, hero, catalog, game-card, game-detail-modal, login-modal, how-it-works, footer, toast, provider). Ikon inline → `lucide-react`, `<img>` → `next/image` (+`remotePatterns` Unsplash), font → Manrope (display) + DM Sans (body). Palet lime dipetakan ke token shadcn di `app/globals.css` (`--brand`, `--brand-ink`, `--brand-deep`); tema default dark. Katalog masih **data demo** di `src/lib/storefront-demo.ts` (DB menyusul Fase 3/7). Login modal tersambung ke `loginAction` asli; alias `@/*` kembali `./*` sehingga backend dipanggil `@/src/...` dan `src/` tetap murni backend. Dokumen `PRODUCT.md`/`DESIGN.md` dibuat. Zip asli tetap di root sebagai arsip.
- 2026-11-11: **v15** (Fase 2 — alur akun) — server: `requestPasswordReset`/`resetPassword` (token `RESET`, TTL 1 jam, sekali pakai; sukses = ganti hash + `token_version` naik + semua refresh dicabut), `changePassword` (wajib password lama; sesi lain dicabut, sesi ini diterbitkan ulang), `requestEmailChange`/`confirmEmailChange` (dua token `GANTI_EMAIL_LAMA`/`GANTI_EMAIL_BARU`, urutan bebas, wajib password, anti-enumerasi: email terpakai → jawaban tetap generik + notifikasi ke pemilik; konfirmasi = email pindah + `email_terverifikasi` + semua sesi mati). Repository menambah transaksi data-level `consumePasswordReset`, `consumeEmailChange`, `updatePasswordAndRevokeAll`, `findById`, lookup email case-insensitive. Halaman baru: `/lupa-password`, `/reset-password`, `/verifikasi-email`, `/ganti-email/konfirmasi` (+ `AuthShell`, tautan "Lupa password?" di login). `email.service` memakai `APP_BASE_URL` (sebelumnya salah `APP_URL`) + helper `passwordResetLink`/`emailChangeLink`. Smoke non-cookie 13/13 hijau; build hijau. Sisa Fase 2: TOTP, rate limit per bucket, audit log admin, `/users*`.
- 2026-11-11: **v16** (validasi zod bersama) — folder baru **`src/validation/`**: `common.ts` (username, email trim+lowercase→`z.email()`, password min 8, token), `auth.ts` (skema per aksi + tipe `z.infer`), `parse.ts` (`parseInput()` → typed-union `INPUT_TIDAK_VALID`; `UnionError` pindah ke sini). Service auth kini memvalidasi lewat `parseInput` (guard regex manual dihapus); controller memakai tipe turunan skema; form client (login, modal login, daftar, lupa/reset password, konfirmasi ganti email) memakai skema yang sama sebelum memanggil Server Action. Pengecualian anti-enumerasi dipertahankan: `requestPasswordReset` tetap `ok` untuk input tidak valid. `API.md` → v11 (baris "Validasi"). Verifikasi: `tsc`, `lint`, `build` hijau; smoke schema 8/8 + smoke akun 12/12.
- 2026-11-11: **v17** (service sebagai object) — permintaan user: kode service ditulis **inline di dalam object** agar mudah dikelola. `src/services/auth.service.ts` mengekspor **`authService`** dengan method inline (`register`, `verifyEmail`, `resendVerification`, `requestPasswordReset`, `resetPassword`, `changePassword`, `requestEmailChange`, `confirmEmailChange`, `login`, `issueSession`, `refresh`, `logout`, `logoutSemua`, `verifySession`); `rbac.service.ts` → **`rbacService`**; `email.service.ts` → **`emailService`**. Helper murni (`keSession`, `kirimVerifikasi`, `baseUrl`, `gagal`) tetap module-private; panggilan antar-method memakai `authService.<method>()` / `rbacService.<method>()`, bukan `this`, jadi aman di-destructure. Semua pemanggil diperbarui: controller auth, `app/page.tsx`, `app/panel/{layout,dashboard}`, `app/verifikasi-email`. `API.md` baris "Batas layer" mencatat pola object. Verifikasi: `tsc`, `lint`, `build` hijau; smoke akun 12/12 + schema 8/8.
- 2026-11-11: **v18** (Fase 2 — TOTP, rate limit, audit, users admin) — **TOTP selesai**: `src/lib/totp.ts` (otplib v13: `verifyTotp` dengan `epochTolerance: 1` + `afterTimeStep` anti-replay, recovery code `xxxxx-xxxxx` di-hash SHA-256), `src/lib/crypto.ts` (AES-256-GCM `[iv12|tag16|data]`, AAD `totp:<user_id>`, `key_version` dari keyring), `src/repositories/totp-repo.ts` (klaim langkah atomik `consumeStep`, counter gagal + lock 15 menit tahan restart, recovery sekali pakai, reset admin). Alur `authService`: `setupTotp`/`activateTotp` (bisa lewat sesi **atau** challenge `totp-setup` 15 menit), `loginTotp` (6 digit **atau** recovery code, anti-replay, `TOTP_TERKUNCI` setelah 5 gagal), `regenerateRecoveryCodes` (wajib password + kode TOTP), login ADMIN tanpa TOTP saat `TOTP_WAJIB_ADMIN=true` → `jalur: 'perlu-setup-totp'` (15 menit). **Rate limit**: `src/lib/rate-limit.ts` (rate-limiter-flexible in-memory, bucket IP & identitas: login, register, email, token, refresh, totp — semua menjawab `TERLALU_SERING`); dipasang di register, verifikasi, kirim-ulang, lupa/reset password, login, TOTP, refresh. **Audit**: `admin_audit_log` lewat `audit.service` (`log` internal + `list` ber-guard `audit:read`). **Users admin**: `user-admin.service` — list, ubah role, aktif/nonaktif, paksa-logout, reset TOTP (`totp:reset` + re-autentikasi + email target + alert admin), guard anti-kunci diri & `ADMIN_TERAKHIR`, semua mutasi diaudit. Validation baru: `src/validation/admin.ts`; controller `admin-user.controller.ts` + aksi TOTP di `auth.controller.ts`. `emailService.sendAdminAlert` (env `ADMIN_EMAIL`). Verifikasi: `tsc`, `lint`, `build` hijau; smoke TOTP 17/17 ALL PASS + smoke akun 12/12 + schema 8/8.
- 2026-11-11: **v19** (Fase 3 — katalog) — backend katalog selesai. **Master**: `catalog.service` (jenis-game & game; DELETE = `aktif=false`; `skema_atribut` hanya boleh **tumbuh** — kunci/tipe lama tidak boleh dihapus/berubah), repo `jenis-game-repo`/`game-repo` (+ hitungan akun AVAILABLE per game). **Akun**: `akun.service` + `akun-repo` — state machine eksplisit (`reserve`, `release`, `markSold`, `relist`, `delist`, `pulihkan`) lewat conditional `UPDATE ... WHERE status = from` (atomik); akun baru selalu `DELISTED`; `relist` wajib kredensial; edit/delist/credential ditolak saat `RESERVED`; `delete` hanya saat `DELISTED` (soft delete); `pulihkan` SOLD→AVAILABLE wajib kredensial baru (dienkripsi di transisi). **Kredensial tulis-saja**: AES-256-GCM AAD `akun:<id>` + `key_version`, tidak pernah dikembalikan; flag `kredensialTerisi` di DTO admin. **Foto**: URL + urutan, DELETE soft (`dihapus_pada`), reorder divalidasi kepemilikan, whitelist domain `FOTO_DOMAIN_WHITELIST`. **Publik**: filter jenis/game/harga, urutan whitelist (`terbaru/termurah/termahal`), `size` maks 100, `q` full-text via tsvector `cari` (GIN) + prefilter id; detail per slug hanya AVAILABLE. **Cache**: `src/lib/cache/{tags,revalidate,catalog}.ts` — `use cache` + `cacheLife` + `cacheTag` untuk jenis/game/katalog/detail; Server Action mutasi memanggil `updateTag` (via `revalidate.ts`). Schema evolusi: `parserSkema`/`validateAtribut` menolak kunci asing, field wajib kosong, dan tipe salah. Controller: `catalog.controller.ts`, `akun.controller.ts`. Verifikasi: `tsc`, `lint`, `build` hijau; smoke katalog 33/33 ALL PASS + smoke TOTP 17/17 + akun 12/12 + schema 8/8.
- 2026-11-11: **v20** (Fase 4 — diskon) — `src/lib/diskon.ts` (Strategy murni: persen floor ke rupiah, `maks_potongan`, nominal di-clamp ke harga; `pilihPromo` AKUN > GAME > SEMUA, seri potongan rupiah lalu `id` terbesar). **Promo**: `promo.service` + `promo-repo` — CRUD admin (`promo:read/write`, DELETE = `aktif=false`), validasi periode/persentase/target (AKUN/GAME harus ada; SEMUA tanpa target), publik `listAktif`, hook internal `hitungPromo`. **Voucher**: `voucher.service` + `voucher-repo` — CRUD admin (`voucher:read/write`, kode unik uppercase), kuota tidak boleh di bawah `terpakai`, pratinjau checkout (promo dulu → voucher pada harga setelah promo; `min_belanja` diuji terhadap harga setelah promo; nominal > dasar ditolak; total > 0; wajib email terverifikasi; tanpa konsumsi kuota). **Atomik**: `consume` = satu transaksi `UPDATE voucher ... WHERE terpakai < kuota` + upsert `voucher_usage` (`ON CONFLICT ... WHERE status='DIPULIHKAN'`), `release` = flip usage ke `DIPULIHKAN` + `terpakai--`; 1×/user didahulukan dari cek kuota; re-consume menimpa baris. Controller `diskon.controller.ts`; cache tag `promo:aktif` + `revalidatePromoCache`. **Seeder testing**: `prisma/seed-testing.ts` + modul `prisma/seed/testing/{config,data-games,users,accounts,promos,vouchers,reset}.ts` — namespace `test-*`/`[TEST] *`/`NEXA*`/`@nexaplay.test`, 35 akun dengan kredensial AES terenkripsi + 85 foto (dimiliki superadmin dari `SUPERADMIN_*`), promo/voucher skenario batas, 3 buyer uji; idempoten, `--reset` menolak bila sudah ada transaksi; script `db:seed:test` & `db:seed:test:reset`. Verifikasi: smoke 39/39 (termasuk race 2 thread kuota terakhir), `tsc`/`lint`/`build` hijau + regresi fase sebelumnya.
- 2026-11-11: **v21** (UI akun & keamanan — Fase A) — halaman **`/akun`** (guard `verifySession`, `instant = false`) menampilkan profil aman dari method baru **`authService.profile()`** (tanpa hash/secret): username, email, status verifikasi, role, status TOTP. Form **ganti password** memakai `changePasswordAction` (password lama + konfirmasi, sesi lain dicabut, sesi ini diterbitkan ulang) dan kartu **keluar dari semua perangkat** memakai `logoutSemuaAction` dengan konfirmasi inline lalu redirect `/login`. Entry point: dropdown nama user di header storefront (Akun saya/Keluar) dan link “Akun saya” di sidebar panel. `AuthShell` mendapat prop `wide`. Tidak ada migration. Verifikasi: `tsc`, `lint`, `build` hijau; GET `/akun` anonim → 307 `/login`, sesi valid → 200.
- 2026-11-11: **v22** (UI akun & keamanan — Fase B/C) — **ganti email**: kartu di `/akun` memakai `requestEmailChangeAction` (email baru + konfirmasi + password), pesan netral anti-enumerasi, tautan ke `/ganti-email/konfirmasi`, menjelaskan dua tautan 24 jam dan semua sesi keluar setelah konfirmasi. **TOTP**: kartu setup di `/akun` (QR via dependency baru `qrcode` + secret manual, aktivasi 6 digit, recovery code tampil sekali), kartu aktif untuk regenerate recovery code (password + TOTP), dan langkah kedua login TOTP di `/login` serta modal storefront (`TotpLoginForm`). Alur `perlu-setup-totp` diarahkan ke halaman baru `/totp/setup?token=...`; aktivasi dengan challenge token langsung menerbitkan sesi lalu lanjut panel. Semua pemetaan kode error TOTP/email ada di UI, bukan service. Verifikasi: `tsc`, `lint`, `build` hijau; `/akun` sesi valid → 200, `/login` dan `/totp/setup` → 200.
- 2026-11-12: **v23** (katalog storefront dari database) — `app/(storefront)/layout.tsx` membaca `getKatalogCached` (100 akun AVAILABLE pertama), `getGamesCached`, dan `getJenisGameCached`, lalu memetakan lewat `src/lib/storefront-catalog.ts` ke `StorefrontAccount`/`StorefrontCategory`. `StorefrontProvider` menerima akun, kategori, dan total asli; search/filter/sort dilakukan client-side atas data server; spesifikasi akun memakai label dari `skema_atribut` game; foto memakai URL DB dengan fallback ikon. Harga, judul, game, jenis, slug, dan jumlah akun tidak lagi hardcode; `src/lib/storefront-demo.ts` dihapus. Harga coret/diskon demo, badge promo palsu, metode pembayaran hardcoded, dan tombol statistik `248 akun` dihapus. Sisa: pagination, filter harga/atribut, full-text server-side, promo/diskon nyata, dan checkout (Fase 5/7). Verifikasi: `tsc`, `lint` hijau; `/` menampilkan 25 akun seed dari DB; `/akun` sesi valid → 200.
- 2026-11-12: **v24** (batas akses data server component) — facade baru `src/services/storefront.service.ts` dengan `getInitialCatalog()`; `app/(storefront)/layout.tsx` tidak lagi mengimpor cache reader/mapper, hanya `authService` dan `storefrontService`. ESLint `no-restricted-imports` untuk `app/**/*.{ts,tsx}` melarang import `src/lib/prisma`, `src/repositories/*`, `generated/*`, `src/lib/cache/*`, `pg`, dan `@prisma/client`; server component wajib lewat service (baca) atau controller/server action (mutasi). Aturan yang sama dicatat di `AGENTS.md`. Tidak ada perubahan schema/query. Verifikasi: `tsc`, `lint` hijau; smoke `/` dan `/akun` → 200.
- 2026-11-12: **v25** (Fase 5 core transaksi) — migration `20261112130000_pembayaran_instruksi` menambah `pembayaran.instruksi` JSONB. Service baru: `transaksiService` (checkout 3 fase, idempotency replay/TTL, lock user, batas pending, reserve, harga server, voucher atomik, batal, list/detail/status, reveal, konfirmasi), `pembayaranService` (channel QRIS/VA, webhook Xendit dua-fase, dedup, PAID/EXPIRED/FAILED, late-pay + NEEDS_REFUND, DUPLIKAT), `pengaturanService` (checkout_aktif + pengaturan publik/admin). Adapter `paymentGateway` memakai Xendit asli bila `XENDIT_SECRET_KEY` ada, mock deterministik di dev. Route `POST /api/v1/pembayaran/webhook/xendit` + verifikasi `XENDIT_CALLBACK_TOKEN` constant-time. Cache katalog diinvalidasi dari service setelah checkout/cancel/webhook. Smoke: preview, checkout QRIS/VA, replay key, webhook PAID/duplikat, late-pay, cancel, reveal, konfirmasi; data uji dibersihkan. Sisa Fase 5: ganti-metode, job expiry/rekonsiliasi/idempotency/webhook-retry/auto-konfirmasi, refund/sengketa, admin transaksi/ringkasan, UI Fase 7/8.
- 2026-11-12: **v26** (ganti metode) — `transaksiService.gantiMetode()` + `gantiMetodeAction`. Hanya transaksi `RESERVED` milik pembeli; `kunciIdempoten` dengan `request_hash` berisi nama aksi; satu tagihan `PENDING`; tagihan lama di-`CANCELLED` dan di-cancel ke Xendit best-effort; tagihan baru memakai `external_id` urut berikutnya dan expiry transaksi yang sama; no-op bila metode+bank sama; dana masuk ke tagihan lama tetap diterima lewat state machine webhook → transaksi `PAID`, tagihan `PENDING` lain dibatalkan. `pembayaran.instruksi` disimpan untuk tagihan baru; replay key mengembalikan snapshot. Verifikasi: tsc/lint, smoke QRIS→VA, webhook dana tagihan lama, duplikat webhook, replay key, no-op metode sama; data uji dibersihkan.
- 2026-11-12: **v27** (job terjadwal + perbaikan zona waktu) — `src/jobs/` menambah `runJob`/`withAdvisoryLock` (pg advisory lock dalam transaksi), scheduler node-cron dari `instrumentation.ts`, dan handler `IdempotencyJob`, `ExpiryJob`, `WebhookRetryJob`, `AutoKonfirmasiJob`. Expiry melepas akun/voucher + membatalkan tagihan PENDING; retry memproses ulang payload event `GAGAL`; auto-konfirmasi mengisi `garansi_mulai` dan menutup transaksi PAID yang garansinya habis. `src/lib/prisma.ts` memaksa koneksi `timezone=UTC` karena adapter Prisma 7 mengganti offset timestamptz menjadi `+00:00` tanpa konversi — tanpa ini semua timestamp bergeser +7 jam. `requestHash` sekarang memuat nama aksi (`checkout`/`ganti-metode`). Verifikasi: tsc/lint; smoke expiry, retry GAGAL→PAID, auto-konfirmasi, IdempotencyJob; data uji dibersihkan. Sisa: pre-check Xendit pada expiry + masa tenggang, ReconciliationJob, RetensiJob, admin webhook-event, refund/sengketa, admin transaksi, UI Fase 7/8.
- 2026-11-12: **v28** (UI pembeli checkout/pembayaran/pesanan) — `checkoutService.getBySlug()` menyiapkan akun, promo, total, dan versi S&K untuk server component. Halaman `/checkout/[slug]` memakai form klien untuk voucher (pratinjau tanpa konsumsi), QRIS/VA + bank, centang S&K, idempotency key, lalu redirect ke `/pesanan/[kode]`. Halaman pesanan menampilkan QR server-generated, VA + copy, hitung mundur, polling status, ganti metode, batal, reveal kredensial (hanya dari respons aksi), konfirmasi diterima, dan rincian biaya. `/pesanan` menampilkan riwayat + filter status. Menu akun desktop/mobile menambah “Pesanan saya”; tombol beli katalog sekarang menuju checkout dan modal login melanjutkan ke checkout setelah masuk. Verifikasi: `tsc`, `lint`; `/checkout/test-vlrt-04`, `/pesanan`, dan `/pesanan/[kode]` → 200; QR data URL tampil; status PAID menampilkan tombol reveal; data uji dibersihkan.
- 2026-11-12: **v29** (halaman detail + checkout inline) — `checkoutService.getDetailBySlug()` membaca akun, promo, total, S&K, dan sesi opsional; halaman publik `/akun-game/[slug]` menampilkan galeri, deskripsi lengkap, spesifikasi, promo, dan `CheckoutForm` di halaman yang sama (QRIS/VA, voucher, S&K). User anonim melihat prompt masuk; setelah login modal menutup dan `router.refresh()` merender formulir tanpa pindah halaman. `CheckoutForm` mendapat prop `showProductCard` agar kartu produk tidak duplikat. Kartu katalog kini memakai `Link` ke halaman detail; modal detail dan state `selected`/`pendingBuy`/`buy` dihapus. Verifikasi: tsc/lint/build; detail anonim dan login → 200, form tampil setelah login, katalog menautkan `/akun-game/[slug]`.
- 2026-11-13: **v30** (detail akun — checkout popup + polish UX) — `/akun-game/[slug]` kini memakai `CheckoutDialog` (shadcn Dialog) untuk formulir checkout, dipicu dari sidebar dan sticky bar mobile; tidak ada lagi section checkout inline. Galeri foto menjadi interaktif (thumbnail + counter), CTA login/checkout memakai state provider sehingga label berubah tanpa refresh, dan mobile bar berisi total + tombol checkout serta auto-hide saat footer terlihat. File `detail-checkout.tsx` dihapus. Verifikasi: `tsc`, `lint`, detector UI bersih; detail login/anonim → 200.
- 2026-11-13: **v31** (Fase 7 — konten publik, promo katalog, katalog server-side) — halaman statis `/halaman/[kode]` membaca versi terbit lewat `halamanService` + cache tag `halaman`, dirender `react-markdown` + `remark-gfm` + `rehype-sanitize`; seed diisi konten S&K/privasi/garansi/FAQ dan menerbitkan versi 2 untuk data placeholder. Footer menautkan empat halaman; `sitemap.ts` memuat rute publik + semua slug akun, `robots.ts` menutup area privat. Katalog beranda kini server component dengan `q` full-text, `jenis`, `sort`, dan `page`; 9 item/halaman, hitungan kategori per query, pagination link, dan empty state. Promo aktif dihitung per akun di service (AKUN > GAME > SEMUA) untuk harga final + harga coret di kartu. `StorefrontProvider` dirampingkan (tanpa state filter katalog); hero search mengarah ke `/?q=#catalog`. Verifikasi: `tsc`, `lint`, `build`; HTTP 200 beranda, `?q=valorant` (5 hasil), `?page=2`, halaman statis, sitemap (25 detail), robots; detail login/anonim + checkout login 200.
- 2026-11-13: **v32** (Fase 6 — halaman statis + laporan) — `halamanService` + `halaman.controller`: list draf, `getDraft`, `updateDraft`, `publish` (versi naik + snapshot append-only), `listVersions`, `getVersion`; publik & checkout membaca versi terbit terakhir lewat `findByKode`, sehingga edit draf tidak bocor. Publish memakai row lock + transaksi dan menginvalidasi cache tag `halaman`. Laporan baru: `laporanService` + `laporan.controller` untuk penjualan harian, penjualan per game, dan refund dengan rentang `dari`/`sampai` (default 30 hari, batas 366 hari) serta agregasi zona Asia/Jakarta; guard `laporan:read`. Tema MVP tetap statis (seed + toggle terang/gelap), editor token dinamis tetap Fase 2. Verifikasi: `tsc`, `lint`, `build`; smoke publish/version dan query laporan dengan transaksi uji (dibersihkan), halaman publik tetap membaca versi terbit, checkout/detail 200.
- 2026-11-13: **v33** (Fase 8 — frontend admin, core) — panel responsif dengan sidebar dari `role_menu` + ikon/active state; dashboard operasional (`ringkasanAdmin`: NEEDS_REFUND, DISPUTED, duplikat, RESERVED, omzet Jakarta); transaksi list/cari/filter, detail pembayaran + refund + audit reveal + linimasa webhook, aksi tandai/tutup sengketa, refund parsial/penuh, izin reveal; akun list/baru/detail (edit, kredensial tulis-saja, foto, delist/relist/pulihkan/hapus); master jenis/game; voucher/promo; halaman draf/terbit/riwayat versi; users; pengaturan + penanda tema Fase 2; audit; inbox webhook. Backend baru: `transaksiService.listAdmin/detailAdmin/ringkasanAdmin/tandaiSengketa/tutupSengketa/refundSelesai/izinkanReveal`, `refund-repo`, `webhook-service` + admin webhook list. Verifikasi: `tsc`, `lint`, `build`; 16 halaman panel GET 200 dengan sesi admin; detail transaksi uji dirender lalu dibersihkan. Sisa: sinkron Xendit GET, penyuntingan penuh voucher/promo/game, verifikasi browser.
- 2026-11-13: **v34** (Fase 8 selesai) — sinkron pembayaran QRIS admin lewat `GET /qr_codes/payments` (VA tetap callback-only) memakai `paymentGateway.fetchStatus` + `transaksiService.sinkronAdmin`, permission `transaksi:sinkron`, audit, dan tombol di detail transaksi; event hasil polling masuk pipeline webhook yang sama sehingga dedup/amount/state machine tetap satu jalur. UI voucher/promo/game kini punya editor penuh (field, periode, kuota, target, skema atribut, aktif); tanggal dikirim sebagai ISO dari browser. Verifikasi: `tsc`, `lint`, `build`; halaman panel 200; aksi update voucher/promo/game dan sinkron dipanggil langsung via Server Action dengan sesi admin dan diverifikasi di DB, lalu data smoke dihapus. Fase 8 ✅; sisa global hanya verifikasi browser (Fase 7) dan Fase 9 regression.
- 2026-11-13: **v35** (webhook retry admin) — `/panel/webhook` kini punya aksi `Proses ulang` untuk event `GAGAL`; `webhookService.retry` memakai payload mentah tersimpan, permission `webhook:retry`, memanggil pipeline webhook yang sama (dedup/amount/state machine), lalu mencatat audit `webhook.retry`. Item Fase 5 “admin webhook-event + proses-ulang” tertutup.
- 2026-11-13: **v36** (Fase 9 selesai) — Vitest + DB test lokal: `vitest.config.mts` mengeset `DATABASE_URL` ke `gamestore_test`; `tests/global-setup.ts` drop schema, `prisma migrate deploy` dari nol, grant DML; helper `resetDb` memakai `TRUNCATE ... CASCADE`. Suite: unit diskon; integrasi migrasi, katalog publik, halaman versi beku, laporan Jakarta, webhook state machine (PAID, duplikat, nominal salah, urutan terminal, telat bayar + voucher, NEEDS_REFUND, DUPLIKAT, ganti metode, EXPIRED), route HTTP webhook, serta job retry/expiry/auto-konfirmasi. `npm run test` = 28 tes / 5 file hijau; `tsc`, `lint`, `build` hijau. Sisa global: verifikasi browser Fase 7.
- 2026-11-13: **v37** (Fase 10 — hardening kode) — `next.config.ts` mengirim CSP (frame-ancestors none, object-src none, img Unsplash, dev eval/ws), `X-Frame-Options: DENY`, `nosniff`, referrer/permissions policy, HSTS + upgrade-insecure-requests hanya produksi, dan `poweredByHeader=false`; terverifikasi `next start` + `curl -I`. `instrumentation.ts` menolak startup produksi bila env wajib/`TOTP_WAJIB_ADMIN=true`/`APP_BASE_URL` https tidak lengkap. `src/lib/logger.ts` JSON + redaksi + correlation id webhook. Email memakai Nodemailer (`MAIL_*`), preview dev ke `.next/dev/mail` mode 0600, error generik. TOTP darurat: `totpDarurat` + `npm run totp:darurat` (token file, cabut sesi/recovery, audit `aktor_id NULL`, alert email) + tes. Retensi: `RetensiJob` (payload 90 hari hanya DIPROSES, snapshot 30 hari, refresh per family, email token), `expireSelesai`, heartbeat `pengaturan.job_heartbeat:*`; health 503 bila heartbeat basi/DB mati; alert job/webhook/RESERVED. PDP: `pdp:hapus` dan `pdp:anonim-audit` memakai user DDL + audit. Deploy: systemd unit/timer, backup/restore/health scripts, Dependabot, `docs/DEPLOYMENT.md`. Verifikasi: 36 tes / 10 file hijau, `tsc`/`lint`/`build` hijau. Sisa: butir operator (DNS email, server non-root/secret, staging restore/TOTP, monitor eksternal, teks final S&K).
- 2026-11-13: **v38** (Fase 20 — cleanup) — redirect panel lama dihapus dari `next.config.ts`; fallback baca foto `/uploads/akun` dan `LEGACY_*` dihapus; direktori kosong `public/uploads/akun` dihapus; path lama diverifikasi 404. `docs/API.md`, `docs/PLAN.md`, `docs/PHASES.md`, `docs/CHECKLIST-FITUR.md`, `docs/ERD.md`, dan `docs/DEPLOYMENT.md` diselaraskan ke nama/route/permission Inggris. Verifikasi: 49 tes / 15 file, `tsc`, `lint`, `build`, seluruh menu panel 200, path lama 404; backup/restore DB bersih menghasilkan 28 tabel + data domain utuh.
- 2026-11-13: **v39** (Fase 21 — copy UI Inggris) — seluruh copy UI storefront, auth, akun, pesanan, panel, email transaksional, validasi Zod, dan pesan error/alert diterjemahkan ke Inggris; `aria-label`, `placeholder`, `alt`, empty state, konfirmasi, dan metadata ikut diperbarui. Tanggal memakai `en-GB` + `Asia/Jakarta`, sedangkan Rupiah/format angka tetap `id-ID`. Seed menu/permission/role diperbarui ke Inggris; migration `20261113170000_english_ui_labels` menyinkronkan data system yang sudah ada. Konten produk/legal/admin tetap sebagai data. Verifikasi: 49 tes / 15 file, `tsc`, `lint`, `build`, seluruh halaman publik/auth/panel GET 200, label sidebar Inggris terverifikasi.
- 2026-11-13: **v40** (Fase 22 — public routes English) — seluruh route publik/auth memakai segmen Inggris: `/account`, `/accounts/[slug]`, `/orders`, `/orders/[code]`, `/pages/[code]`, `/register`, `/forgot-password`, `/verify-email`, `/change-email/confirm`. Parameter dinamis `[kode]` → `[code]`; kode halaman statis menjadi `terms-and-conditions`, `privacy`, `warranty` via migration `20261113180000_english_page_codes`. Redirect 308 menjaga URL lama, termasuk `/halaman/syarat-ketentuan` → `/pages/terms-and-conditions`. Callback Xendit pindah ke `/api/v1/payments/webhook/xendit`; path lama tetap sebagai alias kompatibilitas. Link internal, email, sitemap, robots, dan dokumentasi route diperbarui. Verifikasi: 49 tes / 15 file, `tsc`, `lint`, `build`; semua route baru 200, URL lama 308 ke tujuan baru.
- 2026-11-14: **v41** (verifikasi email via OTP) — verifikasi email registrasi tidak lagi memakai link token; server membuat kode 6 digit (`node:crypto.randomInt`), menyimpan HMAC-SHA256 di tabel baru `email_otps` (purpose `VERIFY_EMAIL`, expiry 15 menit, maks 5 percobaan, sekali pakai), lalu mengirim kode lewat `emailService`/Nodemailer. `/verify-email` menjadi form kode (email terkunci bila sudah login), `verifyEmail` atomic consume + `emailVerified=true`, `resend-verification` menginvalidasi kode lama dan tetap rate-limited. PDP dan `RetensiJob` ikut membersihkan `email_otps`. Verifikasi: `tsc`, `lint`, migration `20261114120000_email_verification_otp` diterapkan ke dev.
