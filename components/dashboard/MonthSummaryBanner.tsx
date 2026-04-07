'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { TranslationKey } from '@/lib/i18n'
import type { DashboardData } from '@/hooks/useDashboardData'

export function MonthSummaryBanner({ data, lang, t, currency }: {
  data: DashboardData | null
  lang: string
  t: (k: TranslationKey) => string
  currency: string
}) {
  const [dismissed, setDismissed] = useState(true)

  const now = new Date()
  const day = now.getDate()
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`
  const DISMISS_KEY = `month_summary_dismissed_${prevMonthKey}`

  useEffect(() => {
    if (day > 7) return
    try {
      const val = localStorage.getItem(DISMISS_KEY)
      setDismissed(val === 'true')
    } catch { setDismissed(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (dismissed || !data || day > 7) return null

  const prevIncome = data.prevIncome
  const prevExpenses = data.prevExpenses
  if (prevIncome === 0 && prevExpenses === 0) return null

  const prevSaved = prevIncome - prevExpenses
  const savingsRate = prevIncome > 0 ? Math.round((prevSaved / prevIncome) * 100) : 0
  const isPositive = prevSaved >= 0
  const prevMonthName = prevMonthDate.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' })
  const fmt = (n: number) => Math.abs(n) % 1 === 0 ? Math.abs(n).toFixed(0) : Math.abs(n).toFixed(1)

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, 'true') } catch { }
    setDismissed(true)
  }

  const title = t('month_summary_title').replace('{month}', prevMonthName).replace('{}', prevMonthName)

  return (
    <div style={{
      background: isPositive
        ? 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.04) 100%)'
        : 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.04) 100%)',
      border: `1px solid ${isPositive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
      borderRadius: 18,
      padding: '14px 16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>📊</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>{title}</span>
        </div>
        <button 
          onClick={dismiss} 
          aria-label={lang === 'ar' ? 'إغلاق' : 'Dismiss'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: 4 }}
        >✕</button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { label: t('month_summary_income'), value: `+${fmt(prevIncome)}`, color: 'var(--accent-green-light)' },
          { label: t('month_summary_expenses'), value: `-${fmt(prevExpenses)}`, color: 'var(--accent-red-light)' },
          { label: t('month_summary_saved'), value: `${isPositive ? '+' : '-'}${fmt(prevSaved)}`, color: isPositive ? 'var(--accent-green-light)' : 'var(--accent-red-light)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{currency}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
          background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: isPositive ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
        }}>
          {isPositive ? '✅' : '⚠️'} {isPositive ? t('month_summary_positive') : t('month_summary_negative')}
          {prevIncome > 0 && ` · ${savingsRate}% ${t('month_summary_rate')}`}
        </span>
        <Link
          href={`/dashboard/transactions?month=${prevMonthKey}`}
          style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-blue-light)', textDecoration: 'none' }}
        >
          {t('month_summary_view')} ←
        </Link>
      </div>
    </div>
  )
}
