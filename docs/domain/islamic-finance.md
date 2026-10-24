# Domain: Islamic Finance — Zakat Engine, Hawl, Nisab, FIRE, Halal Investing

> Layer 2 deep dive. Entry points: `AGENTS.md` → `PROJECT_CONTEXT.md` → this file.
> Last verified 2026-10-20.

## 1. Core principle: one engine, clients only collect and display

Zakat math (Nisab, 2.5% rate, Hawl clock) exists **only in Supabase RPCs**. Web and Flutter
screens gather inputs (live gold/silver prices, FX rate, user holdings) and render RPC output.
Any client-side reimplementation violates CLAUDE.md rules 10 & 11 and will drift from fiqh
rulings encoded in the DB.

- `get_zakat_summary(p_user_id, p_gold_price, p_silver_price, p_usd_to_local_rate)` — the engine.
  Returns `zakatable_assets`, `nisab_effective`, `zakat_due` (JSON).
- `get_zakat_hauls(p_user_id)` — per-holding/year Zakat history.
- `sync_zakat_haul_state(p_user_id, p_gold_price, p_silver_price, p_fx_rate)` — Hawl state machine
  (see §3). SECURITY DEFINER; `last_notified_at` is intentionally untouched by the RPC.

Both engine RPCs enforce owner verification: an authenticated JWT with a mismatched
`p_user_id` raises; a NULL uid (service_role / cron) is allowed for background jobs; `anon`
has no EXECUTE at all (verified on prod 2026-10-18, see `SECURITY.md`).

## 2. Nisab and the 2.5% rate

- Nisab is the wealth threshold below which no Zakat is due. Effective Nisab is derived from
  live **gold** (primary) and **silver** prices per gram, converted to the user's currency via
  the USD FX rate — all passed as RPC parameters, never hardcoded in clients.
- Zakat due = 2.5% of `zakatable_assets` once assets ≥ effective Nisab.
- Zakatable base spans cash, `zakat_holdings` (gold/silver), investments, and offsetting debts —
  composed inside the RPC, not the UI.
- Fixtures/defaults used by tests and fallbacks: gold 30, silver 0.35, fx 1.0 (see
  `sync_zakat_haul_state` defaults and `supabase/tests/zakat_*.sql`).

## 3. Hawl tracking (Zakat Autopilot, Phase C)

Migration `20261021000000_zakat_autopilot.sql` encodes the fiqh Hawl rules as a state machine:

- Table `zakat_haul_tracking` — one row per user: `nisab_reached_at`, `current_haul_due_at`
  (= start + **354 days**, the Hijri year), `last_notified_at` (anti-spam, cron-written only).
- State transitions inside `sync_zakat_haul_state`:
  - assets ≥ Nisab, no clock → **start** the Hawl (now, now + 354d)
  - assets ≥ Nisab, clock running → **keep** it (Hawl continuity — a running haul never restarts)
  - assets < Nisab → **break** the Hawl (both timestamps cleared; next crossing restarts)
- RLS: clients get **SELECT-only** on their own row; there is deliberately **no INSERT/UPDATE
  policy** — writes happen only inside the SECURITY DEFINER RPC and via service_role crons, so
  a compromised client token cannot forge or reset its clock.
- `last_notified_at` is written only by the cron route, and only after an actual push delivery
  (quiet-hours users must not be stamped as notified — audit fix, 2026-10-19).

## 4. Live prices and the mock-reality rule

- Gold/silver: `api.gold-api.com/price/{XAU,XAG}` (CORS-enabled, USD/troy-oz) via
  `/api/zakat/prices` and the autopilot cron. The former source freegoldapi.com served a
  **JSON array, gold-only, ~8 months stale** — tests mocked the assumed shape, went green, and
  production broke (CLAUDE.md rule 13 exists because of this).
- FX: `/api/exchange-rate`; the FX fetch is deliberately decoupled from the Yahoo stock-price
  `Future.wait` so a Yahoo CORS failure no longer forces `usdRate = 1.0`.
- When writing tests that mock these endpoints, curl the live URL and paste the real response
  shape + date into a comment beside the fixture.

## 5. Live Price Fetching (v3.46.0+)

**Clients MUST NOT compute Zakat**, but they MUST fetch the inputs (prices) and pass them to the RPC.

- Web: `lib/zakat-prices.ts` exports `fetchZakatPrices()` → returns `{ goldPrice, silverPrice, fxRate }` in user's local currency
- Mobile: `lib/services/metal_price_service.dart` exports `fetchZakatPrices()` with identical contract
- Cron: `/api/zakat-autopilot` calls `fetchZakatPrices()` once per currency (KWD, JOD, SAR) and passes live prices to `sync_zakat_haul_state`
- **Failure mode:** if price fetching fails for a user, the cron **skips that user** — it does NOT fall back to RPC defaults ($30/0.35/1.0)
- Source: `api.gold-api.com/price/{XAU,XAG}` for gold (XAU) and silver (XAG) in USD/troy-oz; FX from `/api/exchange-rate`
- Test fixtures for these endpoints must be verified live (CLAUDE.md rule 13) — paste real response + date

## 6. Cron and notification flow

1. Daily Vercel cron `0 8 * * *` → `/api/zakat-autopilot` (secret: `ZAKAT_AUTOPILOT_SECRET`).
2. Route iterates users, calls `sync_zakat_haul_state` with **live** prices (never stale
   defaults), and composes a localized push (language from `profiles.lang`).
3. Push is queued through `notification_history` → Edge Function (quiet hours + masking
   checked) → FCM/Web Push → row in `alerts` for in-app display.
4. Push fires when the Hawl is due or ≤ 7 days remain; `last_notified_at` stamps only on
   successful delivery.
5. Separate `/api/zakat-reminder` cron handles haul reminders (GitHub Actions schedule).

## 7. Where the code lives

| Piece | Location |
|---|---|
| Engine v2 migration | `supabase/migrations/20261019000000_zakat_engine_v2.sql` |
| Autopilot migration | `supabase/migrations/20261021000000_zakat_autopilot.sql` |
| DB unit tests (pgTAP) | `supabase/tests/zakat_*.sql` |
| Web calculator | `app/(dashboard)/dashboard/zakat/page.tsx` |
| Web Hawl card | `components/dashboard/ZakatHawlCard.tsx` |
| Live price fetcher (web) | `lib/zakat-prices.ts` |
| Live price fetcher (mobile) | `mobile/fajrak_flutter/lib/services/metal_price_service.dart` |
| Prices + autopilot routes | `app/api/zakat/prices/`, `app/api/zakat-autopilot/`, `app/api/zakat-reminder/` |
| Mobile calculator | `mobile/fajrak_flutter/lib/screens/more/zakat_calculator_screen.dart` |
| Zakat tables | `zakat_history`, `zakat_holdings`, `zakat_haul_tracking` |

## 8. FIRE and halal investing

- **FIRE**: `/dashboard/fire` (web) and `more/fire_calculator_screen.dart` (mobile) with
  Lean/Normal/Fat modes; the simulation layer is `components/investments/wealth-simulator.tsx`
  (web) / `WealthSimulatorCard` (mobile). FIRE number math is display-side planning, not stored
  finance state — unlike Zakat, it has no RPC (deduplication of non-Zakat metrics is an open
  risk, `HANDOFF_REPORT.md` §8).
- **Halal investing**: `investments.is_halal` flag tags holdings as halal; surfaced in the
  portfolio (web `dashboard/investments/`, mobile `investments/`) and in gamification badges
  ("Halal Investor"). It is a label only — no screening logic lives in the repo; do not add
  screening data sources without an ADR.

## 9. Checklist before touching this domain

- [ ] No Zakat/Nisab/Hawl math added to web or mobile — RPC only.
- [ ] Any new price source verified live (rule 13) with the response shape documented.
- [ ] Cron changes respect `ZAKAT_AUTOPILOT_SECRET` and quiet hours.
- [ ] pgTAP fixtures (`supabase/tests/zakat_*.sql`) updated alongside RPC changes.
- [ ] UI strings added to both `lib/locales/en` + `ar` and mobile `assets/i18n/*.json`
      (i18n key-parity test runs on both sides).
