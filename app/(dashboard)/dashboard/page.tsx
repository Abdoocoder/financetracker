'use client'
import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useCachedData } from '@/lib/use-cached-data'
import { PageSkeleton, StatsSkeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = createClient()

  const fetchStats = useCallback(async () => {
    if (!user) return null
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const [txRes, debtRes, goalRes, invRes] = await Promise.all([
      supabase.from('transactions').select('type, amount').eq('user_id', user.id).gte('transaction_date', firstDay).lte('transaction_date', lastDay),
      supabase.from('debts').select('remaining_amount, monthly_payment').eq('user_id', user.id).eq('is_paid', false),
      supabase.from('savings_goals').select('target_amount, current_amount').eq('user_id', user.id),
      supabase.from('investments').select('shares, current_price, avg_buy_price').eq('user_id', user.id),
    ])

    const income = txRes.data?.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0) ?? 0
    const expenses = txRes.data?.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0) ?? 0
    const totalDebt = debtRes.data?.reduce((a, d) => a + d.remaining_amount, 0) ?? 0
    const monthlyDebt = debtRes.data?.reduce((a, d) => a + (d.monthly_payment ?? 0), 0) ?? 0
    const invValue = invRes.data?.reduce((a, i) => a + i.shares * i.current_price, 0) ?? 0
    const invCost = invRes.data?.reduce((a, i) => a + i.shares * i.avg_buy_price, 0) ?? 0
    const goalsProgress = goalRes.data?.length
      ? goalRes.data.reduce((a, g) => a + g.current_amount / g.target_amount, 0) / goalRes.data.length * 100
      : 0

    return { income, expenses, net: income - expenses, totalDebt, monthlyDebt, invValue, invCost, invPnL: invValue - invCost, goalsProgress, debtCount: debtRes.data?.length ?? 0, goalCount: goalRes.data?.length ?? 0 }
  }, [user, supabase])

  const { data: stats, loading } = useCachedData('dashboard-stats', fetchStats, [user?.id])

  const today = new Date()
  const dayName = today.toLocaleDateString('ar-EG', { weekday: 'long' })
  const dateStr = `${dayName}، ${today.getDate()} ${today.toLocaleDateString('ar-EG', { month: 'long' })} ${today.getFullYear()}`
  const hour = today.getHours()
  const greeting = hour < 12 ? 'صباح النور' : hour < 17 ? 'مساء النور' : 'مساء الخير'
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'عبدالله'

  if (userLoading || loading) return <PageSkeleton />

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl lg:max-w-none mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
            👋 {greeting}، {firstName}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{dateStr}</p>
        </div>
        <div className="card px-3 py-2 text-center">
          <div className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>الراتب الشهري</div>
          <div className="font-black text-sm font-mono" style={{ color: 'var(--accent-green-light)' }}>
            JOD {stats?.income.toFixed(2) ?? '0.00'}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'الدخل', value: `+${stats?.income.toFixed(0) ?? 0}`, color: 'var(--accent-green-light)', sub: 'JOD' },
          { label: 'المصاريف', value: `-${stats?.expenses.toFixed(0) ?? 0}`, color: 'var(--accent-red-light)', sub: 'JOD' },
          { label: 'الصافي', value: `${(stats?.net ?? 0) >= 0 ? '+' : ''}${stats?.net.toFixed(0) ?? 0}`, color: (stats?.net ?? 0) >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', sub: 'JOD' },
        ].map((s, i) => (
          <div key={i} className="card p-3 text-center">
            <div className="text-base font-black font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {/* الديون */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">💳</span>
              <div>
                <div className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>إجمالي الديون</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stats?.debtCount} دين نشط</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-black font-mono" style={{ color: 'var(--accent-red-light)' }}>{stats?.totalDebt.toFixed(0)} JOD</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stats?.monthlyDebt.toFixed(0)} شهرياً</div>
            </div>
          </div>
        </div>

        {/* الاستثمارات */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📈</span>
              <div>
                <div className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>المحفظة الاستثمارية</div>
                <div className="text-xs font-mono" style={{ color: (stats?.invPnL ?? 0) >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
                  {(stats?.invPnL ?? 0) >= 0 ? '+' : ''}{stats?.invPnL.toFixed(2) ?? '0'} USD
                </div>
              </div>
            </div>
            <div className="font-black font-mono" style={{ color: 'var(--accent-blue-light)' }}>
              ${stats?.invValue.toFixed(2) ?? '0'}
            </div>
          </div>
        </div>

        {/* الأهداف */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <div>
                <div className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>أهداف الادخار</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stats?.goalCount} هدف</div>
              </div>
            </div>
            <div className="font-black font-mono text-sm" style={{ color: 'var(--accent-blue-light)' }}>
              {stats?.goalsProgress.toFixed(0) ?? 0}%
            </div>
          </div>
          <div className="progress-track">
            <div className="progress-fill gradient-blue" style={{ width: `${Math.min(stats?.goalsProgress ?? 0, 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
