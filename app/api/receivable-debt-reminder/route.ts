import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push-send'
import { verifyCronAuth } from '@/lib/cron-auth'
import { getLocalNow } from '@/lib/timezone'

export const runtime = 'nodejs'
export const maxDuration = 60

async function receivableDebtReminder() {
  const supabase = createAdminClient()
  const now = getLocalNow()
  const todayStr = now.toISOString().split('T')[0]
  const tomorrow = new Date(now.getTime() + 86400000)
    .toISOString().split('T')[0]

  const { data: profiles } = await supabase
    .from('profiles').select('id, full_name, lang')
  if (!profiles?.length) return

  await Promise.allSettled(profiles.map(async (p) => {
    const name = p.full_name?.split(' ')[0] ?? 'أخي'
    const userLang: 'ar' | 'en' = p.lang === 'en' ? 'en' : 'ar'

    const { data: debts } = await supabase.from('debts')
      .select('id, name, remaining_amount, currency, due_date')
      .eq('user_id', p.id)
      .eq('is_paid', false)
      .eq('debt_type', 'receivable')
      .not('due_date', 'is', null)

    if (!debts?.length) return

    for (const debt of debts) {
      const dueDate = debt.due_date
      const amount = Number(debt.remaining_amount).toFixed(0)
      const currency = debt.currency || 'JOD'

      if (dueDate === tomorrow) {
        const title = userLang === 'ar'
          ? `💰 غداً موعد استلام دينك`
          : `💰 Debt due tomorrow`
        const body = userLang === 'ar'
          ? `غداً موعد استلام ${amount} ${currency} من "${debt.name}" — هل تواصلت معه؟`
          : `${amount} ${currency} from "${debt.name}" is due tomorrow — did you reach out?`
        await sendPushToUser(p.id, title, body, '/dashboard/debts', 'receivable-debt')
      }

      if (dueDate === todayStr) {
        const title = userLang === 'ar'
          ? `💰 اليوم موعد استلام دينك!`
          : `💰 Debt due today!`
        const body = userLang === 'ar'
          ? `اليوم موعد استلام ${amount} ${currency} من "${debt.name}" — هل استلمته؟`
          : `${amount} ${currency} from "${debt.name}" is due today — did you receive it?`
        await sendPushToUser(p.id, title, body, '/dashboard/debts', 'receivable-debt')
      }
    }
  }))
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await receivableDebtReminder()
  return NextResponse.json({ ok: true })
}