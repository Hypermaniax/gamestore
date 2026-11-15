# 📡 API.md — Spesifikasi Kontrak Modul & Aksi Server Toko Akun Game (v13)

> **Sumber kebenaran logika server**; pendamping `PLAN.md` (v20). Berisi daftar lengkap modul & aksi
> hasil review: perubahan status hanya lewat aksi (state machine), aksi tulis-saja
> untuk kredensial, aksi ringan untuk polling, dan alat bantu operasional admin.
>
> **v10 — tanpa lapisan API HTTP publik (Server Actions)**: logika server dipanggil **langsung** —
> server component memanggil service; komponen klien memanggil Server Actions (`app/actions/*`).
> Tabel memakai **penamaan HTTP (Method + Path) hanya sebagai indeks kejelasan** — kenyataannya
> semua baris adalah aksi/module: `POST /transactions` → aksi `transactions`, `GET /accounts` → baca via
> server component/aksi pembaca. **UI panel berada di `/panel/*`** (folder `app/(secret)/panel/` — bukan
> `/admin`). Dua pengecualian **tetap benar HTTP**: `POST /payments/webhook/xendit`
> (callback dari server Xendit) dan `GET /health` (uptime check).

---

## 0. Aturan Lintas Aksi (supaya kontrak konsisten)

| Aturan | Isi |
|---|---|
| **Error** | **Typed-union `{ ok: true, ...data }` / `{ ok: false, code, message }`** — kode machine-readable: `ACCOUNT_UNAVAILABLE`, `VOUCHER_EXHAUSTED`, `EMAIL_NOT_VERIFIED`, `TRANSACTION_LIMIT`, `PRICE_CHANGED`, `REQUEST_IN_PROGRESS`, `CHECKOUT_CLOSED`, dst; frontend memetakan kode ke pesan, **tidak membaca teks**. Penulisan lama "409/422/503" di tabel = penamaan semantik asalnya |
| **Idempotency** | Aksi checkout & `changeMethod` membawa argumen **`kunciIdempoten`** (`crypto.randomUUID()` dibuat klien; bukan lagi header): key sama + isi sama → hasil yang sama; key sama + isi beda → **kode kontras-isi**; key yang request-nya **masih berjalan** → **kode `REQUEST_IN_PROGRESS`**; key yang **kedaluwarsa** (`valid_until` lewat) dipakai ulang → diklaim kembali, baris lama **di-overwrite** (bukan dihapus). Klaim key **commit sendiri (`$transaction` Prisma terpisah, pola REQUIRES_NEW)**; hasil final — termasuk error fase-1 (`ACCOUNT_UNAVAILABLE`, `PRICE_CHANGED`, dst) dan error Xendit 4xx — disimpan → `SELESAI` (key sama = hasil sama). Key `PROCESSING` ber-**TTL 5 menit**: lewat TTL tanpa `transaction_id` → `KEDALUWARSA`; sudah punya `transaction_id` (timeout/crash setelah fase 1) → diselesaikan `RekonsiliasiJob`. `request_hash` = hash(nama aksi + argumen serial) |
| **Rate limit** | Hasil **kode `TOO_MANY_REQUESTS`** + pesan tunggu; bucket per-IP & per-user (rate-limiter-flexible, in-memory) diterapkan **di dalam aksi**; percobaan ulang menyematkan jeda eksponensial sederhana |
| **Permission** | Kode di database, bukan nama role: `account:read|write`, `credential:write`, `game:read|write`, `voucher:read|write`, `promotion:read|write`, `theme:write` 🔵, `page:read|write`, `setting:read|write`, `transaction:read|sync|dispute|refund`, `reveal:grant`, `webhook:read|retry`, `complaint:decide` 🔵, `report:read`, `audit:read`, `user:manage`, `totp:reset`, `rbac:manage` 🔵 — matriks aksi↔permission di §8 |
| **Akses berlapis** | publik → login → pemilik objek → ADMIN dengan kode permission |
| **Sesi & keamanan** | Access JWT di **cookie httpOnly** (bukan header `Authorization`); refresh token cookie kedua (unchanged). Halaman reveal: tanpa cache (`no-store`); data master publik dibaca server component dengan `use cache` + `revalidateTag` (ETag HTTP tidak dipakai) |
| **Pengecualian HTTP** | Webhook Xendit & `/health` — satu-satunya Route Handler; webhook memakai status HTTP nyata (5xx agar Xendit retry) |
| **Batas layer (v13)** | controller → service → repository → Prisma. **controller** (`src/controllers/`): menerima dari client, tanpa validasi bisnis; **service** (`src/services/`): validasi + aturan bisnis + `$transaction` orkestrasi + cookie, **tidak menyentuh `prisma` langsung**, diekspor sebagai object (`authService`, `rbacService`, `emailService`); **repository** (`src/repositories/*-repo.ts`): murni query + operasi data-level atomik, tanpa aturan bisnis, tanpa cookie. `instant = false` pada segmen yang membaca cookie (guard auth) |
| **Validasi (v11)** | Satu definisi zod di **`src/validation/`** (`common.ts`, `auth.ts`, `parse.ts`) dipakai server **dan** form client; `parseInput()` memetakan issue pertama ke typed-union `INPUT_INVALID` (kontrak tidak berubah). Aksi yang sengaja generik (mis. lupa password) tetap membalas `ok` walau input tidak valid |

Legenda fase: 🟢 MVP · 🔵 Fase 2 · 🔴 wajib sebelum go-live. Ubah bentuk: ✅ tetap · ✏️ diubah · ➕ baru.

---

## 1. Auth

| Method | Endpoint | Kegunaan | Fase |
|---|---|---|---|
| POST | `/auth/register` | Daftar sebagai PEMBELI (email wajib); kirim email verifikasi | ✅ 🟢 |
| POST | `/auth/login` | Login → access token (cookie httpOnly) + cookie refresh. Bila TOTP aktif → balas `perlu_totp` + token sementara; bila TOTP **wajib** (`TOTP_WAJIB_ADMIN`) tapi belum aktif → balas `perlu_setup_totp` + token sementara **15 menit** yang hanya valid untuk aksi `totpSetup` & `totpAktifkan` | ✏️ 🟢 |
| POST | `/auth/login/totp` | Langkah-2 ADMIN: kode 6 digit atau recovery code; token sementara berlaku **5 menit** dan hanya valid untuk endpoint ini; kode yang sudah dipakai ditolak (anti-replay); rate-limited + kunci sementara setelah N gagal (disimpan di `users.totp_failures` / `totp_locked_until` — bertahan lintas restart). Dibangun di tahap 2, **wajib-aktif sebelum go-live** | ➕ 🔴 |
| POST | `/auth/totp/setup`, `/auth/totp/aktifkan` | Buat secret + QR; konfirmasi kode pertama; tampilkan recovery code **sekali saja**; bisa dipanggil dengan token `perlu_setup_totp` (onboarding admin saat TOTP wajib) | ➕ 🔴 |
| POST | `/auth/totp/recovery-baru` | Regenerasi recovery code: wajib password + kode TOTP valid; kode lama dicabut (`totp_recoveries.revoked_at`); kode baru tampil **sekali saja** | ➕ 🔴 |
| POST | `/auth/refresh` | Tukar refresh token, **dirotasi**: lama hangus namun diberi **masa toleransi 10–30 detik** (dua tab yang refresh bersamaan tidak dianggap pencurian); dipakai ulang setelah toleransi → semua sesi dicabut. Butuh tabel `refresh_tokens` | ✏️ 🟢 |
| POST | `/auth/logout` | Akhiri **sesi ini saja** (refresh token yang ini dicabut) | ✏️ 🟢 |
| POST | `/auth/logout-semua` | Naikkan `token_version` → semua perangkat keluar | ➕ 🟢 |
| POST | `/auth/verify-email` | Verifikasi email dengan `{ email?, code }`: kode 6 digit, berlaku 15 menit, maksimal 5 percobaan, sekali pakai; `email` opsional bila sudah login. Membuka hak checkout. | ✅ 🟢 |
| POST | `/auth/resend-verification` | Kirim ulang kode verifikasi; rate-limited, jawaban generik | ✅ 🟢 |
| POST | `/auth/forgot-password`, `/auth/reset-password` | Reset sekali pakai; sesi lama mati | ✅ 🟢 |
| PUT | `/auth/ganti-password` | Wajib password lama; sesi lain dicabut | ✏️ 🟢 |
| PUT | `/auth/change-email` | **Wajib password saat ini**; email tujuan disimpan di `email_tokens.new_email`; token dikirim ke email lama + baru; dibandingkan **lower(email)** — unik tanpa peduli kapital | ➕ 🟢 |
| POST | `/auth/change-email/confirm` | Konfirmasi **kedua** token (lama + baru) → email berganti; sesi lain dicabut; pemberitahuan ke alamat lama | ➕ 🟢 |
| GET | `/auth/me`, `/auth/menu` | Profil (+ status verifikasi email); menu sidebar dari database | ✅ 🟢 |
| DELETE | `/auth/account` | Hapus/anonimkan data pribadi; transaksi tetap ada tanpa identitas (hak UU PDP) | ➕ 🔵 |

## 2. Publik (tanpa login)

| Method | Endpoint | Kegunaan | Fase |
|---|---|---|---|
| GET | `/game-types`, `/game` | Master kategori & game **+ jumlah akun AVAILABLE per game** | ✏️ 🟢 |
| GET | `/game/{code}` | Detail game + `attribute_schema` — fe merender filter & form atribut **dinamis** | ➕ 🟢 |
| GET | `/` | Satu panggilan beranda: promo aktif, game populer, akun terbaru (mudah di-cache) | ➕ 🟢 |
| GET | `/accounts?type=&game=&minPrice=&maxPrice=&q=&sort=&page=` | Katalog — status **dipaksa AVAILABLE** dan `deleted_at IS NULL`; respons ringkas (tanpa deskripsi panjang); `q` full-text | ✏️ 🟢 |
| GET | `/accounts/{slug}` | Detail via slug; non-AVAILABLE → 404 | ✅ 🟢 |
| GET | `/promotions/active` | Daftar promo untuk banner/halaman promo | ➕ 🟢 |
| GET | `/payments/methods` | **Channel tersedia (QRIS, VA per bank) + minimum nominal** — frontend menampilkan pilihan metode/bank dari sini, bukan hardcode | ➕ 🟢 |
| GET | `/themes/active`, `/pages/{code}` | Token tema; S&K/privasi/garansi/FAQ — isi diambil dari versi **terbit terakhir** (`static_page_versions`); respons memuat nomor **versi** untuk persetujuan | ✅ 🟢 |
| GET | `/settings/public` | Nama toko, kontak CS, lama garansi, lama expiry, **`checkout_aktif`** (saklar darurat) & `pesan_pengumuman` — angka UI tidak di-hardcode; nama/kontak/saklar dari tabel `settings`, garansi/expiry dari konfigurasi | ➕ 🟢 |

Data master (`/game-types`, `/game`, `/themes/active`, `/pages/*`) dibaca **server component dengan `use cache` + `revalidateTag`** — hampir tanpa biaya.

## 3. Pembeli

| Method | Endpoint | Kegunaan | Fase |
|---|---|---|---|
| POST | `/checkout/pratinjau` | Hitung rincian: harga awal − promo − voucher = total; lolos minimum nominal? **Tidak mengonsumsi kuota** — sumber kebenaran harga mesti di server; `total` di respons dikirim balik sebagai `totalPratinjau` saat checkout | ✏️ 🟢 |
| POST | `/transactions` | Checkout 3 fase. Argumen: akun, kodeVoucher?, metode, bank? (khusus VA), syaratVersi, **totalPratinjau**, **`kunciIdempoten`**. Sukses / kode `ACCOUNT_UNAVAILABLE` atau `REQUEST_IN_PROGRESS` (key masih berjalan) atau kontras-isi key atau **`PRICE_CHANGED`** (total server ≠ totalPratinjau; klien tampilkan harga baru) / `CHECKOUT_CLOSED` | ✏️ 🟢 |
| GET | `/transactions?status=`, `/transactions/{code}` | Riwayat dan detail (+ QR/VA + sisa waktu) | ✅ 🟢 |
| GET | `/transactions/{code}/status` | **Polling ringan** halaman bayar: hanya status + sisa detik — bukan detail penuh | ➕ 🟢 |
| POST | `/transactions/{code}/cancel` | Batalkan sebelum lunas → akun & voucher kembali | ✅ 🟢 |
| POST | `/transactions/{code}/change-method` | QRIS ↔ VA; **tagihan lama dibatalkan dulu** (satu aktif); dana yang telanjur masuk ke tagihan lama saat transaksi masih `RESERVED` **diterima** (lihat §4); `external_id` tagihan baru = kode transaksi + nomor urut berikutnya | ✅ 🟢 |
| POST | `/transactions/{code}/reveal` | Serah terima kredensial (PAID, milik sendiri, dalam garansi, `no-store`) — **garansi dihitung dari reveal pertama**, bukan `paid_at`, agar pembeli yang reveal di hari ke-3 tidak kehilangan 3 hari (bila tak pernah reveal: `paid_at + GARANSI_MAKS_TANPA_REVEAL_HARI`, diisi job). **Diubah dari GET** — GET ber-efek-samping bisa terpicu prefetch/crawler; request dibukukan dengan **IP + user-agent** di `audit_reveals` | ✏️ 🟢 |
| POST | `/transactions/{code}/confirm-receipt` | "Akun sudah saya terima" → jendela komplain tutup | ✅ 🟢 |
| POST | `/transactions/{code}/complaints`, `GET .../complaints` | Ajukan & lihat status komplain dalam garansi | ➕ 🔵 |
| GET | `/transactions/{code}/receipt` | Bukti transaksi untuk dicetak/disimpan | ➕ 🔵 |
| GET | `/wishlist` | Daftar favorit | ➕ 🔵 |
| PUT/DELETE | `/wishlist/{slug}` | Tambah/hapus favorit (**idempoten, tanpa body**); memakai **slug**, bukan ID internal (anti enumerasi) | ➕ 🔵 |

**Jalur sengketa manual di MVP** (komplain 🔵 belum ada): kontak CS (disebut di halaman garansi) + endpoint admin `mark-dispute` (di bawah) — pembeli yang bermasalah selalu punya jalan.

## 4. Webhook

| Method | Endpoint | Kegunaan | Fase |
|---|---|---|---|
| POST | `/payments/webhook/xendit` | Satu pintu; **di dalamnya adapter per jenis callback (QR & VA) di balik satu interface** — bentuk payload berbeda tidak bocor ke service. **Dua-fase**: payload mentah disimpan dulu di transaksi terpisah (`$transaction` Prisma terpisah/pola REQUIRES_NEW, status `DITERIMA`) → proses → status `DIPROSES/GAGAL`; dedup pakai **`type + incoming_fund_id`** (ID dana masuk dari payload; event_id QR/VA belum tentu seragam; bila payload tak punya ID dana masuk unik, pakai hash payload; bila satu ID mengirim beberapa status, status callback ikut kunci dedup — **verifikasi dokumentasi Xendit di tahap 5**). Pencocokan ke pembayaran lewat **`external_id` per tagihan**. Event `GAGAL` diulang otomatis oleh `WebhookRetryJob`. **Dana masuk saat `EXPIRED/CANCELLED/FAILED`** diperlakukan seperti telat-bayar (reserve-ulang → voucher dikonsumsi ulang; gagal → `NEEDS_REFUND`). **Dana masuk ke tagihan yang sudah `CANCELLED` (changeMethod) saat transaksi masih `RESERVED`** → pembayaran itu `PAID`, transaksi `PAID`, tagihan `PENDING` lain dibatalkan; bila gagal dibatalkan dan dananya ikut masuk → `DUPLIKAT`. Rate limit longgar/whitelist IP Xendit supaya retry sah tidak terblokir | ✏️ 🟢 |

> Cek dokumentasi Xendit terkini untuk bentuk payload sebelum menulis adapter.

## 5. Admin

### 5.1 Katalog
| Method | Endpoint | Kegunaan | Fase |
|---|---|---|---|
| GET/POST | `/panel/accounts` | List (paging, **+ flag `credentials_present`** karena admin tidak bisa membaca isinya) + create — **akun baru mulai dari `DELISTED` (draf)**: tak bisa tampil di katalog sebelum kredensial diisi | ✏️ 🟢 |
| GET/PUT/DELETE | `/panel/accounts/{id}` | Detail/edit/soft delete (**DELETE hanya saat `DELISTED`**; `SOLD` tak boleh dihapus, `AVAILABLE`/`RESERVED` harus di-delist dulu) — **PUT TIDAK mengubah status & kredensial** (status hanya via method domain) | ✏️ 🟢 |
| PUT | `/panel/accounts/{id}/credentials` | Isi/ganti kredensial — **tulis-saja, TIDAK ADA GET**; **ditolak saat akun `RESERVED`/`SOLD`** (kredensial jangan diubah saat transaksi berjalan) | ➕ 🟢 |
| POST | `/panel/accounts/{id}/delist`, `/panel/accounts/{id}/relist` | Transisi status via endpoint aksi (bukan PUT status); **`relist()` wajib menolak bila kredensial belum terisi** | ➕ 🟢 |
| POST | `/panel/accounts/{id}/restore` | `SOLD → AVAILABLE` setelah refund — admin-only, tercatat audit, **wajib kredensial diganti dulu** (yang lama sudah pernah direveal pembeli) | ➕ 🔵 |
| POST/DELETE | `/panel/accounts/{id}/photos` | Kelola galeri foto — **DELETE = soft** (`deleted_at`, baris tetap tersimpan) | ✏️ 🟢 |
| PUT | `/panel/accounts/{id}/photos/order` | Urutan foto | ✏️ 🟢 |
| CRUD | `/panel/games`, `/panel/games` | Master; perubahan `attribute_schema` **tambahan saja** — field wajib baru tak berlaku mundur; DELETE = `active=false` | ✅ 🟢 |

### 5.2 Diskon & konten
| Method | Endpoint | Kegunaan | Fase |
|---|---|---|---|
| CRUD | `/panel/vouchers`, `/panel/promotions` | Voucher & promo (DELETE = `active=false`) | ✅ 🟢 |
| GET | `/panel/vouchers/{id}/usages` | Siapa pakai, kapan, potongan berapa — termasuk baris `DIPULIHKAN` (riwayat pengembalian voucher) | ➕ 🔵 |
| CRUD | `/panel/settings` + `PUT .../{code}/activate` | Kelola & aktifkan tema (satu aktif) — MVP memakai tema statis dari seed | ✅ 🔵 |
| CRUD | `/panel/pages` + `POST .../{code}/publish` | Edit sebagai draf (di `static_pages`) → terbit = **versi naik + salinan beku ke `static_page_versions`** (append-only; persetujuan pembeli merujuk versi tertentu). `GET /panel/pages/{code}/versions/{n}` membaca teks versi lama sebagai bukti | ✏️ 🟢 |
| GET/PUT | `/panel/settings` | Baca/ubah `checkout_aktif`, `nama_toko`, `kontak_cs`, `pesan_pengumuman`; tercatat audit | ➕ 🟢 |

### 5.3 Transaksi & uang
| Method | Endpoint | Kegunaan | Fase |
|---|---|---|---|
| GET | `/panel/transactions?status=&kode=&pembeli=` | Daftar & pencarian | ✏️ 🟢 |
| GET | `/panel/transactions/{code}` | Detail + pembayaran + **linimasa webhook_events** (alat debugging utama) | ➕ 🟢 |
| POST | `/panel/transactions/{code}/sync` | Tanya Xendit **sekarang** untuk satu transaksi (pembeli: "sudah bayar"). QRIS memakai `GET /qr_codes/payments?external_id=`; VA callback-only (dilewati dengan catatan). Hasil `PAID/FAILED` masuk pipeline webhook yang sama | ➕ 🟢 |
| POST | `/panel/transactions/{code}/refund-complete` | Catat refund **per pembayaran**. Body: `pembayaranId`, `amount`, `fee`, `reference`, `note` → baris di tabel `refunds` (total ≤ jumlah dibayar). Transaksi `NEEDS_REFUND`/`DISPUTED` jadi `REFUNDED` **hanya bila total refund pembayaran utama = `amount` dibayar** (selama masih ada sisa, status tidak berubah dan sisa tampil di ringkasan); pembayaran `DUPLIKAT` → transaksi tetap `PAID`. Eksekusi transfer **manual admin** (VA/QRIS umumnya tak ada auto-refund; rekening tujuan hanya sebagai catatan, bukan data bank — hemat UU PDP). Menggantikan `resolve` yang samar | ✏️ 🟢 |
| POST | `/panel/transactions/{code}/close-dispute` | Keluar dari `DISPUTED` **tanpa refund** — kembali ke `PAID` (mencegah transaksi macet & akun terkunci), tercatat audit | ➕ 🟢 |
| POST | `/panel/transactions/{code}/mark-dispute` | Jalur sengketa manual di MVP: `PAID → DISPUTED` (boleh juga setelah konfirmasi diterima, atas kebijakan admin) | ➕ 🟢 |
| POST | `/panel/transactions/{code}/allow-reveal` | Perpanjang reveal `N` hari setelah garansi (kolom `reveal_until`) | ➕ 🟢 |
| GET | `/panel` | **Kotak masuk operasional**: jumlah NEEDS_REFUND dan DISPUTED (masing-masing + **sisa refund** dalam rupiah), pembayaran DUPLIKAT yang **sisa refund-nya > 0**, RESERVED menggantung, omzet hari ini | ➕ 🟢 |
| GET/PUT | `/panel/complaints` + `PUT .../{id}/decide` | TOLAK / REFUND / GANTI_AKUN | ➕ 🔵 |
| GET / POST | `/panel/webhooks`, `POST .../{id}/retry` | Lihat & ulang event gagal; UI `/panel/webhooks` menyediakan tombol **Proses ulang** untuk event `GAGAL` (payload mentah, audit `webhook.retry`). Job otomatis tetap berjalan | ✅ 🟢 |

### 5.4 Audit, user, laporan
| Method | Endpoint | Kegunaan | Fase |
|---|---|---|---|
| GET | `/panel/audit?actor=&action=&from=` | Baca `admin_audit_logs` (tabel tersedia; halaman panel sudah ada) | ➕ 🟢 |
| GET | `/panel/audit?transaction=` | Siapa mereveal kredensial, kapan | ➕ 🟢 |
| CRUD | `/panel/users` | User (list, ubah role, aktif/nonaktif); guard anti-kunci diri | ✅ 🟢 |
| CRUD & sync | `/rbac/role`, `/rbac/menu`, `/rbac/permission` (+`/menu`, `/permission`) | Role, menu & permission dari database (seed & aturan tetap MVP; **CRUD-nya Fase 2**) | ✅ 🔵 |
| POST | `/panel/users/{id}/force-logout` | Cabut semua sesi user (akun diduga bocor) | ➕ 🟢 |
| POST | `/panel/users/{id}/reset-totp` | Admin kehilangan perangkat — permission **`totp:reset`**; wajib **re-autentikasi** admin pelaksana; **email pemberitahuan** ke target user; jika satu-satunya ADMIN kehilangan perangkat + recovery code → **prosedur darurat CLI** (env var darurat, tercatat audit) | ➕ 🔴 |
| GET | `/panel/reports/penjualan`, `/panel/reports/penjualan-per-game` | Query `dari`/`sampai` (`YYYY-MM-DD`, default 30 hari); basis `paid_at`, zona Asia/Jakarta | ✅ 🟢 |
| GET | `/panel/reports/penjualan-per-jenis`, `/panel/reports/lama-terjual`, `/panel/reports/stale` | Basis `paid_at`, zona Asia/Jakarta | ✅ 🔵 |
| GET | `/panel/reports/refund` | Query `dari`/`sampai`; jumlah, nilai & fee refund per periode (agregasi tabel `refunds`, basis `refunded_at`) | ✅ 🟢 |
| GET | `/panel/reports/diskon` | Total potongan & pemakaian voucher/promo per periode | ➕ 🔵 |

---

## 6. Dampak ke Skema (review API + review integrasi + review konsistensi v7 + review celah logika v9)

| Perubahan | Alasan |
|---|---|
| Tabel baru **`refresh_tokens`**: hash (unique), user_id, **family_id, replaced_at, replaced_by_token_id**, device, expires_at, revoked | rotasi + toleransi 10–30 dtk; dipakai ulang setelah toleransi → cabut seluruh `family_id`; `logout` satu sesi |
| Tabel baru **`totp_recoveries`**: user_id, hash, used_at | recovery code banyak, sekali pakai (hash, bukan plaintext) |
| Kolom baru `users`: **`totp_key_version`, `totp_last_step`** | secret TOTP ikut keyring; kode TOTP tak bisa dipakai ulang |
| Kolom baru `transactions.reveal_until` | `allow-reveal` memperpanjang akses setelah garansi |
| Kolom baru `transactions.confirmed_at`, `confirmed_by` (`PEMBELI`/`OTOMATIS`) | bukti siapa yang menutup jendela komplain |
| Tabel baru **`refunds`**: payment_id, transaction_id, amount, fee, reference, note, admin_id, refunded_at (**menggantikan** kolom `refund_*` di `transactions`) | refund `DUPLIKAT` tak mengubah transaksi utama; refund parsial/ganda; `/panel/reports/refund` basis `refunded_at` |
| `payments`: kolom **`incoming_fund_id`** (unique, nullable); `xendit_id` jadi non-unique | dana kedua ke QR/VA yang sama punya ID pembayaran sendiri (verifikasi payload di tahap 5) |
| Kolom baru **`webhook_events.status`** (`DITERIMA/DIPROSES/GAGAL`) + kunci dedup `(type, incoming_fund_id)` (v9: kolom diganti nama jadi **`incoming_fund_id`**) | dua-fase (simpan → proses → update), bahan `retry` & linimasa |
| `idempotency_keys`: **PK `(user_id, key)`**, `status` (`PROCESSING/SELESAI/KEDALUWARSA`), `request_hash`, `response_status`, `response_snapshot`, `valid_until` + job penanda kedaluwarsa | klaim key di awal; 409 saat masih berjalan; 422 saat isi beda; key kedaluwarsa dipakai ulang = baris di-overwrite |
| `email_tokens`: kolom **`new_email`**, type `GANTI_EMAIL_LAMA`/`GANTI_EMAIL_BARU` | ganti-email butuh tempat menyimpan alamat tujuan |
| Tabel baru **`email_otps`**: user_id, purpose (`VERIFY_EMAIL`), code_hash (HMAC), expires_at, attempts, consumed_at, created_at | verifikasi email memakai kode 6 digit sekali pakai, bukan link token |
| Tabel baru **`settings`**: key, value, updated_at, updated_by | sumber `/settings/public` + saklar `checkout_aktif` |
| `audit_reveals`: **ip, user_agent** | bukti sengketa "tidak pernah menerima akun" |
| `game_accounts`: **CHECK** `status NOT IN ('AVAILABLE','RESERVED') OR credentials_encrypted IS NOT NULL` | akun tak mungkin tampil/terjual tanpa kredensial |
| **Soft delete global (v8)**: `account_photos.deleted_at`; `complaints.deleted_at` 🔵; `role_menus`/`role_permissions.revoked_at` (NULL = grant aktif); `voucher_usages.status` (`TERPAKAI/DIPULIHKAN`) + `restored_at`; `idempotency_keys.valid_until` + status `KEDALUWARSA` | rekord bisnis tidak pernah dihapus fisik — pengembalian voucher = flip status, job pembersih key menandai bukan menghapus, grant RBAC dicabut dengan penanda; **audit tetap tak bisa dihapus sama sekali** |

| **v9** Tabel baru **`static_page_versions`**: page_id, version (PK gabungan), title, body_markdown, published_at, published_by (append-only); `static_pages` jadi draf kerja + nomor versi terbit | teks S&K yang disetujui pembeli tak hilang saat halaman diedit (bukti sengketa) |
| **v9** `payments.external_id` (unique) = kode transaksi + nomor urut tagihan; `webhook_events.xendit_id` → **`incoming_fund_id`**, `raw_payload` nullable | `changeMethod` membuat tagihan baru (Xendit butuh ID unik per tagihan); dua arti `xendit_id` dipisah; payload bisa dikosongkan oleh retensi |
| **v9** `users.totp_failures`, `users.totp_locked_until`; `totp_recoveries.revoked_at` | kunci sementara tahan restart; regenerasi recovery code |
| **v9** CHECK `vouchers.used BETWEEN 0 AND quota`; CHECK konsistensi `transactions.receipt_confirmed`; index `refunds(transaction_id)`, `email_tokens(user_id)`, `totp_recoveries(user_id)`, parsial `transactions(warranty_start)` & `game_accounts(status, game_id) WHERE deleted_at IS NULL` | kuota tak bisa lewat; status konfirmasi tak bisa setengah-terisi; query job & katalog |
| **v9** Permission baru `game:read`, `voucher:read`, `promotion:read`, `page:read`, `setting:read` | baca tak lagi butuh izin tulis |

Skema jadi: **30 tabel — MVP 28, Fase 2 +2** (`komplain`, `wishlist`).

## 7. Catatan Implementasi singkat

- `GET /transactions/{code}` detail vs `GET /transactions/{code}/status` ringan — polling hanya pakai yang ringan
- **Rate limit per endpoint milik bucket sendiri**: polling status bucket terpisah (tiap beberapa detik × 30 menit tidak boleh kena limit umum); webhook bucket longgar/whitelist Xendit
- **Email notifikasi admin (NEEDS_REFUND/DISPUTED/transactions baru) masuk MVP** — endpoint health saja tidak ada yang membaca
- `GET /health` membalas `200 {"status":"ok"}` atau `503 {"status":"degraded"}`; pengecekan mencakup DB dan heartbeat job terjadwal, tanpa membocorkan detail internal
- **Tipe & validasi dibagikan dari satu definisi (zod + tipe shared)** — frontend dan API satu aplikasi Next.js, sehingga katalog kode error & skema respons tidak hanya hidup di dokumen
- Semua aksi admin → `admin_audit_logs` (actor_id, action, target, detail)
- 409 untuk konflik: akun sudah dibeli orang — kode `ACCOUNT_UNAVAILABLE`
- `POST /panel/accounts/{id}/credentials` **tanpa** pasangan GET dan tanpa pengembalian isi di respons — kredensial tak pernah keluar lewat API admin
- `kunciIdempoten` juga dipakai **`changeMethod`**; job penanda kedaluwarsa key (menandai, bukan menghapus)
- `AutoKonfirmasiJob` **skip** transaksi `DISPUTED` (jangan konfirmasi-otomatis yang sedang disengketakan)
- Polling frontend: interval beberapa detik + hentikan saat `PAID/FAILED/EXPIRED`
- Semua respon list: `page`, `size` (maks 100), dan `total`
- **Checkout** menolak `PRICE_CHANGED` bila `totalPratinjau` ≠ total server; klien menampilkan harga baru lalu mengulang dengan key baru
- **Idempotency**: key diklaim di awal (`PROCESSING`, TTL 5 menit, commit sendiri); request kedua dengan key sama saat request pertama masih jalan → 409 `REQUEST_IN_PROGRESS`; respons final (termasuk error 4xx) → `SELESAI` + snapshot
- **Refund per pembayaran**: `DUPLIKAT` = pembayaran tambahan tanpa mengubah status transaksi; "DUPLIKAT belum selesai" di ringkasan = pembayaran `DUPLIKAT` yang Σ refund-nya < `amount`; transaksi utama `REFUNDED` hanya bila Σ refund = jumlah dibayar
- **Saklar `checkout_aktif`**: bila mati, hanya aksi checkout yang ditolak (`CHECKOUT_CLOSED`); katalog, pembayaran berjalan, dan reveal tetap normal
- `AutoKonfirmasiJob` juga mengisi `warranty_start = paid_at + GARANSI_MAKS_TANPA_REVEAL_HARI` untuk transaksi yang tak pernah reveal
- **Telat-bayar & voucher**: reserve-ulang → `PAID` mengonsumsi ulang voucher (usage → `TERPAKAI`, `used`++); gagal (kuota habis / voucher terpakai transaksi aktif lain) → `NEEDS_REFUND`
- **Aturan hapus**: `DELETE /panel/accounts/{id}` hanya saat `DELISTED`; DELETE pada master (game_types, games, vouchers, promotions, themes, users) = `active=false`; katalog publik, `/`, `sitemap.xml` memfilter `deleted_at IS NULL`

---

## 8. Matriks Aksi ↔ Permission

Role `ADMIN` di-seed dengan semua permission; `PEMBELI` tidak punya satu pun (akses pembeli lewat kepemilikan objek). Permission baru wajib masuk seed migration (DoD butir 3).

| Aksi (penamaan asal HTTP) | Permission |
|---|---|
| `GET /panel/accounts`, `GET /panel/accounts/{id}` | `account:read` |
| `POST/PUT/DELETE /panel/accounts*`, `delist`, `relist`, `photos*` | `account:write` |
| `PUT /panel/accounts/{id}/credentials` | `credential:write` |
| `POST /panel/accounts/{id}/restore` 🔵 | `account:write` + `credential:write` |
| `GET /panel/games`, `GET /panel/games` | `game:read` |
| `POST/PUT/DELETE /panel/games`, `/panel/games` | `game:write` |
| `GET /panel/vouchers*` (termasuk `/usages`) | `voucher:read` |
| `POST/PUT/DELETE /panel/vouchers*` | `voucher:write` |
| `GET /panel/promotions*` | `promotion:read` |
| `POST/PUT/DELETE /panel/promotions*` | `promotion:write` |
| `/panel/settings*` 🔵 | `theme:write` |
| `GET /panel/pages*` (termasuk `/versions/{n}`) | `page:read` |
| `POST/PUT/DELETE /panel/pages*`, `publish` | `page:write` |
| `GET /panel/settings` | `setting:read` |
| `PUT /panel/settings` | `setting:write` |
| `GET /panel/transactions*`, `GET /panel` | `transaction:read` |
| `POST /panel/transactions/{code}/sync` | `transaction:sync` |
| `mark-dispute`, `close-dispute` | `transaction:dispute` |
| `refund-complete` | `transaction:refund` |
| `allow-reveal` | `reveal:grant` |
| `GET /panel/webhooks` | `webhook:read` |
| `POST /panel/webhooks/{id}/retry` | `webhook:retry` |
| `GET /panel/audit`, `GET /panel/audit` | `audit:read` |
| `/panel/users*`, `POST /panel/users/{id}/force-logout` | `user:manage` |
| `POST /panel/users/{id}/reset-totp` | `totp:reset` (+ re-autentikasi) |
| `/rbac/*` 🔵 | `rbac:manage` |
| `/panel/reports/*` | `report:read` |
| `/panel/complaints*` 🔵 | `complaint:decide` |