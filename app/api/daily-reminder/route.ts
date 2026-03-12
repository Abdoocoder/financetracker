import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push-send'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function sendDailyReminders() {
  const now = new Date()
  const localNow = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  const year = localNow.getUTCFullYear()
  const month = localNow.getUTCMonth() + 1
  const day = localNow.getUTCDate()
  const firstDay = `${year}-${String(month).padStart(2,'0')}-01`
  const today = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  const daysLeft = new Date(year, month, 0).getDate() - day + 1

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, monthly_income')
    .gt('monthly_income', 0)

  if (!profiles?.length) return 0

  let sent = 0
  for (const profile of profiles) {
    const uid = profile.id
    const name = profile.full_name?.split(' ')[0] ?? 'أخي'
    const income = profile.monthly_income ?? 0

    const { data: txData } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', uid)
      .gte('transaction_date', firstDay)
      .lte('transaction_date', today)

    const spent = (txData ?? [])
      .filter(t => t.type === 'expense')
      .reduce((a, t) => a + Number(t.amount), 0)

    const { data: debts } = await supabase
      .from('debts')
      .select('monthly_payment')
      .eq('user_id', uid)
      .eq('is_paid', false)

    const debtTotal = (debts ?? []).reduce((a, d) => a + Number(d.monthly_payment), 0)

    const remaining = income - debtTotal - spent
    const dailySafe = daysLeft > 0 ? Math.max(0, remaining / daysLeft) : 0

    const { count: todayCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('transaction_date', today)

    let title: string
    let message: string

    if ((todayCount ?? 0) === 0) {
      title = `صباح الخير ${name} 👋`
      message = `ميزانيتك اليوم: ${dailySafe.toFixed(0)} JOD — سجّل أول مصروف الآن ⚡`
    } else {
      title = `أحسنت ${name} ✅`
      message = `سجّلت اليوم. المتاح اليوم: ${dailySafe.toFixed(0)} JOD. استمر! 💪`
    }

    await sendPushToUser(uid, title, message, '/dashboard?quick=1', 'daily-reminder')
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
  const sent = await sendDailyReminders()
  return NextResponse.json({ ok: true, sent })
}
