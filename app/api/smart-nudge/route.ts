import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push-send'
import { verifyCronAuth } from '@/lib/cron-auth'
import { getLocalNow } from '@/lib/timezone'

export const runtime = 'nodejs'
export const maxDuration = 60

function daysAgo(n: number): string {
  const d = new Date(getLocalNow().getTime() - n * 86400000)
  return d.toISOString().split('T')[0]
}

async function smartNudge() {
  const supabase = createAdminClient()
  const { data: profiles } = await supabase
    .from('profiles').select('id, full_name, lang')

  if (!profiles?.length) return

  await Promise.allSettled(profiles.map(async (p) => {
    const name = p.full_name?.split(' ')[0] ?? 'أخي'
    const userLang: 'ar' | 'en' = p.lang === 'en' ? 'en' : 'ar'

    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', p.id)
      .gte('transaction_date', daysAgo(3))

    if ((count ?? 0) === 0) {
      const title = userLang === 'ar'
        ? `${name}، كيف مصاريفك اليوم؟ 💭`
        : `${name}, how are your expenses today? 💭`
      const body = userLang === 'ar'
        ? 'ما سجلت أي معاملة منذ 3 أيام — دقيقة واحدة تفرق في وعيك المالي ⚡'
        : 'No transactions logged in 3 days — one minute makes a difference in your financial awareness ⚡'

      await sendPushToUser(p.id, title, body, '/dashboard?quick=1', 'nudge')
    }
  }))
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await smartNudge()
  return NextResponse.json({ ok: true })
}