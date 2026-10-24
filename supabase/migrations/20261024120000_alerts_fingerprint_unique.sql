-- Track D prerequisite: add fingerprint to alerts for idempotency.
--
-- Why: The Edge Function writes alerts unconditionally now (Correction F),
-- so a duplicate-write guard is required to prevent double-inserts from
-- retried webhooks or from auto-debt / smart-notifications during the
-- transition.
--
-- The doc comment in lib/push-send.ts:104-107 claims a UNIQUE index on
-- fingerprint exists. It does not (verified 2026-10-22 via pg_indexes on
-- project ujwcvtpwsaidljecqbaa). This migration makes the comment true.
--
-- Partial index (WHERE fingerprint IS NOT NULL) so legacy rows without a
-- fingerprint don't collide. NULLs remain multiple by SQL semantics.

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS fingerprint text;

CREATE UNIQUE INDEX IF NOT EXISTS alerts_user_fingerprint_unique
  ON public.alerts (user_id, fingerprint)
  WHERE fingerprint IS NOT NULL;
