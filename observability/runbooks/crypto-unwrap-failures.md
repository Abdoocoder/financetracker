# Runbook: Crypto Unwrap Failures Spike

## Alert
**Name:** Fajrak Crypto Unwrap Failures Spike  
**Severity:** Critical  
**Condition:** `rate(crypto_unwrap_failures_total[5m]) > 0.5 req/s`

## Diagnosis Steps

1. **Check failures by provider and error type**
   ```promql
   rate(crypto_unwrap_failures_total[5m]) by provider_id, error_type
   ```

2. **Check key rotation status**
   - Recent key rotation may have `keyId` mismatch
   - Old private key retained until all fragments re-wrapped?

3. **Check client envelope format**
   - Invalid `env`/`payload` format
   - Wrong `keyId` sent by client

## Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| Key rotation mismatch | Run re-wrap script; ensure old key retained |
| Client sending wrong `keyId` | Update client to fetch latest config from `/api/byok/config` |
| Corrupted envelope | Client must re-encrypt key; clear IndexedDB vault |
| RSA private key not configured | Set `BYOK_PRIVATE_KEY` and `BYOK_KEK_ID` env vars |

## Verification
- Unwrap failures < 0.01 req/s for 10min