'use client'
import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useCachedData } from '@/lib/use-cached-data'
import { PageSkeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = createClient()

  const fetchStats = useCallback(async () => {
    if (!user) return null
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const [txRes, debtRes, goalRes, invRes, alertRes] = await Promise.all([
      supabase.from('transactions').select('type, amount, description, category, transaction_date').eq('user_id', user.id).gte('transaction_date', firstDay).lte('transaction_date', lastDay).order('transaction_date', { ascending: false }),
      supabase.from('debts').select('remaining_amount, monthly_payment, original_amount').eq('user_id', user.id).eq('is_paid', false),
      supabase.from('savings_goals').select('target_amount, current_amount').eq('user_id', user.id),
      supabase.from('investments').select('shares, current_price, avg_buy_price').eq('user_id', user.id),
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
    ])

    const income = txRes.data?.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0) ?? 0
    const expenses = txRes.data?.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0) ?? 0
    const totalDebt = debtRes.data?.reduce((a, d) => a + d.remaining_amount, 0) ?? 0
    const monthlyDebt = debtRes.data?.reduce((a, d) => a + (d.monthly_payment ?? 0), 0) ?? 0
    const totalOriginal = debtRes.data?.reduce((a, d) => a + d.original_amount, 0) ?? 0
    const debtPct = totalOriginal > 0 ? ((totalOriginal - totalDebt) / totalOriginal * 100) : 0
    const invValue = invRes.data?.reduce((a, i) => a + i.shares * i.current_price, 0) ?? 0
    const invCost = invRes.data?.reduce((a, i) => a + i.shares * i.avg_buy_price, 0) ?? 0
    const goalsProgress = goalRes.data?.length
      ? goalRes.data.reduce((a, g) => a + g.current_amount / g.target_amount, 0) / goalRes.data.length * 100
      : 0
    const unreadAlerts = alertRes.count ?? 0

    return {
      income, expenses, net: income - expenses,
      totalDebt, monthlyDebt, debtPct,
      debtCount: debtRes.data?.length ?? 0,
      invValue, invCost, invPnL: invValue - invCost,
      goalsProgress, goalCount: goalRes.data?.length ?? 0,
      unreadAlerts,
      recentTx: txRes.data?.slice(0, 5) ?? [],
    }
  }, [user, supabase])

  const { data: stats, loading } = useCachedData('dashboard-stats', fetchStats, [user?.id])

  const today = new Date()
  const hour = today.getHours()
  const greeting = hour < 12 ? 'صباح النور' : hour < 17 ? 'مساء النور' : 'مساء الخير'
  const dateStr = today.toLocaleDateString('ar-JO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'عبدالله'

  if (userLoading || loading) return <PageSkeleton />

  const categoryIcons: Record<string, string> = {
    'راتب': '💼', 'طعام': '🍽️', 'مواصلات': '🚗', 'فواتير': '⚡',
    'اتصالات': '📱', 'ديون': '💳', 'ترفيه': '🎬', 'صحة': '🏥',
    'تعليم': '📚', 'ملابس': '👕', 'متنوع': '📦',
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl lg:max-w-none mx-auto">

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

      {/* تنبيه غير مقروء */}
      {(stats?.unreadAlerts ?? 0) > 0 && (
        <Link href="/dashboard/alerts">
          <div className="card p-3 flex items-center gap-3 animate-scale-in"
            style={{ borderColor: 'rgba(59,130,246,0.4)', cursor: 'pointer' }}>
            <span className="text-xl">🔔</span>
            <div className="flex-1">
              <div className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                لديك {stats?.unreadAlerts} تنبيه غير مقروء
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded-lg gradient-blue text-white font-bold">عرض</span>
          </div>
        </Link>
      )}

      {/* Stats شهرية */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'الدخل', value: `+${stats?.income.toFixed(0) ?? 0}`, color: 'var(--accent-green-light)', sub: 'JOD هذا الشهر' },
          { label: 'المصاريف', value: `-${stats?.expenses.toFixed(0) ?? 0}`, color: 'var(--accent-red-light)', sub: 'JOD هذا الشهر' },
          { label: 'الصافي', value: `${(stats?.net ?? 0) >= 0 ? '+' : ''}${stats?.net.toFixed(0) ?? 0}`, color: (stats?.net ?? 0) >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', sub: 'JOD' },
        ].map((s, i) => (
          <div key={i} className="card p-3 text-center">
            <div className="text-base font-black font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* الديون */}
      <Link href="/dashboard/debts">
        <div className="card p-4" style={{ cursor: 'pointer' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">💳</span>
              <div>
                <div className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>إجمالي الديون</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stats?.debtCount} دين · {stats?.monthlyDebt.toFixed(0)} JOD/شهر</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-black font-mono" style={{ color: 'var(--accent-red-light)' }}>{stats?.totalDebt.toFixed(0)} JOD</div>
              <div className="text-xs font-mono" style={{ color: 'var(--accent-green-light)' }}>{stats?.debtPct.toFixed(0)}% مسدد</div>
            </div>
          </div>
          <div className="progress-track">
            <div className="progress-fill gradient-green" style={{ width: `${Math.min(stats?.debtPct ?? 0, 100)}%` }} />
          </div>
        </div>
      </Link>

      {/* الاستثمارات */}
      <Link href="/dashboard/investments">
        <div className="card p-4" style={{ cursor: 'pointer' }}>
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
      </Link>

      {/* الأهداف */}
      <Link href="/dashboard/goals">
        <div className="card p-4" style={{ cursor: 'pointer' }}>
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
      </Link>

      {/* آخر المعاملات */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>🔄 آخر المعاملات</div>
          <Link href="/dashboard/transactions">
            <span className="text-xs font-bold badge-blue px-2 py-1 rounded-lg">كل المعاملات</span>
          </Link>
        </div>
        <div className="space-y-2">
          {stats?.recentTx.map((t: any) => (
            <div key={t.transaction_date + t.amount} className="flex items-center gap-3 py-2"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                style={{ background: t.type === 'income' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
                {categoryIcons[t.category] ?? (t.type === 'income' ? '💰' : '💸')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {t.description || t.category || '—'}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.transaction_date}</div>
              </div>
              <div className="font-black font-mono text-sm shrink-0"
                style={{ color: t.type === 'income' ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
                {t.type === 'income' ? '+' : '-'}{Number(t.amount).toFixed(2)}
              </div>
            </div>
          ))}
          {(stats?.recentTx.length ?? 0) === 0 && (
            <div className="text-center py-6" style={{ color: 'var(--text-muted)' }}>
              <div className="text-2xl mb-1">📋</div>
              <div className="text-xs">لا توجد معاملات هذا الشهر</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
