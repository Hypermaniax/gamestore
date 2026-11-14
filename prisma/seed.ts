// Idempotent seed — ref: docs/PLAN.md §8 ("Seed" section) + §13 (SUPERADMIN_*)
// Safe to run repeatedly: upserts by natural keys; static_page_versions is INSERT-only
// when missing (append-only table for the app DB user).

import 'dotenv/config'
import bcrypt from 'bcrypt'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/client'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

const PERMISSIONS = [
  ['account:read', 'View accounts (admin)'],
  ['account:write', 'Manage accounts and photos'],
  ['credential:write', 'Write account credentials'],
  ['game:read', 'View game master data'],
  ['game:write', 'Manage game types and games'],
  ['voucher:read', 'View vouchers'],
  ['voucher:write', 'Manage vouchers'],
  ['promotion:read', 'View promotions'],
  ['promotion:write', 'Manage promotions'],
  ['theme:write', 'Manage themes'],
  ['page:read', 'View static pages'],
  ['page:write', 'Manage and publish static pages'],
  ['setting:read', 'View store settings'],
  ['setting:write', 'Change store settings'],
  ['transaction:read', 'View transactions'],
  ['transaction:sync', 'Sync payment status'],
  ['transaction:dispute', 'Mark or close disputes'],
  ['transaction:refund', 'Mark and complete refunds'],
  ['reveal:grant', 'Allow reveals outside the warranty period'],
  ['webhook:read', 'View webhook history'],
  ['webhook:retry', 'Retry failed webhooks'],
  ['complaint:decide', 'Decide complaints'],
  ['report:read', 'View sales reports'],
  ['audit:read', 'View audit log and audit reveals'],
  ['user:manage', 'Manage users: deactivate, force logout'],
  ['totp:reset', 'Reset user TOTP'],
  ['rbac:manage', 'Manage roles, menus, and permissions'],
] as const

const MENUS = [
  ['dashboard', 'Dashboard', '/panel', 'LayoutDashboard', 10],
  ['accounts', 'Accounts', '/panel/accounts', 'Gamepad2', 20],
  ['games', 'Game Master', '/panel/games', 'Swords', 30],
  ['vouchers', 'Vouchers', '/panel/vouchers', 'Ticket', 40],
  ['promotions', 'Promotions', '/panel/promotions', 'Tag', 50],
  ['transactions', 'Transactions', '/panel/transactions', 'Receipt', 60],
  ['reports', 'Reports', '/panel/reports', 'BarChart3', 65],
  ['pages', 'Static Pages', '/panel/pages', 'FileText', 70],
  ['settings', 'Settings', '/panel/settings', 'Settings', 80],
  ['audit', 'Audit Log', '/panel/audit', 'ShieldCheck', 90],
  ['users', 'Users', '/panel/users', 'Users', 100],
  ['webhooks', 'Webhooks', '/panel/webhooks', 'Webhook', 110],
] as const

const JENIS_GAME = [
  ['MOBA', 'MOBA', 10],
  ['BR', 'Battle Royale', 20],
  ['STRATEGI', 'Strategi', 30],
  ['RPG', 'RPG / Gacha', 40],
  ['FPS', 'FPS', 50],
] as const

type AtributTipe = 'teks' | 'angka' | 'pilihan' | 'teks_panjang'
type AtributSkema = {
  kunci: string
  label: string
  tipe: AtributTipe
  wajib: boolean
  opsi?: string[]
}

const skema = (
  fields: Array<[string, string, AtributTipe, boolean, string[]?]>,
): AtributSkema[] =>
  fields.map(([kunci, label, tipe, wajib, opsi]) => ({
    kunci,
    label,
    tipe,
    wajib,
    ...(opsi ? { opsi } : {}),
  }))

const GAMES = [
  ['ML', 'Mobile Legends', 'MOBA', skema([
    ['rank', 'Rank', 'teks', true],
    ['level', 'Level', 'angka', true],
    ['jumlah_skin', 'Jumlah Skin', 'angka', false],
    ['hero_favorit', 'Hero Favorit', 'teks', false],
    ['tipe_login', 'Tipe Login', 'pilihan', false, ['Moonton', 'Google', 'Facebook', 'Apple', 'TikTok']],
    ['binding', 'Binding Akun', 'pilihan', false, ['Email', 'Nomor HP', 'Google', 'Facebook', 'Apple', 'Tidak ada']],
    ['status_email', 'Status Email', 'pilihan', false, ['Tidak terikat', 'Terikat, bisa diganti', 'Terikat, tidak bisa diganti']],
    ['server', 'Server', 'pilihan', false, ['Indonesia', 'Malaysia', 'Singapore', 'Filipina']],
    ['daftar_skin', 'Daftar Skin/Item', 'teks_panjang', false],
  ])],
  ['COC', 'Clash of Clans', 'STRATEGI', skema([
    ['town_hall', 'Town Hall', 'angka', true],
    ['level', 'Level', 'angka', true],
    ['tahun_buat', 'Tahun Dibuat', 'angka', false],
    ['tipe_login', 'Tipe Login', 'pilihan', false, ['Supercell ID', 'Google', 'Game Center', 'Email']],
    ['binding', 'Binding Akun', 'pilihan', false, ['Email', 'Nomor HP', 'Google', 'Facebook', 'Apple', 'Tidak ada']],
    ['status_email', 'Status Email', 'pilihan', false, ['Tidak terikat', 'Terikat, bisa diganti', 'Terikat, tidak bisa diganti']],
    ['daftar_item', 'Daftar Item/Pencapaian', 'teks_panjang', false],
  ])],
  ['GI', 'Genshin Impact', 'RPG', skema([
    ['adventure_rank', 'Adventure Rank', 'angka', true],
    ['region', 'Region (Server)', 'teks', true],
    ['jumlah_karakter', 'Jumlah Karakter', 'angka', false],
    ['jumlah_senjata_5', 'Senjata 5★', 'angka', false],
    ['tipe_login', 'Tipe Login', 'pilihan', false, ['HoYoverse', 'Google', 'Facebook', 'Apple']],
    ['binding', 'Binding Akun', 'pilihan', false, ['Email', 'Nomor HP', 'Google', 'Facebook', 'Apple', 'Tidak ada']],
    ['status_email', 'Status Email', 'pilihan', false, ['Tidak terikat', 'Terikat, bisa diganti', 'Terikat, tidak bisa diganti']],
    ['daftar_item', 'Daftar Karakter/Senjata', 'teks_panjang', false],
  ])],
  ['FF', 'Free Fire', 'BR', skema([
    ['level', 'Level', 'angka', true],
    ['rank', 'Rank', 'teks', false],
    ['diamond', 'Diamond', 'angka', false],
    ['tipe_login', 'Tipe Login', 'pilihan', false, ['Google', 'Facebook', 'VK', 'Apple', 'Guest']],
    ['binding', 'Binding Akun', 'pilihan', false, ['Email', 'Nomor HP', 'Google', 'Facebook', 'Apple', 'Tidak ada']],
    ['status_email', 'Status Email', 'pilihan', false, ['Tidak terikat', 'Terikat, bisa diganti', 'Terikat, tidak bisa diganti']],
    ['server', 'Server', 'pilihan', false, ['Indonesia', 'Malaysia', 'Brazil', 'Singapore']],
    ['daftar_skin', 'Daftar Skin/Item', 'teks_panjang', false],
  ])],
  ['VLRT', 'Valorant', 'FPS', skema([
    ['rank', 'Rank', 'teks', true],
    ['level', 'Level', 'angka', true],
    ['jumlah_skin', 'Jumlah Skin', 'angka', false],
    ['tipe_login', 'Tipe Login', 'pilihan', false, ['Riot ID', 'Google', 'Facebook']],
    ['binding', 'Binding Akun', 'pilihan', false, ['Email', 'Nomor HP', 'Google', 'Facebook', 'Apple', 'Tidak ada']],
    ['status_email', 'Status Email', 'pilihan', false, ['Tidak terikat', 'Terikat, bisa diganti', 'Terikat, tidak bisa diganti']],
    ['server', 'Server', 'pilihan', false, ['Asia Pacific', 'Europe', 'North America', 'Korea', 'Japan', 'Brazil', 'LATAM']],
    ['daftar_skin', 'Daftar Skin/Item', 'teks_panjang', false],
  ])],
] as const

const TEMA_TOKEN = {
  warna: {
    utama: '#0ea5e9',
    aksen: '#8b5cf6',
    latar: '#ffffff',
    teks: '#0f172a',
    kartu: '#f8fafc',
  },
  font: { dasar: 'Inter', title: 'Inter' },
  radius: '0.75rem',
} as const

const HALAMAN_AWAL = [
  {
    code: 'terms-and-conditions',
    title: 'Syarat & Ketentuan',
    isi: `## 1. Tentang layanan

NexaPlay menjual akun game yang stoknya dikelola langsung oleh toko. Setiap akun bersifat unik dan hanya tersedia untuk satu pembeli. Dengan menyelesaikan checkout, kamu menyetujui syarat yang berlaku pada versi halaman ini.

## 2. Pembelian dan pembayaran

- Harga yang dibayar adalah total final setelah promo dan voucher yang sah.
- Pembayaran diproses melalui penyedia pembayaran pihak ketiga. NexaPlay tidak menyimpan data kartu atau PIN pembayaran.
- Pesanan yang belum dibayar sampai batas waktu akan kedaluwarsa dan stok dilepas kembali.
- Perubahan metode pembayaran hanya dapat dilakukan selama pesanan masih menunggu pembayaran.

## 3. Serah terima akun

- Kredensial akun ditampilkan setelah pembayaran terverifikasi.
- Pembeli wajib segera mengganti password, email pemulihan, dan pengaturan keamanan lain setelah menerima akun.
- Pembeli dilarang membagikan, menjual kembali, atau memindahtangankan akun tanpa persetujuan tertulis dari NexaPlay.
- Aktivitas yang dilakukan pembeli setelah serah terima menjadi tanggung jawab pembeli.

## 4. Garansi

Garansi mengikuti ketentuan pada halaman **Garansi & Refund**. Masa garansi dihitung sejak kredensial pertama kali dibuka. Klaim di luar cakupan garansi dapat ditolak.

## 5. Pembatalan dan pengembalian dana

Pembatalan sebelum pembayaran tidak dikenakan biaya. Pengembalian dana setelah pembayaran hanya diproses sesuai ketentuan garansi atau keputusan CS NexaPlay. Dana dikembalikan ke rekening yang ditentukan setelah verifikasi.

## 6. Larangan penyalahgunaan

NexaPlay dapat menolak atau membatalkan transaksi yang terindikasi penipuan, penyalahgunaan promo, pencucian uang, atau pelanggaran hukum. Akun yang terbukti disalahgunakan dapat dinonaktifkan.

## 7. Perubahan ketentuan

NexaPlay dapat memperbarui halaman ini. Versi yang berlaku untuk pesananmu adalah versi yang tercatat saat checkout. Perubahan tidak berlaku surut untuk transaksi yang sudah selesai.

## 8. Kontak

Pertanyaan tentang pesanan, garansi, atau syarat ini dapat disampaikan melalui kanal bantuan NexaPlay.`,
  },
  {
    code: 'privacy',
    title: 'Kebijakan Privasi',
    isi: `## Data yang kami kumpulkan

- Data akun: username, alamat email, status verifikasi, dan pengaturan keamanan.
- Data transaksi: akun yang dibeli, nominal, metode pembayaran, status, dan riwayat komunikasi terkait pesanan.
- Data teknis: alamat IP, user-agent, waktu akses, dan catatan audit yang diperlukan untuk keamanan serta penyelesaian sengketa.

## Cara kami menggunakan data

Data digunakan untuk memproses pembelian, menyerahkan akun, memverifikasi kepemilikan, mencegah penipuan, menangani garansi, dan memenuhi kewajiban hukum. Kami tidak menjual data pribadi kepada pihak ketiga.

## Pembayaran

Pemrosesan pembayaran dilakukan oleh penyedia pembayaran tepercaya. NexaPlay tidak menyimpan nomor kartu, PIN, atau kode OTP. Penyedia pembayaran memiliki kebijakan privasi sendiri.

## Penyimpanan dan keamanan

- Password disimpan dalam bentuk hash, bukan teks asli.
- Kredensial akun game disimpan terenkripsi dan hanya dibuka melalui proses reveal yang sah.
- Akses internal dibatasi berdasarkan peran dan dicatat dalam audit log.
- Data disimpan selama diperlukan untuk operasional, garansi, pencegahan penipuan, dan kewajiban hukum.

## Hak kamu

Kamu dapat meminta akses, koreksi, atau penjelasan mengenai data pribadi yang kami simpan melalui kanal bantuan. Permintaan yang berpotensi melanggar keamanan atau kewajiban hukum dapat ditolak dengan alasan yang jelas.

## Cookie dan sesi

Kami menggunakan cookie sesi yang diperlukan untuk login dan keamanan. Cookie ini bukan untuk iklan pihak ketiga. Menonaktifkan cookie dapat membuat login dan checkout tidak berfungsi.

## Perubahan kebijakan

Kebijakan ini dapat diperbarui seiring perubahan layanan atau regulasi. Versi terbaru selalu ditampilkan di halaman ini.`,
  },
  {
    code: 'warranty',
    title: 'Garansi & Refund',
    isi: `## Masa garansi

Masa garansi dimulai saat kredensial akun pertama kali dibuka dan berlangsung sesuai durasi yang tertera pada halaman pesanan. Simpan bukti pembelian dan jangan mengubah data akun sebelum melakukan pengecekan awal.

## Yang dicakup garansi

- Kredensial tidak bisa digunakan karena kesalahan dari pihak toko.
- Akun ditarik kembali oleh pemilik asli tanpa sebab dari pembeli.
- Data akun tidak sesuai dengan deskripsi yang dijual.
- Masalah kepemilikan yang dapat dibuktikan dan bukan disebabkan pembeli.

## Yang tidak dicakup garansi

- Password atau email diubah lalu dilupakan oleh pembeli.
- Akun terkena banned, suspend, atau pembatasan karena aktivitas pembeli.
- Kerugian akibat membagikan akun, transaksi di luar NexaPlay, atau penipuan pihak ketiga.
- Perubahan kebijakan game yang memengaruhi akun setelah serah terima.
- Klaim tanpa bukti pembelian atau di luar masa garansi.

## Cara mengajukan klaim

1. Hubungi CS melalui kanal bantuan dengan menyertakan kode pesanan.
2. Jelaskan masalah dan lampirkan bukti yang relevan, misalnya tangkapan layar pesan error.
3. Tim akan memverifikasi riwayat transaksi dan kondisi akun.
4. Bila klaim disetujui, NexaPlay akan menawarkan penggantian akun atau pengembalian dana sesuai ketersediaan stok.

## Refund

Refund diproses setelah verifikasi dan persetujuan CS. Waktu penerimaan dana bergantung pada metode pembayaran dan bank penerima. Biaya pihak ketiga yang tidak dapat dikembalikan dapat dikurangkan sesuai ketentuan yang berlaku.

## Sengketa

Bila terjadi perbedaan pendapat, pembeli dan NexaPlay akan menyelesaikan sengketa secara musyawarah berdasarkan bukti transaksi, audit reveal, dan riwayat komunikasi.`,
  },
  {
    code: 'faq',
    title: 'FAQ',
    isi: `## Apa itu NexaPlay?

NexaPlay adalah toko akun game yang menyediakan stok akun siap pakai dengan deskripsi transparan, pembayaran aman, dan garansi sesuai ketentuan.

## Bagaimana cara membeli?

Pilih akun di katalog, buka halaman detail, lalu tekan **Lanjut ke checkout**. Setelah login, periksa rincian, pilih metode pembayaran, setujui syarat, dan selesaikan pembayaran.

## Metode pembayaran apa yang tersedia?

Metode yang aktif ditampilkan saat checkout, umumnya QRIS dan virtual account bank. Ketersediaan dapat berubah sewaktu-waktu.

## Kapan kredensial diterima?

Kredensial dapat dibuka di halaman pesanan setelah pembayaran terverifikasi. Segera ganti password dan email pemulihan setelah menerima akun.

## Apakah akun aman?

Setiap akun diperiksa sebelum dijual dan kredensial disimpan terenkripsi. Namun keamanan setelah serah terima juga bergantung pada tindakan pembeli, termasuk menjaga kerahasiaan kredensial.

## Bagaimana cara klaim garansi?

Buka halaman **Garansi & Refund**, siapkan kode pesanan dan bukti masalah, lalu hubungi CS. Klaim di luar cakupan garansi dapat ditolak.

## Pesanan saya belum muncul, apa yang harus dilakukan?

Pastikan kamu login dengan akun yang sama saat checkout. Buka **Pesanan saya** dan muat ulang halaman. Bila masih tidak muncul, hubungi CS dengan bukti pembayaran.

## Apakah bisa membatalkan pesanan?

Pesanan yang belum dibayar akan kedaluwarsa otomatis, atau dapat dibatalkan dari halaman pesanan. Pesanan yang sudah dibayar mengikuti ketentuan garansi dan refund.

## Bagaimana menghubungi CS?

Gunakan kanal bantuan yang tersedia di situs. Sertakan kode pesanan agar tim dapat memeriksa lebih cepat.`,
  },
] as const

async function main(): Promise<void> {
  // 1. Roles
  const roleAdmin = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: { code: 'ADMIN', name: 'Administrator', isSystem: true },
  })
  await prisma.role.upsert({
    where: { code: 'PEMBELI' },
    update: {},
    create: { code: 'PEMBELI', name: 'Buyer', isSystem: true },
  })

  // 2. Permission catalog + grant matrix (ADMIN = all, PEMBELI = none)
  const permissionId = new Map<string, bigint>()
  for (const [code, name] of PERMISSIONS) {
    const p = await prisma.permission.upsert({
      where: { code },
      update: { name },
      create: { code, name, isSystem: true },
    })
    permissionId.set(code, p.id)
  }
  for (const id of permissionId.values()) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: roleAdmin.id, permissionId: id } },
      update: { revokedAt: null },
      create: { roleId: roleAdmin.id, permissionId: id },
    })
  }

  // 3. Initial menus + grants to ADMIN
  const menuId = new Map<string, bigint>()
  for (const [code, name, path, icon, order] of MENUS) {
    const m = await prisma.menu.upsert({
      where: { code },
      update: { name, path, icon, order },
      create: { code, name, path, icon, order, isSystem: true },
    })
    menuId.set(code, m.id)
  }
  for (const id of menuId.values()) {
    await prisma.roleMenu.upsert({
      where: { roleId_menuId: { roleId: roleAdmin.id, menuId: id } },
      update: { revokedAt: null },
      create: { roleId: roleAdmin.id, menuId: id },
    })
  }

  // 4. Superadmin — only when no ADMIN exists yet (PLAN §13)
  const { SUPERADMIN_USERNAME, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = process.env
  const sudahAdaAdmin =
    (await prisma.user.findFirst({ where: { role: { code: 'ADMIN' } }, select: { id: true } })) !== null
  let superadminId: bigint
  if (sudahAdaAdmin) {
    const ada = await prisma.user.findFirst({
      where: { role: { code: 'ADMIN' } },
      select: { id: true },
      orderBy: { id: 'asc' },
    })
    superadminId = ada!.id
    console.log('Seed: ADMIN already exists — skipping superadmin')
  } else {
    if (!SUPERADMIN_USERNAME || !SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
      throw new Error('SUPERADMIN_USERNAME / SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD not set in .env')
    }
    const superadmin = await prisma.user.create({
      data: {
        username: SUPERADMIN_USERNAME,
        email: SUPERADMIN_EMAIL,
        emailVerified: true,
        passwordHash: await bcrypt.hash(SUPERADMIN_PASSWORD, 12),
        roleId: roleAdmin.id,
      },
      select: { id: true },
    })
    superadminId = superadmin.id
    console.log(`Seed: superadmin "${SUPERADMIN_USERNAME}" created (id=${superadmin.id})`)
  }

  // 5. Initial game types & games
  const typeId = new Map<string, bigint>()
  for (const [code, name, order] of JENIS_GAME) {
    const j = await prisma.gameType.upsert({
      where: { code },
      update: { name, order },
      create: { code, name, order },
    })
    typeId.set(code, j.id)
  }
  for (const [code, name, jenisKode, attributeSchema] of GAMES) {
    await prisma.game.upsert({
      where: { code },
      update: { name, attributeSchema },
      create: { code, name, typeId: typeId.get(jenisKode)!, attributeSchema },
    })
  }

  // 6. Default theme (the only active one)
  await prisma.theme.upsert({
    where: { code: 'default' },
    update: {},
    create: { code: 'default', name: 'Default', tokens: TEMA_TOKEN, active: true, isSystem: true },
  })

  // 7. Initial store settings
  const pengaturanAwal: Array<[string, string]> = [
    ['checkout_aktif', 'true'],
    ['nama_toko', 'GameStore'],
    ['kontak_cs', ''],
    ['pesan_pengumuman', ''],
  ]
  for (const [key, value] of pengaturanAwal) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    })
  }

  // 8. Four static pages, each published as version 1 (append-only: check first)
  for (const { code, title, isi } of HALAMAN_AWAL) {
    const page = await prisma.staticPage.upsert({
      where: { code },
      update: {},
      create: { code, title, bodyMarkdown: isi, version: 0 },
    })

    const placeholder = page.bodyMarkdown.startsWith('Isi ')
    const version = placeholder ? Math.max(1, page.version + 1) : 1
    const sudahTerbit = await prisma.staticPageVersion.findUnique({
      where: { pageId_version: { pageId: page.id, version } },
      select: { pageId: true },
    })
    if (!sudahTerbit) {
      await prisma.staticPageVersion.create({
        data: {
          pageId: page.id,
          version,
          title,
          bodyMarkdown: isi,
          publishedBy: superadminId,
        },
      })
      await prisma.staticPage.update({
        where: { id: page.id },
        data: { version, title, bodyMarkdown: isi },
      })
    }
  }

  console.log('Seed done: roles 2, permissions', PERMISSIONS.length, ', menus', MENUS.length, ', game types', JENIS_GAME.length, ', games', GAMES.length)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
