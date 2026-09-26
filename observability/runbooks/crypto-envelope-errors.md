# Runbook: Crypto Envelope Errors Spike

## Alert
**Name:** Fajrak Crypto Envelope Errors Spike  
**Severity:** Warning  
**Condition:** `rate(crypto_envelope_errors_total[5m]) > 0.1 req/s`

## Diagnosis Steps

1. **Check envelope error rate**
   ```promql
   rate(crypto_envelope_errors_total[5m])
   ```

2. **Check for client-side encryption issues**
   - Web Crypto API unavailable (private browsing, old browser)
   - IndexedDB quota exceeded

## Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| Private browsing / unsupported browser | Show vault unavailable warning; guide user |
| IndexedDB corruption | Clear site data; re-add keys |
| Client code regression | Check recent deployments to `lib/byok/vault.ts` |

## Verification
- Envelope errors < 0.01 req/s for 10min