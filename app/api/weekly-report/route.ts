import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push-send'
import { verifyCronAuth } from '@/lib/cron-auth'

const supabase = createAdminClient()

async function sendWeeklyReports() {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, monthly_income')

  if (!profiles?.length) return 0

  let sent = 0
  for (const profile of profiles) {
    const uid = profile.id
    const name = profile.full_name?.split(' ')[0] ?? 'أخي'

    // مصاريف هذا الأسبوع
    const { data: thisWeek } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', uid)
      .eq('type', 'expense')
      .gte('transaction_date', weekAgo)
      .lte('transaction_date', today)

    // مصاريف الأسبوع الماضي
    const { data: lastWeek } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', uid)
      .eq('type', 'expense')
      .gte('transaction_date', twoWeeksAgo)
      .lt('transaction_date', weekAgo)

    const thisTotal = (thisWeek ?? []).reduce((a, t) => a + Number(t.amount), 0)
    const lastTotal = (lastWeek ?? []).reduce((a, t) => a + Number(t.amount), 0)
    const diff = Math.abs(thisTotal - lastTotal).toFixed(0)

    // أكبر فئة إنفاق
    const { data: cats } = await supabase
      .from('transactions')
      .select('category, amount')
      .eq('user_id', uid)
      .eq('type', 'expense')
      .gte('transaction_date', weekAgo)

    const catMap: Record<string, number> = {}
    for (const t of cats ?? []) {
      catMap[t.category] = (catMap[t.category] ?? 0) + Number(t.amount)
    }
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]

    let title = `تقرير أسبوعك ${name} 📊`
    let body: string

    if (lastTotal === 0) {
      body = `أنفقت هذا الأسبوع: ${thisTotal.toFixed(0)} JOD`
    } else if (thisTotal < lastTotal) {
      body = `أسبوع أفضل! وفّرت ${diff} JOD مقارنة بالأسبوع الماضي ✅`
    } else if (thisTotal > lastTotal) {
      body = `أنفقت ${diff} JOD أكثر من الأسبوع الماضي — راجع مصاريفك`
    } else {
      body = `إنفاقك مستقر هذا الأسبوع: ${thisTotal.toFixed(0)} JOD`
    }

    if (topCat) {
      body += ` | أكثر إنفاق: ${topCat[0]} (${topCat[1].toFixed(0)} JOD)`
    }

    await sendPushToUser(uid, title, body, '/dashboard', 'weekly-report')
    sent++
  }
  return sent
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sent = await sendWeeklyReports()
  return NextResponse.json({ ok: true, sent })
}
