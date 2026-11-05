# CPU Fixes Verified — 2026-11-05

Mechanical verification pass on HEAD `5b837189` (branch `main`).
No fixes applied beyond the two declared additions in Step 3. No commit, no push, no deploy.

## TL;DR

| Item | Status |
|---|---|
| F1 — `proxy.ts` catch-all removed | **PRESENT** |
| F2 — `vercel.json` 8 crons → 4 | **PRESENT** |
| F3 — `getClaims()` in dashboard layout | **PRESENT** |
| F4 — `playwright`/`jsdom` → dev, `install` deleted | **PRESENT** |
| F5 — `package-lock.json` in sync | **PRESENT** |
| jsdom warning comment | **ADDED_NOW** |
| CHANGELOG entry | **ADDED_NOW** |
| typecheck | **PASS** (exit 0) |
| build | **PASS** (exit 0) |
| tests | **832 passed / 86 suites** (exit 0) |
| Git state | 12 modified + 7 untracked; 7 files belong to this workstream |

Nothing regressed. Nothing was blocked.

## Verification evidence

### 1.1 F1 — proxy matcher

```
$ grep -A10 "matcher:" proxy.ts | head -15
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

→ Six patterns, no `'/((?!_next/static|...).*)'` catch-all. **F1 PRESENT.**

### 1.2 F2 — crons

```
$ node -e "console.log(require('./vercel.json').crons.length)"
4

$ node -e "console.log(require('./vercel.json').crons.map(c=>c.path).join('\n'))"
/api/auto-debt
/api/auto-recurring
/api/budget-alerts
/api/zakat-autopilot
```

→ Count is 4 and the surviving paths are exactly the four expected ones. **F2 PRESENT.**

### 1.3 F3 — dashboard layout auth call

```
$ grep -n "getClaims\|getUser" "app/(dashboard)/layout.tsx" | head -5
19:  // getClaims() verifies the session JWT locally against the project's cached
21:  // the Auth server. getUser() always performs that round-trip on every
22:  // dashboard navigation. For legacy symmetric-secret projects getClaims()
23:  // degrades to the same server call as getUser(), so this is never slower.
24:  const { data, error } = await supabase.auth.getClaims()

$ grep -n "getUser(" "app/(dashboard)/layout.tsx"
21:  // the Auth server. getUser() always performs that round-trip on every
23:  // degrades to the same server call as getUser(), so this is never slower.
```

→ The only `getClaims` occurrence is the call site on line 24. The two `getUser(` hits are
**comment text**, not invocations — there is no `supabase.auth.getUser(` call in the file.
**F3 PRESENT.**

### 1.4 F4 — dependency placement

```
$ node -e "const p=require('./package.json'); ['playwright','jsdom','install'].forEach(h=>{const loc=p.dependencies?.[h]?'RUNTIME':p.devDependencies?.[h]?'DEV':'ABSENT';console.log(h+': '+loc);});"
playwright: DEV
jsdom: DEV
install: ABSENT
```

→ No package remains in `dependencies`. **F4 PRESENT.**

### 1.5 package-lock sync

```
$ grep -c '"node_modules/install"' package-lock.json
0

$ node -e "const l=require('./package-lock.json'); console.log('jsdom dev:', l.packages['node_modules/jsdom']?.dev === true)"
jsdom dev: true
```

→ Lockfile matches `package.json`: `install` entry gone, `jsdom` marked `dev`. **F5 PRESENT.**

### 4.1 typecheck

```
$ npm run typecheck 2>&1 | tail -3
> fajrak@3.42.0 typecheck
> tsc --noEmit -p tsconfig.typecheck.json

TYPECHECK_EXIT=0
```

→ PASS.

### 4.2 build

```
$ npm run build 2>&1 | tail -8
└ ƒ /terms

ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

BUILD_EXIT=0
```

→ PASS. (Observation, not a failure: every route still renders as `ƒ (Dynamic)` because of
`await headers()` in `app/layout.tsx` — out of scope by instruction.)

### 4.3 tests

```
$ npm test 2>&1 | tail -8
A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown. Try running with --detectOpenHandles to find leaks. Active timers can also cause this, ensure that .unref() was called on them.

Test Suites: 86 passed, 86 total
Tests:       832 passed, 832 total
Snapshots:   0 total
Time:        4.924 s
Ran all test suites.
TEST_EXIT=0
```

→ 832 passed / 86 suites, matching the stated baseline. The worker-teardown warning is
pre-existing noise, not a failure (exit 0, zero failed suites).

## What was added in this pass

1. **`lib/moderation/index.ts`** — warning comment directly above the dynamic import (2 lines):
   ```
   if (!dompurify) {
     // WARNING: jsdom is a devDependency. If this is ever imported from a
     // production route, add jsdom back to dependencies first.
     const { JSDOM } = await import('jsdom')
   ```
2. **`CHANGELOG.md`** — `### Changed (CPU quota reduction)` block plus `### Note`, inserted under
   `[Unreleased]` after the existing `### Changed` section (line 87) and before `### Fixed`.

## Git state (Step 4.4)

```
$ git status --porcelain
 M .env.example
 M CHANGELOG.md
 M CONFIGURATION.md
 M __tests__/components/chat-assistant.test.tsx
 M app/(dashboard)/layout.tsx
 M lib/moderation/index.ts
 M mobile/fajrak_flutter/.env.example
 M mobile/fajrak_flutter/Makefile
 M package-lock.json
 M package.json
 M proxy.ts
 M vercel.json
?? docs/cpu-fixes-verified-2026-11-05.md
?? docs/cpu-quota-reduction-2026-11-05.md
?? docs/cutover-runbook-2026-11-03.md
?? docs/fajrak-dossier-2026-11-02.md
?? docs/migration-deep-analysis-2026-11-03.md
?? docs/migration-status-2026-11-01.md
?? docs/week-0-report-2026-11-02.md
```

**CPU-workstream files (7):**

| File | Origin |
|---|---|
| `proxy.ts` | F1, prior session |
| `vercel.json` | F2, prior session |
| `package.json` | F4, prior session |
| `package-lock.json` | F5, prior session |
| `app/(dashboard)/layout.tsx` | F3, prior session |
| `lib/moderation/index.ts` | new in this pass (one comment) |
| `CHANGELOG.md` | new section added in this pass (file also carries unrelated pre-existing edits) |

**Pre-existing, untouched by this pass (5 modified + 5 untracked docs):**
`.env.example`, `CONFIGURATION.md`, `__tests__/components/chat-assistant.test.tsx`,
`mobile/fajrak_flutter/.env.example`, `mobile/fajrak_flutter/Makefile`;
`docs/cutover-runbook-2026-11-03.md`, `docs/fajrak-dossier-2026-11-02.md`,
`docs/migration-deep-analysis-2026-11-03.md`, `docs/migration-status-2026-11-01.md`,
`docs/week-0-report-2026-11-02.md`.

HEAD unchanged: `5b837189 chore: sanitize docs and add netlify.toml to fix secrets scan`.

## Ready-to-paste commit command

```bash
git add proxy.ts vercel.json package.json package-lock.json \
        'app/(dashboard)/layout.tsx' lib/moderation/index.ts CHANGELOG.md
git commit -m "fix(cpu): scope proxy matcher, drop 4 crons, use getClaims, move test deps"
git push origin HEAD:fix/cpu-quota-reduction
```

## OBSERVATIONS (not fixed — reported only)

**O-1 — `git add CHANGELOG.md` stages unrelated pre-existing entries.** `CHANGELOG.md` was already
modified before this workstream (Neon standby probe, `createClerkClient()`, Neon preview branch,
Clerk identity pipeline, Android minSdk, cron query load, perf indexes). The command above stages
all of it together with the CPU section. Either accept the bundle or use
`git add -p CHANGELOG.md` to stage only the `### Changed (CPU quota reduction)` / `### Note` hunk.

**O-2 — `docs/cpu-quota-reduction-2026-11-05.md` is untracked and not in the commit command.**
It is the implementation report from the prior session, newly created by this workstream, not one of
the five pre-existing docs. It will be left behind by the command above.

**O-3 — Task context said "6 pre-existing modified files plus the 4 CPU-fix files"; the actual
counts are 6 pre-existing modified and 5 CPU-fix files** (the task's own F1–F5 list includes
`package-lock.json` separately). No action needed; recorded so the numbers reconcile later.

**O-4 — worker teardown warning** in `npm test` ("A worker process has failed to exit gracefully").
Exit code is 0 and all 86 suites pass. Pre-existing, unrelated to these changes.

**O-5 — MCP usage.** The requested MCPs (Vercel/Supabase) were not called in this pass: Steps 1–4
are local file/command checks and Step R2 forbids new investigations. Every claim above is backed by
a command run in this session.
