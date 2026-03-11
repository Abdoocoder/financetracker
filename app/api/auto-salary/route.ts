import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function addMonthlySalaries() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const dayOfMonth = now.getDate()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, monthly_income, salary_day')
    .gt('monthly_income', 0)

  if (!profiles?.length) return 0

  let count = 0
  for (const profile of profiles) {
    const salaryDay = profile.salary_day ?? 1
    if (dayOfMonth !== salaryDay) continue

    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(salaryDay).padStart(2,'0')}`

    const { count: existing } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('type', 'income')
      .eq('category', 'راتب')
      .eq('transaction_date', dateStr)

    if ((existing ?? 0) === 0) {
      await supabase.from('transactions').insert({
        user_id: profile.id,
        type: 'income',
        amount: profile.monthly_income,
        category: 'راتب',
        description: 'راتب شهري (تلقائي)',
        transaction_date: dateStr,
      })
      count++
    }
  }
  return count
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isManualCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
  if (!isVercelCron && !isManualCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const count = await addMonthlySalaries()
  return NextResponse.json({ ok: true, added: count })
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    const { data: profile } = await supabase
      .from('profiles')
      .select('monthly_income, salary_day')
      .eq('id', user.id)
      .single()

    if (!profile?.monthly_income || profile.monthly_income <= 0) {
      return NextResponse.json({ ok: false, message: 'لم يتم تحديد راتب شهري في الإعدادات' })
    }

    const salaryDay = profile.salary_day ?? 1
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(salaryDay).padStart(2,'0')}`

    const { count: existing } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'income')
      .eq('category', 'راتب')
      .eq('transaction_date', dateStr)

    if ((existing ?? 0) > 0) {
      return NextResponse.json({ ok: false, message: 'تم إضافة راتب هذا الشهر مسبقاً' })
    }

    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'income',
      amount: profile.monthly_income,
      category: 'راتب',
      description: 'راتب شهري (تلقائي)',
      transaction_date: dateStr,
    })

    return NextResponse.json({ ok: true, message: 'تم إضافة الراتب بنجاح' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
