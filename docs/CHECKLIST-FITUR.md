# Checklist Fitur NEXAPLAY

Status per 12 November 2026.

Legenda:

- `[x]` sudah ada di aplikasi / backend
- `[ ]` belum ada, atau baru backend tanpa UI
- Status ini bukan pengganti uji manual. Centang tetap boleh kamu ubah saat kamu selesai memverifikasi sendiri.

---

## 1. UI Storefront

- [x] Landing page NEXAPLAY
- [x] Hero, katalog, cara beli, footer
- [x] Navbar desktop + menu mobile
- [x] Ganti tema terang/gelap
- [x] Katalog dari database: pencarian full-text, filter kategori, sorting + pagination server-side
- [x] Kartu akun game + harga dari database
- [x] Harga coret/diskon nyata dari promo
- [x] Halaman detail akun publik `/accounts/[slug]` + checkout popup
- [x] Detail akun memakai halaman penuh, bukan modal
- [x] Favorit lokal (hilang saat refresh)
- [x] Toast notifikasi
- [x] Modal login
- [x] Link “Lupa password?” di modal login
- [x] Form lupa password di dalam modal login
- [x] Tombol beli mengarahkan ke login bila belum masuk
- [x] Klik nama user membuka menu “Akun saya” / “Keluar”
- [x] Katalog asli dari database (semua akun via paging server)
- [ ] Filter harga/atribut asli dari database
- [x] Paging katalog dari database
- [x] Pencarian full-text dari database di UI
- [x] Checkout
- [x] Pilihan QRIS/VA
- [x] Halaman pembayaran
- [x] Halaman pesanan saya
- [x] Reveal kredensial akun
- [x] Konfirmasi akun diterima
- [x] Ganti metode pembayaran dari halaman bayar
- [x] Batal pesanan dari halaman bayar
- [x] Halaman garansi/refund
- [x] Halaman statis S&K, privasi, FAQ
- [ ] Wishlist permanen
- [ ] Upload foto akun dari panel

## 2. UI Autentikasi & Akun

- [x] Halaman daftar `/register`
- [x] Halaman verifikasi email `/verify-email`
- [x] Halaman login `/login`
- [x] Login lewat modal di landing page
- [x] Redirect admin ke `/panel` setelah login
- [x] Lupa password `/forgot-password`
- [x] Reset password `/reset-password`
- [x] Halaman akun `/account`
- [x] Profil akun: username, email, status verifikasi, role, status TOTP
- [x] Ganti password dari halaman akun
- [x] Keluar dari semua perangkat
- [x] Halaman konfirmasi ganti email `/change-email/confirm`
- [x] Logout sesi saat ini
- [x] Form minta ganti email dari halaman akun
- [x] Tombol kirim ulang verifikasi email
- [x] Setup TOTP dari halaman akun
- [x] Tampilan QR TOTP
- [x] Aktivasi TOTP dengan kode 6 digit
- [x] Tampilan recovery codes
- [x] Regenerate recovery codes
- [x] Popup login langkah kedua TOTP
- [x] Alur setup TOTP paksa untuk admin
- [ ] Reset TOTP oleh admin lewat panel
- [ ] Daftar perangkat/sesi aktif
- [ ] Hapus akun sendiri

## 3. UI Panel Admin

- [x] Guard panel: hanya ADMIN
- [x] Sidebar dari menu database
- [x] Halaman dashboard placeholder
- [x] Link “Akun saya” di sidebar
- [x] Logout sesi saat ini
- [x] Dashboard operasional nyata
- [x] CRUD akun game
- [x] CRUD jenis game
- [x] CRUD game
- [x] Kelola kredensial akun
- [x] Kelola foto akun
- [x] CRUD promo
- [x] CRUD voucher
- [x] Daftar user
- [x] Ubah role user
- [x] Aktif/nonaktif user
- [x] Paksa logout user
- [x] Reset TOTP user
- [x] Reader audit log
- [x] Kelola halaman statis
- [x] Riwayat versi halaman statis
- [x] Pengaturan toko
- [x] Daftar transaksi
- [x] Detail transaksi
- [x] Linimasa webhook
- [x] Antrean refund
- [x] Antrean sengketa
- [x] Antrean pembayaran duplikat
- [x] Laporan penjualan
- [x] Laporan per game
- [x] Laporan refund

Catatan: seluruh menu sidebar mengarah ke halaman panel yang sudah dibuat.

## 4. Backend & Database yang Sudah Selesai

### Autentikasi & keamanan

- [x] Register role PEMBELI
- [x] Verifikasi email dengan kode OTP 6 digit (HMAC hash)
- [x] Kirim ulang verifikasi email
- [x] Login username/email
- [x] Access JWT di cookie httpOnly
- [x] Refresh token 30 hari dengan rotasi
- [x] Deteksi refresh token reuse
- [x] Logout satu sesi
- [x] Logout semua perangkat
- [x] Ganti password dengan password lama
- [x] Lupa password dengan token 1 jam
- [x] Reset password sekali pakai
- [x] Ganti email dua tahap
- [x] TOTP setup, aktivasi, login, recovery code
- [x] Anti-replay kode TOTP
- [x] Lock sementara setelah gagal TOTP berulang
- [x] Regenerate recovery codes
- [x] Reset TOTP oleh admin
- [x] RBAC resolve menu dan permission
- [x] Kelola user admin
- [x] Paksa logout user oleh admin
- [x] Audit log admin
- [x] Audit reveal
- [x] Rate limit login/register/email/token/refresh/TOTP/email OTP
- [x] Validasi Zod bersama client/server
- [x] Error typed-union `{ ok, code, pesan }`

### Katalog

- [x] CRUD jenis game
- [x] CRUD game
- [x] Skema atribut dinamis per game
- [x] State machine akun: AVAILABLE/RESERVED/SOLD/DELISTED
- [x] Reserve akun atomik
- [x] Relist wajib kredensial
- [x] Delist dan pulihkan akun
- [x] Soft delete akun
- [x] Kredensial akun AES-256-GCM tulis-saja
- [x] Foto akun via URL + urutan
- [x] Soft delete foto
- [x] Slug akun unik
- [x] Browse publik hanya akun AVAILABLE
- [x] Filter jenis/game/harga/atribut
- [x] Sorting dengan whitelist
- [x] Paging maksimal 100
- [x] Pencarian full-text dengan GIN
- [x] Cache katalog, detail, jenis, game
- [x] Revalidasi cache setelah mutasi

### Diskon

- [x] CRUD promo
- [x] CRUD voucher
- [x] Promo persen dan nominal
- [x] Maksimum potongan
- [x] Prioritas promo AKUN > GAME > SEMUA
- [x] Tie-break promo
- [x] Validasi periode promo
- [x] Voucher minimal belanja
- [x] Voucher kuota
- [x] Voucher 1x per user
- [x] Konsumsi kuota voucher atomik
- [x] Release voucher saat gagal/expire
- [x] Pratinjau promo + voucher
- [x] Wajib email terverifikasi untuk voucher
- [x] Cache promo aktif

### Seed & database

- [x] 28 tabel MVP + constraint
- [x] Unique parsial anti double-buy
- [x] CHECK konsistensi transaksi/refund
- [x] Index parsial job
- [x] GIN atribut dan pencarian
- [x] Audit log append-only
- [x] Role ADMIN dan PEMBELI
- [x] 27 permission
- [x] Menu panel awal
- [x] Seed game dan jenis game
- [x] Seeder testing 35 akun
- [x] 85 foto fixture
- [x] Kredensial fixture terenkripsi
- [x] 5 promo fixture
- [x] 6 voucher fixture
- [x] 3 buyer testing
- [x] Reset seeder aman saat sudah ada transaksi
- [x] Guard seeder menolak production

### Infrastruktur

- [x] Health check `/api/v1/health`
- [x] Build Next.js
- [x] Typecheck
- [x] Lint
- [x] Cache components + instant navigation config
- [x] Helper clock untuk pengujian
- [x] AES keyring dan JWT secret
- [x] Audit startup environment

## 5. Backend / Fitur yang Belum Ada

### Transaksi & pembayaran

- [x] Checkout 3 fase + idempotency
- [x] Reserve akun saat checkout
- [x] Batas transaksi pending per user
- [x] Cek harga berubah
- [x] Simpan syarat & ketentuan
- [x] Saklar checkout aktif
- [x] Integrasi Xendit QRIS
- [x] Integrasi Xendit VA
- [x] Ganti metode pembayaran
- [x] Batal transaksi
- [x] Webhook Xendit
- [x] Deduplikasi webhook
- [x] Retry webhook gagal (job otomatis)
- [x] Expiry job transaksi (pre-check Xendit belum)
- [ ] Masa tenggang pembayaran
- [x] Telat bayar
- [x] Reserve ulang akun
- [x] Re-konsumsi voucher
- [x] Status NEEDS_REFUND
- [x] Pembayaran duplikat
- [x] Refund parsial
- [x] Refund selesai
- [x] Sengketa
- [x] Tutup sengketa
- [x] Reveal kredensial
- [x] Rate limit reveal
- [x] Garansi dari reveal pertama
- [ ] Auto konfirmasi
- [x] Konfirmasi diterima
- [x] Admin sinkron transaksi
- [x] Admin ringkasan transaksi
- [x] Admin audit reveal

### Konten & laporan

- [x] CRUD halaman statis
- [x] Draf dan terbit halaman
- [x] Versi beku halaman statis
- [x] Baca versi lama halaman
- [ ] Tema dinamis
- [ ] Validasi tema
- [x] Laporan penjualan
- [x] Laporan per game
- [x] Laporan refund
- [ ] Retensi data otomatis

### Fitur lain

- [ ] Wishlist permanen
- [ ] Komplain
- [ ] CRUD RBAC
- [ ] Dashboard statistik
- [ ] Notifikasi Telegram
- [ ] Ulasan/testimoni

## 6. Infrastruktur yang Belum Ada

- [x] Pengiriman email SMTP sungguhan (Nodemailer via `MAIL_*`; preview dev ke `.next/dev/mail`)
- [ ] Mailpit/SMTP provider production
- [ ] Template email HTML
- [x] Cron job expiry
- [x] Cron job auto konfirmasi
- [x] Cron job retry webhook
- [x] Cron job retensi
- [ ] Upload foto ke object storage
- [ ] Rate limit persisten untuk multi-instance
- [x] Test suite Vitest
- [x] Database test otomatis
- [x] Mock payload + route webhook Xendit
- [x] Regresi semua fase dalam satu perintah (`npm run test`)
- [x] CSP, HSTS, frame deny, nosniff
- [x] Wajib TOTP admin production (`TOTP_WAJIB_ADMIN=true`, startup guard)
- [x] Prosedur darurat TOTP via CLI (`npm run totp:darurat`, teruji)
- [x] Backup database terpisah dari keyring (script + systemd unit; uji restore staging operator)
- [x] Alert dan uptime check (alert ter-throttle + heartbeat + `deploy/healthcheck.sh`; monitor eksternal operator)
- [ ] SPF/DKIM/DMARC domain email

## 7. Rute yang Bisa Dibuka Sekarang

| Rute | Keterangan |
|---|---|
| `/` | Storefront dan katalog database |
| `/login` | Login |
| `/register` | Registrasi |
| `/verify-email` | Verifikasi email dengan kode 6 digit |
| `/forgot-password` | Minta link reset |
| `/reset-password?token=...` | Password baru |
| `/change-email/confirm` | Konfirmasi dua token ganti email |
| `/totp/setup?token=...` | Setup TOTP paksa setelah login admin |
| `/account` | Profil, ganti email/password, TOTP, logout semua |
| `/panel` | Dashboard admin |
| `/panel/dashboard` | Redirect ke `/panel` |
| `/panel/accounts` | Kelola akun game |
| `/panel/accounts/new` | Tambah akun game |
| `/panel/accounts/[id]` | Detail/edit akun game |
| `/panel/games` | Master jenis game & game |
| `/panel/vouchers` | Voucher |
| `/panel/promotions` | Promo |
| `/panel/transactions` | Transaksi |
| `/panel/transactions/[code]` | Detail transaksi |
| `/panel/reports` | Laporan |
| `/panel/pages` | Halaman statis |
| `/panel/pages/[code]` | Editor halaman statis |
| `/panel/settings` | Pengaturan toko |
| `/panel/webhooks` | Webhook event |
| `/panel/audit` | Audit log |
| `/panel/users` | User |
| `/api/v1/health` | Health check |

## 8. Akun Testing

| Peran | Username | Email | Password |
|---|---|---|---|
| Admin | `superadmin` | `superadmin@gamestore.local` | `Sewdaq123` |
| Buyer terverifikasi | `tester_buyer1` | `buyer1@nexaplay.test` | `Test1234!` |
| Buyer terverifikasi | `tester_buyer2` | `buyer2@nexaplay.test` | `Test1234!` |
| Buyer belum verifikasi | `tester_unverified` | `unverified@nexaplay.test` | `Test1234!` |

Kredensial akun game fixture:

- Format email: `test-<code>-<nn>@nexaplay.test`
- Contoh: `test-ml-01@nexaplay.test`
- Password: `Test1234!`

## 9. Cara Cek Cepat

```bash
npx tsc --noEmit
npm run lint
npm run build
ALLOW_DESTRUCTIVE_TESTS=1 npm run test
```

Tes integrasi memakai `DATABASE_URL` yang sama: global setup menghapus schema, menjalankan seluruh migration dari nol, lalu mereset tabel antar-test. Karena ini destruktif, tes hanya berjalan dengan `ALLOW_DESTRUCTIVE_TESTS=1`:

```bash
ALLOW_DESTRUCTIVE_TESTS=1 npm run test
```

File tes ada di `tests/unit` dan `tests/integration`.

Migration dan seed dasar memakai perintah default Prisma:

```bash
npx prisma migrate deploy
npx prisma db seed
```

Seed ulang data testing:

```bash
npm run db:seed:test
```

Reset data testing, hanya aman bila belum ada transaksi:

```bash
npm run db:seed:test:reset
```

Preview email development ada di:

```text
.next/dev/mail/*.txt
```

Cari kode verifikasi email terbaru:

```bash
rg -o 'verification code is [0-9]{6}' .next/dev/mail | tail -n 1
```

Cari link reset/ganti email terbaru:

```bash
rg -o 'http://localhost:3000/(reset-password|change-email/confirm)\?token=[a-f0-9]+' .next/dev/mail | tail -n 1
```

Deployment produksi, TOTP darurat, retensi/PDP, backup, dan alert: lihat `docs/DEPLOYMENT.md`.
