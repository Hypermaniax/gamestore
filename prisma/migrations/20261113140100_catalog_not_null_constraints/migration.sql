-- Phase 17 — rename PostgreSQL NOT NULL constraints left behind by column renames.
-- PostgreSQL 18 exposes these as named constraints; keep their names aligned with
-- the new physical catalog schema.

ALTER TABLE "game_types" RENAME CONSTRAINT "jenis_game_aktif_not_null" TO "game_types_active_not_null";
ALTER TABLE "game_types" RENAME CONSTRAINT "jenis_game_id_not_null" TO "game_types_id_not_null";
ALTER TABLE "game_types" RENAME CONSTRAINT "jenis_game_kode_not_null" TO "game_types_code_not_null";
ALTER TABLE "game_types" RENAME CONSTRAINT "jenis_game_nama_not_null" TO "game_types_name_not_null";
ALTER TABLE "game_types" RENAME CONSTRAINT "jenis_game_urutan_not_null" TO "game_types_sort_order_not_null";

ALTER TABLE "games" RENAME CONSTRAINT "game_aktif_not_null" TO "games_active_not_null";
ALTER TABLE "games" RENAME CONSTRAINT "game_id_not_null" TO "games_id_not_null";
ALTER TABLE "games" RENAME CONSTRAINT "game_jenis_id_not_null" TO "games_type_id_not_null";
ALTER TABLE "games" RENAME CONSTRAINT "game_kode_not_null" TO "games_code_not_null";
ALTER TABLE "games" RENAME CONSTRAINT "game_nama_not_null" TO "games_name_not_null";
ALTER TABLE "games" RENAME CONSTRAINT "game_skema_atribut_not_null" TO "games_attribute_schema_not_null";

ALTER TABLE "game_accounts" RENAME CONSTRAINT "akun_game_admin_id_not_null" TO "game_accounts_admin_id_not_null";
ALTER TABLE "game_accounts" RENAME CONSTRAINT "akun_game_atribut_not_null" TO "game_accounts_attributes_not_null";
ALTER TABLE "game_accounts" RENAME CONSTRAINT "akun_game_created_at_not_null" TO "game_accounts_created_at_not_null";
ALTER TABLE "game_accounts" RENAME CONSTRAINT "akun_game_game_id_not_null" TO "game_accounts_game_id_not_null";
ALTER TABLE "game_accounts" RENAME CONSTRAINT "akun_game_harga_not_null" TO "game_accounts_price_not_null";
ALTER TABLE "game_accounts" RENAME CONSTRAINT "akun_game_id_not_null" TO "game_accounts_id_not_null";
ALTER TABLE "game_accounts" RENAME CONSTRAINT "akun_game_judul_not_null" TO "game_accounts_title_not_null";
ALTER TABLE "game_accounts" RENAME CONSTRAINT "akun_game_slug_not_null" TO "game_accounts_slug_not_null";
ALTER TABLE "game_accounts" RENAME CONSTRAINT "akun_game_status_not_null" TO "game_accounts_status_not_null";
ALTER TABLE "game_accounts" RENAME CONSTRAINT "akun_game_updated_at_not_null" TO "game_accounts_updated_at_not_null";
ALTER TABLE "game_accounts" RENAME CONSTRAINT "akun_game_version_not_null" TO "game_accounts_version_not_null";

ALTER TABLE "account_photos" RENAME CONSTRAINT "akun_foto_akun_id_not_null" TO "account_photos_account_id_not_null";
ALTER TABLE "account_photos" RENAME CONSTRAINT "akun_foto_id_not_null" TO "account_photos_id_not_null";
ALTER TABLE "account_photos" RENAME CONSTRAINT "akun_foto_url_not_null" TO "account_photos_url_not_null";
ALTER TABLE "account_photos" RENAME CONSTRAINT "akun_foto_urutan_not_null" TO "account_photos_sort_order_not_null";
