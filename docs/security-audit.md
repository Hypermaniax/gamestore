# Security Audit — GameStore

- **Date:** 2026-11-14
- **Source ref:** `b2f4429` (worktree; staged `.agents/skills/security-audit/` files are unrelated to the application)
- **Scope:** `app/`, `src/`, `components/`, `prisma/`, `deploy/`, `next.config.ts`, `instrumentation.ts`, dependency tree
- **Method:** read-only source review plus `npm audit --omit=dev`. No live endpoints or production systems were probed. The application and build were not run.
- **Result:** 1 Critical, 2 Medium, 1 deployment-dependent Medium, 4 Low/Informational. No high-confidence SQL injection, XSS, IDOR, or committed-secret issue was found.

---

## Severity Summary

| ID | Severity | Finding | Confidence |
| --- | --- | --- | --- |
| F-01 | **Critical** | TOTP challenge JWT accepted as a full access session (MFA bypass) | High |
| F-02 | **Medium** | Self-promotion to `ADMIN` and TOTP not enforced on role change/refresh | High (conditional exploit) |
| F-03 | **Medium** | TOTP setup bearer token placed in URL | High (leak-dependent) |
| F-04 | **Medium** | IP rate limiting trusts spoofable `X-Forwarded-For` | High in code; deployment-dependent |
| F-05 | **Low** | Webhook `PAID` can be processed without an amount | High |
| F-06 | **Low** | Missing rate limits on voucher preview and password re-authentication | High |
| F-07 | **Low** | PDP deletion leaves unused email tokens valid | High |
| F-08 | **Informational** | CSP/hardening, dependency advisories, migration credentials in app env | Confirmed |

---

## F-01 — Critical: TOTP challenge JWT is accepted as a full access session

**Locations:**

- `src/lib/session.ts:94-100` — challenge tokens are signed with the same secret and claims as access tokens.
- `src/lib/session.ts:130-142` — `readSession()` never checks the `kind` claim or any token type.
- `src/services/auth.service.ts:447-449` — password-only login returns a `totp2` challenge token.
- `src/services/auth.service.ts:742-749` — `verifySession()` trusts whatever `readSession()` returns.
- `app/(secret)/panel/layout.tsx:9-11` and `app/(secret)/(storefront)/account/page.tsx:16-17` — both rely on `verifySession()`.

**Confidence:** High

### Issue

`createChallengeToken()` adds a `kind` claim, but `readSession()` ignores it. A `totp2` or `totp-setup` challenge token is therefore a valid session JWT. The login response returns the `totp2` token after password verification, before TOTP is checked.

```ts
// src/lib/session.ts:94 — challenge token
return new SignJWT({ kind, uname, rid, rkode, tv } ...)

// src/lib/session.ts:135 — session reader
const verified = await jwtVerify<JwtClaims>(value, loadJwtSecret())
return {
  userId: BigInt(verified.payload.sub!),
  username: verified.payload.uname,
  roleId: BigInt(verified.payload.rid),
  roleKode: verified.payload.rkode,
  tokenVersion: verified.payload.tv,
} // no `kind` check — challenge token is accepted
```

`readChallengeToken()` correctly rejects session tokens because `kind` is missing, but the reverse direction is not checked.

### Impact

Anyone with a valid password — including a credential-stuffing attacker — can bypass TOTP entirely for any TOTP-enabled account. For an `ADMIN`, this gives full panel access without the second factor:

1. Call `loginAction` with the victim's password.
2. Receive `{ jalur: 'perlu-totp', token }`.
3. Send that token as `Cookie: session=<token>` (no session cookie exists at this point).
4. `/account`, `/panel`, and authenticated server actions now accept the challenge token as a session.

### Fix

- Add an explicit token-type claim, e.g. `typ: 'session'` for access tokens and `typ: 'challenge'` for challenge tokens.
- In `readSession()`, reject any token where `typ !== 'session'` (and reject tokens carrying `kind`).
- In `readChallengeToken()`, require `typ === 'challenge'` and the matching `kind`.
- Stronger option: sign challenge tokens with a separate secret or a separate `audience`.
- Add a regression test proving:
  - `createChallengeToken(..., 'totp2')` does not authenticate `verifySession()` or `/account`.
  - `createChallengeToken(..., 'totp-setup')` does not authenticate as a session.
  - `createSessionToken()` does not work as a challenge token.
- Refactor token verification into a pure helper so it can be unit-tested without a `next/headers` request context.

---

## F-02 — Medium: Self-promotion to `ADMIN` and TOTP not enforced on role change/refresh

**Locations:**

- `src/services/user-admin.service.ts:92-102` — the self guard only blocks demotion, not self-promotion.
- `src/services/auth.service.ts:684-701` — `refresh()` re-issues a session from the current DB role without checking TOTP.
- `src/services/auth.service.ts:742-749` — `verifySession()` checks role/active/token version but not `totpActive`.
- `app/(secret)/panel/layout.tsx:9-11` — panel guard checks only `roleKode === 'ADMIN'`.
- `prisma/seed.ts:39` — `user:manage` is described as "Manage users: deactivate, force logout".

**Confidence:** High in code behavior; exploit is conditional on a non-ADMIN role holding `user:manage`.

### Issue

```ts
if (target.id === session.userId && roleCode !== 'ADMIN')
  return fail('CANNOT_TARGET_SELF', 'You cannot demote your own account.')
```

If a non-ADMIN user has `user:manage`, they can call:

```ts
changeUserRoleAction({ userId: <their id>, roleKode: 'ADMIN' })
```

The guard does not trigger because the new role is `ADMIN`. The permission description does not mention role assignment, yet `changeRole` is gated only by `user:manage`.

After promotion:

- Their existing access token fails the role check, but `refreshAction()` re-reads the DB user and mints a fresh `ADMIN` session.
- Neither `refresh()` nor `verifySession()` checks `TOTP_WAJIB_ADMIN`/`user.totpActive`, so a promoted admin reaches `/panel` without completing TOTP setup.

The default seed grants `user:manage` only to `ADMIN`, so this is conditional. It becomes high-impact if custom roles are used, or if an admin promotes a user who already has a live refresh cookie.

**Related:** `resetTotp()` (`src/services/user-admin.service.ts:155-158`) lets a role with `totp:reset` reset an ADMIN's MFA; `setActive()`/`forceLogout()` similarly allow non-ADMIN managers to affect higher-privileged users.

### Fix

- Block all self role changes: `if (target.id === session.userId) return fail('CANNOT_TARGET_SELF', ...)`.
- Require `rbac:manage` (or a dedicated `user:role` permission) for role assignment.
- When assigning `ADMIN` while `TOTP_WAJIB_ADMIN=true`, require the target to have `totpActive`, or force a setup challenge before the role becomes effective.
- In `verifySession()` and `refresh()`, reject admins without active TOTP when `TOTP_WAJIB_ADMIN=true`.
- Restrict management permissions from affecting higher-privileged targets where appropriate.

---

## F-03 — Medium: TOTP setup bearer token placed in URL

**Locations:**

- `app/(public)/(auth)/login/page.tsx:50`
- `components/storefront/login-modal.tsx:90`
- `app/(public)/(auth)/totp/setup/page.tsx:12-13`
- `src/services/auth.service.ts:598`

**Confidence:** High in design; exploit requires token leakage.

### Issue

The forced-TOTP onboarding token is sent as `/totp/setup?token=<JWT>`. The token is a bearer credential: `setupTotpAction()` returns the TOTP secret to its holder, and `activateTotpAction()` calls `issueSession(actor)` when a challenge token is present. If the URL leaks through browser history, access logs, referrer headers, screenshots, or support tooling, the holder can complete setup with their own authenticator and obtain an admin session without knowing the password.

### Fix

- Do not put the challenge token in a query string.
- Set a short-lived, `HttpOnly`, `SameSite=Strict` setup cookie from the login server action, or store a one-time server-side setup session keyed by a random opaque ID.
- Make setup/activation challenges single-use and invalidate them after use.
- Use `Referrer-Policy: no-referrer` on `/totp/setup`, `/reset-password`, `/verify-email`, and `/change-email/confirm`; avoid logging query strings.

---

## F-04 — Medium (needs deployment validation): IP rate limiting trusts spoofable `X-Forwarded-For`

**Locations:**

- `src/lib/rate-limit.ts:53-54` — takes the first `X-Forwarded-For` entry.
- `src/services/transaction.service.ts:1194` — uses the same value for reveal audit IPs.
- `docs/PLAN.md:534` — documentation requires correctly configured proxy IP handling.

**Confidence:** High that the header is trusted; exploitability depends on proxy configuration.

### Issue

If a client can reach the app directly, or if the reverse proxy appends to an incoming `X-Forwarded-For` instead of overwriting it, an attacker controls the IP bucket key. This bypasses the IP half of `register`, `emailIp`, `token`, `refresh`, `reveal`, and `totpIp` limits. The most significant consequences are mass account creation and email bombing; login is still partially protected by the per-identity `loginIdentity` bucket. Audit reveal IPs can also be forged.

### Fix

- Have the reverse proxy overwrite the header, e.g. `proxy_set_header X-Forwarded-For $remote_addr;`, or use a trusted `X-Real-IP`.
- Optionally trust `X-Forwarded-For` only from known proxy CIDRs and use the correct hop.
- Validate that the result is an IP address.
- Add user/identity buckets for auth-sensitive actions rather than relying primarily on IP.
- Do not use a spoofable value as non-repudiation evidence in audit logs.

### Verification

Inspect the deployed nginx/Caddy config and `/etc/gamestore/gamestore.env`; do not probe production.

---

## F-05 — Low: Webhook `PAID` can be processed without an amount

**Locations:**

- `src/services/payment.service.ts:63-68`
- `src/services/payment.service.ts:228-229`
- `src/repositories/webhook-repo.ts:27-30`

`normalize()` allows `amount = null`; the caller then skips the amount comparison. A caller with a valid `XENDIT_CALLBACK_TOKEN` could settle a pending invoice with no amount. The callback token is the primary boundary, but requiring an amount for `PAID` is cheaper and prevents misrouted or partial callbacks.

`lockByKey()` is also a plain `findUnique`, not a row lock; concurrent duplicate webhooks are not serialized. Use `FOR UPDATE` or an advisory lock for deterministic processing.

**Fix:** Require `amount` for `PAID`, reject null/zero, and verify that all supported Xendit callback shapes include an amount. If a provider payload legitimately omits it, fetch the provider record before settling.

---

## F-06 — Low: Missing rate limits on voucher preview and password re-authentication

**Locations:**

- `src/controllers/discount.controller.ts:55-56`
- `src/services/voucher.service.ts:228-253`
- `src/services/auth.service.ts:293-304` (`changePassword`)
- `src/services/auth.service.ts:319-330` (`requestEmailChange`)
- `src/services/user-admin.service.ts:155-158` (`resetUserTotp`)

`previewCheckoutAction` has no rate limit and returns distinguishable voucher errors, allowing authenticated code enumeration and repeated DB work. The password-checking endpoints also have no rate limit; a session thief could use them as a password oracle.

**Fix:** Add dedicated `RateLimiterMemory` buckets keyed by user and IP, and return generic voucher errors where possible.

---

## F-07 — Low: PDP deletion leaves unused email tokens valid

**Location:** `src/repositories/pdp-repo.ts:37`

The deletion transaction only clears `newEmail` on email tokens; it does not mark them used or delete them. The user is deactivated, so immediate use is blocked, but a previously issued reset/verification token remains valid until retention cleanup or reactivation.

**Fix:** Mark all email tokens used/delete them as part of deletion and add a test.

---

## F-08 — Informational: Hardening and supply chain

- `next.config.ts:7` allows `'unsafe-inline'` for `script-src` (and `'unsafe-eval'` in dev). No XSS vector was found, but a nonce/hash-based CSP would harden against future injection.
- `package.json:41` lists `shadcn` as a production dependency. `npm audit --omit=dev` reports 2 low + 4 moderate transitives (`deepmerge` prototype poisoning, `minimatch` DoS via `shadcn`/`ts-morph`), with no high/critical findings. The package is CLI/tooling, not imported at runtime; move it to `devDependencies` and update/pin.
- Development now intentionally uses one `DATABASE_URL` for app, migration, seed, and test. `.env.example` still includes `SUPERADMIN_PASSWORD`. For production, keep DDL credentials and the seed superadmin password out of the web service environment; use a separate CLI/ops env file and remove the seed password after the admin exists.

---

## Verified Controls

- **Authorization:** admin services consistently call `requirePermission`; buyer reads check `buyerId`; reveal/cancel/detail paths are ownership-scoped.
- **SQL injection:** Prisma ORM plus parameterized tagged `$queryRaw`/`$executeRaw`; no raw SQL string interpolation found.
- **XSS:** React escaping; `react-markdown` + `rehype-sanitize`; no user-controlled `dangerouslySetInnerHTML` (the only one is the constant theme script).
- **CSRF/session:** `HttpOnly`, `Secure` in production, `SameSite=Strict`, short access JWT, rotating refresh token with family revocation, token-version invalidation.
- **Crypto/secrets:** bcrypt cost 12; AES-256-GCM with AAD and key version; random 256-bit tokens hashed at rest; JWT secret minimum 256 bits; secrets stored outside git with file permissions.
- **Uploads:** magic-byte validation, UUID filenames, size/MIME limits, strict local-path regex.
- **Headers:** CSP, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, HSTS in production, restrictive `Permissions-Policy`.
- **Payments:** webhook callback-token check, idempotent inbox, amount verification when present, conditional state transitions, backend-authoritative pricing.
- **Secrets in git:** `.env*` and `.secrets/` are ignored; `git ls-files` found no tracked credentials.

---

## Needs Verification

- **Proxy/XFF configuration:** confirm the reverse proxy overwrites `X-Forwarded-For` or provides a trusted `X-Real-IP`. Until then, treat F-04 as exploitable.
- **Role assignments:** query (read-only) for any non-ADMIN role granted `user:manage` or `totp:reset`. If present, treat F-02 as High.
- **Production environment file:** confirm it does not contain `SUPERADMIN_PASSWORD` or other post-seed/DDL credentials; development's single `DATABASE_URL` must not be reused with owner/DDL rights in production.
- **Provider payloads:** confirm all supported Xendit callback shapes include an amount; otherwise F-05 needs a provider fetch before settlement.

---

## Recommended Fix Order

1. **F-01** — add token type/audience checks and a regression test. This restores the TOTP control.
2. **F-02** — block self role changes, gate role assignment, and enforce TOTP at session/refresh time.
3. **F-03** — move the setup challenge out of the URL and make it single-use.
4. **F-04** — configure trusted proxy IP handling; add identity-based buckets.
5. **F-05 to F-08** — webhook amount requirement, rate limits, PDP token invalidation, CSP/dependency/env hardening.

---

## Audit Commands

```bash
npm audit --omit=dev --json
git ls-files | grep -Ei 'env|secret|key|pem|credential'
git check-ignore .env .secrets
```
