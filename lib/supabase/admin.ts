/**
 * ⚠️  SERVER-ONLY — NEVER import this from client components or pages.
 *     This module uses SUPABASE_SERVICE_ROLE_KEY which bypasses all RLS.
 *     Use only from:
 *       - app/api/** route handlers
 *       - lib/cron-* utilities (called from cron API routes only)
 */

if (typeof window !== 'undefined') {
  throw new Error(
    'lib/supabase/admin.ts must not be imported in client code. ' +
    'It exposes the service-role key and bypasses all RLS.'
  )
}

import { createClient } from '@supabase/supabase-js'

/**
 * Returns a Supabase admin client with the service role key.
 * Access is fully unrestricted (bypasses RLS).
 * Import ONLY in API Route handlers after verifying authentication.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. ' +
      'Admin client cannot be constructed.'
    )
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
