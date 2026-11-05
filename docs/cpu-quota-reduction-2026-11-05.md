# Vercel CPU / memory quota reduction — implementation report

**Date:** 2026-11-05
**Scope:** 4 fixes from the Hobby-quota investigation (project `prj_uh9Tkj9oUMwo4zA2tuinX4dVyvC0`)
**Status:** Applied locally, verified with typecheck + build, **not committed, not pushed, not deployed**

---

## Phase 0 — Context

The Vercel project was paused on 2026-10-31 with Hobby Fluid usage at:

| Metric | Used | Limit | % |
|---|---|---|---|
| Fluid Active CPU | 3h 44m | 4h | 93% |
| Provisioned Memory | 291.7 GB-hrs | 360 GB-hrs | 81% |
| Invocations | 104K | 1M | 10% |

The 10% invocation figure against 81–93% compute is the signature of **per-invocation cost**, not
traffic: ~129 ms active CPU but ~10.1 GB-seconds provisioned per invocation (≈10 s of wall time at
1 GB). Long-lived, mostly-idle Node functions are the cost centre.

The four fixes below target invocation count (matcher), scheduled invocations (crons), and
per-invocation network I/O (auth round-trip).

---

## Phase 1 — Pre-flight audit verdict

**Verdict: PASS** (1 caveat — see OQ-1)

The four fixes were audited against the current HEAD *before* being applied. None of them was
already present; `proxy.ts` contained a partial mitigation (an early `return` for public paths)
that did **not** stop the function from running, because the catch-all matcher forced execution
first.

| # | Fix | Pre-existing state | Applicable | Behaviour-changing |
|---|---|---|---|---|
| 1 | `proxy.ts` matcher | catch-all present (partial mitigation only) | yes | no (see F-1) |
| 2 | `vercel.json` crons | 8 crons | yes | **yes** (4 jobs stop) |
| 3 | `app/(dashboard)/layout.tsx` | `getUser()` | yes | no (see F-3) |
| 4 | `package.json` deps | 3 prod deps | yes | no (see F-4) |

Note: the task text started at "Fix 2"; Fix 1 (`git add proxy.ts` in the next-steps list) was
reconstructed from that reference as the matcher scope fix.

---

## Phase 2 — Fixes applied

### Fix 1 — `proxy.ts`: remove the catch-all matcher

**Before**

```ts
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/auth/:path*',
    '/onboarding',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/__clerk/:path*'
  ],
}
```

**After**

```ts
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/auth/:path*',
    '/auth-confirm',
    '/onboarding',
    '/__clerk/:path*'
  ],
}
```

**Why this is behaviour-preserving:** the function already returned `NextResponse.next()` for every
non-protected path (`isProtectedPath` guard). That return sends the request through untouched, so
excluding those paths from the matcher produces a byte-identical response — it only stops the
function from being instantiated and billed.

**Why `/auth-confirm` was added:** the task's path list omitted it. It is a route handler at
`app/auth-confirm/route.ts`, and it does **not** match `/auth/:path*`. Under the old catch-all it
hit the middleware and received the CSP header. Adding it explicitly preserves that.

**Why the `isProtectedPath` guard was kept:** it is now always true, but it stays as
defence-in-depth against a future matcher widening (same reasoning as the existing comment in
`app/(dashboard)/layout.tsx`).

**Verified in the build artefact:**

```
$ node -e "const j=require('./.next/server/functions-config-manifest.json'); \
  const m=j.functions['/_middleware']; console.log(m.runtime); \
  m.matchers.forEach(x=>console.log(' -',x.originalSource))"

nodejs
 - /dashboard/:path*
 - /api/:path*
 - /auth/:path*
 - /auth-confirm
 - /onboarding
 - /__clerk/:path*
```

No catch-all remains, and the runtime is `nodejs` (not edge), which matters for the CPU budget.

### Fix 2 — `vercel.json`: 8 crons → 4

**Before:** `/api/auto-debt`, `/api/auto-recurring`, `/api/budget-alerts`, `/api/zakat-autopilot`,
`/api/wealth-guidance`, `/api/receivable-debt-reminder`, `/api/smart-nudge`,
`/api/cleanup-notifications`

**After:** `/api/auto-debt`, `/api/auto-recurring`, `/api/budget-alerts`, `/api/zakat-autopilot`

```
$ node -e "console.log(require('./vercel.json').crons.length)" → 4
```

**Functional impact (product decision, please confirm):** the four removed jobs no longer run on a
schedule. Their route handlers still exist and remain callable manually:

| Removed cron | Schedule | Handler | Consequence |
|---|---|---|---|
| `/api/wealth-guidance` | `0 19 * * *` | `app/api/wealth-guidance/route.ts` | morning/evening wealth-guidance notification stops |
| `/api/receivable-debt-reminder` | `0 10 * * *` | `app/api/receivable-debt-reminder/route.ts` | receivable-debt reminder notification stops |
| `/api/smart-nudge` | `0 12 * * *` | `app/api/smart-nudge/route.ts` | midday smart-nudge notification stops |
| `/api/cleanup-notifications` | `0 2 * * 0` | `app/api/cleanup-notifications/route.ts` | weekly notification-table cleanup stops (data grows) |

None of these four paths is referenced by `.github/workflows/**`, so nothing else will trigger them.

### Fix 3 — `app/(dashboard)/layout.tsx`: `getUser()` → `getClaims()`

**Before**

```ts
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
```

**After**

```ts
const { data, error } = await supabase.auth.getClaims()
if (error || !data?.claims?.sub) redirect('/login')
```

**Downstream usage: VERIFIED** — the layout only used `user` as a boolean and never passed it to
children, so nothing consumed `user.id` / `user.email` from this call. `DashboardShell` receives
`children` only.

**Premise verified against the live project:** `getClaims()` only avoids the network round-trip
when the Supabase project uses asymmetric JWT signing keys. The project publishes an ES256 key:

```
$ GET https://ujwcvtpwsaidljecqbaa.supabase.co/auth/v1/.well-known/jwks.json
{"keys":[{"alg":"ES256","crv":"P-256","ext":true,"key_ops":["verify"],
          "kid":"9259e586-3751-4b00-9950-ebcfab27996c","kty":"EC","use":"sig", ...}]}
```

Checked 2026-11-05. So verification is local via WebCrypto against the cached JWKS. For a
symmetric-secret project `getClaims()` degrades to the same server call as `getUser()`, i.e. this
change is never slower.

### Fix 4 — `package.json` dependencies

| Package | Before | After | Justification |
|---|---|---|---|
| `playwright` | `dependencies` | `devDependencies` | only used by `test:e2e` / `e2e/*.spec.ts` |
| `jsdom` | `dependencies` | `devDependencies` | see OQ-1 |
| `install` | `dependencies` | **deleted** | no importer anywhere; not a real dependency |
| `@modelcontextprotocol/server` | `dependencies` | kept | imported at runtime by `app/api/mcp/route.ts:9` |

`package-lock.json` regenerated with `npm install --package-lock-only --ignore-scripts`
(jsdom now `dev: true`, `node_modules/install` gone, playwright `devOptional: true`).

---

## Phase 3 — Verification

### `npm run typecheck`

```
> fajrak@3.42.0 typecheck
> tsc --noEmit -p tsconfig.typecheck.json

TYPECHECK_EXIT=0
```

**PASS** — the `getClaims()` shape (`{ data: { claims } | null, error }`) type-checks against
`@supabase/supabase-js@2.117.2`.

### `npm run build`

```
BUILD_EXIT=0
```

Build completed and emitted the route table. Note that **every route is still `ƒ (Dynamic)`**,
including `/privacy`, `/terms`, `/help`, `/login` — that is the `await headers()` call in
`app/layout.tsx:76`, explicitly out of scope here (see Phase 6).

### All four fixes confirmed in place

```
$ node -e "…matchers…"                      → 6 matcher entries, no catch-all
$ node -e "require('./vercel.json').crons.length" → 4
$ grep -n "getClaims" "app/(dashboard)/layout.tsx" → present; no getUser
$ node -e "…lockfile…"                      → jsdom dev:true, install:false, playwright devOptional
```

---

## Phase 4 — Skills invoked

| # | Skill | Result |
|---|---|---|
| S-1 | `using-superpowers` | loaded (harness-provided); dictated process order |
| S-2 | `find-skills` | `npx skills find "nextjs performance"` / `"vercel deploy"` executed; see below |
| S-3 | `skill-scout` | local scan of `~/.claude/skills`, `~/.opencode/skills`, `~/.config/opencode/skills`; only `deployment-patterns` matched |
| S-4 | `verification-before-completion` | applied — typecheck/build run and outputs quoted before any success claim |
| S-5 | `systematic-debugging` | SKIPPED here (already applied in the preceding quota investigation; this task is implementation, not diagnosis) |

Skill discovery results (ranked, not installed — installation needs consent):

| Skill | Installs | Verdict |
|---|---|---|
| `vercel-labs/agent-skills@vercel-react-best-practices` | 871.8K | best general fit for this class of work |
| `vercel-labs/agent-skills@deploy-to-vercel` | 182.5K | out of scope (no deploy in this task) |
| `vercel-labs/agent-skills@vercel-optimize` | 121.9K | needs Vercel CLI + Observability Plus — unavailable here |
| `giuseppe-trisciuoglio/developer-kit@nextjs-performance` | 5K | secondary; unvetted |

The two high-install official skills were **not installed** — `skill-scout` requires reading an
external skill before adoption, and the task did not ask for installation.

---

## Phase 5 — What the user must do next

1. Do **not** `git push` yet — verify locally first with `npm test`.
2. If tests pass, stage **five** files (the task's list omitted the lockfile, which would break
   `npm ci` in CI):
   ```bash
   git add proxy.ts vercel.json package.json package-lock.json "app/(dashboard)/layout.tsx"
   ```
3. ```bash
   git commit -m "fix(cpu): scope proxy matcher, drop 4 crons, use getClaims, move test deps"
   ```
4. ```bash
   git push origin HEAD:fix/cpu-quota-reduction
   ```
5. On 2026-12-01 (or after unpause), merge and deploy.
6. Expected CPU after deploy: **~50–70 minutes/month (13–18% of quota)** — an estimate from the
   task brief, not a measurement; it cannot be measured while the project is paused and
   Observability Plus is unavailable.

Also required before merge by repo convention (`CONTRIBUTING.md`): add a `CHANGELOG.md` entry under
`[Unreleased]`, because Fix 2 stops four scheduled notifications (user-visible). It was **not**
written here to keep the diff to the four declared fixes.

---

## Phase 6 — What was NOT changed

- `app/layout.tsx` `await headers()` → still forces every route dynamic (**G-6**, out of scope).
  This is the largest remaining CPU driver after Fix 1.
- `proxy.ts` still calls **both** `auth()` (Clerk) and `supabase.auth.getUser()` for every matched
  request → the single biggest remaining per-request cost on `/dashboard` and `/api`.
- Git state → unchanged: **no commits, no pushes**.
- Remote → unchanged.
- Vercel project → **still paused** (`"live": false` re-checked 2026-11-05); no unpause attempted.
- `maxDuration = 120` on `/api/byok/proxy` and `/api/byok/agent` → untouched.
- Sentry `tracesSampleRate: 0.1` → untouched.

Pre-existing working-tree changes that are **not** part of this work and were left alone:
`.env.example`, `CHANGELOG.md`, `CONFIGURATION.md`, `__tests__/components/chat-assistant.test.tsx`,
`mobile/fajrak_flutter/.env.example`, `mobile/fajrak_flutter/Makefile`, plus 5 untracked docs under
`docs/`.

---

## Phase 7 — Open questions

**OQ-1 — `jsdom` is imported by production code, not just tests.**
`lib/moderation/index.ts:154` does `const { JSDOM } = await import('jsdom')` inside
`getDOMPurify()`, which backs `postOutputSanitize()`. It is currently **unreachable**: no module
outside `lib/moderation` imports it, so the build and typecheck pass without jsdom in production
dependencies. But if moderation is ever wired into a route or server action, that import will fail
at runtime in production. Either keep `jsdom` in `dependencies`, or move sanitisation to a
DOM-free sanitiser (e.g. a allow-list HTML parser) before that day. Decision needed.

**OQ-2 — Fix 2 disables four user-facing notifications.** Confirmed as intended? If
`wealth-guidance`, `receivable-debt-reminder`, `smart-nudge` must keep firing, they need another
scheduler (GitHub Actions already exists as a pattern in this repo) rather than Vercel crons.

**OQ-3 — Cluster invocations.** With the matcher scoped, a visitor who loads `/` and `/pricing`
no longer invokes a function at all; but the pages are still dynamically rendered *if* they render,
because of `headers()`. The estimate in step 5 assumes marketing traffic was a meaningful share.
