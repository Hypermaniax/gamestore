# Confirmed Findings

## High — TOTP challenge token is accepted as a full session

**Fingerprint:** `session/readSession-accepts-totp-challenge`  
**Severity:** High (likelihood High, impact High)  
**Confidence:** High  
**Status:** Fixed in working tree 2026-11-16. Session tokens carry `typ: 'session'`; challenge tokens carry `typ: 'challenge'` and `kind`; `readSession()` rejects challenge markers. Regression coverage: `tests/unit/session-token.test.ts`.

### Issue

After a correct password on an account with TOTP active, `login()` returns a `totp2` challenge JWT. The challenge carries the same claims and signing secret as an access session. `readSession()` verifies the signature and expiry but never checks the `kind` claim, so the challenge is returned as `SessionClaims`. `verifySession()` then accepts it and the panel layout admits the ADMIN role.

An attacker who knows an admin password can take the challenge token from the login response and send it as the `session` cookie. No TOTP code is required.

### Source trace

- **entrypoint** — `src/controllers/auth.controller.ts:43` (`loginAction`): receives attacker-supplied credentials and calls `authService.login`.
- **propagation** — `src/services/auth.service.ts:556` (`login`): a valid password on a TOTP-active account returns a `totp2` challenge before TOTP verification.
- **propagation** — `src/lib/session.ts:130` (`readSession`): reads the session cookie and verifies the JWT.
- **sink** — `src/lib/session.ts:140` (`readSession`): returns `sub`/`uname`/`rid`/`rkode`/`tv` claims without rejecting `kind`.
- **propagation** — `src/services/auth.service.ts:850` (`verifySession`): trusts `readSession` and checks only active, token version, and role consistency.
- **sink** — `app/(secret)/panel/layout.tsx:9` (`PanelLayout`): admits the challenge-derived ADMIN session.

### Evidence

- `src/services/auth.service.ts:556` — password-only login returns a `totp2` challenge before TOTP verification.
- `src/lib/session.ts:95` — `createChallengeToken` embeds `kind` in the same claim set used by sessions.
- `src/lib/session.ts:140` — `readSession` verifies the JWT and returns claims without a `kind` check.
- `src/services/auth.service.ts:850` — `verifySession` performs no token-purpose check.
- `app/(secret)/panel/layout.tsx:11` — panel authorization is satisfied by `roleKode === 'ADMIN'`.

### Conditions

- The attacker knows a valid password for an account with TOTP active.
- The account has `totpActive=true`, so login returns a `totp2` challenge instead of a session.

### Bounded reproduction

A sandboxed faithful-source harness generated a `totp2` challenge, supplied it as the `session` cookie, and called `readSession()`. Only the `next/headers` import was replaced by a cookie stub; token and session logic were unchanged.

**Observed result:** `challengeTokenAcceptedAsSession=true`, `returnedUserId=1`, `returnedUsername=dummy-admin`, `returnedRoleKode=ADMIN`, `returnedTokenVersion=7`.

### Impact

Acceptance yields an ADMIN session and bypasses the TOTP second factor. For an admin victim, the panel and every permission-guarded server action treat the attacker as fully authenticated before TOTP is completed.

### Remediation

Make `readSession()` reject tokens that carry a challenge `kind`, or require an explicit session type/audience claim. Add regression tests proving:

- `totp2` and `totp-setup` tokens cannot authenticate a session or reach `/panel`.
- A session token cannot be used as a challenge token.
