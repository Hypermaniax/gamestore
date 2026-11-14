# PRODUCT.md

## Product
Toko online jual-beli **akun game** (Mobile Legends, Clash of Clans, Genshin Impact, PUBG, Valorant, dll. lihat seed `jenis_game`/`game`). Pembeli memilih akun, membayar via Xendit, lalu menerima kredensial akun (serah terima + garansi). Ini **bukan marketplace C2C** — toko tunggal yang menampung stok akun sendiri.

- Sumber kebenaran bisnis: `docs/PLAN.md` (v13); kontrak aksi: `docs/API.md` (v10); skema: `docs/ERD.md` (v10).
- E-commerce terkunci untuk **pembeli** (katalog, checkout, reveal, garansi, refund; status transaksi = state machine ketat).
- Fitur **Fase 2** yang belum ada: komplain/dispute-penuh, editor tema, invoice kustom, notifikasi push.

## Users
1. **Pembeli** — orang Indonesia yang membeli akun game. Lupa-tapi-berat: butuh kepercayaan (punya aset uang), cepat, dan cocok HP. Bahasa UI: **Indonesia** (angkaformat `Rp 1.250.000`, tanggal lokal).
2. **Admin / CS toko** (1 orang, panel `app/panel/*`) — mengelola katalog akun stok, transaksi/reveal, refund, voucher, users & RBAC. Mode antarmukanya **Operate**: kecepatan & konsisten, bukan ekspresi.

## Platform
`web`. Next.js full-stack App Router (halaman + Server Actions; satu-satunya HTTP route = webhook Xendit + `/health`). Skala pertumbuhan juga sebuah target: responsif mobile-first dari chunk pertama karena mayoritas pembeli dari HP.

## Stack (terkunci)
Next 16 + React 19 + Tailwind 4 + shadcn/ui (base-nova, prop `render` bukan `asChild`), Prisma 7 (Postgres native), auth = access JWT cookie httpOnly + refresh rotasi. Backend 3 layer dalam `src/`: controllers → services → repositories.

## Consolidation (aksesibilitas & praktik)
- Semua tindakan tulis lewat Server Actions; error = typed-union `{ ok, kode, pesan }` — frontend memetakan `kode` ke teks Indonesia, **tidak membaca teks mesin**.
- Nilai nominal = `Rp` ribuan lokal, tanggal `Intl.DateTimeFormat('id-ID')`.
- Halaman publik responsive; fitur bagian panel min-width umumnya desktop, masih harus tidak hancur di tablet.

## Open decisions
- **Nama brand final** — sementara dipakai "GameStore" (placeholder, minta penggantian saat penentu); logo belum ada (teks saja).
- Estetika/visual world final menunggu Fase 7 (toko) & Fase 8 (panel) — dijaga ringan karena halaman sekarang masih placeholder.
