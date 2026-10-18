import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push-send'
import { verifyCronAuth } from '@/lib/cron-auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// صيغة عنصر get_zakat_hauls (مصدر الحول الوحيد — راجع migration 20261019000000)
interface HaulItem {
  source: 'investment' | 'holding'
  ref_id: string | null
  label: string | null
  asset_type: string | null
  grams: number | null
  value_usd: number | null
  haul_date: string
  days_remaining: number
}

async function sendZakatReminders(userId?: string) {
  const supabase = createAdminClient()

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

    // الحولات تأتي من RPC الموحد (استثمارات + ذهب/فضة)، وليس حساباً مضمراً هنا.
    // service_role لا يحمل JWT => auth.uid() NULL => الحارس يسمح (بنفس نمط المسارات الخلفية).
    const { data: hauls, error } = await supabase.rpc('get_zakat_hauls', {
      p_user_id: uid,
    })

    if (error || !Array.isArray(hauls) || hauls.length === 0) continue

    for (const haul of hauls as HaulItem[]) {
      const daysLeft = haul.days_remaining

      // تنبيه عند: 30 يوم + 7 أيام + يوم الحول (0) + يوم بعد الحول (-1)
      const shouldNotify = daysLeft === 30 || daysLeft === 7 || daysLeft === 0 || daysLeft === -1
      if (!shouldNotify) continue

      const invName = haul.label ?? 'الاستثمار'
      const invValue = Number(haul.value_usd ?? 0)

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

      await sendPushToUser(uid, title, body, '/dashboard/zakat', 'zakat-due')
      sent++
    }
  }

  return sent
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const rawId = request.nextUrl.searchParams.get('userId')
  const userId = rawId && UUID_RE.test(rawId) ? rawId : undefined
  const sent = await sendZakatReminders(userId)
  return NextResponse.json({ ok: true, sent })
}
