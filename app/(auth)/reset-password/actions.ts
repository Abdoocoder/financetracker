'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'

// Exchange a PKCE code for an access_token (email recovery — no verifier needed)
export async function exchangeCode(code: string): Promise<{ token?: string }> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (!error && data.session?.access_token) return { token: data.session.access_token }
  return {}
}

export async function updatePassword(password: string, token: string): Promise<{ error?: string }> {
  if (!token) return { error: 'session' }

  const admin = createAdminClient()

  const { data: { user }, error: userError } = await admin.auth.getUser(token)
  if (userError || !user) return { error: 'session' }

  const { error } = await admin.auth.admin.updateUserById(user.id, { password })
  return { error: error?.message }
}
