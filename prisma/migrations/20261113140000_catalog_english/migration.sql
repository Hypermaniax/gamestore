-- Phase 17 — physical catalog/account naming.
-- Logical Prisma names are already English; this migration renames the physical
-- schema only. No data is deleted.

-- ── Tables ────────────────────────────────────────────────────────────────
ALTER TABLE "jenis_game" RENAME TO "game_types";
ALTER TABLE "game" RENAME TO "games";
ALTER TABLE "akun_game" RENAME TO "game_accounts";
ALTER TABLE "akun_foto" RENAME TO "account_photos";

-- ── Columns: game types ──────────────────────────────────────────────────
ALTER TABLE "game_types" RENAME COLUMN "kode" TO "code";
ALTER TABLE "game_types" RENAME COLUMN "nama" TO "name";
ALTER TABLE "game_types" RENAME COLUMN "urutan" TO "sort_order";
ALTER TABLE "game_types" RENAME COLUMN "aktif" TO "active";

-- ── Columns: games ───────────────────────────────────────────────────────
ALTER TABLE "games" RENAME COLUMN "kode" TO "code";
ALTER TABLE "games" RENAME COLUMN "nama" TO "name";
ALTER TABLE "games" RENAME COLUMN "jenis_id" TO "type_id";
ALTER TABLE "games" RENAME COLUMN "ikon_url" TO "icon_url";
ALTER TABLE "games" RENAME COLUMN "skema_atribut" TO "attribute_schema";
ALTER TABLE "games" RENAME COLUMN "aktif" TO "active";

-- ── Columns: game accounts ───────────────────────────────────────────────
ALTER TABLE "game_accounts" RENAME COLUMN "judul" TO "title";
ALTER TABLE "game_accounts" RENAME COLUMN "deskripsi" TO "description";
ALTER TABLE "game_accounts" RENAME COLUMN "harga" TO "price";
ALTER TABLE "game_accounts" RENAME COLUMN "atribut" TO "attributes";
ALTER TABLE "game_accounts" RENAME COLUMN "kredensial_encrypted" TO "credentials_encrypted";
ALTER TABLE "game_accounts" RENAME COLUMN "dilist_pada" TO "listed_at";
ALTER TABLE "game_accounts" RENAME COLUMN "dihapus_pada" TO "deleted_at";
ALTER TABLE "game_accounts" RENAME COLUMN "cari" TO "search_vector";

-- ── Columns: account photos ──────────────────────────────────────────────
ALTER TABLE "account_photos" RENAME COLUMN "akun_id" TO "account_id";
ALTER TABLE "account_photos" RENAME COLUMN "urutan" TO "sort_order";
ALTER TABLE "account_photos" RENAME COLUMN "dihapus_pada" TO "deleted_at";

-- ── Sequences ────────────────────────────────────────────────────────────
ALTER SEQUENCE "jenis_game_id_seq" RENAME TO "game_types_id_seq";
ALTER SEQUENCE "game_id_seq" RENAME TO "games_id_seq";
ALTER SEQUENCE "akun_game_id_seq" RENAME TO "game_accounts_id_seq";
ALTER SEQUENCE "akun_foto_id_seq" RENAME TO "account_photos_id_seq";

-- ── Primary keys ─────────────────────────────────────────────────────────
ALTER TABLE "game_types" RENAME CONSTRAINT "jenis_game_pkey" TO "game_types_pkey";
ALTER TABLE "games" RENAME CONSTRAINT "game_pkey" TO "games_pkey";
ALTER TABLE "game_accounts" RENAME CONSTRAINT "akun_game_pkey" TO "game_accounts_pkey";
ALTER TABLE "account_photos" RENAME CONSTRAINT "akun_foto_pkey" TO "account_photos_pkey";

-- ── CHECK constraints ────────────────────────────────────────────────────
ALTER TABLE "game_accounts" RENAME CONSTRAINT "akun_game_harga_positif" TO "game_accounts_price_positive";
ALTER TABLE "game_accounts" RENAME CONSTRAINT "akun_game_status_valid" TO "game_accounts_status_valid";
ALTER TABLE "game_accounts" RENAME CONSTRAINT "akun_game_wajib_kredensial" TO "game_accounts_credentials_required";

-- ── Foreign keys ─────────────────────────────────────────────────────────
ALTER TABLE "games" RENAME CONSTRAINT "game_jenis_id_fkey" TO "games_type_id_fkey";
ALTER TABLE "game_accounts" RENAME CONSTRAINT "akun_game_game_id_fkey" TO "game_accounts_game_id_fkey";
ALTER TABLE "game_accounts" RENAME CONSTRAINT "akun_game_admin_id_fkey" TO "game_accounts_admin_id_fkey";
ALTER TABLE "account_photos" RENAME CONSTRAINT "akun_foto_akun_id_fkey" TO "account_photos_account_id_fkey";

-- ── Indexes ──────────────────────────────────────────────────────────────
ALTER INDEX "jenis_game_kode_key" RENAME TO "game_types_code_key";
ALTER INDEX "game_jenis_id_idx" RENAME TO "games_type_id_idx";
ALTER INDEX "game_kode_key" RENAME TO "games_code_key";
ALTER INDEX "akun_game_game_id_idx" RENAME TO "game_accounts_game_id_idx";
ALTER INDEX "akun_game_admin_id_idx" RENAME TO "game_accounts_admin_id_idx";
ALTER INDEX "akun_game_slug_key" RENAME TO "game_accounts_slug_key";
ALTER INDEX "akun_foto_akun_id_urutan_idx" RENAME TO "account_photos_account_id_sort_order_idx";
ALTER INDEX "akun_game_katalog" RENAME TO "game_accounts_catalog";
ALTER INDEX "akun_game_cari_gin" RENAME TO "game_accounts_search_gin";
ALTER INDEX "akun_game_atribut_gin" RENAME TO "game_accounts_attributes_gin";
