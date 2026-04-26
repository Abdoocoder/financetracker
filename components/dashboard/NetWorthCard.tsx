'use client'
import { useState } from 'react'
import styles from './NetWorthCard.module.css'

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
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

  const items = [
    { label: lang === 'en' ? 'Investments' : 'الاستثمارات', value: invValue, color: '#3B7EF6', icon: '📈' },
    { label: lang === 'en' ? 'Savings Goals' : 'الأهداف', value: goalsSaved, color: '#10B981', icon: '🎯' },
    { label: lang === 'en' ? 'Owed to me' : 'ديون لي', value: totalReceivable, color: '#8B5CF6', icon: '💰' },
    { label: lang === 'en' ? 'My Debts' : 'ديون عليّ', value: -totalDebt, color: '#EF4444', icon: '💳' },
  ]

  return (
    <div className={`${styles.card} ${isPositive ? styles.cardPositive : styles.cardNegative}`}>
      {/* ── Header (دائماً ظاهر) ── */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={styles.headerButton}
      >
        <div className={styles.headerInfo}>
          <span className={styles.headerEmoji}>{isPositive ? '🏦' : '⚠️'}</span>
          <span className={styles.headerLabel}>
            {lang === 'en' ? 'Net Worth' : 'صافي الثروة'}
          </span>
        </div>
        <div className={styles.amountWrapper}>
          <span className={`${styles.amountValue} ${isPositive ? styles.amountPositive : styles.amountNegative}`}>
            {isPositive ? '+' : ''}{fmt(netWorth)}
            <span className={styles.currencyLabel}> {currency}</span>
          </span>
          <span className={`${styles.arrowIcon} ${open ? styles.arrowOpen : ''}`}>▼</span>
        </div>
      </button>

      {/* ── Breakdown (يظهر عند الفتح) ── */}
      {open && (
        <div className={styles.breakdownGrid}>
          {items.map(item => (
            <div key={item.label} className={styles.breakdownItem}>
              <span className={styles.itemIcon}>{item.icon}</span>
              <div className={styles.itemInfo}>
                <div className={styles.itemLabel}>{item.label}</div>
                <div className={`${styles.itemValue} ${item.value >= 0 ? styles[`itemColor${items.indexOf(item)}`] : styles.itemValueNegative}`}>
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
