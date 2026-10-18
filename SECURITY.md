# Security

## Supported versions

- `3.44.x`: supported
- `3.43.x` and `3.42.x`: best effort
- Earlier: unsupported

## Reporting a vulnerability

Please email the maintainer at `<TODO: add security contact email>`. Do not open public GitHub issues for security reports.

## Current posture

- Row Level Security is enabled on all 30 tables (including the new `zakat_holdings`), and every policy keys on `auth.uid() = user_id`.
- Internal RPCs (health score, sync, idempotency, account balances, Zakat: `get_zakat_summary` and `get_zakat_hauls`): `EXECUTE` revoked from `PUBLIC` and `anon`, granted only to `authenticated` and `service_role`. Both Zakat RPCs additionally enforce owner verification (`auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id` raises), while a NULL uid (service_role / cron) is allowed for background jobs. Verified on the production project `ujwcvtpwsaidljecqbaa` on 2026-10-18 via `proacl`.
- `search_path = public` is pinned on all SECURITY DEFINER functions flagged by the Supabase linter.
- Firebase Installation ID registration is enabled via the `firebase_messaging_installation_id_enabled` manifest meta-data.
- BYOK keys are encrypted client-side (AES-256-GCM plus RSA-OAEP). The proxy receives an opaque envelope, not plaintext keys.

## Known gaps and backlog

- Leaked Password Protection is disabled. Enabling it requires a paid Supabase tier; deferred for now.
- Supabase anon key rotation is pending.
- No Point-In-Time Recovery (PITR) because the project is on the Free tier.
- Recommend reviewing `supabase db lint` output monthly.

## Incident history

See `mobile/fajrak_flutter/INCIDENT.md` for the 2026-10-11 to 2026-10-17 production outage post-mortem.
