# Security Definer Functions — Audit & Rationale

**Last Updated:** 2026-10-27  
**Supabase Project:** `ujwcvtpwsaidljecqbaa` (Fajrak)  
**Related:** `/tmp/security-advisor-report.md` (full audit), `supabase/migrations/20261027000000_fix_missing_owner_guards.sql` (fixes)

---

## Why This Document Exists

The Supabase Security Advisor flags **21 functions** under `authenticated_security_definer_function_executable` (WARN level).  
This document explains which are **False Positives (Safe by Design)** and which were **True Positives (Fixed)**.

> **Do not revoke EXECUTE from the safe RPCs** (e.g., `get_debts`, `get_zakat_summary`, `get_budgets`, etc.).  
> Doing so will break the Agentic AI, the web frontend, and the Flutter app.

---

## Architecture Pattern (The "Why")

All user-facing RPCs in Fajrak follow this **defense-in-depth pattern**:

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| 1 | `SECURITY DEFINER` | Bypass RLS for complex joins/aggregations; run as table owner |
| 2 | `SET search_path = public` (or `pg_catalog,public,auth,pg_temp`) | Prevent search-path injection |
| 3 | **Owner Guard**<br>`IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;` | Enforce `auth.uid() = p_user_id` for session callers; `service_role` (NULL uid) bypasses for crons/webhooks |
| 4 | `REVOKE EXECUTE ... FROM PUBLIC, anon; GRANT ... TO authenticated, service_role;` | Block unauthenticated callers; explicit grants for auditability |

This is the **Supabase-recommended pattern** for `SECURITY DEFINER` RPCs.  
The linter WARN is a heuristic — it cannot see in-function guards.

---

## Audit Results (2026-10-27)

### ✅ SAFE — 15 Functions (False Positives)

| Function | Guard Type | Notes |
|----------|------------|-------|
| `bump_proxy_usage()` | Self-scoped (zero args, uses `auth.uid()` internally) | Caller can only increment own bucket |
| `delete_user_account(uuid)` | Owner guard | Destructive; only owner or service_role |
| `get_account_balances(uuid)` | Owner guard | Standard read RPC |
| `get_budgets(uuid, int, int)` | Owner guard | Standard read RPC |
| `get_debts(uuid)` | Owner guard | Standard read RPC |
| `get_financial_dashboard(uuid, float8)` | Owner guard | Standard read RPC |
| `get_goals(uuid)` | Owner guard | Standard read RPC |
| `get_monthly_financial_summary(uuid, int, int)` | Owner guard | Standard read RPC |
| `get_recent_transactions(uuid, int)` | Owner guard | Standard read RPC |
| `get_spending_breakdown(uuid, int, int)` | Owner guard | Standard read RPC |
| `get_zakat_hauls(uuid)` | Owner guard | Standard read RPC |
| `get_zakat_summary(uuid, float8, float8, float8)` | Owner guard | Standard read RPC |
| `sync_zakat_haul_state(uuid, numeric, numeric, numeric)` | Owner guard | Standard read/write RPC |
| `upsert_investment_cash(uuid, text, numeric)` | Owner guard | Standard write RPC |
| `cleanup_expired_idempotency_keys()` | Cron-only (no `p_user_id`) | Service_role cron; no user parameter |

### 🔧 FIXED — 6 Functions (True Positives)

| Function | Issue | Fix Applied |
|----------|-------|-------------|
| `calculate_health_score(uuid, float8)` | Missing owner guard | Added guard in `20261027000000_fix_missing_owner_guards.sql` |
| `get_health_score(uuid)` | Missing owner guard | Added guard in `20261027000000_fix_missing_owner_guards.sql` |
| `check_and_reserve_idempotency_key(uuid, text, timestamptz)` | Missing owner guard | Added guard in `20261027000000_fix_missing_owner_guards.sql` |
| `complete_idempotency_key(uuid, text, uuid)` | Missing owner guard | Added guard in `20261027000000_fix_missing_owner_guards.sql` |
| `get_changed_records(uuid, text, timestamptz, int, int)` | Missing owner guard | Added guard in `20261027000000_fix_missing_owner_guards.sql` |
| `get_deleted_records(uuid, text, timestamptz)` | Missing owner guard | Added guard in `20261027000000_fix_missing_owner_guards.sql` |

> **Migration:** `supabase/migrations/20261027000000_fix_missing_owner_guards.sql`  
> **Verification:** Re-run `supabase db advisors --linked` after applying; the 6 functions should no longer appear as vulnerable.

---

## Other WARN: `auth_leaked_password_protection`

- **Status:** Configuration gap (dashboard setting)
- **Action:** Enable in Supabase Dashboard → Authentication → Password Strength → "Enable leaked password protection"
- **Tracking:** Documented in `SECURITY.md` as known gap

---

## Future Agent Guidance

When you see `authenticated_security_definer_function_executable` WARNs:

1. **Check this document first** — most are False Positives by design.
2. **Verify the function has:**
   - `SECURITY DEFINER`
   - `SET search_path = ...`
   - Owner guard: `IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;`
   - `REVOKE FROM PUBLIC, anon; GRANT TO authenticated, service_role`
3. **If all 4 are present → Safe (False Positive).** Do not "fix" by revoking EXECUTE.
4. **If owner guard is missing → True Positive.** Add the guard via migration (see `20261027000000_fix_missing_owner_guards.sql` as template).

---

## References

- Full audit report: `/tmp/security-advisor-report.md`
- Fix migration: `supabase/migrations/20261027000000_fix_missing_owner_guards.sql`
- Supabase linter docs: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- Project security posture: `SECURITY.md`, `HANDOFF_REPORT.md` §8