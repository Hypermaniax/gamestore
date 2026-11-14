# PRODUCT.md — NEXAPLAY

Sumber: ekspor Figma Make `project.zip` (landing page marketplace akun game), diadopsi sebagai arah visual & brand sementara.

## Brand

- **Nama**: NEXAPLAY (wordmark: `NEXA` + `PLAY` aksen lime).
- **Kategori**: marketplace akun game terkurasi.
- **Janji**: detail akun transparan, pembayaran terverifikasi, garansi hingga 14 hari.
- **Audiens**: gamer Indonesia 16–30 tahun yang membeli akun siap pakai.

## Tone

- Bahasa Indonesia santai-profesional ("Main lebih jauh", "Season-ready accounts" sebagai aksen Inggris).
- Jujur: tidak ada angka/sosial-bukti palsu; data demo ditandai dan diganti bertahap.
- Pendek, tegas, tanpa jargon teknis.

## Prinsip produk (UI)

1. Satu aksen warna (lime) untuk aksi & penanda penting; sisanya netral.
2. Detail akun selalu lebih penting dari dekorasi: rank, skin, binding, harga.
3. Semua jalur uang harus terasa aman: proteksi pembeli, garansi, stok unik.
4. Katalog adalah bintang; hero hanya pintu masuk.

## Batas saat ini

- Katalog masih **data demo** (`src/lib/storefront-demo.ts`); sumber DB menyusul Fase 3/7.
- Pembelian belum aktif — tombol beli memberi pesan jujur sampai fase transaksi.
- Login modal & halaman auth tersambung ke auth asli (Next server actions), TOTP menyusul.
