'use client'

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
  const isPositive = netWorth >= 0
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

  const items = [
    { label: lang === 'en' ? 'Investments' : 'الاستثمارات', value: invValue, color: '#3B7EF6', icon: '📈' },
    { label: lang === 'en' ? 'Savings Goals' : 'الأهداف', value: goalsSaved, color: '#10B981', icon: '🎯' },
    { label: lang === 'en' ? 'Owed to me' : 'ديون لي', value: totalReceivable, color: '#8B5CF6', icon: '💰' },
    { label: lang === 'en' ? 'My Debts' : 'ديون عليّ', value: -totalDebt, color: '#EF4444', icon: '💳' },
  ]

  return (
    <div style={{
      background: `linear-gradient(135deg, ${isPositive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)'} 0%, var(--bg-card) 100%)`,
      border: `1px solid ${isPositive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
      borderRadius: 18, padding: '18px 16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 3 }}>
            {lang === 'en' ? '📊 Net Worth' : '📊 صافي الثروة'}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'monospace', color: isPositive ? 'var(--accent-green-light)' : 'var(--accent-red-light)', letterSpacing: '-0.02em' }}>
            {isPositive ? '+' : ''}{fmt(netWorth)}
            <span style={{ fontSize: 13, marginRight: 4, opacity: 0.7 }}>{currency}</span>
          </div>
        </div>
        <div style={{ fontSize: 36 }}>{isPositive ? '🏦' : '⚠️'}</div>
      </div>

      {/* Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
    </div>
  )
}
