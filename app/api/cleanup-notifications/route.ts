import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCronAuth } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    const { error } = await supabase.rpc('cleanup_old_notifications')
    if (error) throw error

    return NextResponse.json({ ok: true, message: 'Old notifications cleaned up' })
  } catch (err) {
    console.error('[cleanup-notifications] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}