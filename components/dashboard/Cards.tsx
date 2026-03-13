'use client'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

export function MonthCompareCard({ income, expenses, prevIncome, prevExpenses }: { income: number; expenses: number; prevIncome: number; prevExpenses: number }) {
  const { t, lang } = useI18n()
  if (!prevIncome && !prevExpenses) return null
  const incDiff = prevIncome > 0 ? ((income - prevIncome) / prevIncome * 100) : 0
  const expDiff = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses * 100) : 0
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px' }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 12 }}>{t('dash_compare')}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, padding: '10px', borderRadius: 12, background: incDiff >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)', textAlign: 'center' }}>
          <div style={{ fontSize: 18, marginBottom: 2 }}>{incDiff >= 0 ? '📈' : '📉'}</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: incDiff >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', fontFamily: 'monospace' }}>{incDiff >= 0 ? '+' : ''}{incDiff.toFixed(0)}%</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{lang === 'en' ? 'Income' : 'الدخل'}</div>
        </div>
        <div style={{ flex: 1, padding: '10px', borderRadius: 12, background: expDiff <= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)', textAlign: 'center' }}>
          <div style={{ fontSize: 18, marginBottom: 2 }}>{expDiff <= 0 ? '✅' : '⚠️'}</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: expDiff <= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', fontFamily: 'monospace' }}>{expDiff > 0 ? '+' : ''}{expDiff.toFixed(0)}%</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{lang === 'en' ? 'Expenses' : 'المصاريف'}</div>
        </div>
      </div>
    </div>
  )
}

export function BudgetProgressCard({ income, expenses, net }: { income: number; expenses: number; net: number }) {
  const { lang } = useI18n()
  if (!income) return null
  const spendPct = Math.min((expenses / income) * 100, 100)
  const spendColor = spendPct > 90 ? '#EF4444' : spendPct > 70 ? '#F59E0B' : '#10B981'
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{lang === 'en' ? 'Monthly Budget' : 'الميزانية الشهرية'}</span>
        <span style={{ fontSize: 12, fontWeight: 900, color: spendColor, fontFamily: 'monospace' }}>{spendPct.toFixed(0)}% {lang === 'en' ? 'spent' : 'مُنفَق'}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${spendPct}%`, borderRadius: 4, background: spendColor, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{lang === 'en' ? 'Income' : 'الدخل'}: {income.toFixed(0)} JOD</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{lang === 'en' ? 'Remaining' : 'المتبقي'}: {Math.max(0, net).toFixed(0)} JOD</span>
      </div>
    </div>
  )
}

export function QuickLinksCards({ totalDebt, invValue, goalsSaved, goalsTarget }: { totalDebt: number; invValue: number; goalsSaved: number; goalsTarget: number }) {
  const { t } = useI18n()
  const cards = [
    { label: t('dash_debts'),       value: `${totalDebt.toFixed(0)} JOD`,                           color: 'var(--accent-red-light)',   bg: 'var(--accent-red-dim)',   border: 'rgba(239,68,68,0.15)',  icon: '◈', href: '/dashboard/debts'       },
    { label: t('dash_investments'), value: `$${invValue.toFixed(0)}`,                                color: 'var(--accent-green-light)', bg: 'var(--accent-green-dim)', border: 'rgba(16,185,129,0.15)', icon: '◎', href: '/dashboard/investments' },
    { label: t('dash_goals'),       value: `${goalsSaved.toFixed(0)}/${goalsTarget.toFixed(0)} JOD`, color: 'var(--accent-blue-light)',  bg: 'var(--accent-blue-dim)',  border: 'rgba(59,126,246,0.15)', icon: '◉', href: '/dashboard/goals'       },
  ]
  return (
    <>
      {cards.map((c, i) => (
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
    </>
  )
}

export function WealthSimulatorCard({ net, lang }: { net: number; lang: string }) {
  const surplus = Math.max(0, Math.round(net))
  const invest = Math.max(surplus, 10)
  const future10 = invest * ((Math.pow(1 + 0.07 / 12, 120) - 1) / (0.07 / 12))
  const future20 = invest * ((Math.pow(1 + 0.07 / 12, 240) - 1) / (0.07 / 12))
  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`
  const stats = [
    { label: lang === 'en' ? 'Monthly'  : 'شهرياً',        value: `$${invest}`,  color: 'var(--accent-blue-light)'  },
    { label: lang === 'en' ? '10 years' : 'بعد 10 سنوات', value: fmt(future10), color: 'var(--accent-green-light)' },
    { label: lang === 'en' ? '20 years' : 'بعد 20 سنة',   value: fmt(future20), color: '#F59E0B'                   },
  ]
  return (
    <Link href="/dashboard/investments" style={{ textDecoration: 'none' }}>
      <div style={{ background: 'linear-gradient(135deg, rgba(59,126,246,0.08), rgba(16,185,129,0.05))', border: '1px solid rgba(59,126,246,0.2)', borderRadius: 16, padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>📈 {lang === 'en' ? 'Wealth Simulator' : 'محاكي الثروة'}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-blue-light)', background: 'rgba(59,126,246,0.1)', border: '1px solid rgba(59,126,246,0.2)', padding: '3px 10px', borderRadius: 100 }}>{lang === 'en' ? 'View' : 'افتح ←'}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{lang === 'en' ? 'If you invest your monthly surplus:' : 'لو استثمرت فائضك الشهري:'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>💡 {lang === 'en' ? 'Based on 7% annual return (S&P500 avg)' : 'بناءً على عائد 7% سنوياً (متوسط S&P500)'}</div>
      </div>
    </Link>
  )
}

export function RecentTransactionsCard({ transactions, lang }: { transactions: any[]; lang: string }) {
  const { t } = useI18n()
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>{t('dash_recent')}</span>
        <Link href="/dashboard/transactions" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-blue-light)', textDecoration: 'none' }}>{t('dash_view_all')}</Link>
      </div>
      {transactions.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>{t('dash_no_transactions')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {transactions.map(tx => (
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
  )
}
