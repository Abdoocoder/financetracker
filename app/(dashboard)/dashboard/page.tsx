'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'

function Bone({ w, h = '14px', r = '8px' }: { w: string; h?: string; r?: string }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r }} />
}

function DashSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <Bone w="140px" h="24px" />
        <Bone w="80px" h="18px" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0,1,2].map(i => (
          <div key={i} className="card-static p-3 flex flex-col items-center gap-2">
            <Bone w="32px" h="32px" r="10px" />
            <Bone w="60px" h="20px" r="6px" />
            <Bone w="50px" h="12px" r="6px" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3">
        {[0,1,2].map(i => (
          <div key={i} className="card-static p-4 flex items-center gap-4">
            <Bone w="48px" h="48px" r="12px" />
            <div className="flex-1 space-y-2">
              <Bone w="80px" h="12px" r="6px" />
              <Bone w="120px" h="20px" r="6px" />
            </div>
          </div>
        ))}
      </div>
      <div className="card-static p-4 space-y-3">
        <Bone w="120px" h="16px" r="6px" />
        {[0,1,2,3,4].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Bone w="32px" h="32px" r="8px" />
            <div className="flex-1 space-y-1.5">
              <Bone w="70%" h="12px" r="6px" />
              <Bone w="40%" h="10px" r="6px" />
            </div>
            <Bone w="50px" h="14px" r="6px" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { t } = useI18n()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [recentTx, setRecentTx] = useState<any[]>([])
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true

    async function fetchAll() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      const [txRes, debtRes, invRes, goalRes, alertRes, recentRes] = await Promise.all([
        supabase.from('transactions').select('type,amount')
          .eq('user_id', user.id)
          .gte('transaction_date', firstDay)
          .lte('transaction_date', lastDay),
        supabase.from('debts').select('remaining_amount,monthly_payment')
          .eq('user_id', user.id).eq('is_paid', false),
        supabase.from('investments').select('shares,current_price')
          .eq('user_id', user.id),
        supabase.from('savings_goals').select('current_amount,target_amount')
          .eq('user_id', user.id),
        supabase.from('alerts').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('is_read', false),
        supabase.from('transactions').select('id,type,amount,category,description,transaction_date')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false })
          .limit(5),
      ])

      const txs      = txRes.data ?? []
      const income   = txs.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
      const expenses = txs.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)

      setData({
        income, expenses,
        net:          income - expenses,
        totalDebt:    (debtRes.data ?? []).reduce((a, d) => a + Number(d.remaining_amount), 0),
        invValue:     (invRes.data  ?? []).reduce((a, i) => a + Number(i.shares) * Number(i.current_price), 0),
        goalsSaved:   (goalRes.data ?? []).reduce((a, g) => a + Number(g.current_amount), 0),
        goalsTarget:  (goalRes.data ?? []).reduce((a, g) => a + Number(g.target_amount), 0),
        unreadAlerts: alertRes.count ?? 0,
      })
      setRecentTx(recentRes.data ?? [])
      setLoading(false)
    }

    fetchAll()
  }, [supabase])

  if (loading) return <DashSkeleton />

  const stats = [
    { label: t('dash_income'),
      value: `+${(data?.income ?? 0).toFixed(0)}`,
      color: 'var(--accent-green-light)', icon: '💰' },
    { label: t('dash_expenses'),
      value: `${(data?.expenses ?? 0).toFixed(0)}`,
      color: 'var(--accent-red-light)', icon: '💸' },
    { label: t('dash_net'),
      value: `${(data?.net ?? 0) >= 0 ? '+' : ''}${(data?.net ?? 0).toFixed(0)}`,
      color: (data?.net ?? 0) >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
      icon: '📊' },
  ]

  const cards = [
    { label: t('dash_debts'),
      value: `${(data?.totalDebt ?? 0).toFixed(0)} JOD`,
      color: 'var(--accent-red-light)', icon: '💳', href: '/dashboard/debts' },
    { label: t('dash_investments'),
      value: `$${(data?.invValue ?? 0).toFixed(0)}`,
      color: 'var(--accent-green-light)', icon: '📈', href: '/dashboard/investments' },
    { label: t('dash_goals'),
      value: `${(data?.goalsSaved ?? 0).toFixed(0)}/${(data?.goalsTarget ?? 0).toFixed(0)}`,
      color: 'var(--accent-blue-light)', icon: '🎯', href: '/dashboard/goals' },
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{t('dash_title')}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('dash_monthly')}</p>
        </div>
        {(data?.unreadAlerts ?? 0) > 0 && (
          <Link href="/dashboard/alerts"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', textDecoration: 'none' }}>
            🔔 {data.unreadAlerts} {t('dash_unread_alerts')}
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 stagger">
        {stats.map((s, i) => (
          <div key={i} className="card p-3 text-center">
            <div className="text-lg mb-1">{s.icon}</div>
            <div className="text-base font-black font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-3 stagger">
        {cards.map((c, i) => (
          <Link key={i} href={c.href}
            className="card p-4 flex items-center gap-4 transition-all"
            style={{ textDecoration: 'none' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: 'var(--bg-secondary)' }}>{c.icon}</div>
            <div className="flex-1">
              <div className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>{c.label}</div>
              <div className="text-lg font-black font-mono mt-0.5" style={{ color: c.color }}>{c.value}</div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '18px' }}>‹</span>
          </Link>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{t('dash_recent')}</h3>
          <Link href="/dashboard/transactions"
            className="text-xs font-bold"
            style={{ color: 'var(--accent-blue-light)', textDecoration: 'none' }}>
            {t('dash_view_all')}
          </Link>
        </div>
        <div className="space-y-1">
          {recentTx.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>{t('dash_no_transactions')}</p>
          ) : recentTx.map(tx => (
            <div key={tx.id}
              className="flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all"
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                style={{ background: tx.type === 'income' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)' }}>
                {tx.type === 'income' ? '💰' : '💸'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {tx.description || tx.category || '—'}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{tx.transaction_date}</div>
              </div>
              <div className="font-black font-mono text-sm shrink-0"
                style={{ color: tx.type === 'income' ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
                {tx.type === 'income' ? '+' : '−'}{Number(tx.amount).toFixed(0)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
