/**
 * ⚠️  SERVER-ONLY — NEVER import this from client components or pages.
 *     This module holds DATABASE_URL, which authenticates as the database owner.
 *
 * ── Why this file exists ─────────────────────────────────────────────────────
 * Neon currently holds a *restored standby copy* of the Supabase database, not
 * a replacement for it. It has no Supabase Auth (GoTrue), no PostgREST and no
 * Realtime server, so it MUST NOT serve user-facing queries. The only consumer
 * is `/api/health/db`, a read-only connectivity probe.
 *
 * ── Security: this client bypasses RLS ───────────────────────────────────────
 * The connection string authenticates as `neondb_owner`, the table owner.
 * Postgres lets table owners skip RLS unless FORCE ROW LEVEL SECURITY is set,
 * and it is set on zero tables in this database. `auth.uid()` also returns NULL
 * here, because only PostgREST populates the `request.jwt.claims` GUC.
 *
 * Consequence: every query through this client sees ALL rows across ALL users.
 * Golden Rule #1 ("every query respects auth.uid() = user_id") does NOT hold
 * here. Never use this client for anything scoped to a single user.
 */

import { neon } from '@neondatabase/serverless'

if (typeof window !== 'undefined') {
  throw new Error(
    'lib/db/neon.ts must not be imported in client code. ' +
    'It exposes a database connection that bypasses RLS.'
  )
}

type NeonQueryResult = Record<string, unknown>[]

/**
 * Default driver options (no `arrayMode`, no `fullResults`) return row objects.
 * Pinning that shape here gives callers a usable type instead of the driver's
 * three-way return union, which cannot be narrowed without options in hand.
 */
export type NeonClient = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<NeonQueryResult>

/**
 * Cached per connection string.
 *
 * Deliberately NOT a module-level `const sql = neon(...)`: `next build` imports
 * route modules, so a top-level call would throw at build time on any
 * environment without DATABASE_URL (preview deploys, CI). Keying the cache on
 * the URL also means an env change is picked up without a test-only reset hook.
 */
let cached: { url: string; client: NeonClient } | null = null

export function getSql(): NeonClient {
  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error(
      'Missing DATABASE_URL. Set the Neon *pooled* connection string ' +
      '(host contains "-pooler") in .env.local or in the deployment environment.'
    )
  }

  if (cached?.url !== url) {
    cached = { url, client: neon(url) as unknown as NeonClient }
  }

  return cached.client
}
