'use client'

// lib/supabase/client.ts
//
// Two browser clients live here:
//
// 1. `createClient()` — the existing Supabase-Auth browser client (singleton).
//    It MUST NOT set the `accessToken` option: supabase-js disables the entire
//    `auth` namespace when `accessToken` is present, and ~20 call sites still
//    use `supabase.auth.*` (signInWithPassword, signUp, signOut, getSession,
//    onAuthStateChange, resetPasswordForEmail...). Changing that is a later
//    phase.
//
// 2. `createClerkClient(session)` / `useClerkSupabaseClient()` — a separate
//    client that authenticates Supabase requests with the Clerk session token
//    via the `accessToken` option (Clerk + Supabase third-party auth).
//    Use these for Clerk-authenticated data access.

import { createBrowserClient } from '@supabase/ssr'
import { useSession } from '@clerk/nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useMemo } from 'react'

let client: SupabaseClient | null = null

/**
 * Supabase browser client backed by Supabase Auth.
 * Do not add `accessToken` here — it disables `supabase.auth`.
 */
export function createClient(): SupabaseClient {
  if (client) return client
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      }
    }
  )
  return client
}

/** Minimal structural type for a Clerk session (avoids deep import). */
type ClerkSessionLike = {
  getToken: () => Promise<string | null>
} | null | undefined

/**
 * Supabase browser client that authenticates with the Clerk session token.
 * Pass the session from `useSession()` (see `useClerkSupabaseClient`).
 *
 * Not a singleton: the token getter closes over the current session.
 */
export function createClerkClient(session: ClerkSessionLike): SupabaseClient {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => (await session?.getToken()) ?? null,
    }
  )
}

/**
 * Hook variant for client components — mirrors the Clerk docs pattern:
 *   const { session } = useSession()
 *   createClient(url, key, { accessToken: async () => (await session?.getToken()) ?? null })
 *
 * Stable across renders until the Clerk session changes.
 */
export function useClerkSupabaseClient(): SupabaseClient {
  const { session } = useSession()
  return useMemo(() => createClerkClient(session), [session])
}
