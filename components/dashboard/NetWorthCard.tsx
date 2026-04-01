'use client'
import { useState } from 'react'

interface Props {
  netWorth: number
  invValue: number
  goalsSaved: number
  totalDebt: number
  totalReceivable: number
  currency: string
  lang: string
}

export function NetWorthCard({ netWorth, invValue, goalsSaved, totalDebt, totalReceivable, currency, lang }: Props) {
  const [open, setOpen] = useState(false)
  const isPositive = netWorth >= 0
  const mainColor = isPositive ? 'var(--accent-green-light)' : 'var(--accent-red-light)'
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

  const items = [
    { label: lang === 'en' ? 'Investments' : 'الاستثمارات', value: invValue, color: '#3B7EF6', icon: '📈' },
    { label: lang === 'en' ? 'Savings Goals' : 'الأهداف', value: goalsSaved, color: '#10B981', icon: '🎯' },
    { label: lang === 'en' ? 'Owed to me' : 'ديون لي', value: totalReceivable, color: '#8B5CF6', icon: '💰' },
    { label: lang === 'en' ? 'My Debts' : 'ديون عليّ', value: -totalDebt, color: '#EF4444', icon: '💳' },
  ]

  return (
    <div style={{
      background: `linear-gradient(135deg, ${isPositive ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.05)'} 0%, var(--bg-card) 100%)`,
      border: `1px solid ${isPositive ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}`,
      borderRadius: 16,
    }}>
      {/* ── Header (دائماً ظاهر) ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{isPositive ? '🏦' : '⚠️'}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
            {lang === 'en' ? 'Net Worth' : 'صافي الثروة'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 900, fontFamily: 'monospace', color: mainColor, letterSpacing: '-0.02em' }}>
            {isPositive ? '+' : ''}{fmt(netWorth)}
            <span style={{ fontSize: 11, marginRight: 3, opacity: 0.7 }}> {currency}</span>
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
        </div>
      </button>

      {/* ── Breakdown (يظهر عند الفتح) ── */}
      {open && (
        <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {items.map(item => (
            <div key={item.label} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 900, fontFamily: 'monospace', color: item.value >= 0 ? item.color : '#EF4444' }}>
                  {item.value >= 0 ? '+' : ''}{fmt(Math.abs(item.value))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
