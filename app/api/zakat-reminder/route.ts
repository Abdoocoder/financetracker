import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push-send'
import { verifyCronAuth } from '@/lib/cron-auth'

const supabase = createAdminClient()

const HAUL_DAYS = 354

async function sendZakatReminders(userId?: string) {
  const today = new Date()

  // جلب كل المستخدمين (أو مستخدم واحد للاختبار)
  const profileQuery = supabase.from('profiles').select('id, full_name')
  const { data: profiles } = userId
    ? await profileQuery.eq('id', userId)
    : await profileQuery

  if (!profiles?.length) return 0

  let sent = 0

  for (const profile of profiles) {
    const uid = profile.id
    const name = profile.full_name?.split(' ')[0] ?? 'أخي'

    // جلب كل استثمارات المستخدم
    const { data: investments } = await supabase
      .from('investments')
      .select('id, name, symbol, shares, current_price, created_at')
      .eq('user_id', uid)

    if (!investments?.length) continue

    for (const inv of investments) {
      if (!inv.created_at) continue

      const createdAt = new Date(inv.created_at)
      const haulDate = new Date(createdAt.getTime() + HAUL_DAYS * 24 * 60 * 60 * 1000)
      const daysLeft = Math.ceil((haulDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

      // تنبيه عند: 30 يوم + 7 أيام + يوم الحول (0)
      const shouldNotify = daysLeft === 30 || daysLeft === 7 || daysLeft === 0 || daysLeft === -1

      if (!shouldNotify) continue

      const invName = inv.symbol ?? inv.name ?? 'الاستثمار'
      const invValue = Number(inv.shares) * Number(inv.current_price)

      let title: string
      let body: string

      if (daysLeft <= 0) {
        title = `${name}، حان موعد زكاة ${invName} 🌙`
        body = `قيمة الاستثمار ${invValue.toLocaleString('ar', { maximumFractionDigits: 0 })} — الزكاة المستحقة ${(invValue * 0.025).toLocaleString('ar', { maximumFractionDigits: 0 })}`
      } else if (daysLeft === 7) {
        title = `${name}، بقي 7 أيام على حول ${invName} ⏳`
        body = `استعدّ لأداء الزكاة — قيمة الاستثمار ${invValue.toLocaleString('ar', { maximumFractionDigits: 0 })}`
      } else {
        title = `${name}، بقي شهر على حول ${invName} 📅`
        body = `موعد زكاة استثماراتك يقترب — لا تنسَ حسابها في فجرك`
      }

      await sendPushToUser(uid, title, body, '/dashboard/zakat', 'reminder')
      sent++
    }
  }

  return sent
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = request.nextUrl.searchParams.get('userId') ?? undefined
  const sent = await sendZakatReminders(userId)
  return NextResponse.json({ ok: true, sent })
}
