# Domain: Observability & Security

> Layer 2 deep dive. Entry points: `AGENTS.md` → `PROJECT_CONTEXT.md` → this file.
> Last verified 2026-10-20.

## 1. Observability stack (production)

- **Traces/metrics**: OpenTelemetry SDK init in `observability/otel/index.ts` (Node) → OTLP
  HTTP exporter → Grafana Tempo/Prometheus. Env: `OTEL_EXPORTER_OTLP_ENDPOINT` + `_HEADERS`.
  Known debt: mixed OTel major lines (`0.222.x` SDK/exporters beside `2.x` resources/metrics)
  and 8 moderate transitive `@opentelemetry/*` npm advisories (pinned via `overrides`).
- **Errors**: Sentry on both clients (web: `@sentry/nextjs`; mobile: `sentry_flutter`).
- **Dashboards** (`observability/dashboards/`): `byok-proxy.json`, `mcp-server.json`,
  `crypto-rate-limits.json`.
- **Alert rules** (`observability/alerts/`): `byok-proxy-alerts.json`, `mcp-server-alerts.json`,
  `crypto-rate-limit-alerts.json` — high error rate, high latency, SSE stalled, rate-limit
  spikes, PAT auth failures, scope violations.
- **Runbooks** (`observability/runbooks/`, 11 markdown guides): byok-proxy
  (high-errors / high-latency / sse-stalled / rate-limit-spike), crypto
  (envelope-errors / unwrap-failures), mcp (pat-auth-failures / scope-violations /
  tool-high-errors / tool-high-latency), capacity (pat-rate-limit / proxy-rate-limit).
  **An alert without a runbook is incomplete** — add one when adding an alert.
- Health endpoint: `GET /api/health` → `{"ok":true}` (checks DB, Supabase, external APIs).

## 2. Sentry and PII (rule 12 — a compliance boundary, not a preference)

**Web** (`instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`):
- DSN validated before init (must be `https://…@….ingest.` shape); Sentry disabled when
  invalid or non-production.
- `tracesSampleRate` 0.1; replay on errors with `maskAllText: true` + `blockAllMedia: true`.
- `beforeSend` drops the known-noisy serviceWorker registration rejections.

**Mobile** (`lib/services/sentry_service.dart`) — the strict wrapper:
- Init is skipped entirely when no `SENTRY_DSN` dart-define (dev runs never send).
- Events carrying **`Authorization` or `Cookie` headers are dropped whole**.
- Keys containing `password`, `anon_key`, `api_key`, `access_token`, `refresh_token`,
  `secret`, etc. are redacted wherever they appear; emails are regex-redacted in strings.
- Handled errors flow only through `SentryService.captureReport` (release mode) so nothing is
  reported twice; release tag must track `pubspec.yaml` version.

Any new error path must go through these filters — never `Sentry.captureException` with raw
request objects, and keep the mobile DSN out of web builds.

## 3. Key & credential posture

| Credential | Where it lives | Posture |
|---|---|---|
| Supabase anon key | Embedded in both clients | **Rotation still pending** post-incident (open, `SECURITY.md`) — treat as public-by-design: RLS is the real boundary |
| Service role key | Server env only | Crons/webhooks/migrations only (rule 5) |
| PATs (`fjk_live_…`) | `api_keys` table (prefix + scopes + expiry) | User-created/revoked via `/api/api-keys/*`; per-key `rate_limit_per_min`, `expires_at`; every use audited in `api_audit_log` |
| BYOK keys | `user_byok_keys` (envelope-encrypted, device-encrypted) | Never plaintext anywhere (see `docs/domain/byok-ai.md`) |
| Cron secrets | `CRON_SECRET`, `SMART_NOTIFICATIONS_SECRET`, `ZAKAT_AUTOPILOT_SECRET` | Verified via `lib/cron-auth.ts` `X-Cron-Secret` |
| VAPID / Firebase | Server env + Makefile `--dart-define` | Makefile grep fragility (gotcha #2) |

**DB-level ACL**: EXECUTE on internal RPCs is revoked from `PUBLIC` and `anon`, granted only
to `authenticated` + `service_role` — verified on prod project `ujwcvtpwsaidljecqbaa` on
2026-10-18 (`SECURITY.md`). Keep new RPCs in that pattern.

## 4. Open security backlog (from `SECURITY.md` + `HANDOFF_REPORT.md` §8)

1. 🔴 **Anon key rotation** pending since the incident — the key ships in clients; rotation
   means coordinated web + mobile releases.
2. 🟠 **Leaked-password protection disabled** in Supabase Auth config.
3. 🟠 **No feature flags** — every change ships all-or-nothing to all users.
4. 🟡 BYOK store copy ("keys never sent to our servers") vs the RSA-OAEP envelope POSTed to
   the proxy — wording needs legal review.
5. 🟡 AD_ID permission added for Firebase Analytics (Play compliance) sits awkwardly with
   "no ad tracking" marketing — reconcile messaging.
6. 🟡 `testimonials` public-SELECT read amplification by an unknown external client —
   monitoring item, not a policy bypass.
7. 🟡 Supabase Auth: consider enabling leaked-password protection; 6 RLS initplan advisories
   and 21 unused indexes remain on the cleanup list.

## 5. Backups & incident history

- Daily GitHub Actions `supabase db dump` → Cloudflare R2 (`fajrak-backups`), nightly 02:00
  UTC; dumps retained (post-incident pipeline, live since 2026-10-14).
- The 2026-10-11 → 2026-10-17 prod outage is **resolved**; post-mortem and the security
  hardening backlog live in `mobile/fajrak_flutter/INCIDENT.md`. Read it before touching
  schema, auth, or the anon key.

## 6. Checklist before touching this domain

- [ ] New user data → RLS policy in the same migration; no reliance on the anon key for privacy.
- [ ] New RPC → EXECUTE revoked from `PUBLIC`/`anon`; owner-verification guard; `search_path`
      pinned.
- [ ] New error reporting path → passes the PII filters (rule 12); no BYOK key material.
- [ ] New alert → matching runbook in `observability/runbooks/`.
- [ ] New secret → `.env.example` entry + `cron-auth` wiring; never committed to git.
- [ ] Schema-adjacent work → checked against `INCIDENT.md` and the drift gotcha (#1).
