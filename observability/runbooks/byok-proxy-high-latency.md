# Runbook: BYOK Proxy High Latency

## Alert
**Name:** Fajrak BYOK Proxy High Latency  
**Severity:** Warning  
**Condition:** `histogram_quantile(0.99, rate(byok_proxy_latency_ms_bucket[5m])) > 5000ms`

## Diagnosis Steps

1. **Check latency by provider**
   ```promql
   histogram_quantile(0.99, rate(byok_proxy_latency_ms_bucket[5m])) by provider_id
   ```

2. **Check if latency is upstream or local**
   - High latency on all providers → Local issue (Vercel cold start, network)
   - High latency on one provider → Upstream issue

3. **Check Vercel function metrics**
   - Cold starts? Check function duration in Vercel dashboard
   - Memory/CPU limits hit?

4. **Check SSE stream handling**
   - Stalled streams can inflate latency metrics

## Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| Vercel cold start | Enable Vercel Fluid Compute; pre-warm functions |
| Upstream provider slow | Add circuit breaker; fallback to Ollama |
| Large request/response bodies | Monitor payload sizes; consider compression |
| Network issues | Check Vercel region vs provider region |

## Escalation
- If Vercel-side > 30min → Contact Vercel support
- If upstream provider > 30min → Post status page

## Verification
- p99 latency < 2000ms for 10min