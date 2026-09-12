# FinanceTracker (Fajrak) — Deep Project Analysis

Generated from the repo's own docs — `CLAUDE.md`, `structure.md`, `VISION.md`, `PRODUCT.md`, `DESIGN.md`, `API_DOCS.md`, `AUDIT_REPORT_AR.md`, `store-listing.txt` — plus live toolchain verification of the repo at HEAD `fcea7f69` (v3.40.0).

---

## 1. Executive Summary

FinanceTracker, internally branded **Fajrak (فجرك = "Your Dawn")**, is an Arabic-first personal finance app with a Next.js 16 Web app and a Flutter mobile app. It targets the Arab world, primarily Kuwait/Gulf users, in KWD with full RTL support.

**Toolchain status: green.** TypeScript, ESLint, 524 Jest unit tests, 7 Playwright E2E specs, coverage, and `next build` all pass. The only non-green artifact is a *clean* `npm run doctor` exit code, which is blocked purely by the environment (the user's live `next dev` on port 3000 holds the `.next` lock) — not by code.

**The two biggest non-code findings:**
1. **Identity mismatch** — the design spec (`DESIGN.md`) and product docs call the app "Fajrak" and frame it as a **Flutter mobile app**, while the store listing ships as **"FinanceTracker"** and the repo is overwhelmingly a web product. This is a naming/branding fork that should be resolved explicitly.
2. **A known accounting bug** (`AUDIT_REPORT_AR.md` §6.1, §12.2): the web net-worth calc historically excluded account balances and savings-goal values. It is flagged as unfixed in the audit; the fix target is dashboard `page.tsx`.

---

## 2. Product Narrative

| Doc | Key claims |
|-----|-----------|
| `VISION.md` | Fajrak/فجرك = "Your Dawn". Mission: Arab financial freedom. Values: الحرية (freedom), التكافؤ (solidarity/equity), الأمانة (trustworthiness), البساطة (simplicity), الجذور (roots). Built in Jordan for the Arab world; core is free. |
| `PRODUCT.md` | Users are Arabic-speaking, primarily Kuwait / Gulf. Brand: "Dawn, Purposeful, Grounded". Current web theme: dark navy `#070B14`; direction = dawn metaphor (amber/gold horizon on numbers). Principles: **numbers first, earned decoration, RTL native, calm urgency, no spectacle.** |
| `DESIGN.md` | Design sources = Stripe (visual) + Apple HIG (behavior) + Material 3 (Flutter implementation). Framed explicitly as a **Flutter Mobile App**. Rule of thumb: *"Stripe tells us how things should look. Apple HIG tells us how things should behave. Material 3 tells us how to build it in Flutter."* |
| `store-listing.txt` | **Name on store: "FinanceTracker"** — Arabic *FinanceTracker - ادارة مالية*, English *FinanceTracker - Smart Finance*. Tagline: "تتبع مصاريفك وديونك واستثماراتك بذكاء في مكان واحد" / "Track expenses, debts and investments intelligently in one place". Category: Finance; Content Rating: Everyone; Website: `https://financetracker-brown.vercel.app`. Features advertised: charts dashboard, Quick Add, monthly budget + overspend alerts, debt management with auto monthly deduction, live investment prices (stocks + crypto), AI-powered smart alerts, Arabic/English with full RTL, light + dark mode. |

**Feature surface** (from CLAUDE.md + verified routes): dashboard, transactions, accounts, debts (owed + receivable, auto-deduct, payment day), investments (stocks/ETFs/crypto), budgets, savings goals, alerts + push notifications (web push + FCM), AI chat assistant, health score, PDF report, Zakat, gamification (streaks/points/badges) — mirrored across web and Flutter.

---

## 3. Architecture

### 3.1 Web
- **Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind CSS.** Server Components with `lib/supabase/server.ts`; client components with `lib/supabase/client.ts` + TanStack Query v5.
- **~40 app routes** across `(auth)` and `(dashboard)` (accounts, alerts, budgets, chat, dashboard, debts, fire, goals, help, investments, learn, pdf-report, settings, transactions, zakat, download) + **~24 API routes** (alerts, cron, health-score-snapshot, stock-price, push-subscribe, push-test, testimonials, api-keys, etc.) behind middleware proxy.
- **Supabase (PostgreSQL)** with RLS enabled everywhere; **numbered migrations** in `supabase/migrations/` (039+ per API doc references).
- Auth: **Supabase Auth**. Monitoring: **Sentry**. Notifications: **Firebase + Web Push**. i18n: custom Arabic/English system.

### 3.2 Mobile (`mobile/fajrak_flutter/`)
- Flutter (app name **Fajrak**), Provider + Supabase Flutter SDK, easy_localization (ar/en, RTL), screens + widgets + services, `Makefile` (doctor/build-apk).
- Store binary published as **FinanceTracker** (see identity mismatch).

### 3.3 External API surface (`API_DOCS.md`)
Two auth tiers:
1. **Internal (cron):** Bearer `CRON_SECRET` — used by automation (e.g. `health-score-snapshot`, `stock-price`).
2. **Public (PAT):** API keys prefixed `fjk_live_...` (migration 039 → `user_api_keys`). Managed via `/api/api-keys/*`. Scopes: `create_transaction`, `read_transactions`, `read_balances`. Max 5 active keys/user. Server stores only partial SHA-256 hash — never plaintext. Verified by `verifyApiKey` (`lib/api-keys.ts`), which rejects revoked/expired keys and returns identity + scopes + `rateLimitPerMin`. Successful calls fire-and-forget log to `api_audit_log`. Rate limiting keyed `${scope}:{keyId}`/min → 429.

Key endpoints: `/api/health-score-snapshot` (per-user health score computed from savings rate, debt ratio, emergency fund, investments, activity → saved to `health_scores`), `/api/stock-price` (live-investment refresh).

---

## 4. Financial Logic Model (`AUDIT_REPORT_AR.md`)

### 4.1 Core equations (canonical)
```
account_balance      = opening_balance + Σ(income) − Σ(expenses) + Σ(transfers_in) − Σ(transfers_out)
net_monthly          = Σ(income) − Σ(expenses) − Σ(debt_payments)
net_worth            = Σ(account_balances) + Σ(price×shares) + Σ(savings_goals) + Σ(receivable) − Σ(remaining_debt)
savings_rate         = (income − expenses) / income
debt_to_income       = total_debt / (monthly_income × 12)
emergency_ratio      = savings_goals / (monthly_income × 3)
health_score         = composite(savings_rate, debt_ratio, emergency, investments, activity)
```

### 4.2 Asset/liability classification
- Assets: accounts (book value), investments (market value), savings goals (book value), receivable debts.
- Liabilities: owed debts (remaining amount).
- Debts support foreign-currency amounts (`original_amount_foreign`, `remaining_amount_foreign`, `exchange_rate`).
- Receiving a debt posts an `income` transaction (`category: 'دين مستلم'`) and marks `is_paid = true`.

### 4.3 Known issues (from the audit)
| # | Issue | Severity | Target |
|---|-------|----------|--------|
| 1 | Web net worth excluded account balances + savings goals (`page.tsx:219`, `netWorth: invValueLocal`) | ❌ bug | dashboard `page.tsx` |
| 2 | Investment prices not auto-refreshed / staleness not checked | ⚠️ | investments service |
| 3 | FX rates not updated | ⚠️ | currency util |
| 4 | `debt_payments` table not fully used (direct `remaining_amount` updates) | ⚠️ | debt flows |

*Caveat: the audit predates the current HEAD; the listed bug may have been fixed since. The codebase audits itself elsewhere (webhas pass on unit level); the equation `net_worth` in §8.3 is the one to test against.* Recommended verification: grep dashboard net-worth computation and assert it includes `totalAccountBalances` + `savingsGoalsValue`.

---

## 5. Design System (mobile-first, `DESIGN.md`)

- **Method:** Stripe for LOOK (restraint, borders, fina-number hierarchy, whitespace), Apple HIG for BEHAVIOR (touch targets, feedback timing, navigation clarity, progressive disclosure, error prevention, gestures), Material 3 for BUILD (components, RTL, dark mode, color scheme, accessibility).
- Sections: philosophy → color → typography → spacing → radius → the Stripe elevation rule → iconography → components → navigation → screen patterns → interaction/feedback → motion → dark mode.
- Arabic-first with RTL as the native layout (web is currently LTR-first Tailwind; RTL polish is aligned with PRODUCT.md "RTL native").

---

## 6. Documentation Consistency Gaps

| Doc | Says | Reality |
|-----|------|---------|
| `structure.md` | Simplified layout: `(auth)` + `(dashboard)`, components dir, `migrations/001_initial.sql` | **Stale** — repo has ~40 App Router routes, `components/ui` + `components/dashboard` + `components/layout`, ~24 API routes, middleware, migrations 039+. |
| `DESIGN.md` / product docs | App is **Flutter** "Fajrak" | Repo is ~95% Next.js web; Flutter is a small mobile twin. |
| `VISION.md` / `PRODUCT.md` / `CLAUDE.md` | Name **Fajrak / فجرك**; default currency **KWD** (CLAUDE.md) | Store listing = **FinanceTracker**; `AUDIT_REPORT_AR.md` examples use **JOD**; PRODUCT.md says Kuwait/Gulf. Currency default needs a single source of truth. |
| `CLAUDE.md` | v3.40.0+51; support `support@fajrak.com` | Matches `pubspec.yaml`; correct. |

**Consistency recommendation:** pick one canonical product name (recommend **Fajrak/فجرك** per VISION + DESIGN + mobile identity, with "FinanceTracker" as the store-facing brand, documented explicitly), unify default-currency (KWD) across docs and examples, and refresh `structure.md`.

---

## 7. Toolchain Verification (HEAD `fcea7f69`, v3.40.0)

| Gate | Result |
|------|--------|
| `npx tsc --noEmit -p tsconfig.typecheck.json` | ✅ exit 0 |
| `npm run lint` (ESLint) | ✅ exit 0 |
| Jest full suite | ✅ 56 suites / **524 tests pass** (was 9 failing suites at session start — all fixed) |
| Coverage (whole-project) | ✅ 44.85% stmts / 30.78% branch / 30.7% funcs / 48.07% lines — no threshold failure |
| Playwright E2E | ✅ 7/7 (~46.5s): auth-flow, smoke, transaction-management |
| `next build` | ✅ proven green (full route table) |
| `npm audit` | ⚠️ 8 moderate, all `@opentelemetry/*` (<2.8.0 chain) — exits 0 at `--audit-level=high`, no action required |
| `npm run doctor` | ⚠️ run #1 full chain passed; run #2 exits 1 **only** because user's live `next dev` (PID 514615) holds the `.next` lock — environmental, **do not kill the dev server** |
| Live dev (`localhost:3000`) | ✅ `/`=200, `/login`=200, `/dashboard`=307 (auth redirect, expected) |

---

## 8. Recommendations (priority order)

1. **Resolve product identity** — pick canonical name/brand (Fajrak vs FinanceTracker), unify in docs + store listing + DESIGN.md framing.
2. **Audit the net-worth equation live** — the `AUDIT_REPORT_AR.md` §6.1 bug target is web dashboard `page.tsx`; verify it now includes accounts + savings goals after the repo's subsequent changes.
3. **Refresh `structure.md`** to match the real ~40-route App Router layout.
4. **Single source of truth for default currency** (KWD) across CLAUDE.md, audit examples, and util.
5. **Declare stale data policy** — investment prices + FX refresh cadence (job/cron + last-updated stamp per asset), per audit §6.3.
6. **Adopt `debt_payments` ledger fully** instead of direct `remaining_amount` mutations (audit §6.3.4).
7. **Keep docs in sync with API surface** — `API_DOCS.md` should document all ~24 routes, not just health-score/stock-price; note PAT + `CRON_SECRET` two-tier auth as current.
8. **Turn clean-doctor into a CI gate** once the dev-server lock issue is removed (run builds in CI where port/lock conflicts don't apply).