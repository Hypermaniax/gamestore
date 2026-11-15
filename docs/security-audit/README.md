# Security Audit — GameStore / NEXAPLAY

- **Date:** 2026-11-15
- **Source ref:** `f94346d891da2e2f6ea4df288c8f41c851e74695` (clean worktree)
- **Profile:** standard
- **Method:** source review plus one bounded local sandbox harness. No deployed endpoints, provider APIs, or real credentials were used.
- **Scope:** `app/`, `src/`, `components/`, `proxy.ts`, `next.config.ts`, `prisma/`, `deploy/`, `scripts/`, `tests/`, dependency manifests.
- **Excluded:** unfinished payment gateway/Xendit integration — provider initiation, webhook settlement, refund/idempotency persistence, and webhook admin retry.
- **Coverage:** 47 ledger units — 29 covered, 13 candidate, 5 explicitly out of scope. The run is **incomplete**: the final coverage-critic pass after wave 4 did not complete, so this is a partial pass.
- **Result:** **1 confirmed High** (fixed in working tree 2026-11-16), **12 needs-validation leads**, **0 rejected**.

## Reports

- [Confirmed findings](./confirmed.md)
- [Needs validation](./needs-validation.md)
- [Hardening, positive controls, and coverage](./hardening-and-coverage.md)
- [Addendum 2026-11-16 — fix verification & deferred deployment items](./addendum-2026-11-16.md)

## Headline

The most serious confirmed issue was token-purpose confusion: a pre-TOTP challenge JWT was accepted as a full access session. It is fixed in the working tree: session tokens now carry `typ: 'session'`, challenge tokens carry `typ: 'challenge'` + `kind`, and `readSession()` rejects any token with a challenge marker.

Most remaining leads are authorization-separation, lifecycle, or deployment-validation issues. They are not confirmed vulnerabilities and have no assigned severity. Several lifecycle and MFA-enrollment leads are fixed in the working tree; see [`needs-validation.md`](./needs-validation.md) and [`hardening-and-coverage.md`](./hardening-and-coverage.md) for per-item status.

## Prior audit

The previous prose audit remains at [`docs/security-audit.md`](../security-audit.md) and targeted `b2f4429`. It was used as lead context only; no compatible prior ledger existed.
