'use client'
import { useMemo } from 'react'
import { useCountUp } from '@/lib/use-count-up'
import type { Account } from '@/types'
import styles from './HeroBalanceCard.module.css'

const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)

export function HeroBalanceCard({ monthlyNet, currency, lang, accounts, totalBalance, prevMonthNet }: {
  monthlyNet: number; currency: string; lang: string
  accounts: Account[]
  totalBalance?: number
  prevMonthNet: number
}) {
  const heroValue = typeof totalBalance === 'number' ? totalBalance : monthlyNet
  const animatedHero = useCountUp(Math.abs(heroValue), 900)
  const isPositive = heroValue >= 0
  const { trend, hasTrend } = useMemo(() => ({
    trend: prevMonthNet !== 0 ? ((monthlyNet - prevMonthNet) / Math.abs(prevMonthNet)) * 100 : 0,
    hasTrend: prevMonthNet !== 0,
  }), [monthlyNet, prevMonthNet])

  return (
    <div className={`${styles.card} ${isPositive ? styles.cardPositive : styles.cardNegative}`}>
      {/* Label */}
      <div className={styles.label}>
        {lang === 'en' ? '🏦 Total Balance' : '🏦 إجمالي الرصيد'}
      </div>

      {/* Hero Number */}
      <div className={styles.heroRow}>
        <span className={`${styles.amount} ${isPositive ? styles.amountPositive : styles.amountNegative}`}>
          {isPositive ? '+' : '-'}{fmt(animatedHero)}
        </span>
        <span className={styles.currency}>{currency}</span>
      </div>

      {/* Monthly net + trend */}
      <div className={styles.statsRow}>
        <span className={styles.thisMonthLabel}>
          {lang === 'en' ? 'This month:' : 'هذا الشهر:'}{' '}
          <span className={`${styles.thisMonthValue} ${monthlyNet >= 0 ? styles.monthlyPositive : styles.monthlyNegative}`}>
            {monthlyNet >= 0 ? '+' : '-'}{fmt(Math.abs(monthlyNet))}
          </span>
        </span>
        {hasTrend && (
          <span className={`${styles.trendBadge} ${trend >= 0 ? styles.trendPositive : styles.trendNegative}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(0)}% {lang === 'en' ? 'vs last month' : 'عن الشهر الماضي'}
          </span>
        )}
      </div>

      {/* Account chips */}
      {accounts.length > 1 && (
        <div className={styles.accountChips}>
          {accounts.map(acc => {
            const accColor = acc.color ?? '#3B7EF6'
            return (
              <div key={acc.id} className={styles.accountChip} style={{ background: `${accColor}14`, border: `1px solid ${accColor}30`, color: accColor }}>
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
