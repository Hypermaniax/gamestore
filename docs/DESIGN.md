---
name: GameStore (nama sementara)
description: Toko jual-beli akun game — netral, jujur, data-dulu
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  card: "oklch(1 0 0)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  border: "oklch(0.922 0 0)"
  primary: "oklch(0.205 0 0)"
  primary-foreground: "oklch(0.985 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
  sidebar: "oklch(0.985 0 0)"
  ring: "oklch(0.708 0 0)"
  dark-background: "oklch(0.145 0 0)"
  dark-foreground: "oklch(0.985 0 0)"
  dark-card: "oklch(0.205 0 0)"
  dark-border: "oklch(1 0 0 / 10%)"
typography:
  display:
    fontFamily: "var(--font-geist-sans), Geist, system-ui, sans-serif"
  body:
    fontFamily: "var(--font-geist-sans), Geist, system-ui, sans-serif"
  label:
    fontFamily: "var(--font-geist-sans), Geist, system-ui, sans-serif"
  mono:
    fontFamily: "var(--font-geist-mono), Geist Mono, monospace"
rounded:
  sm: "calc(0.625rem * 0.6)"
  md: "calc(0.625rem * 0.8)"
  lg: "0.625rem"
  xl: "calc(0.625rem * 1.4)"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
---

# Design System: GameStore (nama sementara)

## Overview

**Creative North Star: `"Rak Sepi, Harga Jujur"`**

Sistem visual yang presisi dan tenang: warna netral OKLCH (warisan shadcn base-nova), teks Geist Sans, angka/kode transaksi memakai Geist Mono. Identitas toko ini **netral dan data-dulu**: ornamen minimal; yang paling menonjol haruslah harga, status, dan bukti — bukan dekorasi. Karakter "gamer" dibiarkan datang dari konten (judul game, foto akun), bukan dari warna UI. Dark mode aktif via `.dark` (token lengkap sudah ada).

**Key Characteristics:**
- Netral murni + satu aksen merah `destructive` untuk bahaya/error; kedalaman lewat `border` dan lapisan `muted` (bukan drop-shadow berat).
- Rounded konsisten dari `--radius: 0.625rem` dengan sub-skala.
- Bahasa UI `id-ID` — angka Rp dengan titik ribuan, tanggal lokal; ini aturan visual, bukan pelengkap.
- Tanpa logo — identitas teks brand sampai nama final & logo tersedia.

## Colors

Netral murni; merah `destructive` hanya untuk error/bahaya. Light sebagai tema utama, dark via `.dark`. Sidebar memisah diri dengan `sidebar: oklch(0.985 0 0)` + `border` tipis; di dark `1 0 0/10%`.

## Typography

Geist Sans = identitas utama (headings label dan body); Geist Mono untuk kode transaksi, id idempoten, dan kolom tabel data (angka, referensi pembayaran).

## Layout

Mobile-first; kontainer terbatas lebar; halaman admin memakai sidebar ±15rem + area kerja `p-8`. Kontrol tanpa kontrolutzt khusus: spacing bawaan Tailwind 4 (4/8 px).

## Elevation & Depth

**Rata (flat)** — lapisan lewat `border` + permukaan `muted`, bukan drop-shadow. Tonal layering adalah kawan default.

## Shapes

`rounded-md` untuk kontrol kecil (button, input); kartu/panel `rounded-lg` ke atas. Tanpa rounded penuh via-lebihan.

## Components

Variant mengikuti shadcn base-nova (prop `render`, bukan `asChild`). Input/textarea normatif `bg-transparent border-input` + `focus-visible:ring-ring/50`. Status transaksi dirender sebagai badge dari state machine, tidak pernah hardcode-warned.

## Do's and Don'ts

- **Do**: tampilkan status/nilai dari data; format uang `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })`; pakai token tema, tidak hardcode hex.
- **Don't**: menghias (gradient, glow, badge metal); format uang gaya `en-US` (koma); memasang warna aksen baru — itu sengaja Fase 7.