# Security

## Supported versions

- `3.47.x`: supported
- `3.46.x` and `3.45.x`: best effort
- Earlier: unsupported

## Reporting a vulnerability

Please email the maintainer at `<TODO: add security contact email>`. Do not open public GitHub issues for security reports.

## Recent Hardening (v3.46.0 - v3.47.0)

### v3.47.0 — Security P0/P1/P2 Resolution

**P0 — Dependency Vulnerabilities (14 critical, 41 high):**
- Patched via `npm audit --omit=dev` (74 → 1 remaining). Upgraded:
  - `next@16.4.3` (pulls `sharp@0.35.5`)
  - `@sentry/nextjs@10.76.2`
  - `dompurify@3.4.17`
  - `@modelcontextprotocol/server@2.4.0`
  - `zod@4.6.7`
- Added same-major `overrides` for `@grpc/grpc-js@^1.14.6`, `source-map-js@^1.2.2`, `jsdom → undici@^8.12.3`, `handlebars@^4.7.10`
- Removed unused direct `npx@^10.2.2` dependency (its bundled `npm@5.1.0` tree accounted for most critical findings)
- Remaining accepted: `fast-uri@3.1.8` (moderate; fix requires `ajv` 4.x major bump), plus dev-only `solid-js`/`seroval` criticals outside production bundle.

**P1 — Layout Auth / Internal Table Hardening:**
- Migration `20261026124600_harden_internal_tables.sql`:
  - `authenticated` role: `UPDATE`/`DELETE`/`TRUNCATE` revoked on `api_audit_log` (audit trail) and `idempotency_keys` (transaction deduplication)
  - `authenticated` role: `SELECT` only on `proxy_usage` (BYOK rate-limit counter) — previously could `UPDATE proxy_usage.count = 0` to bypass 30 req/min cap
  - `bump_proxy_usage()` converted to `SECURITY DEFINER` (zero-argument, resolves row from `auth.uid()`); caller can only bump their own bucket
  - `api_audit_log` INSERT deliberately kept — BYOK agent route writes audit rows with caller's session client
  - No application logic changed.

**P2 — Audit Log & Rate Limit Self-Tampering Prevention:**
- Users can no longer DELETE their own `api_audit_log` rows or reset their `proxy_usage` bucket
- RLS policies on internal tables now enforce owner verification at the database level

### v3.46.0 — Previous Hardening
- DB: Revoked `anon` INSERT/UPDATE/DELETE/TRUNCATE on all tables. `anon` has SELECT only on `testimonials`. No app flows affected.
- Sentry (web): `sendDefaultPii` disabled on server and edge runtimes; `beforeSend` strips user context and redacts IP/credential headers (`x-forwarded-for`, `x-real-ip`, `cookie`, `set-cookie`, `authorization`).
- Sentry (web): Dropped `Failed to find Server Action` events aimed at action-less landing route (bot/malformed traffic). Genuine skew failures on routes with Server Actions still report.

## Current posture

- Row Level Security is enabled on all 30 tables (including the new `zakat_holdings`), and every policy keys on `auth.uid() = user_id`.
- Internal RPCs (health score, sync, idempotency, account balances, Zakat: `get_zakat_summary` and `get_zakat_hauls`): `EXECUTE` revoked from `PUBLIC` and `anon`, granted only to `authenticated` and `service_role`. Both Zakat RPCs additionally enforce owner verification (`auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id` raises), while a NULL uid (service_role / cron) is allowed for background jobs. Verified on the production project `ujwcvtpwsaidljecqbaa` on 2026-10-18 via `proacl`.
- **Live RLS audit (2026-10-29):** Performed on the 5 prod-only tables (`user_stats`, `testimonials`, `saving_challenges`, `health_score_history`, `profiles`). All 5 have RLS enabled. 4 tables strictly enforce `auth.uid() = user_id` on all commands. `testimonials` has an intentional PUBLIC READ policy (`is_visible = true`) for the public testimonials page; all writes require owner verification.
- `search_path = public` is pinned on all SECURITY DEFINER functions flagged by the Supabase linter.
- Firebase Installation ID registration is enabled via the `firebase_messaging_installation_id_enabled` manifest meta-data.
- BYOK keys are encrypted client-side (AES-256-GCM plus RSA-OAEP). The proxy receives an opaque envelope, not plaintext keys.
- Internal bookkeeping tables (`api_audit_log`, `idempotency_keys`, `proxy_usage`) hardened against self-tampering (see P1/P2 above).

## Known gaps and backlog

- Leaked Password Protection is disabled. Enabling it requires a paid Supabase tier; deferred for now.
- ✅ Anon key rotation deemed unnecessary after RLS verification (2026-10-29). Key is safe by design; RLS enforces data isolation across all tables.
- No Point-In-Time Recovery (PITR) because the project is on the Free tier.
- Recommend reviewing `supabase db lint` output monthly.

## History Rewrite (2026-10-29)

On 2026-10-29, the repository was made private and a Git history rewrite (`git filter-repo`) removed two sensitive internal audit documents from all commit history:

- `DEEPSEEK_BRIEFING.md` — security backlog and attack surface analysis
- `INVESTIGATION_REPORT.md` — 6-phase audit findings with P0/P1/P2 action items

These documents were never meant for public exposure. Additionally, 891 local agent configuration files (`.agents/`, `.opencode/`, `.claude/`, `.cursor/`, `.gemini/`, `.continue/`, `.taskmaster/`, `.planning/`, `.trae/`, `.kilo/`, `.vscode/`, and build output directories) were untracked via `.gitignore` and removed from Git tracking. The Supabase anon key was verified secure via live RLS audit and was NOT rotated.

## Incident history

See `mobile/fajrak_flutter/INCIDENT.md` for the 2026-10-11 to 2026-10-17 production outage post-mortem.
