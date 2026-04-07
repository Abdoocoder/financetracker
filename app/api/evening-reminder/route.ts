import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push-send'
import { verifyCronAuth } from '@/lib/cron-auth'

const supabase = createAdminClient()

async function sendEveningReminders(userId?: string) {
  // استخدام توقيت UTC+3 (الأردن/الخليج) لتجنب خطأ اليوم
  const today = new Date(new Date().getTime() + (Number(process.env.TIMEZONE_OFFSET_HOURS) || 3) * 60 * 60 * 1000).toISOString().split('T')[0]

  const query = supabase.from('profiles').select('id, full_name')
  const { data: profiles } = userId ? await query.eq('id', userId) : await query

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
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = request.nextUrl.searchParams.get('userId') ?? undefined
  const sent = await sendEveningReminders(userId)
  return NextResponse.json({ ok: true, sent })
}
