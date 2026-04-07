import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push-send'
import { verifyCronAuth } from '@/lib/cron-auth'

const supabase = createAdminClient()

function localDate(offsetDays = 0): string {
  const offset = (Number(process.env.TIMEZONE_OFFSET_HOURS) || 3) * 60 * 60 * 1000
  const d = new Date(Date.now() + offset - offsetDays * 86400000)
  return d.toISOString().split('T')[0]
}

async function sendStreakAlerts() {
  const today = localDate(0)
  const yesterday = localDate(1)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')

  if (!profiles?.length) return 0

  let sent = 0

  await Promise.all(profiles.map(async (profile) => {
    const uid = profile.id
    const name = profile.full_name?.split(' ')[0] ?? 'أخي'

    const { count: todayCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('transaction_date', today)

    if ((todayCount ?? 0) > 0) return

    const { data: txs } = await supabase
      .from('transactions')
      .select('transaction_date')
      .eq('user_id', uid)
      .lt('transaction_date', today)
      .order('transaction_date', { ascending: false })

    if (!txs?.length) return

    const uniqueDates = [...new Set(txs.map((t: any) => t.transaction_date))].sort().reverse()
    let streak = 0
    let checkDate = new Date(yesterday)

    for (const date of uniqueDates) {
      const d = new Date(date as string)
      const diff = Math.floor((checkDate.getTime() - d.getTime()) / 86400000)
      if (diff <= 1) { streak++; checkDate = d }
      else break
    }

    if (streak < 3) return

    const title = streak >= 7
      ? `⚠️ ${name}، سلسلتك 🔥 ${streak} يوم على وشك الانكسار!`
      : `${name}، لا تكسر سلسلتك 🔥 ${streak} أيام!`

    const body = streak >= 30
      ? `شهر كامل من الالتزام — دقيقة واحدة الآن تحافظ على إنجازك`
      : streak >= 7
      ? `أسبوع متواصل — لا تضيّعه، سجّل معاملة واحدة الآن ⚡`
      : `3 أيام متواصلة — واصل وسجّل اليوم قبل منتصف الليل`

    await sendPushToUser(uid, title, body, '/dashboard?quick=1', 'streak-alert')
    sent++
  }))

  return sent
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sent = await sendStreakAlerts()
  return NextResponse.json({ ok: true, sent })
}
