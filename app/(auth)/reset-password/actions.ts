'use server'
import { createClient } from '@supabase/supabase-js'

export async function updatePassword(password: string, token: string): Promise<{ error?: string }> {
  if (!token) return { error: 'session' }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify the token and get the user without relying on cookies
  const { data: { user }, error: userError } = await admin.auth.getUser(token)
  if (userError || !user) return { error: 'session' }

  const { error } = await admin.auth.admin.updateUserById(user.id, { password })
  return { error: error?.message }
}
