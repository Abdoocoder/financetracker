# Runbook: MCP Tool High Latency

## Alert
**Name:** Fajrak MCP Tool High Latency  
**Severity:** Warning  
**Condition:** `histogram_quantile(0.99, rate(mcp_tool_latency_ms_bucket[5m])) > 3000ms`

## Diagnosis Steps

1. **Check latency by tool**
   ```promql
   histogram_quantile(0.99, rate(mcp_tool_latency_ms_bucket[5m])) by tool_name
   ```

2. **Check Supabase query performance**
   - Slow RPCs or queries
   - Connection pool wait time

## Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| Slow Supabase RPC | Check Supabase Advisor; add indexes |
| Cold start (Vercel) | Enable Fluid Compute; pre-warm |
| Large result sets | Add pagination/cursor support |

## Verification
- p99 < 1000ms for 10min