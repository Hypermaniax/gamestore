# Deployment & Hardening Produksi

Dokumen ini adalah checklist operasional untuk butir §14 `docs/PLAN.md`. Butir yang
bertanda **operator** memerlukan akses server/DNS dan tidak bisa dibuktikan dari repo.

## 1. Proses aplikasi

- Jalankan `next start` sebagai user non-root `gamestore` lewat `deploy/gamestore.service`
  (`Restart=always`, `MemoryMax=1G`, `NoNewPrivileges`, `ProtectSystem=strict`, `UMask=0077`).
- `EnvironmentFile=/etc/gamestore/gamestore.env`, isi dari `.env.example`; jangan commit nilai rahasia.
- Postgres hanya listen `127.0.0.1`; aplikasi memakai user DML `gamestore_app`, migrasi memakai
  `gamestore_migrate`.
- Secret JWT/AES/Xendit/token darurat disimpan sebagai file read-only `chmod 600`:

```bash
sudo install -d -o root -g gamestore -m 0750 /etc/gamestore
sudo install -o root -g gamestore -m 0600 jwt.secret /etc/gamestore/jwt.secret
sudo install -o root -g gamestore -m 0600 aes-keyring.json /etc/gamestore/aes-keyring.json
sudo install -o root -g gamestore -m 0600 totp-emergency.token /etc/gamestore/totp-emergency.token
```

- Produksi wajib: `APP_BASE_URL=https://...`, `TOTP_WAJIB_ADMIN=true`, `MAIL_HOST`, `MAIL_FROM`,
  `ADMIN_EMAIL`, `XENDIT_CALLBACK_TOKEN`. `instrumentation.ts` menolak startup bila salah satu
  kosong atau `APP_BASE_URL` bukan HTTPS.
- Langkah aman: `npm ci`, `npm run db:seed` (hanya sekali), `npm run build`, lalu pasang unit systemd.

## 2. Header & transport

`next.config.ts` mengirim untuk semua rute:

- CSP: `default-src 'self'`, `script-src 'self' 'unsafe-inline'` (dev juga `'unsafe-eval'`),
  `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal.
- Di produksi: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` dan
  `upgrade-insecure-requests`.
- Reverse proxy wajib HTTPS. Uji dengan `curl -I https://domain` dan cek tidak ada response HTTP.
- **Operator:** aktifkan HSTS preload hanya setelah yakin semua subdomain HTTPS.

## 3. Email

- SMTP dikonfigurasi lewat `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`.
- Tanpa SMTP di development, preview ditulis ke `.next/dev/mail/*.txt` (mode `0600`), bukan log.
- Email gagal dikirim dicatat sebagai event `email.gagal` tanpa alamat lengkap/token; API tetap
  memberi jawaban generik. Alert admin memakai `ADMIN_EMAIL`.
- **Operator:** pasang SPF, DKIM, DMARC untuk domain `MAIL_FROM`; uji dengan
  `dig TXT`, email ke Gmail/Outlook, dan cek header `Authentication-Results`.
- **Operator:** pastikan inbox `ADMIN_EMAIL` menerima alert `NEEDS_REFUND`, `DISPUTED`,
  `DUPLIKAT`, job gagal, webhook menumpuk, dan transaksi `RESERVED` menggantung.

## 4. TOTP admin

- `TOTP_WAJIB_ADMIN=true` di produksi. Admin tanpa TOTP akan dipaksa setup saat login.
- Prosedur darurat (satu-satunya admin kehilangan perangkat + recovery code):

```bash
TOTP_EMERGENCY_TOKEN_FILE=/etc/gamestore/totp-emergency.token \
TOTP_DARURAT_TOKEN="$(sudo cat /etc/gamestore/totp-emergency.token)" \
npm run totp:darurat -- --username superadmin --alasan "perangkat hilang"
```

- Perintah ini mengenolkan secret/status TOTP, mencabut semua sesi + recovery code, menulis audit
  `TOTP_EMERGENCY` (`aktor_id NULL`), dan mengirim email admin. Setelah itu wajib ganti password dan
  setup TOTP ulang. **Uji di staging** sebelum go-live.

## 5. Retensi & PDP

- `RetensiJob` harian (`30 2 * * *`) mengosongkan `webhook_events.raw_payload` setelah 90 hari
  (hanya `DIPROSES`), `idempotency_keys.response_snapshot` setelah 30 hari `KEDALUWARSA`, menghapus
  `refresh_tokens` per family yang seluruhnya kedaluwarsa + 30 hari, dan `email_tokens` + 30 hari.
- Anonimisasi `audit_reveals.ip`/`user_agent` memakai user DDL:

```bash
PDP_KONFIRMASI=ANONIMISASI-AUDIT MIGRATION_DATABASE_URL=... \
  npm run pdp:anonim-audit -- --dry-run
PDP_KONFIRMASI=ANONIMISASI-AUDIT MIGRATION_DATABASE_URL=... \
  npm run pdp:anonim-audit
```

- Penghapusan data pribadi manual (transaksi tetap disimpan tanpa identitas):

```bash
PDP_KONFIRMASI=HAPUS-DATA npm run pdp:hapus -- \
  --identitas "user@example.com" --alasan "permintaan pemilik akun"
```

- Tabel bukti `admin_audit_logs`, `audit_reveals`, `static_page_versions` sudah `REVOKE UPDATE/DELETE`
  dari `gamestore_app` di migration hardening.

## 6. Backup & restore

- `deploy/backup-db.sh` membuat `pg_dump -Fc` dengan izin `0600` + checksum, retensi default 14 hari.
- Pasang `deploy/gamestore-backup.service` + `.timer`; `backup.env` minimal berisi `DATABASE_URL`
  dan `BACKUP_DIR`.
- Simpan backup di host/akun terpisah dari key AES. **Key AES tidak boleh berada di arsip DB.**
- Uji restore berkala ke database sekali pakai:

```bash
RESTORE_TEST_DATABASE_URL=postgresql://.../gamestore_restore_test \
  deploy/restore-test.sh /var/backups/gamestore/gamestore-....dump
```

- **Operator:** uji restore minimal bulanan dan catat hasilnya.

## 7. Health & alert

- `GET /api/v1/health` mengembalikan `200 {"status":"ok"}` atau `503 {"status":"degraded"}` tanpa
  detail internal. Endpoint mengecek koneksi DB + heartbeat job (`settings.job_heartbeat:*`).
- `deploy/healthcheck.sh` untuk systemd timer; pasang juga uptime monitor eksternal ke endpoint.
- Job gagal, webhook `GAGAL` ≥ 20, dan `RESERVED` menggantung > 10 menit memicu alert admin
  (di-throttle 1–6 jam dan dicatat sebagai `ALERT_*` di audit).
- **Operator:** hubungkan alert email ke on-call; pantau `journalctl -u gamestore`.

## 8. Dependency & deploy

- `.github/dependabot.yml` mengaktifkan update npm mingguan (group minor/patch) + GitHub Actions.
- Migration Prisma yang sudah di-apply tidak pernah diedit; perubahan skema = migration baru.
- Jalankan sebelum rilis: `npm run test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **Operator:** isi S&K, kebijakan privasi, garansi/refund, dan jalur CS sengketa dengan teks final
  (bukan placeholder) sebelum go-live.
