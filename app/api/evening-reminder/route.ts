import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push-send'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function sendEveningReminders() {
  const today = new Date().toISOString().split('T')[0]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')

  if (!profiles?.length) return 0

  let sent = 0
  for (const profile of profiles) {
    const uid = profile.id
    const name = profile.full_name?.split(' ')[0] ?? 'أخي'

    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('transaction_date', today)

    const todayCount = count ?? 0

    let title: string
    let body: string

    if (todayCount === 0) {
      title = `${name}، لم تسجل اليوم بعد 🤔`
      body = 'هل كان يوماً بدون إنفاق؟ سجّل الآن قبل أن تنسى'
    } else {
      title = `أحسنت ${name}! 💪`
      body = `سجّلت ${todayCount} معاملة اليوم. استمر على هذا النهج`
    }

    await sendPushToUser(uid, title, body, '/dashboard/transactions', 'evening-reminder')
    sent++
  }
  return sent
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isManual = authHeader === `Bearer ${process.env.CRON_SECRET}`
  if (!isVercelCron && !isManual) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sent = await sendEveningReminders()
  return NextResponse.json({ ok: true, sent })
}
