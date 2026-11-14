-- Phase 18 — physical discount, transaction, payment, refund, webhook, and
-- idempotency naming. Logical Prisma names are already English; this migration
-- renames the physical schema only. No data is deleted.

-- ── Tables ────────────────────────────────────────────────────────────────
ALTER TABLE "promo" RENAME TO "promotions";
ALTER TABLE "voucher" RENAME TO "vouchers";
ALTER TABLE "voucher_usage" RENAME TO "voucher_usages";
ALTER TABLE "transaksi" RENAME TO "transactions";
ALTER TABLE "pembayaran" RENAME TO "payments";
ALTER TABLE "refund" RENAME TO "refunds";
ALTER TABLE "webhook_event" RENAME TO "webhook_events";
ALTER TABLE "idempotency_key" RENAME TO "idempotency_keys";

-- ── Columns: promotions ──────────────────────────────────────────────────
ALTER TABLE "promotions" RENAME COLUMN "nama" TO "name";
ALTER TABLE "promotions" RENAME COLUMN "jenis" TO "type";
ALTER TABLE "promotions" RENAME COLUMN "nilai" TO "value";
ALTER TABLE "promotions" RENAME COLUMN "maks_potongan" TO "max_discount";
ALTER TABLE "promotions" RENAME COLUMN "cakupan" TO "scope";
ALTER TABLE "promotions" RENAME COLUMN "mulai" TO "starts_at";
ALTER TABLE "promotions" RENAME COLUMN "berakhir" TO "ends_at";
ALTER TABLE "promotions" RENAME COLUMN "aktif" TO "active";

-- ── Columns: vouchers ────────────────────────────────────────────────────
ALTER TABLE "vouchers" RENAME COLUMN "kode" TO "code";
ALTER TABLE "vouchers" RENAME COLUMN "jenis" TO "type";
ALTER TABLE "vouchers" RENAME COLUMN "nilai" TO "value";
ALTER TABLE "vouchers" RENAME COLUMN "kuota" TO "quota";
ALTER TABLE "vouchers" RENAME COLUMN "terpakai" TO "used";
ALTER TABLE "vouchers" RENAME COLUMN "min_belanja" TO "min_purchase";
ALTER TABLE "vouchers" RENAME COLUMN "maks_potongan" TO "max_discount";
ALTER TABLE "vouchers" RENAME COLUMN "aktif" TO "active";
ALTER TABLE "vouchers" RENAME COLUMN "berlaku_hingga" TO "valid_until";

-- ── Columns: voucher usages ──────────────────────────────────────────────
ALTER TABLE "voucher_usages" RENAME COLUMN "transaksi_id" TO "transaction_id";
ALTER TABLE "voucher_usages" RENAME COLUMN "waktu" TO "used_at";
ALTER TABLE "voucher_usages" RENAME COLUMN "dipulihkan_pada" TO "restored_at";

-- ── Columns: transactions ────────────────────────────────────────────────
ALTER TABLE "transactions" RENAME COLUMN "kode" TO "code";
ALTER TABLE "transactions" RENAME COLUMN "akun_id" TO "account_id";
ALTER TABLE "transactions" RENAME COLUMN "pembeli_id" TO "buyer_id";
ALTER TABLE "transactions" RENAME COLUMN "harga_awal" TO "initial_price";
ALTER TABLE "transactions" RENAME COLUMN "promo_id" TO "promotion_id";
ALTER TABLE "transactions" RENAME COLUMN "potongan_promo" TO "promotion_discount";
ALTER TABLE "transactions" RENAME COLUMN "potongan_voucher" TO "voucher_discount";
ALTER TABLE "transactions" RENAME COLUMN "catatan" TO "note";
ALTER TABLE "transactions" RENAME COLUMN "syarat_versi" TO "terms_version";
ALTER TABLE "transactions" RENAME COLUMN "syarat_disetujui_pada" TO "terms_accepted_at";
ALTER TABLE "transactions" RENAME COLUMN "dikonfirmasi_diterima" TO "receipt_confirmed";
ALTER TABLE "transactions" RENAME COLUMN "dikonfirmasi_pada" TO "confirmed_at";
ALTER TABLE "transactions" RENAME COLUMN "dikonfirmasi_oleh" TO "confirmed_by";
ALTER TABLE "transactions" RENAME COLUMN "reveal_hingga" TO "reveal_until";
ALTER TABLE "transactions" RENAME COLUMN "garansi_mulai" TO "warranty_start";

-- ── Columns: payments ────────────────────────────────────────────────────
ALTER TABLE "payments" RENAME COLUMN "transaksi_id" TO "transaction_id";
ALTER TABLE "payments" RENAME COLUMN "metode" TO "method";
ALTER TABLE "payments" RENAME COLUMN "id_xendit" TO "xendit_id";
ALTER TABLE "payments" RENAME COLUMN "id_dana_masuk" TO "incoming_fund_id";
ALTER TABLE "payments" RENAME COLUMN "referensi" TO "reference";
ALTER TABLE "payments" RENAME COLUMN "instruksi" TO "instructions";
ALTER TABLE "payments" RENAME COLUMN "jumlah" TO "amount";

-- ── Columns: refunds ─────────────────────────────────────────────────────
ALTER TABLE "refunds" RENAME COLUMN "pembayaran_id" TO "payment_id";
ALTER TABLE "refunds" RENAME COLUMN "transaksi_id" TO "transaction_id";
ALTER TABLE "refunds" RENAME COLUMN "jumlah" TO "amount";
ALTER TABLE "refunds" RENAME COLUMN "ref" TO "reference";
ALTER TABLE "refunds" RENAME COLUMN "catatan" TO "note";

-- ── Columns: webhook events ──────────────────────────────────────────────
ALTER TABLE "webhook_events" RENAME COLUMN "jenis" TO "type";
ALTER TABLE "webhook_events" RENAME COLUMN "id_dana_masuk" TO "incoming_fund_id";
ALTER TABLE "webhook_events" RENAME COLUMN "payload_mentah" TO "raw_payload";
ALTER TABLE "webhook_events" RENAME COLUMN "diproses_pada" TO "processed_at";

-- ── Columns: idempotency keys ────────────────────────────────────────────
ALTER TABLE "idempotency_keys" RENAME COLUMN "transaksi_id" TO "transaction_id";
ALTER TABLE "idempotency_keys" RENAME COLUMN "respons_status" TO "response_status";
ALTER TABLE "idempotency_keys" RENAME COLUMN "respons_snapshot" TO "response_snapshot";
ALTER TABLE "idempotency_keys" RENAME COLUMN "berlaku_hingga" TO "valid_until";

-- ── Sequences ────────────────────────────────────────────────────────────
ALTER SEQUENCE "promo_id_seq" RENAME TO "promotions_id_seq";
ALTER SEQUENCE "voucher_id_seq" RENAME TO "vouchers_id_seq";
ALTER SEQUENCE "transaksi_id_seq" RENAME TO "transactions_id_seq";
ALTER SEQUENCE "pembayaran_id_seq" RENAME TO "payments_id_seq";
ALTER SEQUENCE "refund_id_seq" RENAME TO "refunds_id_seq";
ALTER SEQUENCE "webhook_event_id_seq" RENAME TO "webhook_events_id_seq";

-- ── Primary keys ─────────────────────────────────────────────────────────
ALTER TABLE "promotions" RENAME CONSTRAINT "promo_pkey" TO "promotions_pkey";
ALTER TABLE "vouchers" RENAME CONSTRAINT "voucher_pkey" TO "vouchers_pkey";
ALTER TABLE "voucher_usages" RENAME CONSTRAINT "voucher_usage_pkey" TO "voucher_usages_pkey";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_pkey" TO "transactions_pkey";
ALTER TABLE "payments" RENAME CONSTRAINT "pembayaran_pkey" TO "payments_pkey";
ALTER TABLE "refunds" RENAME CONSTRAINT "refund_pkey" TO "refunds_pkey";
ALTER TABLE "webhook_events" RENAME CONSTRAINT "webhook_event_pkey" TO "webhook_events_pkey";
ALTER TABLE "idempotency_keys" RENAME CONSTRAINT "idempotency_key_pkey" TO "idempotency_keys_pkey";

-- ── CHECK constraints ────────────────────────────────────────────────────
ALTER TABLE "promotions" RENAME CONSTRAINT "promo_nilai_positif" TO "promotions_value_positive";
ALTER TABLE "promotions" RENAME CONSTRAINT "promo_jenis_valid" TO "promotions_type_valid";
ALTER TABLE "promotions" RENAME CONSTRAINT "promo_persen_range" TO "promotions_percent_range";
ALTER TABLE "promotions" RENAME CONSTRAINT "promo_cakupan_valid" TO "promotions_scope_valid";

ALTER TABLE "vouchers" RENAME CONSTRAINT "voucher_nilai_positif" TO "vouchers_value_positive";
ALTER TABLE "vouchers" RENAME CONSTRAINT "voucher_jenis_valid" TO "vouchers_type_valid";
ALTER TABLE "vouchers" RENAME CONSTRAINT "voucher_persen_range" TO "vouchers_percent_range";
ALTER TABLE "vouchers" RENAME CONSTRAINT "voucher_kuota_nonneg" TO "vouchers_quota_nonnegative";
ALTER TABLE "vouchers" RENAME CONSTRAINT "voucher_terpakai_kuota" TO "vouchers_used_quota";

ALTER TABLE "voucher_usages" RENAME CONSTRAINT "voucher_usage_status_valid" TO "voucher_usages_status_valid";
ALTER TABLE "voucher_usages" RENAME CONSTRAINT "voucher_usage_status_konsisten" TO "voucher_usages_restored_consistency";

ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_harga_awal_positif" TO "transactions_initial_price_positive";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_potongan_promo_nonneg" TO "transactions_promotion_discount_nonnegative";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_potongan_voucher_nonneg" TO "transactions_voucher_discount_nonnegative";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_total_positif" TO "transactions_total_positive";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_status_valid" TO "transactions_status_valid";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_konfirmasi_pada" TO "transactions_receipt_confirmed_consistency";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_konfirmasi_oleh" TO "transactions_receipt_confirmed_by_consistency";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_konfirmasi_oleh_valid" TO "transactions_confirmed_by_valid";

ALTER TABLE "payments" RENAME CONSTRAINT "pembayaran_jumlah_positif" TO "payments_amount_positive";
ALTER TABLE "payments" RENAME CONSTRAINT "pembayaran_status_valid" TO "payments_status_valid";
ALTER TABLE "payments" RENAME CONSTRAINT "pembayaran_metode_valid" TO "payments_method_valid";

ALTER TABLE "refunds" RENAME CONSTRAINT "refund_jumlah_fee" TO "refunds_amount_fee_valid";

ALTER TABLE "webhook_events" RENAME CONSTRAINT "webhook_event_status_valid" TO "webhook_events_status_valid";
ALTER TABLE "idempotency_keys" RENAME CONSTRAINT "idempotency_key_status_valid" TO "idempotency_keys_status_valid";

-- ── Foreign keys ─────────────────────────────────────────────────────────
ALTER TABLE "voucher_usages" RENAME CONSTRAINT "voucher_usage_voucher_id_fkey" TO "voucher_usages_voucher_id_fkey";
ALTER TABLE "voucher_usages" RENAME CONSTRAINT "voucher_usage_user_id_fkey" TO "voucher_usages_user_id_fkey";
ALTER TABLE "voucher_usages" RENAME CONSTRAINT "voucher_usage_transaksi_id_fkey" TO "voucher_usages_transaction_id_fkey";

ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_akun_id_fkey" TO "transactions_account_id_fkey";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_pembeli_id_fkey" TO "transactions_buyer_id_fkey";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_promo_id_fkey" TO "transactions_promotion_id_fkey";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_voucher_id_fkey" TO "transactions_voucher_id_fkey";

ALTER TABLE "payments" RENAME CONSTRAINT "pembayaran_transaksi_id_fkey" TO "payments_transaction_id_fkey";

ALTER TABLE "refunds" RENAME CONSTRAINT "refund_pembayaran_id_fkey" TO "refunds_payment_id_fkey";
ALTER TABLE "refunds" RENAME CONSTRAINT "refund_transaksi_id_fkey" TO "refunds_transaction_id_fkey";
ALTER TABLE "refunds" RENAME CONSTRAINT "refund_admin_id_fkey" TO "refunds_admin_id_fkey";

ALTER TABLE "idempotency_keys" RENAME CONSTRAINT "idempotency_key_user_id_fkey" TO "idempotency_keys_user_id_fkey";
ALTER TABLE "idempotency_keys" RENAME CONSTRAINT "idempotency_key_transaksi_id_fkey" TO "idempotency_keys_transaction_id_fkey";

-- ── NOT NULL constraints ─────────────────────────────────────────────────
ALTER TABLE "promotions" RENAME CONSTRAINT "promo_id_not_null" TO "promotions_id_not_null";
ALTER TABLE "promotions" RENAME CONSTRAINT "promo_nama_not_null" TO "promotions_name_not_null";
ALTER TABLE "promotions" RENAME CONSTRAINT "promo_jenis_not_null" TO "promotions_type_not_null";
ALTER TABLE "promotions" RENAME CONSTRAINT "promo_nilai_not_null" TO "promotions_value_not_null";
ALTER TABLE "promotions" RENAME CONSTRAINT "promo_cakupan_not_null" TO "promotions_scope_not_null";
ALTER TABLE "promotions" RENAME CONSTRAINT "promo_mulai_not_null" TO "promotions_starts_at_not_null";
ALTER TABLE "promotions" RENAME CONSTRAINT "promo_berakhir_not_null" TO "promotions_ends_at_not_null";
ALTER TABLE "promotions" RENAME CONSTRAINT "promo_aktif_not_null" TO "promotions_active_not_null";

ALTER TABLE "vouchers" RENAME CONSTRAINT "voucher_id_not_null" TO "vouchers_id_not_null";
ALTER TABLE "vouchers" RENAME CONSTRAINT "voucher_kode_not_null" TO "vouchers_code_not_null";
ALTER TABLE "vouchers" RENAME CONSTRAINT "voucher_jenis_not_null" TO "vouchers_type_not_null";
ALTER TABLE "vouchers" RENAME CONSTRAINT "voucher_nilai_not_null" TO "vouchers_value_not_null";
ALTER TABLE "vouchers" RENAME CONSTRAINT "voucher_kuota_not_null" TO "vouchers_quota_not_null";
ALTER TABLE "vouchers" RENAME CONSTRAINT "voucher_terpakai_not_null" TO "vouchers_used_not_null";
ALTER TABLE "vouchers" RENAME CONSTRAINT "voucher_aktif_not_null" TO "vouchers_active_not_null";
ALTER TABLE "vouchers" RENAME CONSTRAINT "voucher_berlaku_hingga_not_null" TO "vouchers_valid_until_not_null";

ALTER TABLE "voucher_usages" RENAME CONSTRAINT "voucher_usage_voucher_id_not_null" TO "voucher_usages_voucher_id_not_null";
ALTER TABLE "voucher_usages" RENAME CONSTRAINT "voucher_usage_user_id_not_null" TO "voucher_usages_user_id_not_null";
ALTER TABLE "voucher_usages" RENAME CONSTRAINT "voucher_usage_waktu_not_null" TO "voucher_usages_used_at_not_null";
ALTER TABLE "voucher_usages" RENAME CONSTRAINT "voucher_usage_status_not_null" TO "voucher_usages_status_not_null";

ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_id_not_null" TO "transactions_id_not_null";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_kode_not_null" TO "transactions_code_not_null";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_akun_id_not_null" TO "transactions_account_id_not_null";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_pembeli_id_not_null" TO "transactions_buyer_id_not_null";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_harga_awal_not_null" TO "transactions_initial_price_not_null";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_potongan_promo_not_null" TO "transactions_promotion_discount_not_null";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_potongan_voucher_not_null" TO "transactions_voucher_discount_not_null";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_total_not_null" TO "transactions_total_not_null";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_status_not_null" TO "transactions_status_not_null";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_syarat_versi_not_null" TO "transactions_terms_version_not_null";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_syarat_disetujui_pada_not_null" TO "transactions_terms_accepted_at_not_null";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_dikonfirmasi_diterima_not_null" TO "transactions_receipt_confirmed_not_null";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_version_not_null" TO "transactions_version_not_null";
ALTER TABLE "transactions" RENAME CONSTRAINT "transaksi_created_at_not_null" TO "transactions_created_at_not_null";

ALTER TABLE "payments" RENAME CONSTRAINT "pembayaran_id_not_null" TO "payments_id_not_null";
ALTER TABLE "payments" RENAME CONSTRAINT "pembayaran_transaksi_id_not_null" TO "payments_transaction_id_not_null";
ALTER TABLE "payments" RENAME CONSTRAINT "pembayaran_metode_not_null" TO "payments_method_not_null";
ALTER TABLE "payments" RENAME CONSTRAINT "pembayaran_external_id_not_null" TO "payments_external_id_not_null";
ALTER TABLE "payments" RENAME CONSTRAINT "pembayaran_status_not_null" TO "payments_status_not_null";
ALTER TABLE "payments" RENAME CONSTRAINT "pembayaran_jumlah_not_null" TO "payments_amount_not_null";
ALTER TABLE "payments" RENAME CONSTRAINT "pembayaran_expired_at_not_null" TO "payments_expired_at_not_null";
ALTER TABLE "payments" RENAME CONSTRAINT "pembayaran_created_at_not_null" TO "payments_created_at_not_null";

ALTER TABLE "refunds" RENAME CONSTRAINT "refund_id_not_null" TO "refunds_id_not_null";
ALTER TABLE "refunds" RENAME CONSTRAINT "refund_pembayaran_id_not_null" TO "refunds_payment_id_not_null";
ALTER TABLE "refunds" RENAME CONSTRAINT "refund_transaksi_id_not_null" TO "refunds_transaction_id_not_null";
ALTER TABLE "refunds" RENAME CONSTRAINT "refund_jumlah_not_null" TO "refunds_amount_not_null";
ALTER TABLE "refunds" RENAME CONSTRAINT "refund_fee_not_null" TO "refunds_fee_not_null";
ALTER TABLE "refunds" RENAME CONSTRAINT "refund_admin_id_not_null" TO "refunds_admin_id_not_null";
ALTER TABLE "refunds" RENAME CONSTRAINT "refund_refunded_at_not_null" TO "refunds_refunded_at_not_null";
ALTER TABLE "refunds" RENAME CONSTRAINT "refund_created_at_not_null" TO "refunds_created_at_not_null";

ALTER TABLE "webhook_events" RENAME CONSTRAINT "webhook_event_id_not_null" TO "webhook_events_id_not_null";
ALTER TABLE "webhook_events" RENAME CONSTRAINT "webhook_event_jenis_not_null" TO "webhook_events_type_not_null";
ALTER TABLE "webhook_events" RENAME CONSTRAINT "webhook_event_id_dana_masuk_not_null" TO "webhook_events_incoming_fund_id_not_null";
ALTER TABLE "webhook_events" RENAME CONSTRAINT "webhook_event_status_not_null" TO "webhook_events_status_not_null";

ALTER TABLE "idempotency_keys" RENAME CONSTRAINT "idempotency_key_user_id_not_null" TO "idempotency_keys_user_id_not_null";
ALTER TABLE "idempotency_keys" RENAME CONSTRAINT "idempotency_key_key_not_null" TO "idempotency_keys_key_not_null";
ALTER TABLE "idempotency_keys" RENAME CONSTRAINT "idempotency_key_status_not_null" TO "idempotency_keys_status_not_null";
ALTER TABLE "idempotency_keys" RENAME CONSTRAINT "idempotency_key_request_hash_not_null" TO "idempotency_keys_request_hash_not_null";
ALTER TABLE "idempotency_keys" RENAME CONSTRAINT "idempotency_key_berlaku_hingga_not_null" TO "idempotency_keys_valid_until_not_null";
ALTER TABLE "idempotency_keys" RENAME CONSTRAINT "idempotency_key_created_at_not_null" TO "idempotency_keys_created_at_not_null";

-- ── Indexes ──────────────────────────────────────────────────────────────
ALTER INDEX "promo_aktif_mulai_berakhir_idx" RENAME TO "promotions_active_starts_at_ends_at_idx";
ALTER INDEX "voucher_kode_key" RENAME TO "vouchers_code_key";
ALTER INDEX "voucher_usage_transaksi_id_idx" RENAME TO "voucher_usages_transaction_id_idx";
ALTER INDEX "transaksi_pembeli_id_created_at_idx" RENAME TO "transactions_buyer_id_created_at_idx";
ALTER INDEX "transaksi_paid_at_idx" RENAME TO "transactions_paid_at_idx";
ALTER INDEX "transaksi_kode_key" RENAME TO "transactions_code_key";
ALTER INDEX "pembayaran_transaksi_id_idx" RENAME TO "payments_transaction_id_idx";
ALTER INDEX "pembayaran_id_xendit_idx" RENAME TO "payments_xendit_id_idx";
ALTER INDEX "pembayaran_external_id_key" RENAME TO "payments_external_id_key";
ALTER INDEX "refund_pembayaran_id_idx" RENAME TO "refunds_payment_id_idx";
ALTER INDEX "refund_transaksi_id_idx" RENAME TO "refunds_transaction_id_idx";
ALTER INDEX "refund_refunded_at_idx" RENAME TO "refunds_refunded_at_idx";
ALTER INDEX "webhook_event_status_idx" RENAME TO "webhook_events_status_idx";
ALTER INDEX "webhook_event_jenis_id_dana_masuk_key" RENAME TO "webhook_events_type_incoming_fund_id_key";
ALTER INDEX "idempotency_key_created_at_idx" RENAME TO "idempotency_keys_created_at_idx";

-- ── Partial indexes ──────────────────────────────────────────────────────
ALTER INDEX "transaksi_anti_double_buy" RENAME TO "transactions_anti_double_buy";
ALTER INDEX "pembayaran_satu_tagihan_aktif" RENAME TO "payments_one_active_invoice";
ALTER INDEX "pembayaran_dana_masuk_unik" RENAME TO "payments_incoming_fund_unique";
ALTER INDEX "transaksi_expiry_job" RENAME TO "transactions_expiry_job";
ALTER INDEX "transaksi_autoconfirm_job" RENAME TO "transactions_autoconfirm_job";
