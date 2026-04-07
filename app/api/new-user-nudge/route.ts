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

async function sendNewUserNudge() {
  const today = localDate(0)
  const yesterday = localDate(1)

  const { data: newUsers } = await supabase
    .from('transactions')
    .select('user_id')
    .eq('transaction_date', yesterday)
    .order('user_id')

  if (!newUsers?.length) return 0

  const userIds = [...new Set(newUsers.map((r: any) => r.user_id))]

  let sent = 0

  for (const uid of userIds) {
    const { count: olderCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .lt('transaction_date', yesterday)

    if ((olderCount ?? 0) > 0) continue

    const { count: todayCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('transaction_date', today)

    if ((todayCount ?? 0) > 0) continue

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', uid)
      .single()

    const { data: txs } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', uid)
      .eq('transaction_date', yesterday)

    const name = profile?.full_name?.split(' ')[0] ?? 'أخي'
    const expenses = (txs ?? [])
      .filter((t: any) => t.type === 'expense')
      .reduce((a: number, t: any) => a + Number(t.amount), 0)

    const title = `${name}، أين ذهبت فلوسك اليوم؟ 💭`
    const body = expenses > 0
      ? `أمس سجّلت ${expenses.toFixed(0)} JOD مصاريف — واصل اليوم وشوف أين تذهب فلوسك فعلاً`
      : `بدأت رحلتك أمس في فجرك — دقيقة واحدة اليوم تفرق في وعيك المالي ⚡`

    await sendPushToUser(uid, title, body, '/dashboard?quick=1', 'new-user-nudge')
    sent++
  }

  return sent
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sent = await sendNewUserNudge()
  return NextResponse.json({ ok: true, sent })
}
