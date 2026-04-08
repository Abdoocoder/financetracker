'use client'
import { useCountUp } from '@/lib/use-count-up'
import type { Account } from '@/types'

export function HeroBalanceCard({ monthlyNet, currency, lang, accounts, totalBalance, prevMonthNet }: {
  monthlyNet: number; currency: string; lang: string
  accounts: Account[]
  totalBalance?: number
  prevMonthNet: number
}) {
  const heroValue = typeof totalBalance === 'number' ? totalBalance : monthlyNet
  const animatedHero = useCountUp(Math.abs(heroValue), 900)
  const isPositive = heroValue >= 0
  const color = isPositive ? '#10B981' : '#EF4444'
  const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)
  const trend = prevMonthNet !== 0 ? ((monthlyNet - prevMonthNet) / Math.abs(prevMonthNet)) * 100 : 0
  const hasTrend = prevMonthNet !== 0

  return (
    <div style={{
      background: `linear-gradient(135deg, ${isPositive ? 'rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.04)'} 100%)`,
      border: `1px solid ${isPositive ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
      borderRadius: 24,
      padding: '20px 20px 16px',
    }}>
      {/* Label */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
        {lang === 'en' ? '🏦 Total Balance' : '🏦 إجمالي الرصيد'}
      </div>

      {/* Hero Number */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 42, fontWeight: 900, color, fontFamily: 'monospace', letterSpacing: '-0.03em', lineHeight: 1 }}>
          {isPositive ? '+' : '-'}{fmt(animatedHero)}
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>{currency}</span>
      </div>

      {/* Monthly net + trend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
          {lang === 'en' ? 'This month:' : 'هذا الشهر:'}{' '}
          <span style={{ fontWeight: 800, color: monthlyNet >= 0 ? '#10B981' : '#EF4444' }}>
            {monthlyNet >= 0 ? '+' : '-'}{fmt(Math.abs(monthlyNet))}
          </span>
        </span>
        {hasTrend && (
          <span style={{ fontSize: 11, fontWeight: 700, color: trend >= 0 ? '#10B981' : '#EF4444', background: trend >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 100 }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(0)}% {lang === 'en' ? 'vs last month' : 'عن الشهر الماضي'}
          </span>
        )}
      </div>

      {/* Account chips */}
      {accounts.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {accounts.map(acc => {
            const accColor = acc.color ?? '#3B7EF6'
            return (
              <div key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 100, background: `${accColor}14`, border: `1px solid ${accColor}30`, fontSize: 11, fontWeight: 700, color: accColor }}>
                <span>{acc.icon}</span>
                <span>{fmt(acc.balance ?? 0)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
