# Runbook: BYOK Proxy Rate Limit Spike

## Alert
**Name:** Fajrak BYOK Proxy Rate Limit Spike  
**Severity:** Warning  
**Condition:** `rate(byok_proxy_rate_limit_hits_total[5m]) > 1 req/s`

## Diagnosis Steps

1. **Check which users are hitting limits**
   ```promql
   topk(10, rate(byok_proxy_rate_limit_hits_total[5m])) by user_id
   ```

2. **Check if it's a single user or distributed**
   - Single user: Possible bug in their client (infinite loop, missing abort)
   - Distributed: Traffic spike or bot

3. **Check proxy_usage table directly**
   ```sql
   SELECT user_id, window_start, count 
   FROM proxy_usage 
   WHERE window_start > NOW() - INTERVAL '10 minutes'
   ORDER BY count DESC;
   ```

## Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| Client bug (no abort on unmount) | Fix client to abort on cleanup |
| Automated testing/script | Identify and block abusive IP/user |
| Legitimate traffic spike | Monitor; consider limit increase for power users |
| Multiple tabs open | Client should share rate limit state |

## Escalation
- If single user > 50/min → Temp block, notify user
- If distributed → Monitor; auto-scales

## Verification
- Rate limit hits return to baseline