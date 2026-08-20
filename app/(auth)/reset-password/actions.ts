'use server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'

const RECOVERY_COOKIE = 'sb-recovery-token'
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 3600,
  path: '/',
}

export async function exchangeCode(code: string): Promise<{ ok: boolean }> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.session?.access_token) return { ok: false }
  const cookieStore = await cookies()
  cookieStore.set(RECOVERY_COOKIE, data.session.access_token, COOKIE_OPTS)
  return { ok: true }
}

export async function storeRecoveryToken(token: string): Promise<{ ok: boolean }> {
  const admin = createAdminClient()
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return { ok: false }
  const cookieStore = await cookies()
  cookieStore.set(RECOVERY_COOKIE, token, COOKIE_OPTS)
  return { ok: true }
}

export async function updatePassword(password: string): Promise<{ error?: string }> {
  const cookieStore = await cookies()
  const token = cookieStore.get(RECOVERY_COOKIE)?.value
  if (!token) return { error: 'session' }

  const admin = createAdminClient()
  const { data: { user }, error: userError } = await admin.auth.getUser(token)
  if (userError || !user) return { error: 'session' }

  const { error } = await admin.auth.admin.updateUserById(user.id, { password })
  if (!error) cookieStore.delete(RECOVERY_COOKIE)
  return { error: error?.message }
}
