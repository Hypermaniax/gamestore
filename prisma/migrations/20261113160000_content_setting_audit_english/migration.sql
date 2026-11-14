-- Phase 19 — physical content, setting, and audit naming.
-- Logical Prisma names are already English; this migration renames the physical
-- schema only. No data is deleted.

-- ── Tables ────────────────────────────────────────────────────────────────
ALTER TABLE "tema" RENAME TO "themes";
ALTER TABLE "halaman_statis" RENAME TO "static_pages";
ALTER TABLE "halaman_statis_versi" RENAME TO "static_page_versions";
ALTER TABLE "admin_audit_log" RENAME TO "admin_audit_logs";
ALTER TABLE "audit_reveal" RENAME TO "audit_reveals";
ALTER TABLE "pengaturan" RENAME TO "settings";

-- ── Columns: themes ───────────────────────────────────────────────────────
ALTER TABLE "themes" RENAME COLUMN "kode" TO "code";
ALTER TABLE "themes" RENAME COLUMN "nama" TO "name";
ALTER TABLE "themes" RENAME COLUMN "token" TO "tokens";
ALTER TABLE "themes" RENAME COLUMN "aktif" TO "active";

-- ── Columns: static pages ─────────────────────────────────────────────────
ALTER TABLE "static_pages" RENAME COLUMN "kode" TO "code";
ALTER TABLE "static_pages" RENAME COLUMN "judul" TO "title";
ALTER TABLE "static_pages" RENAME COLUMN "isi_markdown" TO "body_markdown";
ALTER TABLE "static_pages" RENAME COLUMN "versi" TO "version";
ALTER TABLE "static_pages" RENAME COLUMN "diubah_pada" TO "updated_at";

-- ── Columns: static page versions ─────────────────────────────────────────
ALTER TABLE "static_page_versions" RENAME COLUMN "halaman_id" TO "page_id";
ALTER TABLE "static_page_versions" RENAME COLUMN "versi" TO "version";
ALTER TABLE "static_page_versions" RENAME COLUMN "judul" TO "title";
ALTER TABLE "static_page_versions" RENAME COLUMN "isi_markdown" TO "body_markdown";
ALTER TABLE "static_page_versions" RENAME COLUMN "diterbitkan_pada" TO "published_at";
ALTER TABLE "static_page_versions" RENAME COLUMN "diterbitkan_oleh" TO "published_by";

-- ── Columns: admin audit logs ─────────────────────────────────────────────
ALTER TABLE "admin_audit_logs" RENAME COLUMN "aktor_id" TO "actor_id";
ALTER TABLE "admin_audit_logs" RENAME COLUMN "aksi" TO "action";
ALTER TABLE "admin_audit_logs" RENAME COLUMN "waktu" TO "created_at";

-- ── Columns: audit reveals ────────────────────────────────────────────────
ALTER TABLE "audit_reveals" RENAME COLUMN "transaksi_id" TO "transaction_id";
ALTER TABLE "audit_reveals" RENAME COLUMN "pembeli_id" TO "buyer_id";
ALTER TABLE "audit_reveals" RENAME COLUMN "waktu" TO "revealed_at";

-- ── Columns: settings ─────────────────────────────────────────────────────
ALTER TABLE "settings" RENAME COLUMN "kunci" TO "key";
ALTER TABLE "settings" RENAME COLUMN "nilai" TO "value";

-- ── Sequences ────────────────────────────────────────────────────────────
ALTER SEQUENCE "tema_id_seq" RENAME TO "themes_id_seq";
ALTER SEQUENCE "halaman_statis_id_seq" RENAME TO "static_pages_id_seq";
ALTER SEQUENCE "email_token_id_seq" RENAME TO "email_tokens_id_seq";
ALTER SEQUENCE "admin_audit_log_id_seq" RENAME TO "admin_audit_logs_id_seq";
ALTER SEQUENCE "audit_reveal_id_seq" RENAME TO "audit_reveals_id_seq";

-- ── Primary keys ─────────────────────────────────────────────────────────
ALTER TABLE "themes" RENAME CONSTRAINT "tema_pkey" TO "themes_pkey";
ALTER TABLE "static_pages" RENAME CONSTRAINT "halaman_statis_pkey" TO "static_pages_pkey";
ALTER TABLE "static_page_versions" RENAME CONSTRAINT "halaman_statis_versi_pkey" TO "static_page_versions_pkey";
ALTER TABLE "email_tokens" RENAME CONSTRAINT "email_token_pkey" TO "email_tokens_pkey";
ALTER TABLE "admin_audit_logs" RENAME CONSTRAINT "admin_audit_log_pkey" TO "admin_audit_logs_pkey";
ALTER TABLE "audit_reveals" RENAME CONSTRAINT "audit_reveal_pkey" TO "audit_reveals_pkey";
ALTER TABLE "settings" RENAME CONSTRAINT "pengaturan_pkey" TO "settings_pkey";

-- ── Foreign keys ─────────────────────────────────────────────────────────
ALTER TABLE "static_page_versions" RENAME CONSTRAINT "halaman_statis_versi_halaman_id_fkey" TO "static_page_versions_page_id_fkey";
ALTER TABLE "static_page_versions" RENAME CONSTRAINT "halaman_statis_versi_diterbitkan_oleh_fkey" TO "static_page_versions_published_by_fkey";

ALTER TABLE "email_tokens" RENAME CONSTRAINT "email_token_user_id_fkey" TO "email_tokens_user_id_fkey";

ALTER TABLE "admin_audit_logs" RENAME CONSTRAINT "admin_audit_log_aktor_id_fkey" TO "admin_audit_logs_actor_id_fkey";

ALTER TABLE "audit_reveals" RENAME CONSTRAINT "audit_reveal_transaksi_id_fkey" TO "audit_reveals_transaction_id_fkey";
ALTER TABLE "audit_reveals" RENAME CONSTRAINT "audit_reveal_pembeli_id_fkey" TO "audit_reveals_buyer_id_fkey";

ALTER TABLE "settings" RENAME CONSTRAINT "pengaturan_updated_by_fkey" TO "settings_updated_by_fkey";

-- ── NOT NULL constraints ─────────────────────────────────────────────────
ALTER TABLE "themes" RENAME CONSTRAINT "tema_id_not_null" TO "themes_id_not_null";
ALTER TABLE "themes" RENAME CONSTRAINT "tema_kode_not_null" TO "themes_code_not_null";
ALTER TABLE "themes" RENAME CONSTRAINT "tema_nama_not_null" TO "themes_name_not_null";
ALTER TABLE "themes" RENAME CONSTRAINT "tema_token_not_null" TO "themes_tokens_not_null";
ALTER TABLE "themes" RENAME CONSTRAINT "tema_aktif_not_null" TO "themes_active_not_null";
ALTER TABLE "themes" RENAME CONSTRAINT "tema_is_system_not_null" TO "themes_is_system_not_null";

ALTER TABLE "static_pages" RENAME CONSTRAINT "halaman_statis_id_not_null" TO "static_pages_id_not_null";
ALTER TABLE "static_pages" RENAME CONSTRAINT "halaman_statis_kode_not_null" TO "static_pages_code_not_null";
ALTER TABLE "static_pages" RENAME CONSTRAINT "halaman_statis_judul_not_null" TO "static_pages_title_not_null";
ALTER TABLE "static_pages" RENAME CONSTRAINT "halaman_statis_isi_markdown_not_null" TO "static_pages_body_markdown_not_null";
ALTER TABLE "static_pages" RENAME CONSTRAINT "halaman_statis_versi_not_null" TO "static_pages_version_not_null";
ALTER TABLE "static_pages" RENAME CONSTRAINT "halaman_statis_diubah_pada_not_null" TO "static_pages_updated_at_not_null";

ALTER TABLE "static_page_versions" RENAME CONSTRAINT "halaman_statis_versi_halaman_id_not_null" TO "static_page_versions_page_id_not_null";
ALTER TABLE "static_page_versions" RENAME CONSTRAINT "halaman_statis_versi_versi_not_null" TO "static_page_versions_version_not_null";
ALTER TABLE "static_page_versions" RENAME CONSTRAINT "halaman_statis_versi_judul_not_null" TO "static_page_versions_title_not_null";
ALTER TABLE "static_page_versions" RENAME CONSTRAINT "halaman_statis_versi_isi_markdown_not_null" TO "static_page_versions_body_markdown_not_null";
ALTER TABLE "static_page_versions" RENAME CONSTRAINT "halaman_statis_versi_diterbitkan_pada_not_null" TO "static_page_versions_published_at_not_null";
ALTER TABLE "static_page_versions" RENAME CONSTRAINT "halaman_statis_versi_diterbitkan_oleh_not_null" TO "static_page_versions_published_by_not_null";

ALTER TABLE "email_tokens" RENAME CONSTRAINT "email_token_id_not_null" TO "email_tokens_id_not_null";
ALTER TABLE "email_tokens" RENAME CONSTRAINT "email_token_jenis_not_null" TO "email_tokens_type_not_null";
ALTER TABLE "email_tokens" RENAME CONSTRAINT "email_token_hash_token_not_null" TO "email_tokens_token_hash_not_null";
ALTER TABLE "email_tokens" RENAME CONSTRAINT "email_token_user_id_not_null" TO "email_tokens_user_id_not_null";
ALTER TABLE "email_tokens" RENAME CONSTRAINT "email_token_berlaku_hingga_not_null" TO "email_tokens_valid_until_not_null";

ALTER TABLE "admin_audit_logs" RENAME CONSTRAINT "admin_audit_log_id_not_null" TO "admin_audit_logs_id_not_null";
ALTER TABLE "admin_audit_logs" RENAME CONSTRAINT "admin_audit_log_aksi_not_null" TO "admin_audit_logs_action_not_null";
ALTER TABLE "admin_audit_logs" RENAME CONSTRAINT "admin_audit_log_target_not_null" TO "admin_audit_logs_target_not_null";
ALTER TABLE "admin_audit_logs" RENAME CONSTRAINT "admin_audit_log_waktu_not_null" TO "admin_audit_logs_created_at_not_null";

ALTER TABLE "audit_reveals" RENAME CONSTRAINT "audit_reveal_id_not_null" TO "audit_reveals_id_not_null";
ALTER TABLE "audit_reveals" RENAME CONSTRAINT "audit_reveal_transaksi_id_not_null" TO "audit_reveals_transaction_id_not_null";
ALTER TABLE "audit_reveals" RENAME CONSTRAINT "audit_reveal_pembeli_id_not_null" TO "audit_reveals_buyer_id_not_null";
ALTER TABLE "audit_reveals" RENAME CONSTRAINT "audit_reveal_waktu_not_null" TO "audit_reveals_revealed_at_not_null";

ALTER TABLE "settings" RENAME CONSTRAINT "pengaturan_kunci_not_null" TO "settings_key_not_null";
ALTER TABLE "settings" RENAME CONSTRAINT "pengaturan_updated_at_not_null" TO "settings_updated_at_not_null";

-- ── Indexes ──────────────────────────────────────────────────────────────
ALTER INDEX "tema_kode_key" RENAME TO "themes_code_key";
ALTER INDEX "tema_satu_aktif" RENAME TO "themes_single_active";
ALTER INDEX "halaman_statis_kode_key" RENAME TO "static_pages_code_key";
ALTER INDEX "email_token_user_id_idx" RENAME TO "email_tokens_user_id_idx";
ALTER INDEX "email_token_hash_token_key" RENAME TO "email_tokens_token_hash_key";
ALTER INDEX "admin_audit_log_aktor_id_waktu_idx" RENAME TO "admin_audit_logs_actor_id_created_at_idx";
ALTER INDEX "audit_reveal_transaksi_id_idx" RENAME TO "audit_reveals_transaction_id_idx";
