# DESIGN.md — NEXAPLAY

Acuan visual untuk `app/` dan `components/`. Diambil dari ekspor Figma Make (`project.zip`), dipetakan ke token shadcn di `app/globals.css`.

## Palet (light / dark)

| Token | Light | Dark | Pemakaian |
|---|---|---|---|
| `--background` | `#f3f2ed` | `#090d11` | kanvas |
| `--foreground` | `#111719` | `#f2f5ef` | teks utama |
| `--card` | `#ffffff` | `#12181d` | kartu, input |
| `--popover` | `#f8f7f2` | `#12181d` | modal |
| `--muted-foreground` | `#667073` | `#9da7ab` | teks sekunder |
| `--border` | rgb(17 23 25 / 12%) | rgb(255 255 255 / 10%) | garis |
| `--primary` | `#111719` | `#c8ff36` | CTA utama |
| `--brand` | `#c8ff36` | `#c8ff36` | aksen lime, badge, tombol beli |
| `--brand-ink` | `#101510` | `#101510` | teks di atas lime |
| `--brand-deep` | `#6f9018` | `#c8ff36` | lime versi teks (kontras di terang) |
| `--ring` | `#8aaf25` | `#c8ff36` | fokus |

Lime `#c8ff36` adalah satu-satunya aksen. Merah hanya untuk error (`--destructive`).

## Tipografi

- **Display / judul**: Manrope (`font-display`), weight 700–800, tracking ketat `-0.04em` s/d `-0.075em` pada hero.
- **Body / UI**: DM Sans (`font-sans`), 400–700.
- **Mono**: Geist Mono (`font-mono`) untuk label teknis panel.
- Hero memakai `clamp(3.6rem, 7.5vw, 7.7rem)`, `leading-[.82]`.

## Bentuk & elevasi

- Radius besar: kartu katalog `rounded-[26px]`, hero image `rounded-[34px]`, modal `rounded-[28px]`, input `rounded-xl`.
- Bayangan lembut dan lebar, bukan glow: `shadow-[0_25px_70px_rgba(20,28,30,.12)]` (kartu hover), `0_30px_100px_rgba(0,0,0,.35)` (modal).
- Overlay noise halus (`opacity .028`, `mix-blend-soft-light`) di seluruh halaman.

## Gerak

- Transisi 200–500 ms; hover kartu `-translate-y-1`, gambar `scale-105`.
- Nav link: garis lime tumbuh dari kiri (220 ms).
- Kurangi gerak saat `prefers-reduced-motion`.

## Komponen & pola

- **Header** sticky 72 px, transparan lalu blur `bg-background/85` saat scroll.
- **Filter bar katalog** sticky di bawah header, `backdrop-blur-xl`.
- **Badge**: tag putih/kaca di gambar, diskon lime, promo outline lime.
- **Form**: kelas `.field` (48 px, `rounded-xl`, fokus lime); dialog pakai `.modal-close`.
- **Ikon**: `lucide-react`, ukuran 3.5–5 (14–20 px).
- **Gambar**: `next/image` + `remotePatterns` Unsplash.

## Aturan

- Jangan menambah warna aksen baru. Jangan pakai gradien dekoratif selain scrim gambar.
- Teks di atas lime selalu `--brand-ink`.
- Kontras teks minimal 4.5:1; `--brand-deep` ada untuk memenuhi ini di mode terang.
