# Pre-Deletion Investigation Report: Impact of Removing CPU-Heavy Routes

**Date:** 2026-10-31  
**Status:** READ-ONLY investigation — no code modified

---

## Executive Summary

| Route | Safe to Delete? | Primary Risk |
|-------|----------------|--------------|
| `/api/smart-notifications` | **YES** — with caveat about external schedulers | GitHub Actions workflow will 404 (acceptable) |
| `/api/agent/proactive` | **YES** — shares NO code with Interactive Chat | Vercel cron entry missing (already disabled in `vercel.json`) |
| `proxy.ts` matcher change | **CONDITIONAL** — proposed matcher BREAKS `/auth/callback` and landing page Clerk session | Must add `/auth/:path*` to matcher |

**Final Verdict:** **Safe to proceed with deletions of both cron routes** — but `proxy.ts` matcher needs adjustment before deployment.

---

## 1. `/api/smart-notifications` — Impact Analysis

### 1.1 What It Does
This is the **master cron orchestrator** that runs hourly (triggered by GitHub Actions 2×/day at 03:00 and 15:00 UTC). It fans out to:
- `dailyMorningReminder()` — 6 AM local: budget reminder + debt due
- `smartAlerts()` — calls `/api/alerts` (separate route)
- `autoSalary()` — calls `/api/auto-salary` (separate route)
- `autoDebt()` — calls `/api/auto-debt` (separate route)
- `autoRecurring()` — calls `/api/auto-recurring` (separate route)
- `eveningReminder()` — 6 PM local: end-of-day nudge
- `weeklyReport()` — Fridays 8 AM: weekly summary
- `wealthGuidanceAlert()` — 7 PM: financial stage guidance + daily lesson
- `receivableDebtReminder()` — debt collection reminders
- `smartNudge()` — 12 PM: inactive user nudge (3 days no transactions)
- `zakat-haul-check` — 10 AM: calls `/api/zakat-reminder`

### 1.2 Dependents (Who Calls It)
| Caller | Type | Frequency |
|--------|------|-----------|
| `.github/workflows/smart-notifications.yml` | GitHub Actions | 2×/day (03:00, 15:00 UTC) |
| **No UI components** call this route | — | — |
| **No other API routes** import from it | — | — |

### 1.3 Code Ownership
- **Contains NO unique implementation** of `sendPushToUser` — imports from `lib/push-send.ts` (shared by 14+ other routes)
- **Contains NO unique business logic** — all queries are direct Supabase calls
- **Orchestrates only** — delegates to other cron routes (`/api/alerts`, `/api/auto-salary`, etc.)

### 1.4 Functionality Lost If Deleted
| Feature | Alternative |
|---------|-------------|
| Morning budget reminder (6 AM) | `/api/daily-reminder` exists separately (manual/test only) |
| Evening reminder (6 PM) | `/api/evening-reminder` exists separately |
| Weekly report (Friday) | `/api/weekly-report` exists separately |
| Wealth guidance + daily lesson (7 PM) | **NO separate route** — this logic lives ONLY here |
| Receivable debt reminders | **NO separate route** |
| Smart nudge (inactive users) | `/api/new-user-nudge` exists but different logic |
| Zakat haul check (10 AM) | `/api/zakat-reminder` exists separately |
| Fan-out to alerts/auto-salary/auto-debt/auto-recurring | Those routes have their own Vercel crons |

### 1.5 Verdict for `/api/smart-notifications`
✅ **SAFE TO DELETE** — but **wealth guidance + receivable debt reminders + smart nudge logic will be lost** unless migrated to individual cron routes first.

**Recommended:** Before deleting, extract `wealthGuidanceAlert()`, `receivableDebtReminder()`, and `smartNudge()` into their own cron routes (e.g., `/api/wealth-guidance`, `/api/receivable-debt-reminder`, `/api/smart-nudge`) and add to `vercel.json`.

---

## 2. `/api/agent/proactive` — Impact Analysis

### 2.1 What It Does
Daily cron (06:00 UTC) that analyzes each user's financial state and generates **proactive push insights**:
1. Budget > 90% used → "Budget nearly exhausted"
2. Debt due within 3 days → "Payment due soon"
3. Spending up >20% vs last month → "Spending increased"

Uses **deduplication fingerprints** via `notification_history` to avoid repeat alerts.

### 2.2 Dependents (Who Calls It)
| Caller | Type | Status |
|--------|------|--------|
| `vercel.json` | Vercel Cron | **COMMENTED OUT** (see CHANGELOG.md line 106-108) |
| GitHub Actions | None | — |
| UI Components | None | — |
| Other API Routes | None | — |

### 2.3 Code Sharing with Interactive Chat (`/api/byok/agent`)

| Component | Used by Proactive? | Used by Interactive Chat? |
|-----------|-------------------|--------------------------|
| `lib/agent/tools.ts` (`AGENT_TOOLS`) | **YES** — imports `getBudgets`, `getDebts`, `getCashflowSummary` from `lib/unified-tools` | **YES** — same registry used by `runAgentLoop` |
| `lib/unified-tools/index.ts` | **YES** — `getBudgets`, `getDebts`, `getCashflowSummary` | **YES** — all agent tools use these |
| `lib/agent/loop.ts` | **NO** — proactive uses simple rule-based logic | **YES** — interactive chat uses full LLM loop |
| `lib/push-send.ts` | **YES** — `sendPushToUser` | **YES** — chat doesn't send pushes |
| `sendPushToUser` fingerprint logic | **YES** — custom fingerprints for deduplication | **NO** — chat doesn't use fingerprints |

**Key Finding:** The **tools are shared** (`lib/unified-tools` functions), but the **execution logic is completely separate**:
- Proactive: Simple deterministic rules → direct `sendPushToUser` calls
- Interactive: LLM-driven tool calling via `runAgentLoop` → tools execute via RLS client

### 2.4 Functionality Lost If Deleted
- Daily proactive budget/debt/spending alerts (push notifications)
- No impact on interactive chat — different code path entirely

### 2.5 Verdict for `/api/agent/proactive`
✅ **SAFE TO DELETE** — already disabled in `vercel.json` (commented out). No UI or other routes depend on it. Shared tools (`lib/unified-tools`) remain untouched.

---

## 3. `proxy.ts` Matcher Change — Impact Analysis

### 3.1 Current Matcher (Production)
```typescript
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
}
```
This matches **ALL routes** except static assets — including `/auth/callback`, `/login`, `/register`, `/dashboard/*`, `/api/*`, etc.

### 3.2 Proposed Matcher (From Prompt)
```typescript
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/onboarding',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/__clerk/:path*'
  ],
}
```

### 3.3 Routes That Would Be EXCLUDED (Broken)

| Route | Current Behavior | Proposed Matcher | Impact |
|-------|------------------|------------------|--------|
| `/auth/callback` | Clerk OAuth callback → sets session cookies | **NOT MATCHED** | **BROKEN** — Clerk session not established |
| `/login` | Clerk sign-in page | **NOT MATCHED** | Clerk middleware not applied — session unavailable |
| `/register` | Clerk sign-up page | **NOT MATCHED** | Same as login |
| `/forgot-password` | Clerk password reset | **NOT MATCHED** | Broken |
| `/reset-password` | Clerk password reset | **NOT MATCHED** | Broken |
| `/` (landing page) | Clerk session available for "Sign In" button | **NOT MATCHED** | `x-clerk-user-id` header not set |
| `/api/byok/*` | BYOK proxy/agent — session auth | **MATCHED** by `/api/:path*` | ✅ Works |
| `/api/mcp/*` | Not present in codebase | N/A | — |

### 3.4 Critical Issue: `supabase.auth.getUser()` in `proxy.ts`
The proxy middleware calls:
```typescript
const { data: { user } } = await supabase.auth.getUser()
```
This sets `x-user-id` and `x-user-email` headers used by **legacy Server Components** that read these headers instead of calling `getUser()` themselves.

**If matcher excludes `/auth/callback`:**
1. Clerk OAuth callback runs without middleware
2. Session cookies not set by Clerk middleware
3. `supabase.auth.getUser()` returns null
4. `x-user-id` header not set
5. Legacy Server Components break

### 3.5 Required Fix for Proposed Matcher
Add `/auth/:path*` to matcher:
```typescript
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/auth/:path*',        // ← ADD THIS
    '/onboarding',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/__clerk/:path*'
  ],
}
```

**Also consider:** The catch-all `/((?!_next/static|...).*)` already matches `/login`, `/register`, `/` — but it's **after** the explicit routes, so it works. However, putting `/auth/:path*` explicitly is clearer and ensures Clerk middleware runs on auth routes.

---

## 4. External Schedulers Verification

### 4.1 GitHub Actions (`.github/workflows/smart-notifications.yml`)
- **Calls:** `/api/smart-notifications` only
- **Frequency:** 2×/day (03:00, 15:00 UTC)
- **Auth:** `CRON_SECRET` bearer token
- **If route deleted:** Workflow fails with 404 → exits with error code
- **Mitigation:** Delete workflow file or update to call individual cron routes

### 4.2 Vercel Cron (`vercel.json`)
| Route | Schedule | Status |
|-------|----------|--------|
| `/api/auto-debt` | 0 3 * * * | Active |
| `/api/auto-recurring` | 0 3 * * * | Active |
| `/api/budget-alerts` | 0 4 * * * | Active |
| `/api/zakat-autopilot` | 0 8 * * * | Active |
| `/api/cleanup-notifications` | 0 2 * * 0 | Active |
| `/api/agent/proactive` | **NOT PRESENT** | Commented out historically |

### 4.3 cron-job.org
- **Referenced in docs** (README.ar.md lines 292, 426; `app/api/daily-reminder/route.ts` line 9)
- **No actual configuration found** in repo
- **Comment in `daily-reminder`:** "Ensure cron-job.org doesn't run this automatically to avoid duplicate notifications"
- **Conclusion:** Likely **not actively used** — docs may be outdated

### 4.4 Impact of Deleting Routes on Schedulers
| Scheduler | Route | Error If Deleted | Safe to Ignore? |
|-----------|-------|------------------|-----------------|
| GitHub Actions | `/api/smart-notifications` | 404 → workflow fails | ✅ Yes — delete workflow |
| Vercel Cron | `/api/agent/proactive` | Not configured | ✅ N/A |
| cron-job.org | Unknown | Unknown | ⚠️ Verify externally |

---

## 5. Interactive AI Chat / BYOK / MCP — Dependency Trace

### 5.1 Interactive Chat (`/dashboard/chat`)
- **Route:** `app/(dashboard)/dashboard/chat/page.tsx` → `components/dashboard/chat-assistant.tsx`
- **API Calls:** `/api/byok/agent` (proxy providers) or direct to Ollama
- **Tools Used:** `lib/agent/tools.ts` → `lib/unified-tools` (getBudgets, getDebts, getCashflowSummary, etc.)
- **NO dependency on:** `/api/smart-notifications`, `/api/agent/proactive`

### 5.2 BYOK Proxy (`/api/byok/proxy`)
- **Route:** `app/api/byok/proxy/route.ts`
- **Auth:** Session cookie (web) or Bearer JWT (Flutter)
- **Rate Limit:** `bump_proxy_usage` RPC (30/min)
- **NO dependency on:** cron routes

### 5.3 MCP Server
- **Not found in codebase** — no `/api/mcp` route exists
- **PAT-based auth** would use `lib/unified-tools` with admin client (service role)
- **NO dependency on:** cron routes

---

## 6. Final Verdict

### ✅ Safe to Delete
1. **`/api/agent/proactive`** — Already disabled in `vercel.json`, no dependents, shares only `lib/unified-tools` (which stays)
2. **`/api/smart-notifications`** — No UI dependents, GitHub Actions workflow will fail (delete workflow file too)

### ⚠️ Conditional: `proxy.ts` Matcher Change
**DO NOT DEPLOY proposed matcher as-is.** It breaks:
- `/auth/callback` (OAuth flow)
- `/login`, `/register`, `/forgot-password`, `/reset-password` (Clerk auth pages)
- Landing page `/` (Clerk session for "Sign In" button)

**Required fix:** Add `/auth/:path*` to matcher before deployment.

### 📋 Pre-Deletion Checklist
- [ ] Extract `wealthGuidanceAlert()`, `receivableDebtReminder()`, `smartNudge()` from `smart-notifications` into individual cron routes
- [ ] Add new cron routes to `vercel.json`
- [ ] Delete `.github/workflows/smart-notifications.yml`
- [ ] Delete `/api/smart-notifications/route.ts`
- [ ] Delete `/api/agent/proactive/route.ts` (and its test file)
- [ ] Update `proxy.ts` matcher to include `/auth/:path*`
- [ ] Verify Clerk auth flow works end-to-end (login → callback → dashboard)
- [ ] Verify `/api/byok/agent` and `/api/byok/proxy` still work
- [ ] Run `npm test` and `npm run test:e2e`

---

## 7. Evidence Appendix

### Files Read
- `app/api/smart-notifications/route.ts` (458 lines)
- `app/api/agent/proactive/route.ts` (259 lines)
- `proxy.ts` (102 lines)
- `lib/agent/tools.ts` (480 lines)
- `lib/unified-tools/index.ts` (529 lines)
- `app/api/byok/proxy/route.ts` (248 lines)
- `app/api/byok/agent/route.ts` (377 lines)
- `lib/push-send.ts` (141 lines)
- `.github/workflows/smart-notifications.yml` (34 lines)
- `vercel.json` (9 lines)
- `app/api/auth/callback/route.ts` (39 lines)
- `components/dashboard/chat-assistant.tsx` (partial)
- `lib/byok/client.ts` (209 lines)

### Grep Results Summary
- `smart-notifications`: 36 matches (docs, workflows, tests, route_normalizer)
- `agent/proactive`: 24 matches (docs, tests, route_normalizer)
- `sendPushToUser`: 100 matches (14+ route files, tests, docs)
- No UI imports of either cron route
- No MCP routes found in codebase