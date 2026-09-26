# Runbook: MCP Tool High Error Rate

## Alert
**Name:** Fajrak MCP Tool High Error Rate  
**Severity:** Critical  
**Condition:** `rate(mcp_tool_errors_total[5m]) > 0.1 req/s`

## Diagnosis Steps

1. **Check errors by tool**
   ```promql
   rate(mcp_tool_errors_total[5m]) by tool_name
   ```

2. **Check MCP logs for error details**
   ```bash
   vercel logs --since=30m --filter=mcp
   ```

3. **Check Supabase RPC errors**
   - `get_account_balances`, `get_cashflow_summary`, `create_transaction` RPCs

## Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| Supabase RPC failure | Check Supabase status; retry logic |
| PAT expired/revoked | User must regenerate PAT |
| Idempotency key conflict | Client should retry with new key |
| Database connection pool exhausted | Check Supabase connection limits |

## Verification
- Error rate < 0.01 req/s for 10min