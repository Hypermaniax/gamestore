# Needs Validation

These are source-grounded leads, not confirmed vulnerabilities. They have no assigned severity.

| # | Lead | Area | Decisive blocker |
|---|---|---|---|
| 1 | Forced TOTP setup token in URL | MFA enrollment | Whether the setup URL is exposed via logs, history, Referer, or sharing |
| 2 | Self-promotion to ADMIN | RBAC | Whether a non-ADMIN role holds `user:manage` |
| 3 | Refresh bypasses TOTP requirement | MFA / session | Whether a promoted user retains a live refresh token |
| 4 | `activateTotp` rotates recovery codes without step-up | MFA enrollment | Needs active-TOTP dummy account and encrypted secret |
| 5 | Reset token survives password/email change | Account recovery | Needs disposable DB and token lifecycle test |
| 6 | Re-auth lacks rate limit and exposes password oracle | Authentication | Needs authenticated dummy session and bcrypt fixture |
| 7 | Voucher preview lacks rate limit | Business logic | Whether proxy/platform limits cover the action and code entropy |
| 8 | Restore writes credentials with only `account:write` | Authorization | Whether a custom role holds `account:write` without `credential:write` |
| 9 | Deactivated game/type leaves public account copies | Data lifecycle | Intended policy and running cache/DB behavior |
| 10 | Client IP trusts unvalidated `X-Forwarded-For` | HTTP trust | Reverse-proxy behavior and direct-reachability |
| 11 | Verify-email `next` open redirect | Client navigation | Browser navigation and proxy query normalization |
| 12 | DB credential in backup/restore argv | Secret lifecycle | Local-user model, `/proc` restrictions, backup role privilege |

## 1. Forced TOTP setup token is placed in the URL and remains reusable

**Status:** Fixed in working tree 2026-11-16: the setup challenge is stored in an HttpOnly cookie, is never accepted from the URL or client body, and is cleared after activation.

**Fingerprint:** `auth/totp-setup-bearer-token-in-url`

**Trace:** `src/controllers/auth.controller.ts:154` → `src/lib/session.ts:104` → `app/(public)/(auth)/totp/setup/page.tsx:12` → `src/services/auth.service.ts:130` → `src/services/auth.service.ts:697`

**Claimed root cause:** The `totp-setup` challenge is used as a bearer credential in a query string instead of a short-lived, one-time, server-bound setup session. `saveSetupSecret` can overwrite the pending secret, and `activateTotp` issues a session using only that token.

**Blockers:**
- Whether the setup URL is exposed to a lower-trust party is not source-visible.
- Browser history, Referer, proxy access logs, and URL sharing must be observed.
- The deployment `TOTP_WAJIB_ADMIN` value and forced-onboarding behavior must be confirmed.

**Resolution plan:**
- **Local:** exercise `resolveTotpActor`, `setupTotp`, and `activateTotp` twice with the same dummy `totp-setup` token and observe that it remains accepted.
- **Deployment:** owner reviews proxy logs for `/totp/setup?token=`, browser/Referer exposure, and the `TOTP_WAJIB_ADMIN` setting.

## 2. Self-promotion to ADMIN for holders of `user:manage`

**Status:** Fixed in working tree 2026-11-16: self role changes are blocked and every role change bumps `tokenVersion` and revokes the target's refresh tokens.

**Fingerprint:** `user-admin/changeRole-self-promotion`

**Trace:** `src/controllers/admin-user.controller.ts:20` → `src/services/user-admin.service.ts:79` → `src/services/user-admin.service.ts:93` → `src/repositories/user-repo.ts:104` → `src/services/auth.service.ts:850`

**Claimed root cause:** The self guard only rejects role codes that are not `ADMIN`, so a user can assign `ADMIN` to their own account. `updateRole` does not invalidate sessions.

**Blockers:**
- The target database role/permission state is unavailable.
- No source-visible non-ADMIN role holds `user:manage`.
- Exploit requires a custom DB grant or another deployed role.

**Resolution plan:**
- **Local:** create a dummy non-ADMIN role with `user:manage`, promote self to `ADMIN`, re-authenticate, and observe the new role.
- **Deployment:** query `role_permissions` for non-ADMIN roles holding `user:manage` and review self-target role-change audit rows.

## 3. Refresh bypasses TOTP requirement

**Status:** Fixed in working tree 2026-11-16: `refresh()` refuses ADMIN sessions while `TOTP_WAJIB_ADMIN=true` and TOTP is not active; role changes also revoke the target's sessions.

**Fingerprint:** `auth.totp-wajib-admin-refresh-bypass`

**Trace:** `src/controllers/auth.controller.ts:47` → `src/services/user-admin.service.ts:102` → `src/services/auth.service.ts:809` → `app/(secret)/panel/layout.tsx:9`

**Claimed root cause:** `TOTP_WAJIB_ADMIN` is enforced only at login/setup. `refresh()` reissues a session from the current DB role without checking `totpActive`, and role changes do not revoke refresh tokens.

**Blockers:**
- A user with a live refresh token must actually be promoted to ADMIN.
- The deployment `TOTP_WAJIB_ADMIN` value must be confirmed.
- Refresh-token and audit state around role changes must be observed.

**Resolution plan:**
- **Local:** promote a dummy user with a live refresh token, call refresh, and verify an ADMIN session is issued while `totpActive=false`.
- **Deployment:** verify the flag, role-change audit rows, and whether refresh tokens were revoked before refresh.

## 4. `activateTotp` rotates recovery codes without password step-up

**Status:** Fixed in working tree 2026-11-16: `activateTotp` rejects accounts whose TOTP is already active; recovery-code rotation must use the password-gated `regenerateRecoveryCodes` path.

**Fingerprint:** `auth.totp.activate-recovery-codes-no-step-up`

**Trace:** `src/controllers/auth.controller.ts:87` → `src/services/auth.service.ts:682` → `src/services/auth.service.ts:691` → `src/repositories/totp-repo.ts:33`

**Claimed root cause:** `activateTotp` is reachable for already-active TOTP users from a plain session. It skips the password check used by `regenerateRecoveryCodes` and verifies without `afterTimeStep` before overwriting `totpLastStep` and rotating recovery codes.

**Blockers:**
- No live instance or TOTP-active test account with a real encrypted secret is available.
- Demonstrating replay-state change needs a consumed step and controlled clock windows.
- TOTP encryption keys and fixtures require an owner-provided staging environment.

**Resolution plan:**
- **Local:** consume a step, then call `activateTotp` with the same code and a plain session; observe new recovery codes and `totpLastStep` overwrite.
- **Deployment:** use a controlled TOTP-enabled staging account, retain one code, invoke activation without a password, and confirm new recovery codes.

## 5. Reset token survives password/email change

**Status:** Fixed in working tree 2026-11-16: password reset, password change, and email change all spend every pending `RESET` token in the same transaction.

**Fingerprint:** `auth.service.credential-change-leaves-reset-token-valid`

**Trace:** `src/controllers/auth.controller.ts:63` → `src/services/auth.service.ts:378` → `src/repositories/email-token-repo.ts:26` → `src/repositories/email-token-repo.ts:34`

**Claimed root cause:** Password and email changes do not invalidate live RESET rows, and `resetPassword` does not bind the token to the current email or tokenVersion. A pre-change reset link remains redeemable for up to one hour.

**Blockers:**
- No disposable PostgreSQL or running app is available.
- The integration harness drops the configured schema.
- Token rows and timestamps are required for end-to-end reproduction.

**Resolution plan:**
- **Local:** request a reset, change the password/email, then redeem the old reset token and observe whether it still succeeds.
- **Deployment:** use staging and controlled test mailboxes to attempt the old link within one hour.

## 6. Re-authentication lacks rate limiting and exposes a password oracle

**Status:** Fixed in working tree 2026-11-16: `changePassword`, `requestEmailChange`, and admin `resetTotp` now run the `reauth`/`reauthIp` buckets before the password comparison, so repeated wrong passwords hit the same `TOO_MANY_REQUESTS` contract as login.

**Fingerprint:** `auth.service.password-reauth-no-rate-limit-oracle`

**Trace:** `src/controllers/auth.controller.ts:71` → `src/services/auth.service.ts:428` → `src/services/auth.service.ts:437` → `src/services/auth.service.ts:440`

**Claimed root cause:** `changePassword`, `requestEmailChange`, and `resetTotp` compare the current password with bcrypt but never call `guardRateLimit`. `requestEmailChange` returns `EMAIL_SAME` only after a correct password, creating a state-neutral oracle.

**Blockers:**
- Requires an authenticated dummy session.
- Requires a real bcrypt hash and correct/incorrect password fixture.
- `resetTotp` needs a test account holding `totp:reset`.

**Resolution plan:**
- **Local:** submit wrong passwords above the login threshold to `requestEmailChange` with the current email, then the correct password; assert no `TOO_MANY_REQUESTS` and that only the correct attempt returns `EMAIL_SAME`.
- **Deployment:** repeat with staging buyer/admin accounts.

## 7. Voucher preview lacks rate limiting

**Status:** Fixed in working tree 2026-11-16: `preview` runs the `voucherPreview`/`voucherPreviewIp` buckets after session verification and before any account/voucher lookup.

**Fingerprint:** `src/services/voucher.service.ts:preview:missing-rate-limit`

**Trace:** `src/controllers/discount.controller.ts:55` → `src/services/voucher.service.ts:229` → `src/services/voucher.service.ts:248` → `src/services/voucher.service.ts:198` → `src/services/voucher.service.ts:200`

**Claimed root cause:** `preview` omits `guardRateLimit`, and `RATE_LIMITS` has no preview bucket. Caller-controlled voucher lookups return distinguishable invalid/used/exhausted/minimum outcomes.

**Blockers:**
- Whether a reverse proxy or hosting-platform rate limit covers the action is a deployment fact.
- The base seed creates no vouchers, and code entropy is operator-supplied.

**Resolution plan:**
- **Local:** call preview repeatedly with invalid/used/exhausted/below-minimum codes and assert `guardRateLimit` is never called.
- **Deployment:** submit a series of invalid and known used/exhausted codes from a verified staging buyer.

## 8. Account restore writes credentials with only `account:write`

**Status:** Fixed in working tree 2026-11-16: `restore` now requires both `account:write` and `credential:write`, matching the documented permission matrix.

**Fingerprint:** `account.service.restore.credential-write-bypass`

**Trace:** `src/controllers/account.controller.ts:65` → `src/services/account.service.ts:388` → `src/services/account.service.ts:399` → `src/repositories/account-repo.ts:293`

**Claimed root cause:** `restore` authorizes only `account:write` before writing new credentials. `setCredentials` requires `credential:write`, and the docs require both for restore.

**Blockers:**
- The base seed has no principal with `account:write` but not `credential:write`.
- No RBAC CRUD controller exists.
- A runtime demonstration needs a disposable DB, custom role, dummy user, and SOLD account.

**Resolution plan:**
- **Local:** create a custom role with `account:write` only, authenticate a dummy user, invoke restore, and verify the credentials change while `setCredentials` is denied.
- **Deployment:** query `role_permissions` for the permission split.

## 9. Deactivated game/type leaves public account copies

**Status:** Fixed in working tree 2026-11-16 (policy decided by the owner): public account queries now require `game.active` and `game.type.active`, and game/type mutations invalidate the `catalog:akun` tag, so deactivated masters hide their accounts from list/detail/search/checkout/sitemap immediately.

**Fingerprint:** `catalog.deactivation-public-account-copy`

**Trace:** `components/storefront/catalog.tsx:122` → `src/lib/cache/catalog.ts:32` → `src/repositories/account-repo.ts:90` → `src/repositories/account-repo.ts:69`

**Claimed root cause:** Deactivation writes `active=false`, but public account reads filter only `status=AVAILABLE` and `deletedAt`, not parent game/type active. `catalog:akun` is not invalidated by catalog mutations.

**Blockers:**
- No disposable DB or running Next build is available.
- The intended policy is not fully explicit in docs.
- Owner confirmation is needed that child accounts must disappear.

**Resolution plan:**
- **Local:** seed an active game/type with an AVAILABLE account, warm both caches, deactivate the game, then re-query list/detail/search/sitemap.
- **Deployment:** confirm the deactivation policy and observe a staging deactivation with test accounts.

## 10. Client IP trusts unvalidated `X-Forwarded-For`

**Status:** Mitigated in working tree 2026-11-16 at the code level: `X-Forwarded-For`/`X-Real-IP` are ignored unless `TRUST_PROXY_HOPS` declares a hop count, and the selected value must be a valid IP (`src/lib/client-ip.ts`). The deployment half (proxy configuration, direct-reachability) is deferred — the project is local-only for now.

**Fingerprint:** `rate-limit.client-ip.forwarded-header-trust`

**Trace:** `src/controllers/transaction.controller.ts:75` → `src/lib/rate-limit.ts:55` → `src/lib/rate-limit.ts:91` → `src/repositories/audit-reveal-repo.ts:11`

**Claimed root cause:** `clientIp()` returns the leftmost `X-Forwarded-For` value verbatim, or `X-Real-IP`, or `unknown`, without IP validation or a trusted-proxy boundary. `reveal` persists it as audit evidence and `guardRateLimit` keys per-IP buckets on it.

**Blockers:**
- Production proxy behavior is not in the repository.
- Whether the app port is directly reachable is a deployment fact.
- Observing the inet failure and bucket-key variation needs a running instance and disposable DB.

**Resolution plan:**
- **Local:** send reveal requests with different `X-Forwarded-For` values, compare audit rows, then omit both headers and observe the inet insert.
- **Deployment:** inspect proxy header handling and confirm the app is bound only to the proxy interface.

## 11. Verify-email `next` open redirect

**Status:** Fixed in working tree 2026-11-16: login and verify-email share `src/lib/safe-next.ts`, which additionally rejects backslashes, C0/DEL control characters, and any value whose resolved origin is not the application.

**Fingerprint:** `verify-email:safeNext:open-redirect`

**Trace:** `app/(public)/(auth)/verify-email/page.tsx:20` → `app/(public)/(auth)/verify-email/page.tsx:11` → `components/verify-email-form.tsx:91` → `node_modules/next/dist/client/components/sequential-router-queue.js:85`

**Claimed root cause:** Verify-email `safeNext` omits the backslash and C0/DEL checks present in login `safeNext`. A decoded backslash/tab value can pass and be rendered as the Continue link; WHATWG URL resolution can produce an off-origin target.

**Blockers:**
- No sandbox/headless browser is available to observe click-to-navigation.
- The deployment reverse proxy may normalize or reject encoded queries.

**Resolution plan:**
- **Local:** request `/%5Cevil.com` and `/%09/evil.com`, confirm the decoded values pass `safeNext`, and check `new URL(decoded, origin)`.
- **Deployment:** use a dummy verified account and an owner-controlled external test origin.

## 12. DB credential in backup/restore process arguments

**Status:** Deferred 2026-11-16 — the project is personal/local-only with no `pg_dump` schedule or server deployment, so the scripts are unused today. Revisit with a `PGPASSFILE` helper plus `ProtectProc` hardening before any real deployment.

**Fingerprint:** `deploy-db-url-in-process-argv`

**Trace:** `deploy/gamestore-backup.service:10` → `deploy/backup-db.sh:7` → `deploy/backup-db.sh:17` → `deploy/restore-test.sh:13`

**Claimed root cause:** The scripts pass the full PostgreSQL connection URI to `pg_dump`, `psql`, and `pg_restore` as command-line arguments. On a default Linux `/proc`, another local principal can read the credential in process argv.

**Blockers:**
- Host principal model and `/proc` restrictions are not in the repo.
- Whether `DATABASE_URL` embeds a password and the backup role privilege are operator-selected.
- No production URL or running backup unit is available.

**Resolution plan:**
- **Local:** run stub sleepers with a dummy URI and inspect `/proc/<pid>/cmdline` from a second non-root account.
- **Deployment:** check `ProtectProc`/`ProcSubset`, `/proc` mount options, and backup role grants without printing the credential.
