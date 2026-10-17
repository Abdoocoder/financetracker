# Production Incident — Post-Mortem

**Status:** RESOLVED (verified Oct 17, 2026)
**Project:** Supabase `ujwcvtpwsaidljecqbaa` (production)
**Severity:** Critical — production data plane partially unreachable

> Post-mortem archive for the production Supabase outage that began on/around
> 2026-10-11 and was resolved on 2026-10-17. Superseded by the daily backup
> pipeline and the zero-budget trigger guard described below.

---

## 1. Timeline

| Date | Event |
|------|-------|
| ≥ 2026-10-11 | Production Supabase DB (`ujwcvtpwsaidljecqbaa`) becomes unreachable; request success rate drops to ~0.2%. Unknown external client hammering `/rest/v1/testimonials`. |
| 2026-10-14 | First daily backup captured: `fajrak_backup_20261014_121600.dump` (2.78 MB). |
| 2026-10-15 | Daily backup captured (2.79 MB). |
| 2026-10-16 | Daily backup captured (2.80 MB). |
| 2026-10-17 | Incident **RESOLVED**. DB health restored, zero-budget trigger guard applied, backups confirmed flowing (2.83 MB dump). |

---

## 2. Root Causes

- **Free-tier Supabase project** — no point-in-time recovery (PITR) and limited platform-level resilience.
- **No backups configured** — a sustained failure could have meant permanent data loss.
- **Unknown external client** hammering the public read surface `/rest/v1/testimonials` (public `SELECT WHERE is_visible=true`) — read amplification, not a policy bypass.
- Contributed: the Supabase **anon key is embedded in shipped clients** (rotation was pending).

---

## 3. Resolution Steps Taken

1. **Backups automation (a):** Enabled a daily GitHub Actions → Cloudflare R2 backup pipeline.
   - Workflow: `.github/workflows/supabase-backup.yml` (`Supabase Daily Backup`).
   - Schedule: daily at `02:00 UTC` (= `05:00` Amman).
   - Destination: Cloudflare R2 bucket `fajrak-backups`.
2. **Zero-budget trigger guard (b):** Applied the SQL guard
   `supabase/migrations/20261017160000_zero_budget_trigger_guard.sql` to production,
   preventing false "budget exceeded" alerts when `monthly_limit = 0`.
3. **DB health restored (c):** Production request success recovered; the app is serving normally.

---

## 4. Verification Evidence

**Backups (Cloudflare R2 bucket `fajrak-backups`):**

| Dump | Size |
|------|------|
| `fajrak_backup_20261014_121600.dump` | 2.78 MB |
| `fajrak_backup_20261015_*.dump` | 2.79 MB |
| `fajrak_backup_20261016_*.dump` | 2.80 MB |
| `fajrak_backup_20261017_*.dump` | 2.83 MB |

- GitHub Actions run **"Supabase Daily Backup #8"** completed successfully (3m 24s, 2.35 MB artifact).

**Zero-budget guard (production):**
- In the Supabase SQL Editor, `SELECT pg_get_functiondef('public.check_budget_limits'::regproc)`
  returns a body containing:

  ```sql
  IF v_budget.monthly_limit IS NULL OR v_budget.monthly_limit <= 0 THEN RETURN NEW; END IF;
  ```

- Confirms the guard is live in production, matching the committed migration.

---

## 5. Outstanding Items

- **Rotate the Supabase anon key** (still recommended post-incident — the key is embedded in clients).
- **Consider upgrading off the Free tier** to enable PITR and higher platform resilience.
- **Keep the daily R2 backup pipeline monitored** (alert on consecutive failed runs).
