# Runbook: PAT Rate Limit Near Capacity

## Alert
**Name:** Fajrak PAT Rate Limit Near Capacity  
**Severity:** Warning  
**Condition:** `any key > 8 req/min (80% of 10/min limit)`

## Diagnosis Steps

1. **Identify keys near limit**
   ```promql
   topk(10, rate_limit_pat_usage)
   ```

2. **Check user_api_keys for active keys near expiry**
   ```sql
   SELECT key_id, user_id, expires_at, rate_limit_per_min
   FROM user_api_keys
   WHERE is_active = true AND expires_at < NOW() + INTERVAL '7 days';
   ```

## Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| Heavy automation (Cursor/Claude) | Normal for active agents; monitor |
| Multiple agents on same key | User should create separate PATs |
| Rate limit too low for workflow | Consider tiered limits in v2 |

## Verification
- No keys > 8/min for 10min