'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useCachedData } from '@/lib/use-cached-data'
import { useI18n } from '@/lib/i18n'

export default function DashboardPage() {
  const { user } = useUser()
  const { t } = useI18n()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (!user) return null
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    const [txRes, debtRes, invRes, goalRes, alertRes] = await Promise.all([
      supabase.from('transactions').select('type,amount').eq('user_id', user.id).gte('transaction_date', firstDay).lte('transaction_date', lastDay),
      supabase.from('debts').select('remaining_amount,monthly_payment').eq('user_id', user.id).eq('is_paid', false),
      supabase.from('investments').select('shares,current_price,avg_buy_price').eq('user_id', user.id),
      supabase.from('savings_goals').select('current_amount,target_amount').eq('user_id', user.id),
      supabase.from('alerts').select('id').eq('user_id', user.id).eq('is_read', false),
    ])
    const income   = (txRes.data ?? []).filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
    const expenses = (txRes.data ?? []).filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
    const totalDebt = (debtRes.data ?? []).reduce((a, d) => a + Number(d.remaining_amount), 0)
    const invValue  = (invRes.data ?? []).reduce((a, i) => a + Number(i.shares) * Number(i.current_price), 0)
    const goalsSaved = (goalRes.data ?? []).reduce((a, g) => a + Number(g.current_amount), 0)
    const goalsTarget = (goalRes.data ?? []).reduce((a, g) => a + Number(g.target_amount), 0)
    return { income, expenses, net: income - expenses, totalDebt, invValue, goalsSaved, goalsTarget, unreadAlerts: alertRes.data?.length ?? 0 }
  }, [user, supabase])

  const { data, loading } = useCachedData('dashboard', fetchData, [user])

  const [recentTx, setRecentTx] = useState<any[]>([])
  useEffect(() => {
    if (!user) return
    supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(5).then(({ data }) => setRecentTx(data ?? []))
  }, [user, supabase])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-3xl animate-pulse-slow">⏳</div>
    </div>
  )

  const stats = [
    { label: t('dash_income'),   value: `+${(data?.income ?? 0).toFixed(0)}`,   color: 'var(--accent-green-light)', icon: '💰' },
    { label: t('dash_expenses'), value: `${(data?.expenses ?? 0).toFixed(0)}`,   color: 'var(--accent-red-light)',   icon: '💸' },
    { label: t('dash_net'),      value: `${(data?.net ?? 0) >= 0 ? '+' : ''}${(data?.net ?? 0).toFixed(0)}`, color: (data?.net ?? 0) >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', icon: '📊' },
  ]

  const cards = [
    { label: t('dash_debts'),       value: `${(data?.totalDebt ?? 0).toFixed(0)} JOD`, color: 'var(--accent-red-light)',    icon: '💳', href: '/dashboard/debts'       },
    { label: t('dash_investments'), value: `$${(data?.invValue ?? 0).toFixed(0)}`,      color: 'var(--accent-green-light)', icon: '📈', href: '/dashboard/investments'  },
    { label: t('dash_goals'),       value: `${(data?.goalsSaved ?? 0).toFixed(0)}/${(data?.goalsTarget ?? 0).toFixed(0)}`, color: 'var(--accent-blue-light)', icon: '🎯', href: '/dashboard/goals' },
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{t('dash_title')}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('dash_monthly')}</p>
        </div>
        {(data?.unreadAlerts ?? 0) > 0 && (
          <Link href="/dashboard/alerts"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            🔔 {data?.unreadAlerts} {t('dash_unread_alerts')}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="card p-3 text-center">
            <div className="text-lg mb-1">{s.icon}</div>
            <div className="text-base font-black font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {cards.map((c, i) => (
          <Link key={i} href={c.href} className="card p-4 flex items-center gap-4 hover:border-opacity-60 transition-all">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: 'var(--bg-secondary)' }}>{c.icon}</div>
            <div className="flex-1">
              <div className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>{c.label}</div>
              <div className="text-lg font-black font-mono mt-0.5" style={{ color: c.color }}>{c.value}</div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '20px' }}>‹</span>
          </Link>
        ))}
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{t('dash_recent')}</h3>
          <Link href="/dashboard/transactions" className="text-xs font-bold" style={{ color: 'var(--accent-blue-light)' }}>
            {t('dash_view_all')}
          </Link>
        </div>
        <div className="space-y-2">
          {recentTx.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>{t('dash_no_transactions')}</p>
          )}
          {recentTx.map(tx => (
            <div key={tx.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                style={{ background: tx.type === 'income' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
                {tx.type === 'income' ? '💰' : '💸'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{tx.description || tx.category}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{tx.transaction_date}</div>
              </div>
              <div className="font-black font-mono text-sm shrink-0"
                style={{ color: tx.type === 'income' ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
                {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toFixed(0)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
