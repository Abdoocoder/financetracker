import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'

/**
 * Standard server-side Supabase client using the anon key.
 * Respects RLS policies — use this for all user-facing server actions.
 * For admin/service-role access, import from '@/lib/supabase/admin'.
 *
 * `accessToken` (optional) — override the auth identity with a Supabase JWT
 * (e.g. `Authorization: Bearer <jwt>` from the cookie-less Flutter BYOK client).
 * When omitted, the client uses the request's session cookies. When provided,
 * `global.headers.Authorization` is set so every request (getUser, RPC, ...)
 * runs as that user.
 */
export async function createClient(accessToken?: string) {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
