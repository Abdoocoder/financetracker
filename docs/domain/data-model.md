# Domain: Data Model — Tables, RLS, Migrations, Cron Jobs

> Layer 2 deep dive. Entry points: `AGENTS.md` → `PROJECT_CONTEXT.md` → this file.
> Last verified 2026-11-11 (prod schema introspected via Supabase MCP, project `fajrak` /
> `ujwcvtpwsaidljecqbaa`).

## 1. The cardinal rule: migrations are NOT the source of truth

Migrations were historically behind production: tables and columns existed in prod
(`created via the SQL editor`) with **no CREATE TABLE migration**. Running `supabase db reset`
or trusting a fresh `db push` as "the schema" would destroy prod reality — this class of
mistake caused the 2026-10-11 → 2026-10-17 production outage (post-mortem:
`mobile/fajrak_flutter/INCIDENT.md`).

**Current drift state (measured 2026-11-11): the known drift is codified.** Prod and the
migrations tree now agree on shape:

| Measure | Prod (`public`) | Repo migrations |
|---|---|---|
| Base tables | 31 | 31 `create table` |
| Tables with RLS enabled | 31 | 31 `enable row level security` |
| `profiles` columns | 23 | 23 (8 in `001_initial.sql` + 15 alters) |

`20260913135653_add_prod_only_schema.sql` is the file that closed the gap: it codifies
`user_stats`, `testimonials`, `saving_challenges`, `health_score_history` and 15 extra
`profiles` columns (`salary_day`, `asset_*`, `phone`, `job_title`, `birth_date`, `avatar_url`,
`onboarding_done`, `lang`, `lesson_streak`, `last_lesson_date`, `opening_balance`) with
`IF NOT EXISTS` / drop-then-create so applying it to prod is a no-op.

- The rule still stands as **posture, not as a live gap**: parity was reached by *patching the
  repo up to prod*, so nothing guarantees prod has not drifted again since. Before any schema
  work: **diff the live schema against migrations** and treat the diff as the backlog.
- The open owner decision (baseline-dump prod → squashed migration) is still the durable fix
  that makes `db push` safe. Until then, additive-only migrations are the norm.
- `db reset` remains destructive regardless of parity: it drops data, not just schema.

## 2. The 31 tables (all with `ENABLE ROW LEVEL SECURITY` — verified in prod)

| Group | Tables |
|---|---|
| Core finance | `accounts`, `transactions`, `budgets`, `debts`, `debt_payments`, `investments`, `investment_transactions`, `investment_cash`, `recurring_transactions`, `savings_goals`, `saving_challenges`, `alerts` |
| Islamic finance | `zakat_history`, `zakat_holdings`, `zakat_haul_tracking` |
| Identity / profile | `profiles`, `notification_preferences`, `notification_history`, `push_subscriptions` |
| BYOK / AI / API | `chats`, `messages`, `user_api_keys` (PATs), `user_byok_keys`, `proxy_usage`, `api_audit_log`, `idempotency_keys` |
| Gamification / analytics | `user_stats`, `health_score_history`, `app_events`, `budget_alert_log`, `testimonials` |

**Previously prod-only DDL, now codified:** `user_stats`, `testimonials`, `saving_challenges`,
`health_score_history` and the 15 extra `profiles` columns all have DDL in
`20260913135653_add_prod_only_schema.sql`, and prod carries RLS on all 31 tables. Treat any
*new* divergence you observe in prod as a fresh backlog item — do not assume the 2026-09 patch
covered it.

## 3. RLS conventions

- Standard policy: `using ((select auth.uid()) = user_id)` — the `(select …)` wrapper is the
  initplan fix from perf migrations `20260908045741` / `20260914000000`.
- Server code uses `createServerClient()` / `createBrowserClient()` (both RLS-bound). The
  service-role admin client (`lib/supabase/admin.ts`) is reserved for crons, webhooks, and
  migrations — rule 5.
- SECURITY DEFINER RPCs follow one guard pattern:
  `if auth.uid() is not null and auth.uid() is distinct from p_user_id then raise;` —
  authenticated users can only act on themselves; NULL uid = server-side cron/service_role;
  anon has no EXECUTE.
- Hardening migrations on record: `advisor_function_lockdown`,
  `revoke_public_from_secdef_functions`, `verify_owner_in_user_rpcs`, `022`/`024` hardening,
  `20261018000000_linter_security_hardening` (revokes PUBLIC+anon EXECUTE on 7 internal RPCs,
  pins `search_path`).
- Currency default: prod `profiles.currency` default is **`KWD`**, set by
  `20261025000002_profiles_currency_default_kwd.sql`. The legacy baseline
  (`legacy/001_initial.sql`) said `JOD` with `Asia/Amman`; docs that still claim JOD are
  reading the baseline instead of prod.

## 4. Migrations layout (76 files: 34 top-level + 42 legacy)

- `supabase/migrations/legacy/` — `001_initial.sql` … `041_chats.sql`, **42 files** (baseline;
  duplicate numbers at 003 and 029, so 42 files cover 001–041).
- `supabase/migrations/*.sql` — **34 files**: the short-runner `042`–`048` set
  (`042`, `043`, `047`, `048`) and dated `2026xxxx…` files, which are the current convention:
  `YYYYMMDDHHMMSS_name.sql`.
- Numbering gaps at `020` (legacy) and `044`–`046` (top-level) — expected, do not renumber.
- Key recent files: `20261019000000_zakat_engine_v2.sql`, `20261021000000_zakat_autopilot.sql`,
  `20261017160000_zero_budget_trigger_guard.sql`,
  `20261016114425_restore_sync_and_health_rpcs.sql`,
  `20260913135653_add_prod_only_schema.sql` (§1).
- ⚠️ `20261107_rename_deen_to_tabarruat.sql` uses an **8-digit** prefix, which violates the
  workflow's `supabase-validate.yml` filename rule and currently fails the
  `Migration structure guard` job on `main`. Rename it in a follow-up; do not copy that format
  for new files.
- pgTAP fixtures: `supabase/tests/zakat_*.sql`. New RPC behavior ships with a fixture there.
- Naming: numbered snake_case (legacy) or timestamped snake_case (current). Never edit an
  applied migration — add a new one.

## 5. RPCs (where finance math lives)

Clients are input/display only; PostgreSQL functions own the math. Canonical set:

- Dashboard/finance: `get_health_score`, `get_account_balances`, `get_cashflow_summary`,
  `get_financial_dashboard`, sync RPCs (restored by `20261016114425`).
- Zakat: `get_zakat_summary`, `get_zakat_hauls`, `sync_zakat_haul_state`
  (see `docs/domain/islamic-finance.md`).
- BYOK/MCP support: `bump_proxy_usage` (30 req/min proxy limit), idempotency helpers.
- Health-score thresholds were hardcoded and partially centralized by
  `20261017000000_dashboard_health_score_fix.sql`; non-Zakat metrics are still duplicated
  5–7× across web/mobile/SQL (open risk — `PROJECT_CONTEXT.md` §4 "Open risks").

## 6. Cron jobs (two schedulers — know both)

**Vercel crons** (`vercel.json`):

| Path | Schedule (UTC) |
|---|---|
| `/api/auto-debt` | `0 3 * * *` |
| `/api/auto-recurring` | `0 3 * * *` |
| `/api/budget-alerts` | `0 4 * * *` |
| `/api/zakat-autopilot` | `0 8 * * *` |

> These crons only fire while the Vercel project is live — it is **paused** as of 2026-11-11
> (`PROJECT_CONTEXT.md` §5). `netlify.toml` is a secrets-scan suppression file, not a second
> deployment path, so there is no Netlify scheduler to fall back to.

**GitHub Actions** — there are no scheduled notification workflows left. `smart-notifications.yml`
was deleted in `d4e306d0` (2026-10-31) with its route. The only scheduled workflow is
`supabase-backup.yml` — nightly `supabase db dump` → Cloudflare R2 (currently failing, see
`docs/domain/observability-and-security.md` §5). The four Vercel crons above are the only
schedulers. Reminder routes exist and are callable manually.

- Cron routes authenticate via `lib/cron-auth.ts` (`X-Cron-Secret`: `CRON_SECRET`,
  `SMART_NOTIFICATIONS_SECRET`, `ZAKAT_AUTOPILOT_SECRET`).
- Note the **overlap**: `auto-debt` / `auto-recurring` exist both as Vercel crons and as
  Actions-triggered routes — when editing one, check the other before assuming ownership.
- Adding a cron: new route under `app/api/` + secret via cron-auth + schedule entry in
  `vercel.json` **or** a workflow + a row in this table.

## 6b. notification_history Fingerprint Logic (v3.46.0+) & Proactive Insights (v3.47.0+)

### notification_history fingerprint deduplication

The `notification_history` table is the single write path for all notifications (cron alerts, AI-generated insights, proactive agent pushes). A unique index enforces deduplication:

```sql
CREATE UNIQUE INDEX notification_history_user_fingerprint_uidx
ON notification_history (user_id, fingerprint)
WHERE fingerprint IS NOT NULL;
```

- **Fingerprint composition**: SHA-256 of `{user_id, rule_type, entity_id, date}` (e.g., `budget:groceries:2026-10-27`).
- **Write path**: All producers (cron routes, AI generator, achievement awards, proactive agent) call `sendPushToUser()` in `lib/push-send.ts`, which generates the fingerprint, checks `notification_preferences` (enabled, quiet hours), and inserts into `notification_history`. The unique index rejects races as `23505` (treated as success).
- **Self-heal (F22, Edge Function v15)**: If a webhook payload omits `fingerprint` (custom Dashboard template), the Edge Function queries `notification_history` by `historyId` to recover it before delivery.

### Proactive Agent Insights — ⚠️ removed 2026-10-31

> The `/api/agent/proactive` cron was deleted in `d4e306d0`; the table below is a design record.
> `notification_history` itself is unchanged and still receives writes from the other producers.

The daily cron `/api/agent/proactive` generated insights via deterministic rules and wrote them through the same `notification_history` path:

| Rule Type | Trigger | Entity ID | Fingerprint Example |
|---|---|---|---|
| `budget_high` | `spent / limit > 0.9` | budget_id | `sha256(user_id + "budget_high" + budget_id + "2026-10-27")` |
| `debt_due` | `due_date <= now + 3 days` | debt_id | `sha256(user_id + "debt_due" + debt_id + "2026-10-27")` |
| `spending_up` | WoW increase > 20% | category | `sha256(user_id + "spending_up" + "food" + "2026-10-27")` |

- **Deduplication**: Same fingerprint logic prevents duplicate alerts across days.
- **Delivery**: Inserts into `notification_history` → triggers push-notification Edge Function → writes `alerts` row (A.2b pattern) → FCM/Web Push delivery.
- **Quiet Hours**: Respected via `notification_preferences` check in `sendPushToUser()` before insert.

## 7. Checklist before touching this domain

- [ ] Prod schema diffed before trusting any migration output; no `db reset` near prod.
- [ ] New table: RLS enabled + explicit grants (revoke default `anon`/`public` access) in the
      same migration.
- [ ] New RPC: SECURITY DEFINER + owner-verification guard + `search_path` pin + revoked
      PUBLIC/anon EXECUTE + pgTAP fixture.
- [ ] Multi-currency fields (`original_amount`, `original_currency`) handled in any new math.
- [ ] Cron route verifies its secret and respects `notification_preferences` quiet hours.
- [ ] `PROJECT_CONTEXT.md` §4 updated if the change is user-visible or shifts current state.
