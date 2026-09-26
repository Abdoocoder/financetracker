# Runbook: BYOK Proxy SSE Streams Stalled

## Alert
**Name:** Fajrak BYOK Proxy SSE Streams Stalled  
**Severity:** Warning  
**Condition:** `byok_proxy_sse_streams_active > 100 for 10m`

## Diagnosis Steps

1. **Check active stream count over time**
   ```promql
   byok_proxy_sse_streams_active
   ```

2. **Check for stream completion failures**
   - Streams should end with `[DONE]` or client abort
   - Stalled streams = client disconnected without abort, or upstream hung

3. **Check Vercel function timeout**
   - Max duration: 120s (configured in route.ts)
   - Streams near 120s may be timing out

## Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| Client doesn't abort on unmount | Fix client `AbortController` cleanup |
| Upstream never sends `[DONE]` | Add upstream timeout; circuit breaker |
| Memory leak in stream handling | Check for unclosed readers |

## Verification
- Active streams return to < 50 for 10min