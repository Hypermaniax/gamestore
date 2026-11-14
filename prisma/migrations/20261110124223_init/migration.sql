-- CreateTable
CREATE TABLE "role" (
    "id" BIGSERIAL NOT NULL,
    "kode" VARCHAR(50) NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "email_terverifikasi" BOOLEAN NOT NULL DEFAULT false,
    "password_hash" VARCHAR(255) NOT NULL,
    "role_id" BIGINT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "totp_secret_encrypted" BYTEA,
    "totp_key_version" VARCHAR(20),
    "totp_langkah_terakhir" BIGINT,
    "totp_aktif" BOOLEAN NOT NULL DEFAULT false,
    "totp_gagal" INTEGER NOT NULL DEFAULT 0,
    "totp_terkunci_hingga" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu" (
    "id" BIGSERIAL NOT NULL,
    "kode" VARCHAR(50) NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "ikon" VARCHAR(50),
    "urutan" INTEGER NOT NULL,
    "parent_id" BIGINT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" BIGSERIAL NOT NULL,
    "kode" VARCHAR(100) NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_menu" (
    "role_id" BIGINT NOT NULL,
    "menu_id" BIGINT NOT NULL,
    "dicabut_pada" TIMESTAMPTZ(6),

    CONSTRAINT "role_menu_pkey" PRIMARY KEY ("role_id","menu_id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "role_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "dicabut_pada" TIMESTAMPTZ(6),

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "jenis_game" (
    "id" BIGSERIAL NOT NULL,
    "kode" VARCHAR(20) NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "jenis_game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game" (
    "id" BIGSERIAL NOT NULL,
    "kode" VARCHAR(50) NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "jenis_id" BIGINT NOT NULL,
    "ikon_url" VARCHAR(500),
    "skema_atribut" JSONB NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "akun_game" (
    "id" BIGSERIAL NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "game_id" BIGINT NOT NULL,
    "judul" VARCHAR(200) NOT NULL,
    "deskripsi" TEXT,
    "harga" DECIMAL(14,0) NOT NULL,
    "atribut" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DELISTED',
    "kredensial_encrypted" BYTEA,
    "key_version" VARCHAR(20),
    "dilist_pada" TIMESTAMPTZ(6),
    "dihapus_pada" TIMESTAMPTZ(6),
    "admin_id" BIGINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "akun_game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "akun_foto" (
    "id" BIGSERIAL NOT NULL,
    "akun_id" BIGINT NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "urutan" INTEGER NOT NULL,
    "dihapus_pada" TIMESTAMPTZ(6),

    CONSTRAINT "akun_foto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo" (
    "id" BIGSERIAL NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "jenis" VARCHAR(20) NOT NULL,
    "nilai" DECIMAL(14,2) NOT NULL,
    "maks_potongan" DECIMAL(14,0),
    "cakupan" VARCHAR(10) NOT NULL,
    "target_id" BIGINT,
    "mulai" TIMESTAMPTZ(6) NOT NULL,
    "berakhir" TIMESTAMPTZ(6) NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "promo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher" (
    "id" BIGSERIAL NOT NULL,
    "kode" VARCHAR(50) NOT NULL,
    "jenis" VARCHAR(20) NOT NULL,
    "nilai" DECIMAL(14,2) NOT NULL,
    "kuota" INTEGER NOT NULL,
    "terpakai" INTEGER NOT NULL DEFAULT 0,
    "min_belanja" DECIMAL(14,0),
    "maks_potongan" DECIMAL(14,0),
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "berlaku_hingga" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_usage" (
    "voucher_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "transaksi_id" BIGINT,
    "waktu" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'TERPAKAI',
    "dipulihkan_pada" TIMESTAMPTZ(6),

    CONSTRAINT "voucher_usage_pkey" PRIMARY KEY ("voucher_id","user_id")
);

-- CreateTable
CREATE TABLE "transaksi" (
    "id" BIGSERIAL NOT NULL,
    "kode" VARCHAR(50) NOT NULL,
    "akun_id" BIGINT NOT NULL,
    "pembeli_id" BIGINT NOT NULL,
    "harga_awal" DECIMAL(14,0) NOT NULL,
    "promo_id" BIGINT,
    "potongan_promo" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "voucher_id" BIGINT,
    "potongan_voucher" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,0) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'RESERVED',
    "catatan" TEXT,
    "syarat_versi" INTEGER NOT NULL,
    "syarat_disetujui_pada" TIMESTAMPTZ(6) NOT NULL,
    "dikonfirmasi_diterima" BOOLEAN NOT NULL DEFAULT false,
    "dikonfirmasi_pada" TIMESTAMPTZ(6),
    "dikonfirmasi_oleh" VARCHAR(10),
    "reveal_hingga" TIMESTAMPTZ(6),
    "garansi_mulai" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),

    CONSTRAINT "transaksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pembayaran" (
    "id" BIGSERIAL NOT NULL,
    "transaksi_id" BIGINT NOT NULL,
    "metode" VARCHAR(10) NOT NULL,
    "external_id" VARCHAR(80) NOT NULL,
    "id_xendit" VARCHAR(80),
    "id_dana_masuk" VARCHAR(120),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "referensi" VARCHAR(255),
    "jumlah" DECIMAL(14,0) NOT NULL,
    "expired_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund" (
    "id" BIGSERIAL NOT NULL,
    "pembayaran_id" BIGINT NOT NULL,
    "transaksi_id" BIGINT NOT NULL,
    "jumlah" DECIMAL(14,0) NOT NULL,
    "fee" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "ref" VARCHAR(120),
    "catatan" TEXT,
    "admin_id" BIGINT NOT NULL,
    "refunded_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_event" (
    "id" BIGSERIAL NOT NULL,
    "jenis" VARCHAR(30) NOT NULL,
    "id_dana_masuk" VARCHAR(120) NOT NULL,
    "payload_mentah" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DITERIMA',
    "diproses_pada" TIMESTAMPTZ(6),

    CONSTRAINT "webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_key" (
    "user_id" BIGINT NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "transaksi_id" BIGINT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
    "request_hash" VARCHAR(64) NOT NULL,
    "respons_status" INTEGER,
    "respons_snapshot" JSONB,
    "berlaku_hingga" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_key_pkey" PRIMARY KEY ("user_id","key")
);

-- CreateTable
CREATE TABLE "audit_reveal" (
    "id" BIGSERIAL NOT NULL,
    "transaksi_id" BIGINT NOT NULL,
    "pembeli_id" BIGINT NOT NULL,
    "waktu" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" INET,
    "user_agent" VARCHAR(300),

    CONSTRAINT "audit_reveal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tema" (
    "id" BIGSERIAL NOT NULL,
    "kode" VARCHAR(30) NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "token" JSONB NOT NULL,
    "logo_url" VARCHAR(500),
    "banner_url" VARCHAR(500),
    "aktif" BOOLEAN NOT NULL DEFAULT false,
    "is_system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "halaman_statis" (
    "id" BIGSERIAL NOT NULL,
    "kode" VARCHAR(50) NOT NULL,
    "judul" VARCHAR(200) NOT NULL,
    "isi_markdown" TEXT NOT NULL,
    "versi" INTEGER NOT NULL DEFAULT 0,
    "diubah_pada" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "halaman_statis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "halaman_statis_versi" (
    "halaman_id" BIGINT NOT NULL,
    "versi" INTEGER NOT NULL,
    "judul" VARCHAR(200) NOT NULL,
    "isi_markdown" TEXT NOT NULL,
    "diterbitkan_pada" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diterbitkan_oleh" BIGINT NOT NULL,

    CONSTRAINT "halaman_statis_versi_pkey" PRIMARY KEY ("halaman_id","versi")
);

-- CreateTable
CREATE TABLE "email_token" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "jenis" VARCHAR(30) NOT NULL,
    "email_baru" VARCHAR(255),
    "hash_token" VARCHAR(64) NOT NULL,
    "berlaku_hingga" TIMESTAMPTZ(6) NOT NULL,
    "dipakai_pada" TIMESTAMPTZ(6),

    CONSTRAINT "email_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" BIGSERIAL NOT NULL,
    "aktor_id" BIGINT,
    "aksi" VARCHAR(80) NOT NULL,
    "target" VARCHAR(150) NOT NULL,
    "detail" JSONB,
    "waktu" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "hash" VARCHAR(64) NOT NULL,
    "family_id" UUID NOT NULL,
    "diganti_pada" TIMESTAMPTZ(6),
    "diganti_dengan" BIGINT,
    "perangkat" VARCHAR(150),
    "kedaluwarsa" TIMESTAMPTZ(6) NOT NULL,
    "dicabut" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users_totp_recovery" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "hash" VARCHAR(64) NOT NULL,
    "dipakai_pada" TIMESTAMPTZ(6),
    "dicabut_pada" TIMESTAMPTZ(6),

    CONSTRAINT "users_totp_recovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengaturan" (
    "kunci" VARCHAR(60) NOT NULL,
    "nilai" VARCHAR(500),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,

    CONSTRAINT "pengaturan_pkey" PRIMARY KEY ("kunci")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_kode_key" ON "role"("kode");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "menu_parent_id_idx" ON "menu"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_kode_key" ON "menu"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "permission_kode_key" ON "permission"("kode");

-- CreateIndex
CREATE INDEX "role_menu_menu_id_idx" ON "role_menu"("menu_id");

-- CreateIndex
CREATE INDEX "role_permission_permission_id_idx" ON "role_permission"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "jenis_game_kode_key" ON "jenis_game"("kode");

-- CreateIndex
CREATE INDEX "game_jenis_id_idx" ON "game"("jenis_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_kode_key" ON "game"("kode");

-- CreateIndex
CREATE INDEX "akun_game_game_id_idx" ON "akun_game"("game_id");

-- CreateIndex
CREATE INDEX "akun_game_admin_id_idx" ON "akun_game"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "akun_game_slug_key" ON "akun_game"("slug");

-- CreateIndex
CREATE INDEX "akun_foto_akun_id_urutan_idx" ON "akun_foto"("akun_id", "urutan");

-- CreateIndex
CREATE INDEX "promo_aktif_mulai_berakhir_idx" ON "promo"("aktif", "mulai", "berakhir");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_kode_key" ON "voucher"("kode");

-- CreateIndex
CREATE INDEX "voucher_usage_transaksi_id_idx" ON "voucher_usage"("transaksi_id");

-- CreateIndex
CREATE INDEX "transaksi_pembeli_id_created_at_idx" ON "transaksi"("pembeli_id", "created_at");

-- CreateIndex
CREATE INDEX "transaksi_paid_at_idx" ON "transaksi"("paid_at");

-- CreateIndex
CREATE UNIQUE INDEX "transaksi_kode_key" ON "transaksi"("kode");

-- CreateIndex
CREATE INDEX "pembayaran_transaksi_id_idx" ON "pembayaran"("transaksi_id");

-- CreateIndex
CREATE INDEX "pembayaran_id_xendit_idx" ON "pembayaran"("id_xendit");

-- CreateIndex
CREATE UNIQUE INDEX "pembayaran_external_id_key" ON "pembayaran"("external_id");

-- CreateIndex
CREATE INDEX "refund_pembayaran_id_idx" ON "refund"("pembayaran_id");

-- CreateIndex
CREATE INDEX "refund_transaksi_id_idx" ON "refund"("transaksi_id");

-- CreateIndex
CREATE INDEX "refund_refunded_at_idx" ON "refund"("refunded_at");

-- CreateIndex
CREATE INDEX "webhook_event_status_idx" ON "webhook_event"("status");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_event_jenis_id_dana_masuk_key" ON "webhook_event"("jenis", "id_dana_masuk");

-- CreateIndex
CREATE INDEX "idempotency_key_created_at_idx" ON "idempotency_key"("created_at");

-- CreateIndex
CREATE INDEX "audit_reveal_transaksi_id_idx" ON "audit_reveal"("transaksi_id");

-- CreateIndex
CREATE UNIQUE INDEX "tema_kode_key" ON "tema"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "halaman_statis_kode_key" ON "halaman_statis"("kode");

-- CreateIndex
CREATE INDEX "email_token_user_id_idx" ON "email_token"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_token_hash_token_key" ON "email_token"("hash_token");

-- CreateIndex
CREATE INDEX "admin_audit_log_aktor_id_waktu_idx" ON "admin_audit_log"("aktor_id", "waktu");

-- CreateIndex
CREATE INDEX "refresh_token_user_id_family_id_idx" ON "refresh_token"("user_id", "family_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_hash_key" ON "refresh_token"("hash");

-- CreateIndex
CREATE INDEX "users_totp_recovery_user_id_idx" ON "users_totp_recovery"("user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu" ADD CONSTRAINT "menu_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_menu" ADD CONSTRAINT "role_menu_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_menu" ADD CONSTRAINT "role_menu_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game" ADD CONSTRAINT "game_jenis_id_fkey" FOREIGN KEY ("jenis_id") REFERENCES "jenis_game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "akun_game" ADD CONSTRAINT "akun_game_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "akun_game" ADD CONSTRAINT "akun_game_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "akun_foto" ADD CONSTRAINT "akun_foto_akun_id_fkey" FOREIGN KEY ("akun_id") REFERENCES "akun_game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_usage" ADD CONSTRAINT "voucher_usage_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_usage" ADD CONSTRAINT "voucher_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_usage" ADD CONSTRAINT "voucher_usage_transaksi_id_fkey" FOREIGN KEY ("transaksi_id") REFERENCES "transaksi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_akun_id_fkey" FOREIGN KEY ("akun_id") REFERENCES "akun_game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_pembeli_id_fkey" FOREIGN KEY ("pembeli_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_promo_id_fkey" FOREIGN KEY ("promo_id") REFERENCES "promo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran" ADD CONSTRAINT "pembayaran_transaksi_id_fkey" FOREIGN KEY ("transaksi_id") REFERENCES "transaksi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_pembayaran_id_fkey" FOREIGN KEY ("pembayaran_id") REFERENCES "pembayaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_transaksi_id_fkey" FOREIGN KEY ("transaksi_id") REFERENCES "transaksi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_key" ADD CONSTRAINT "idempotency_key_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_key" ADD CONSTRAINT "idempotency_key_transaksi_id_fkey" FOREIGN KEY ("transaksi_id") REFERENCES "transaksi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_reveal" ADD CONSTRAINT "audit_reveal_transaksi_id_fkey" FOREIGN KEY ("transaksi_id") REFERENCES "transaksi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_reveal" ADD CONSTRAINT "audit_reveal_pembeli_id_fkey" FOREIGN KEY ("pembeli_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halaman_statis_versi" ADD CONSTRAINT "halaman_statis_versi_halaman_id_fkey" FOREIGN KEY ("halaman_id") REFERENCES "halaman_statis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halaman_statis_versi" ADD CONSTRAINT "halaman_statis_versi_diterbitkan_oleh_fkey" FOREIGN KEY ("diterbitkan_oleh") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_token" ADD CONSTRAINT "email_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_aktor_id_fkey" FOREIGN KEY ("aktor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_diganti_dengan_fkey" FOREIGN KEY ("diganti_dengan") REFERENCES "refresh_token"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_totp_recovery" ADD CONSTRAINT "users_totp_recovery_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengaturan" ADD CONSTRAINT "pengaturan_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
