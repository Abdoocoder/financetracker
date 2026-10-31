import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
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
 *
 * NOTE: this is the *legacy* Supabase-Auth client. It keeps the `supabase.auth`
 * namespace available (`getUser`, `getSession`, ...) for server components that
 * have not migrated to Clerk yet. For Clerk-authenticated access use
 * `createClerkClient()` below.
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

/**
 * Clerk-authenticated server Supabase client.
 *
 * Fetches the current Clerk session token on every request via `auth()` and
 * hands it to supabase-js through the `accessToken` option, so PostgREST
 * receives `Authorization: Bearer <clerk-jwt>` and RLS evaluates the Clerk
 * `sub` claim (Supabase's Clerk third-party-auth integration).
 *
 * Why not `createServerClient` from `@supabase/ssr`?
 * `@supabase/ssr` unconditionally calls `client.auth.onAuthStateChange()` while
 * building the client. With the `accessToken` option, supabase-js replaces
 * `client.auth` with a proxy whose every property access throws:
 *   "Supabase Client is configured with the accessToken option, accessing
 *    supabase.auth.onAuthStateChange is not possible"
 * so `createServerClient(..., { accessToken })` throws at construction time.
 * `createClient` from `@supabase/supabase-js` does not touch `client.auth`, and
 * is the pattern Clerk documents for Supabase third-party auth.
 *
 * Because `accessToken` disables the `auth` namespace, this client MUST NOT be
 * used for `supabase.auth.*` calls. Use `createClient()` for those.
 *
 * Must be called in a request scope (Server Component, Route Handler, or
 * Server Action) — `auth()` reads the request context injected by
 * `clerkMiddleware()`.
 */
export async function createClerkClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => {
        const { getToken } = await auth()
        return (await getToken()) ?? null
      },
      auth: {
        // No Supabase session management: Clerk owns the session. These flags
        // keep supabase-js from ever writing auth state to storage.
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  )
}
