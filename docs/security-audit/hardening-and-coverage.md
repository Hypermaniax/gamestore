# Hardening, Positive Controls, and Coverage

## Fixed since audit

- **F-01 (High):** session and challenge tokens are purpose-bound; `readSession()` rejects challenge tokens.
- **TOTP setup token:** forced setup uses an HttpOnly cookie, not a URL/body token.
- **TOTP activation step-up:** `activateTotp()` rejects accounts whose TOTP is already active.
- **Role changes:** self role changes are blocked; role changes bump `tokenVersion` and revoke refresh tokens.
- **Refresh TOTP enforcement:** ADMIN refresh is rejected while `TOTP_WAJIB_ADMIN=true` and TOTP is not active.
- **Reset tokens:** password reset/change and email change spend every pending `RESET` token.
- **Re-auth rate limit:** `changePassword`, `requestEmailChange`, and admin `resetTotp` use the `reauth`/`reauthIp` buckets.
- **Voucher preview rate limit:** checkout preview is rate-limited per user and per IP.
- **Restore permission split:** `restore()` requires `account:write` and `credential:write`.
- **Refresh replay tolerance:** `rotate()` keeps the first `replacedAt` via `COALESCE`, so replays cannot reset the theft-detection deadline.
- **Photo hardening:** the photo cap is enforced server-side and local photo paths must belong to the target account.
- **Deactivation policy:** public account queries require an active game and game type; master mutations invalidate the account catalog cache.
- **Client IP trust:** `X-Forwarded-For`/`X-Real-IP` are ignored unless `TRUST_PROXY_HOPS` declares trusted proxies; resolved values must be valid IPs (`src/lib/client-ip.ts`). See the [addendum](./addendum-2026-11-16.md) for the deferred deployment half.

## Hardening notes

These are not confirmed vulnerabilities. They are source-visible improvements worth making.

- **Credential permission split:** ~~`restore()` uses `account:write`~~ resolved (see above). Remaining: RBAC CRUD does not exist yet, so no runtime editor can create a mismatched role.
- **Soft-delete retention:** soft-deleted accounts keep photo rows/files and encrypted credentials with no purge path. The retention job does not remove uploads.
- **Logout scope:** normal logout revokes only the presented refresh hash; the access JWT remains valid until its 30-minute expiry. `logoutAll` is the full-revocation path.
- **Audit PII split:** `transaction:read` returns reveal IP/UA while `audit:read` is a separate seeded permission. With only the default ADMIN role this has no affected principal, but custom roles should separate them.
- **CSP:** `script-src 'unsafe-inline'` remains. The only inline script is the constant theme bootstrap; a hash, nonce, or external script would allow stricter CSP.
- **Email delivery:** delivery is direct (no queue); SMTP failures are logged, not retried. Bounded retry/queueing with alerting is a future improvement.
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
- The project is **personal/local-only** as of 2026-11-16: deployment-fact leads (#10 deployment half, #12) are deferred in the [addendum](./addendum-2026-11-16.md) rather than fixed; operator checklist items stay pending until a real deployment is planned.
- Local validation was limited to one bounded sandbox harness for the confirmed token-purpose issue plus unit-level tests for the safe-next and client-IP fixes. The other leads were closed by source-level fixes, not end-to-end reproduction.
