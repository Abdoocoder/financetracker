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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Bone w="140px" h="24px" /><Bone w="80px" h="18px" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[0,1,2].map(i => (
          <div key={i} className="card-static" style={{ padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Bone w="32px" h="32px" r="10px" /><Bone w="60px" h="20px" r="6px" /><Bone w="50px" h="12px" r="6px" />
          </div>
        ))}
      </div>
      {[0,1,2].map(i => (
        <div key={i} className="card-static" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Bone w="48px" h="48px" r="14px" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Bone w="80px" h="12px" r="6px" /><Bone w="120px" h="20px" r="6px" />
          </div>
          <Bone w="20px" h="20px" r="6px" />
        </div>
      ))}
      <div className="card-static" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Bone w="120px" h="16px" r="6px" />
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bone w="36px" h="36px" r="10px" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Bone w="70%" h="12px" r="6px" /><Bone w="40%" h="10px" r="6px" />
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
        supabase.from('transactions').select('type,amount').eq('user_id', user.id).gte('transaction_date', firstDay).lte('transaction_date', lastDay),
        supabase.from('debts').select('remaining_amount,monthly_payment').eq('user_id', user.id).eq('is_paid', false),
        supabase.from('investments').select('shares,current_price').eq('user_id', user.id),
        supabase.from('savings_goals').select('current_amount,target_amount').eq('user_id', user.id),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
        supabase.from('transactions').select('id,type,amount,category,description,transaction_date').eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(5),
      ])
      const txs      = txRes.data ?? []
      const income   = txs.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
      const expenses = txs.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
      setData({ income, expenses, net: income - expenses, totalDebt: (debtRes.data ?? []).reduce((a, d) => a + Number(d.remaining_amount), 0), invValue: (invRes.data ?? []).reduce((a, i) => a + Number(i.shares) * Number(i.current_price), 0), goalsSaved: (goalRes.data ?? []).reduce((a, g) => a + Number(g.current_amount), 0), goalsTarget: (goalRes.data ?? []).reduce((a, g) => a + Number(g.target_amount), 0), unreadAlerts: alertRes.count ?? 0 })
      setRecentTx(recentRes.data ?? [])
      setLoading(false)
    }
    fetchAll()
  }, [supabase])

  if (loading) return <DashSkeleton />

  const net = data?.net ?? 0
  const income = data?.income ?? 0
  const expenses = data?.expenses ?? 0
  const spendPct = income > 0 ? Math.min((expenses / income) * 100, 100) : 0
  const spendColor = spendPct > 90 ? '#EF4444' : spendPct > 70 ? '#F59E0B' : '#10B981'

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>{t('dash_title')}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>{t('dash_monthly')}</p>
        </div>
        {(data?.unreadAlerts ?? 0) > 0 && (
          <Link href="/dashboard/alerts" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 12, textDecoration: 'none', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', fontSize: 12, fontWeight: 700 }}>
            🔔 {data.unreadAlerts}
          </Link>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: t('dash_income'),   value: `+${income.toFixed(0)}`,  color: 'var(--accent-green-light)', bg: 'var(--accent-green-dim)',  border: 'rgba(16,185,129,0.15)', icon: '↑' },
          { label: t('dash_expenses'), value: `${expenses.toFixed(0)}`, color: 'var(--accent-red-light)',   bg: 'var(--accent-red-dim)',    border: 'rgba(239,68,68,0.15)',  icon: '↓' },
          { label: t('dash_net'),      value: `${net >= 0 ? '+' : ''}${net.toFixed(0)}`, color: net >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', bg: net >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)', border: net >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', icon: '=' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 16, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: s.color, fontWeight: 900, marginBottom: 2, opacity: 0.7 }}>{s.icon}</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: s.color, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {income > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>الميزانية الشهرية</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: spendColor, fontFamily: 'monospace' }}>{spendPct.toFixed(0)}% مُنفَق</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${spendPct}%`, borderRadius: 4, background: spendColor, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>الدخل: {income.toFixed(0)} JOD</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>المتبقي: {Math.max(0, net).toFixed(0)} JOD</span>
          </div>
        </div>
      )}

      {[
        { label: t('dash_debts'),       value: `${(data?.totalDebt ?? 0).toFixed(0)} JOD`, color: 'var(--accent-red-light)',   bg: 'var(--accent-red-dim)',   border: 'rgba(239,68,68,0.15)',  icon: '◈', href: '/dashboard/debts'       },
        { label: t('dash_investments'), value: `$${(data?.invValue ?? 0).toFixed(0)}`,     color: 'var(--accent-green-light)', bg: 'var(--accent-green-dim)', border: 'rgba(16,185,129,0.15)', icon: '◎', href: '/dashboard/investments' },
        { label: t('dash_goals'),       value: `${(data?.goalsSaved ?? 0).toFixed(0)}/${(data?.goalsTarget ?? 0).toFixed(0)} JOD`, color: 'var(--accent-blue-light)', bg: 'var(--accent-blue-dim)', border: 'rgba(59,126,246,0.15)', icon: '◉', href: '/dashboard/goals' },
      ].map((c, i) => (
        <Link key={i} href={c.href} style={{ textDecoration: 'none' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color 0.15s' }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: c.color }}>{c.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>{c.label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: c.color, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{c.value}</div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 20 }}>›</span>
          </div>
        </Link>
      ))}

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>{t('dash_recent')}</span>
          <Link href="/dashboard/transactions" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-blue-light)', textDecoration: 'none' }}>{t('dash_view_all')}</Link>
        </div>
        {recentTx.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>{t('dash_no_transactions')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentTx.map(tx => (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 12, transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: tx.type === 'income' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                  {tx.type === 'income' ? '💰' : '💸'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description || tx.category || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{tx.transaction_date}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'monospace', flexShrink: 0, color: tx.type === 'income' ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
                  {tx.type === 'income' ? '+' : '−'}{Number(tx.amount).toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
