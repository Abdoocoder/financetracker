import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push-send'
import { verifyCronAuth } from '@/lib/cron-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function localDate(offsetDays = 0): string {
  const offset = (Number(process.env.TIMEZONE_OFFSET_HOURS) || 3) * 60 * 60 * 1000
  const d = new Date(Date.now() + offset - offsetDays * 86400000)
  return d.toISOString().split('T')[0]
}

async function sendNewUserNudge() {
  const today = localDate(0)
  const yesterday = localDate(1)

  // مستخدمون سجّلوا أول معاملة بالأمس فقط
  const { data: newUsers } = await supabase
    .from('transactions')
    .select('user_id')
    .eq('transaction_date', yesterday)
    .order('user_id')

  if (!newUsers?.length) return 0

  // نأخذ user_ids فريدة
  const userIds = [...new Set(newUsers.map(r => r.user_id))]

  let sent = 0

  for (const uid of userIds) {
    // تحقق أن هذا فعلاً أول يوم له (لا معاملات قبل الأمس)
    const { count: olderCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .lt('transaction_date', yesterday)

    if ((olderCount ?? 0) > 0) continue // مستخدم قديم، تجاوز

    // تحقق أنه لم يسجّل اليوم بعد
    const { count: todayCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('transaction_date', today)

    if ((todayCount ?? 0) > 0) continue // سجّل اليوم، لا يحتاج nudge

    // احسب ما أنفقه بالأمس
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
      .filter(t => t.type === 'expense')
      .reduce((a, t) => a + Number(t.amount), 0)

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
