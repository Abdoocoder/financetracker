# Runbook: MCP PAT Auth Failures Spike

## Alert
**Name:** Fajrak MCP PAT Auth Failures Spike  
**Severity:** Critical  
**Condition:** `rate(mcp_pat_auth_failures_total[5m]) > 0.5 req/s`

## Diagnosis Steps

1. **Check auth failure rate**
   ```promql
   rate(mcp_pat_auth_failures_total[5m])
   ```

2. **Check for expired PATs**
   - `user_api_keys` table has `expires_at` column (90 days default)
   - Query expired keys: `SELECT * FROM user_api_keys WHERE expires_at < NOW() AND is_active = true`

3. **Check for revoked keys still in use**
   - Agent using old revoked token

## Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| PAT expired (90 days) | User must regenerate PAT in Settings |
| PAT revoked | User must generate new PAT |
| Key rotation not communicated | Notify users before rotation |

## Verification
- Auth failures < 0.1/min for 10min