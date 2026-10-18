import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push-send'
import { verifyCronAuth } from '@/lib/cron-auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// نافذة التنبيه: اليوم (0) أو المتأخر (< 0) أو خلال ٧ أيام قادمة
const NOTIFY_WINDOW_DAYS = 7

// صيغة JSON التي يعيدها RPC sync_zakat_haul_state (migration 20261021000000)
interface HaulState {
  user_id: string
  nisab_reached_at: string | null
  current_haul_due_at: string | null
  last_notified_at: string | null
  days_remaining: number | null
  is_eligible: boolean
  zakatable_assets: number
  nisab_effective: number
  zakat_due: number
}

async function syncZakatAutopilot(userId?: string) {
  const supabase = createAdminClient()

  // جلب كل المستخدمين (أو مستخدم واحد للاختبار)
  const profileQuery = supabase.from('profiles').select('id, full_name')
  const { data: profiles } = userId
    ? await profileQuery.eq('id', userId)
    : await profileQuery

  if (!profiles?.length) return { synced: 0, notified: 0 }

  let synced = 0
  let notified = 0
  const today = new Date().toISOString().slice(0, 10)

  for (const profile of profiles) {
    const uid = profile.id
    const name = profile.full_name?.split(' ')[0] ?? 'أخي'

    // آلة حالة الحول: تعيد الحالة محدّثة (تبدأ الساعة أو تُكملها أو تُلغيها).
    // service_role لا يحمل JWT => auth.uid() NULL => الحارس يسمح (نمط المسارات الخلفية).
    const { data, error } = await supabase.rpc('sync_zakat_haul_state', {
      p_user_id: uid,
    })
    if (error || !data) continue
    synced++

    const state = data as unknown as HaulState
    const daysRemaining = state.days_remaining

    // لا حول قادم (الوعاء تحت النصاب) أو خارج نافذة الـ ٧ أيام => صمت
    if (typeof daysRemaining !== 'number' || daysRemaining > NOTIFY_WINDOW_DAYS) continue

    // مانع الإزعاج: إشعار واحد كحد أقصى في اليوم الواحد لكل مستخدم
    const lastNotified = state.last_notified_at?.slice(0, 10) ?? null
    if (lastNotified === today) continue

    const dueLabel = Math.round(Number(state.zakat_due ?? 0)).toLocaleString('ar')

    let body: string
    if (daysRemaining <= 0) {
      body = `اليوم موعد زكاة ${name} — المبلغ المستحق ${dueLabel}، لا تؤخر أداءها`
    } else if (daysRemaining === 1) {
      body = `${name}، بقي يوم واحد على حول زكاتك — المبلغ المستحق ~${dueLabel}`
    } else {
      body = `${name}، بقي ${daysRemaining} أيام على حول زكاتك — المبلغ المستحق ~${dueLabel}`
    }

    await sendPushToUser(uid, 'اقترب حول زكاتك 🌙', body, '/dashboard/zakat', 'zakat-due')

    // ختم مانع الإزعاج اليومي في جدول التتبع (service_role يتجاوز RLS)
    const { error: updateError } = await supabase
      .from('zakat_haul_tracking')
      .update({ last_notified_at: new Date().toISOString() })
      .eq('user_id', uid)
    if (!updateError) notified++
  }

  return { synced, notified }
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const rawId = request.nextUrl.searchParams.get('userId')
  const userId = rawId && UUID_RE.test(rawId) ? rawId : undefined
  const { synced, notified } = await syncZakatAutopilot(userId)
  return NextResponse.json({ ok: true, synced, notified })
}
