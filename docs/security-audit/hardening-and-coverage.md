# Hardening, Positive Controls, and Coverage

## Fixed since audit

- **F-01 (High):** session and challenge tokens are purpose-bound; `readSession()` rejects challenge tokens.
- **TOTP setup token:** forced setup uses an HttpOnly cookie, not a URL/body token.
- **TOTP activation step-up:** `activateTotp()` rejects accounts whose TOTP is already active.
- **Role changes:** self role changes are blocked; role changes bump `tokenVersion` and revoke refresh tokens.
- **Refresh TOTP enforcement:** ADMIN refresh is rejected while `TOTP_WAJIB_ADMIN=true` and TOTP is not active.
- **Reset tokens:** password reset/change and email change spend every pending `RESET` token.

## Hardening notes

These are not confirmed vulnerabilities. They are source-visible improvements worth making.

- **Refresh replay tolerance reset:** `refresh()` only revokes when `now - replacedAt > REFRESH_TOLERANCE_MS`, while `rotate()` rewrites `replacedAt` on every call. Replaying the same parent within 30 seconds resets the detection deadline. The only caller is not wired into the current client build, so this is latent.
- **Credential permission split:** `restore()` uses `account:write` for a credential write; align it with `credential:write`.
- **Photo namespace and count:** `addPhoto` accepts local paths without comparing the embedded account ID to the submitted account ID, and the empty `FOTO_DOMAIN_WHITELIST` means allow-all. `MAX_PHOTO_COUNT` is client-only; `countActivePhotos` is unused server-side.
- **Soft-delete retention:** soft-deleted accounts keep photo rows/files and encrypted credentials with no purge path. The retention job does not remove uploads.
- **Logout scope:** normal logout revokes only the presented refresh hash; the access JWT remains valid until its 30-minute expiry. `logoutAll` is the full-revocation path.
- **Audit PII split:** `transaction:read` returns reveal IP/UA while `audit:read` is a separate seeded permission. With only the default ADMIN role this has no affected principal, but custom roles should separate them.
- **CSP:** `script-src 'unsafe-inline'` remains. The only inline script is the constant theme bootstrap; a hash, nonce, or external script would allow stricter CSP.
- **Email queue backpressure:** the in-process queue has no cap or drop policy; registration/resend are rate-limited, but a bounded queue with alerting is safer.
- **Deleted-game policy:** public game/type readers filter `active`, but account reads and `catalog:akun` do not. This is listed as a needs-validation lead because the intended policy is not explicit.
- **Supply chain:** `shadcn` and `cn` are runtime dependencies despite CLI/utility use; there is no application CI workflow beyond Dependabot. Lockfile integrity is complete.

## Positive source patterns

- Buyer order reads and mutations are scoped by `buyerId`; repository tests cover cross-buyer lookups.
- Admin mutation services consistently call `requirePermission`; the panel layout adds an ADMIN role gate.
- Prisma and tagged raw SQL are parameterized; no unsafe dynamic SQL, shell execution, or `eval` found.
- Markdown rendering uses `react-markdown` + `rehype-sanitize`; no alternate raw-HTML sink found.
- TOTP login consumes time steps atomically; recovery codes are hashed and one-time; admin TOTP reset requires the actor password.
- Password reset and email-change tokens are random, hashed, expiring, and session revocation is transactional.
- Cookie flags, CSRF-relevant SameSite, security headers, frame denial, HSTS, and systemd isolation are present.
- Seed grants all permissions only to ADMIN; PEMBELI receives none.

## Coverage summary

- **Total ledger units:** 47
- **Covered:** 29
- **Candidate / validated records:** 13
- **Out of scope:** 5 payment-gateway units
- **Confirmed:** 1
- **Needs validation:** 12
- **Rejected:** 0

### Scope exclusions

The unfinished payment gateway/Xendit integration was excluded by user request: provider initiation, webhook settlement, payment/webhook/refund/idempotency persistence, webhook controller/route, and gateway branches inside transaction/jobs code.

Buyer order ownership and general transaction authorization remain in scope where they do not require gateway completion.

### Coverage limits

- This is a **partial pass**. The final coverage-critic pass after wave 4 did not complete.
- A prior prose audit exists at `docs/security-audit.md` for `b2f4429`; no compatible prior ledger existed.
- Deployment facts still needing owner observation include reverse-proxy `X-Forwarded-For` handling, actual role grants, `/proc` restrictions, and production secret-file contents. `TOTP_WAJIB_ADMIN=true` is now set in the local environment; production should set it in `/etc/gamestore/gamestore.env`.
- Local validation was limited to one bounded sandbox harness for the confirmed token-purpose issue. The other leads need a disposable database, running app, browser, or host observation.
