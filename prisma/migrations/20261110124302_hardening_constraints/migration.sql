-- Constraint & hardening — sumber: docs/ERD.md §6 (tidak bisa diekspresikan di schema.prisma)
-- Catatan: gamestore_app = user aplikasi (DML-only) di dev/test; prod memakai konvensi nama sama.

-- ═══ 1. CHECK: status & nilai (ERD §6 "CHECK terminal") ═══
ALTER TABLE akun_game ADD CONSTRAINT akun_game_harga_positif CHECK (harga > 0);
ALTER TABLE akun_game ADD CONSTRAINT akun_game_status_valid CHECK (status IN ('DELISTED','AVAILABLE','RESERVED','SOLD'));
ALTER TABLE akun_game ADD CONSTRAINT akun_game_wajib_kredensial CHECK (status NOT IN ('AVAILABLE','RESERVED') OR kredensial_encrypted IS NOT NULL);

ALTER TABLE transaksi ADD CONSTRAINT transaksi_harga_awal_positif CHECK (harga_awal > 0);
ALTER TABLE transaksi ADD CONSTRAINT transaksi_potongan_promo_nonneg CHECK (potongan_promo >= 0);
ALTER TABLE transaksi ADD CONSTRAINT transaksi_potongan_voucher_nonneg CHECK (potongan_voucher >= 0);
ALTER TABLE transaksi ADD CONSTRAINT transaksi_total_positif CHECK (total > 0);
ALTER TABLE transaksi ADD CONSTRAINT transaksi_status_valid CHECK (status IN ('RESERVED','PAID','EXPIRED','FAILED','CANCELLED','NEEDS_REFUND','REFUNDED','DISPUTED'));
ALTER TABLE transaksi ADD CONSTRAINT transaksi_konfirmasi_pada CHECK (dikonfirmasi_diterima = (dikonfirmasi_pada IS NOT NULL));
ALTER TABLE transaksi ADD CONSTRAINT transaksi_konfirmasi_oleh CHECK (dikonfirmasi_diterima = (dikonfirmasi_oleh IS NOT NULL));
ALTER TABLE transaksi ADD CONSTRAINT transaksi_konfirmasi_oleh_valid CHECK (dikonfirmasi_oleh IS NULL OR dikonfirmasi_oleh IN ('PEMBELI','OTOMATIS'));

ALTER TABLE pembayaran ADD CONSTRAINT pembayaran_jumlah_positif CHECK (jumlah > 0);
ALTER TABLE pembayaran ADD CONSTRAINT pembayaran_status_valid CHECK (status IN ('PENDING','PAID','EXPIRED','FAILED','CANCELLED','DUPLIKAT'));
ALTER TABLE pembayaran ADD CONSTRAINT pembayaran_metode_valid CHECK (metode IN ('QRIS','VA'));

ALTER TABLE refund ADD CONSTRAINT refund_jumlah_fee CHECK (jumlah > 0 AND fee >= 0);

ALTER TABLE voucher ADD CONSTRAINT voucher_nilai_positif CHECK (nilai > 0);
ALTER TABLE voucher ADD CONSTRAINT voucher_jenis_valid CHECK (jenis IN ('PERSEN','NOMINAL'));
ALTER TABLE voucher ADD CONSTRAINT voucher_persen_range CHECK (jenis <> 'PERSEN' OR (nilai BETWEEN 1 AND 100));
ALTER TABLE voucher ADD CONSTRAINT voucher_kuota_nonneg CHECK (kuota >= 0);
ALTER TABLE voucher ADD CONSTRAINT voucher_terpakai_kuota CHECK (terpakai BETWEEN 0 AND kuota);

ALTER TABLE voucher_usage ADD CONSTRAINT voucher_usage_status_valid CHECK (status IN ('TERPAKAI','DIPULIHKAN'));
ALTER TABLE voucher_usage ADD CONSTRAINT voucher_usage_status_konsisten CHECK ((status = 'DIPULIHKAN') = (dipulihkan_pada IS NOT NULL));

ALTER TABLE promo ADD CONSTRAINT promo_nilai_positif CHECK (nilai > 0);
ALTER TABLE promo ADD CONSTRAINT promo_jenis_valid CHECK (jenis IN ('PERSEN','NOMINAL'));
ALTER TABLE promo ADD CONSTRAINT promo_persen_range CHECK (jenis <> 'PERSEN' OR (nilai BETWEEN 1 AND 100));
ALTER TABLE promo ADD CONSTRAINT promo_cakupan_valid CHECK (cakupan IN ('AKUN','GAME','SEMUA'));

ALTER TABLE webhook_event ADD CONSTRAINT webhook_event_status_valid CHECK (status IN ('DITERIMA','DIPROSES','GAGAL'));
ALTER TABLE idempotency_key ADD CONSTRAINT idempotency_key_status_valid CHECK (status IN ('PROCESSING','SELESAI','KEDALUWARSA'));

-- ═══ 2. Partial unique index (anti double-buy, satu tagihan aktif, satu tema aktif) ═══
CREATE UNIQUE INDEX transaksi_anti_double_buy ON transaksi (akun_id) WHERE status IN ('RESERVED','PAID','DISPUTED');
CREATE UNIQUE INDEX pembayaran_satu_tagihan_aktif ON pembayaran (transaksi_id) WHERE status = 'PENDING';
CREATE UNIQUE INDEX pembayaran_dana_masuk_unik ON pembayaran (id_dana_masuk) WHERE id_dana_masuk IS NOT NULL;
CREATE UNIQUE INDEX tema_satu_aktif ON tema ((1)) WHERE aktif = true;

-- ═══ 3. Unique case-insensitive (users) ═══
CREATE UNIQUE INDEX users_email_ci ON users (lower(email));
CREATE UNIQUE INDEX users_username_ci ON users (lower(username));

-- ═══ 4. Partial index job & katalog ═══
CREATE INDEX transaksi_expiry_job ON transaksi (expired_at) WHERE status = 'RESERVED';
CREATE INDEX transaksi_autoconfirm_job ON transaksi (garansi_mulai) WHERE status = 'PAID' AND dikonfirmasi_diterima = false;
CREATE INDEX akun_game_katalog ON akun_game (status, game_id) WHERE dihapus_pada IS NULL;

-- ═══ 5. Full-text search: generated column + GIN (ERD §3.2 / §6) ═══
ALTER TABLE akun_game ADD COLUMN cari tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(judul, '') || ' ' || coalesce(deskripsi, ''))) STORED;
CREATE INDEX akun_game_cari_gin ON akun_game USING GIN (cari);
CREATE INDEX akun_game_atribut_gin ON akun_game USING GIN (atribut);

-- ═══ 6. Append-only audit (ERD §6 baris terakhir): user aplikasi hanya INSERT/SELECT ═══
REVOKE UPDATE, DELETE ON admin_audit_log, audit_reveal, halaman_statis_versi FROM gamestore_app;
