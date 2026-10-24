# Runbook: Database Backup Before Destructive Migrations

> **Use this before any migration that DROPs columns, DROPs tables, ALTERs types, or modifies RLS policies on high-traffic tables.**

---

## When to Run This

Run a targeted backup before applying any migration that:
- `DROP TABLE` / `DROP COLUMN`
- `ALTER COLUMN ... TYPE` (data loss risk)
- `ALTER TABLE ... DROP CONSTRAINT` on FKs/PKs
- Modifies RLS policies on tables with >10k rows (`alerts`, `transactions`, `profiles`)
- Any migration you did not author and haven't tested on a preview DB

---

## Backup Command

The Supabase CLI `db dump -t` **does not work reliably** for single-table data-only dumps. Use `pg_dump` directly against the production connection string.

```bash
# Set the production DB URL (get from Vercel/Supabase Dashboard → Settings → Database → Connection string → Transaction pooler)
export SUPABASE_DB_URL="postgresql://postgres:[password]@[host]:5432/postgres?sslmode=require"

# Backup a single table (data only, no schema)
pg_dump "$SUPABASE_DB_URL" --data-only --table=public.alerts > backup_alerts_$(date +%Y%m%d_%H%M%S).sql

# Backup multiple tables
pg_dump "$SUPABASE_DB_URL" --data-only \
  --table=public.alerts \
  --table=public.transactions \
  --table=public.profiles \
  > backup_critical_$(date +%Y%m%d_%H%M%S).sql

# Backup entire database (schema + data) — use sparingly, large
pg_dump "$SUPABASE_DB_URL" > backup_full_$(date +%Y%m%d_%H%M%S).sql
```

---

## Where to Store Backups

| Option | Command | Retention |
|--------|---------|-----------|
| **Local (dev machine)** | As above | Keep 7 days locally |
| **Cloudflare R2 (preferred)** | `rclone copy backup_*.sql r2:fajrak-backups/manual/` | 90 days (matches automated backup retention) |
| **GitHub Actions Artifact** | Upload in workflow | 90 days |

**To upload to R2 manually:**
```bash
# Requires rclone configured with `r2` remote (see GitHub Actions `supabase-backup.yml` for config)
rclone copy backup_alerts_20261025_143000.sql r2:fajrak-backups/manual/
```

---

## Restore Procedure (If Migration Breaks Prod)

**⚠️ Test restore on a Supabase Preview DB first.**

```bash
# 1. Create a preview branch (or use the PR preview DB from supabase-preview.yml)
# 2. Restore the backup
psql "$PREVIEW_DB_URL" -f backup_alerts_20261025_143000.sql

# 3. Verify row counts match
psql "$PREVIEW_DB_URL" -c "SELECT count(*) FROM alerts;"
psql "$PROD_DB_URL"     -c "SELECT count(*) FROM alerts;"

# 4. If preview restore works, restore to prod (coordinate with team — downtime required)
psql "$SUPABASE_DB_URL" -f backup_alerts_20261025_143000.sql
```

---

## Automated Daily Backups (Already Running)

Workflow: `.github/workflows/supabase-backup.yml`
- Schedule: `0 2 * * *` (daily 02:00 UTC)
- Dumps: Full `pg_dump` (schema + data) → Cloudflare R2 bucket `fajrak-backups`
- Retention: 4 most recent dumps (see workflow for `rclone` lifecycle config)
- **This is your safety net.** Manual backups are for *specific* high-risk migrations.

---

## Checklist Before Running a Risky Migration

- [ ] Identify affected tables and row counts (`SELECT count(*) FROM table;`)
- [ ] Run manual `pg_dump --data-only --table=...` for each affected table
- [ ] Upload to R2: `rclone copy backup_*.sql r2:fajrak-backups/manual/`
- [ ] Verify backup file size > 0 and contains `COPY public.table ...` lines
- [ ] Apply migration via Supabase Dashboard (not `supabase db push` from local)
- [ ] Monitor Sentry / logs for 15 minutes post-migration
- [ ] If issues: follow Restore Procedure above

---

## Emergency Contacts

- Supabase Dashboard: Project → Database → Backups (Point-in-Time Recovery if on Pro plan)
- Vercel: Project → Functions → Logs (for cron/Edge Function errors)
- Sentry: `fajrak` project → Issues (filter by `transaction` or `migration` tags)