# Runbook: Incident Response

> **Quick guide for DB outage, Sentry spike, or major regression. Target: <15 min to diagnosis, <60 min to mitigation.**

---

## 1. Triage Checklist (First 5 Minutes)

| Check | How | Expected |
|-------|-----|----------|
| **Is Vercel healthy?** | `https://vercel-status.com` + Project → Deployments | All green, latest deployment "Ready" |
| **Is Supabase healthy?** | `https://status.supabase.com` + Project → Database → Health | "Healthy", CPU < 80%, connections < 80% limit |
| **Is Sentry spiking?** | Sentry → `fajrak` project → Issues (last 1 hr) | < 5 new issues/min; no "N+1" or "timeout" patterns |
| **Can you hit the API?** | `curl -I https://fajrak.com/api/health` (or any public route) | `200 OK`, `< 500ms` |
| **Is the cron running?** | Vercel → Project → Cron Jobs → Last run | `/api/zakat-autopilot` ran at 08:00 UTC today |

**If any check fails → escalate to that section below.**

---

## 2. Database Down / Unreachable

### Symptoms
- `psql "$SUPABASE_DB_URL"` times out or returns `FATAL: too many connections`
- Supabase Dashboard shows "Database unavailable" or high CPU
- API routes return 500 with `ECONNREFUSED` or `ETIMEDOUT`

### Immediate Actions

1. **Check connection count:**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
   SELECT max_connections FROM pg_settings;
   ```

2. **If connections > 80% of max:**
   - Supabase Free/Pro: max ~100 connections. Likely cause: connection leak in Edge Function or cron.
   - **Quick fix:** Restart the Supabase project (Dashboard → Settings → General → Restart). Takes ~2 min.
   - **Root cause fix:** Audit `supabase/functions/push-notification/index.ts` and all cron routes for missing `await supabase.auth.getUser()` or unclosed clients.

3. **If CPU > 90%:**
   - Check `pg_stat_statements` for runaway queries:
     ```sql
     SELECT query, calls, total_exec_time, rows
     FROM pg_stat_statements
     ORDER BY total_exec_time DESC LIMIT 10;
     ```
   - Likely culprits: missing index on `alerts(user_id, created_at)`, full-table scan on `transactions`, or the `user_stats` upsert in gamification reading whole tables.

4. **If storage full:**
   - `SELECT pg_size_pretty(pg_database_size('postgres'));`
   - Clean old `notification_history` (retention: 30 days), `api_audit_log` (90 days), `app_events` (90 days).

---

## 3. Sentry Massive Spike (>50 new issues/min)

### Symptoms
- Sentry dashboard shows sharp error rate increase
- Common patterns: `TypeError: Cannot read property 'x' of null`, `PostgrestException: relation "x" does not exist`, `ZodError` on webhook payload

### Immediate Actions

1. **Open the latest issue** → click "See all events" → look at **Tags**: `release`, `environment`, `route`, `browser`
2. **Filter by release:** Did a new deploy just go out? (Check Vercel → Deployments)
3. **If web:** Check if it's a specific route (e.g., `/dashboard/zakat`, `/api/byok/proxy`)
4. **If mobile:** Check `flutter` tag; look for `PlatformException` (FCM, Supabase, Drift)

### Common Fixes

| Error Pattern | Likely Cause | Fix |
|---------------|--------------|-----|
| `relation "user_stats" does not exist` | Migration missing on prod | Apply `20261017000000` migration (creates `user_stats`) |
| `ZodError: Required` on `/api/mcp` | MCP client sending bad payload | Validate `lib/unified-tools` schemas; add defensive checks |
| `FCM: UNREGISTERED` | Stale push token | Edge Function auto-cleans; verify `push_subscriptions` cleanup |
| `currentUser!` force-unwrap | Auth race (v3.44.0 fixed) | Ensure mobile is on ≥3.44.0; check `lib/services/*_service.dart` |
| `sync_zakat_haul_state` returns stale Nisab | Live prices not passed | Verify `lib/zakat-prices.ts` / `metal_price_service.dart` called |

---

## 4. Vercel Deployment Rollback

### When to Rollback
- New deployment breaks core flow (login, transactions, zakat calculator)
- Sentry spike correlates 1:1 with deployment timestamp
- No hotfix possible in <30 min

### How to Rollback (Git Revert + Push)

```bash
# 1. Find the bad commit (usually the merge commit to main)
git log --oneline -20

# 2. Revert the merge commit (preserves history, creates new commit)
git revert -m 1 <merge-commit-sha>

# 3. Push to main (Vercel auto-deploys the revert)
git push origin main

# 4. Verify Vercel builds and deploys the revert commit
#    Watch Vercel Dashboard → Deployments
```

**Alternative (Vercel Dashboard):** Project → Deployments → "..." menu on previous good deployment → "Promote to Production". Faster but doesn't fix git history.

---

## 5. Database Connection Limits

### Free/Pro Tier Limits
| Plan | Max Connections | Pool Size (PgBouncer) |
|------|-----------------|----------------------|
| Free | 100 | 20 |
| Pro | 500 | 100 |

### Monitoring
```sql
-- Current usage
SELECT 
  count(*) as active_connections,
  (SELECT max_connections FROM pg_settings) as max_connections,
  round(count(*) * 100.0 / (SELECT max_connections FROM pg_settings), 1) as pct_used
FROM pg_stat_activity 
WHERE state = 'active';
```

### Mitigation
- **Short term:** Restart Supabase project (kills all connections)
- **Medium term:** Audit all `createClient()` / `createServerClient()` calls — ensure single instance per request (Next.js: `createServerClient()` in Server Components; API routes: one per handler)
- **Long term:** Upgrade to Pro for higher limits + PgBouncer session pooling

---

## 6. Communication Template

### Internal (Slack / Discord / GitHub Issue)
```
🚨 INCIDENT: [One-line summary, e.g., "DB connections exhausted, API returning 500"]
- **Detected:** 2026-10-25 14:32 UTC (Sentry alert / user report / monitoring)
- **Impact:** [e.g., "All write operations failing; reads OK"]
- **Status:** [Investigating / Mitigating / Resolved]
- **Owner:** @abdullah
- **Updates:** Thread below
```

### User-Facing (if >15 min downtime)
- Update status page (if exists) or post to X/Twitter: "We're aware of issues with [feature]. Investigating. Will update."
- Do NOT expose internal details (table names, stack traces, infra topology)

---

## 7. Post-Incident (Within 24 Hours)

1. **Create `INCIDENT.md` entry** in `mobile/fajrak_flutter/INCIDENT.md` (follow existing format)
2. **Root cause analysis:** 5 Whys in the incident doc
3. **Action items:** Link to GitHub issues with `incident-followup` label
4. **Update runbook:** If this scenario wasn't covered, add it here
5. **Verify backups:** Check `supabase-backup.yml` ran successfully post-incident

---

## 8. Key Links (Bookmark These)

| Resource | URL |
|----------|-----|
| Vercel Dashboard | `https://vercel.com/abdullah/financetracker` |
| Supabase Dashboard | `https://supabase.com/dashboard/project/[ref]` |
| Sentry (Fajrak) | `https://sentry.io/organizations/abdullah/projects/fajrak/` |
| Grafana (OTel) | `https://grafana.fajrak.com` (if configured) |
| Cloudflare R2 | `https://dash.cloudflare.com/[account]/r2/buckets/fajrak-backups` |
| GitHub Actions | `https://github.com/Abdoocoder/financetracker/actions` |
| Play Console | `https://play.google.com/console/developers/[id]/app/4975723456789012345` |