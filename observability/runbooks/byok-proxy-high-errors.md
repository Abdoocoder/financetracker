# Runbook: BYOK Proxy High Error Rate

## Alert
**Name:** Fajrak BYOK Proxy High Error Rate  
**Severity:** Critical  
**Condition:** `rate(byok_proxy_errors_total[5m]) > 0.1 req/s`

## Diagnosis Steps

1. **Check error breakdown by provider**
   ```promql
   rate(byok_proxy_errors_total[5m]) by provider_id
   ```

2. **Check upstream provider status**
   - OpenRouter: https://status.openrouter.ai
   - NVIDIA NIM: https://status.nvidia.com
   - Check provider dashboards for outages

3. **Check proxy logs for error details**
   ```bash
   # Vercel logs
   vercel logs --since=30m --filter=byok/proxy
   ```

4. **Check for key rotation issues**
   - `crypto_unwrap_failures_total` spike may indicate key rotation mismatch

## Common Causes & Fixes

| Cause | Symptom | Fix |
|-------|---------|-----|
| Upstream provider down | All requests to one provider fail | Wait for provider recovery; notify users |
| Invalid/expired API key | `unauthorized` errors for specific user | User must re-add key in Settings |
| Key rotation mismatch | `crypto_unwrap_failures` spike | Run re-wrap script; update env vars |
| SSE stream corruption | Stream errors, partial responses | Restart proxy; check client handling |

## Escalation
- If upstream provider down > 15min → Post status page update
- If key rotation issue → Run re-wrap script immediately
- If unknown cause persists > 10min → Page on-call

## Verification
After fix, verify:
- Error rate drops to < 0.01 req/s
- Latency returns to baseline
- SSE streams complete successfully