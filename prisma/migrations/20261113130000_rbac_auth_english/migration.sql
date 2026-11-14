-- Phase 16 — physical RBAC, auth, menu, and permission naming.
-- Logical Prisma names are already English; this migration renames the physical
-- schema only. No data is deleted.

-- ── Tables ────────────────────────────────────────────────────────────────
ALTER TABLE "role" RENAME TO "roles";
ALTER TABLE "menu" RENAME TO "menus";
ALTER TABLE "permission" RENAME TO "permissions";
ALTER TABLE "role_menu" RENAME TO "role_menus";
ALTER TABLE "role_permission" RENAME TO "role_permissions";
ALTER TABLE "email_token" RENAME TO "email_tokens";
ALTER TABLE "refresh_token" RENAME TO "refresh_tokens";
ALTER TABLE "users_totp_recovery" RENAME TO "totp_recoveries";

-- ── Columns: roles ───────────────────────────────────────────────────────
ALTER TABLE "roles" RENAME COLUMN "kode" TO "code";
ALTER TABLE "roles" RENAME COLUMN "nama" TO "name";

-- ── Columns: users ───────────────────────────────────────────────────────
ALTER TABLE "users" RENAME COLUMN "email_terverifikasi" TO "email_verified";
ALTER TABLE "users" RENAME COLUMN "aktif" TO "active";
ALTER TABLE "users" RENAME COLUMN "totp_langkah_terakhir" TO "totp_last_step";
ALTER TABLE "users" RENAME COLUMN "totp_aktif" TO "totp_active";
ALTER TABLE "users" RENAME COLUMN "totp_gagal" TO "totp_failures";
ALTER TABLE "users" RENAME COLUMN "totp_terkunci_hingga" TO "totp_locked_until";

-- ── Columns: menus ───────────────────────────────────────────────────────
ALTER TABLE "menus" RENAME COLUMN "kode" TO "code";
ALTER TABLE "menus" RENAME COLUMN "nama" TO "name";
ALTER TABLE "menus" RENAME COLUMN "ikon" TO "icon";
ALTER TABLE "menus" RENAME COLUMN "urutan" TO "sort_order";
ALTER TABLE "menus" RENAME COLUMN "aktif" TO "active";

-- ── Columns: permissions ─────────────────────────────────────────────────
ALTER TABLE "permissions" RENAME COLUMN "kode" TO "code";
ALTER TABLE "permissions" RENAME COLUMN "nama" TO "name";

-- ── Columns: grants ──────────────────────────────────────────────────────
ALTER TABLE "role_menus" RENAME COLUMN "dicabut_pada" TO "revoked_at";
ALTER TABLE "role_permissions" RENAME COLUMN "dicabut_pada" TO "revoked_at";

-- ── Columns: email tokens ────────────────────────────────────────────────
ALTER TABLE "email_tokens" RENAME COLUMN "jenis" TO "type";
ALTER TABLE "email_tokens" RENAME COLUMN "email_baru" TO "new_email";
ALTER TABLE "email_tokens" RENAME COLUMN "hash_token" TO "token_hash";
ALTER TABLE "email_tokens" RENAME COLUMN "berlaku_hingga" TO "valid_until";
ALTER TABLE "email_tokens" RENAME COLUMN "dipakai_pada" TO "used_at";

-- ── Columns: refresh tokens ──────────────────────────────────────────────
ALTER TABLE "refresh_tokens" RENAME COLUMN "diganti_pada" TO "replaced_at";
ALTER TABLE "refresh_tokens" RENAME COLUMN "diganti_dengan" TO "replaced_by_token_id";
ALTER TABLE "refresh_tokens" RENAME COLUMN "perangkat" TO "device";
ALTER TABLE "refresh_tokens" RENAME COLUMN "kedaluwarsa" TO "expires_at";
ALTER TABLE "refresh_tokens" RENAME COLUMN "dicabut" TO "revoked";

-- ── Columns: TOTP recovery codes ─────────────────────────────────────────
ALTER TABLE "totp_recoveries" RENAME COLUMN "dipakai_pada" TO "used_at";
ALTER TABLE "totp_recoveries" RENAME COLUMN "dicabut_pada" TO "revoked_at";

-- ── Backfill permission codes ────────────────────────────────────────────
UPDATE "permissions" SET "code" = 'account:read' WHERE "code" = 'akun:read';
UPDATE "permissions" SET "code" = 'account:write' WHERE "code" = 'akun:write';
UPDATE "permissions" SET "code" = 'credential:write' WHERE "code" = 'kredensial:write';
UPDATE "permissions" SET "code" = 'promotion:read' WHERE "code" = 'promo:read';
UPDATE "permissions" SET "code" = 'promotion:write' WHERE "code" = 'promo:write';
UPDATE "permissions" SET "code" = 'theme:write' WHERE "code" = 'tema:write';
UPDATE "permissions" SET "code" = 'page:read' WHERE "code" = 'halaman:read';
UPDATE "permissions" SET "code" = 'page:write' WHERE "code" = 'halaman:write';
UPDATE "permissions" SET "code" = 'setting:read' WHERE "code" = 'pengaturan:read';
UPDATE "permissions" SET "code" = 'setting:write' WHERE "code" = 'pengaturan:write';
UPDATE "permissions" SET "code" = 'transaction:read' WHERE "code" = 'transaksi:read';
UPDATE "permissions" SET "code" = 'transaction:sync' WHERE "code" = 'transaksi:sinkron';
UPDATE "permissions" SET "code" = 'transaction:dispute' WHERE "code" = 'transaksi:sengketa';
UPDATE "permissions" SET "code" = 'transaction:refund' WHERE "code" = 'transaksi:refund';
UPDATE "permissions" SET "code" = 'complaint:decide' WHERE "code" = 'komplain:decide';
UPDATE "permissions" SET "code" = 'report:read' WHERE "code" = 'laporan:read';

-- ── Backfill menu codes ──────────────────────────────────────────────────
UPDATE "menus" SET "code" = 'accounts' WHERE "code" = 'akun';
UPDATE "menus" SET "code" = 'games' WHERE "code" = 'game';
UPDATE "menus" SET "code" = 'vouchers' WHERE "code" = 'voucher';
UPDATE "menus" SET "code" = 'promotions' WHERE "code" = 'promo';
UPDATE "menus" SET "code" = 'transactions' WHERE "code" = 'transaksi';
UPDATE "menus" SET "code" = 'reports' WHERE "code" = 'laporan';
UPDATE "menus" SET "code" = 'pages' WHERE "code" = 'halaman';
UPDATE "menus" SET "code" = 'settings' WHERE "code" = 'pengaturan';
UPDATE "menus" SET "code" = 'webhooks' WHERE "code" = 'webhook';
