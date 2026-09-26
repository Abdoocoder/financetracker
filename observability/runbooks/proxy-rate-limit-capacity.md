# Runbook: Proxy Rate Limit Near Capacity

## Alert
**Name:** Fajrak Proxy Rate Limit Near Capacity  
**Severity:** Warning  
**Condition:** `any user > 25 req/min (83% of 30/min limit)`

## Diagnosis Steps

1. **Identify users near limit**
   ```promql
   topk(10, rate_limit_proxy_usage)
   ```

2. **Check if legitimate or abusive**
   - Legitimate: Power user, multiple chat sessions
   - Abusive: Script, bot, client bug

3. **Query proxy_usage table**
   ```sql
   SELECT user_id, window_start, count
   FROM proxy_usage
   WHERE count > 25 AND window_start > NOW() - INTERVAL '5 minutes';
   ```

## Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| Power user | Monitor; consider tiered limits in v2 |
| Client bug (no abort) | Fix client cleanup |
| Multiple tabs | Client should share rate limit state |

## Verification
- No users > 25/min for 10min