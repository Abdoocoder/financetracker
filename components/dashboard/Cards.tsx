'use client'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import type { Transaction } from '@/types'

import styles from './Cards.module.css'

export function MonthCompareCard({ income, expenses, prevIncome, prevExpenses }: { income: number; expenses: number; prevIncome: number; prevExpenses: number }) {
  const { t, lang } = useI18n()
  if (!prevIncome && !prevExpenses) return null
  const incDiff = prevIncome > 0 ? ((income - prevIncome) / prevIncome * 100) : 0
  const expDiff = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses * 100) : 0
  return (
    <div className={styles.card}>
      <div className={styles.title}>{t('dash_compare')}</div>
      <div className={styles.compareGrid}>
        <div className={`${styles.compareItem} ${incDiff >= 0 ? styles.compareItemGreen : styles.compareItemRed}`}>
          <div className={styles.compareEmoji}>{incDiff >= 0 ? '📈' : '📉'}</div>
          <div className={`${styles.compareValue} ${incDiff >= 0 ? styles.compareValueGreen : styles.compareValueRed}`}>{incDiff >= 0 ? '+' : ''}{incDiff.toFixed(0)}%</div>
          <div className={styles.compareLabel}>{lang === 'en' ? 'Income' : 'الدخل'}</div>
        </div>
        <div className={`${styles.compareItem} ${expDiff <= 0 ? styles.compareItemGreen : styles.compareItemRed}`}>
          <div className={styles.compareEmoji}>{expDiff <= 0 ? '✅' : '⚠️'}</div>
          <div className={`${styles.compareValue} ${expDiff <= 0 ? styles.compareValueGreen : styles.compareValueRed}`}>{expDiff > 0 ? '+' : ''}{expDiff.toFixed(0)}%</div>
          <div className={styles.compareLabel}>{lang === 'en' ? 'Expenses' : 'المصاريف'}</div>
        </div>
      </div>
    </div>
  )
}

export function BudgetProgressCard({ income, expenses, net, currency = 'JOD' }: { income: number; expenses: number; net: number; currency?: string }) {
  const { lang } = useI18n()
  if (!income) return null
  const spendPct = Math.min((expenses / income) * 100, 100)
  return (
    <div className={styles.card}>
      <div className={styles.budgetHeader}>
        <span className={styles.budgetLabel}>{lang === 'en' ? 'Monthly Budget' : 'الميزانية الشهرية'}</span>
        <span className={`${styles.budgetPercent} ${spendPct > 90 ? styles.budgetPercentRed : spendPct > 70 ? styles.budgetPercentYellow : styles.budgetPercentGreen}`}>{spendPct.toFixed(0)}% {lang === 'en' ? 'spent' : 'مُنفَق'}</span>
      </div>
      <div className={styles.progressBarContainer}>
        <div className={`${styles.progressBarFill} ${spendPct > 90 ? styles.progressBarRed : spendPct > 70 ? styles.progressBarYellow : styles.progressBarGreen}`} style={{ width: `${spendPct}%` }} />
      </div>
      <div className={styles.budgetFooter}>
        <span className={styles.budgetStat}>{lang === 'en' ? 'Income' : 'الدخل'}: {income.toFixed(0)} {currency}</span>
        <span className={styles.budgetStat}>{lang === 'en' ? 'Remaining' : 'المتبقي'}: {Math.max(0, net).toFixed(0)} {currency}</span>
      </div>
    </div>
  )
}

export function QuickLinksCards({ totalDebt, invValue, goalsSaved, goalsTarget, currency = 'JOD' }: { totalDebt: number; invValue: number; goalsSaved: number; goalsTarget: number; currency?: string }) {
  const { t } = useI18n()
  const cards = [
    { label: t('dash_debts'),       value: `${totalDebt.toFixed(0)} ${currency}`,                           color: 'var(--accent-red-light)',   bg: 'var(--accent-red-dim)',   border: 'rgba(239,68,68,0.15)',  icon: '◈', href: '/dashboard/debts'       },
    { label: t('dash_investments'), value: `$${invValue.toFixed(0)}`,                                color: 'var(--accent-green-light)', bg: 'var(--accent-green-dim)', border: 'rgba(16,185,129,0.15)', icon: '◎', href: '/dashboard/investments' },
    { label: t('dash_goals'),       value: `${goalsSaved.toFixed(0)}/${goalsTarget.toFixed(0)} ${currency}`, color: 'var(--accent-blue-light)',  bg: 'var(--accent-blue-dim)',  border: 'rgba(59,126,246,0.15)', icon: '◉', href: '/dashboard/goals'       },
  ]
  return (
    <>
      {cards.map((c, i) => (
        <Link key={i} href={c.href} className={styles.cardLink}>
          <div className={`${styles.quickLinkCard} card-lift`}>
            <div className={styles.iconBox} style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>{c.icon}</div>
            <div className={styles.linkInfo}>
              <div className={styles.linkLabel}>{c.label}</div>
              <div className={styles.linkValue} style={{ color: c.color }}>{c.value}</div>
            </div>
            <span className={styles.linkArrow}>›</span>
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
    <Link href="/dashboard/investments" className={styles.cardLink}>
      <div className={styles.simulatorCard}>
        <div className={styles.simulatorHeader}>
          <span className={styles.simulatorTitle}>📈 {lang === 'en' ? 'Wealth Simulator' : 'محاكي الثروة'}</span>
          <span className={styles.viewBadge}>{lang === 'en' ? 'View' : 'افتح ←'}</span>
        </div>
        <div className={styles.simulatorSubtitle}>{lang === 'en' ? 'If you invest your monthly surplus:' : 'لو استثمرت فائضك الشهري:'}</div>
        <div className={styles.simulatorGrid}>
          {stats.map((s, i) => (
            <div key={i} className={styles.simulatorItem}>
              <div className={`${styles.simulatorValue} ${styles[`simulatorValue${i}`]}`}>{s.value}</div>
              <div className={styles.simulatorLabel}>{s.label}</div>
            </div>
          ))}
        </div>
        <div className={styles.simulatorFooter}>💡 {lang === 'en' ? 'Based on 7% annual return (S&P500 avg)' : 'بناءً على عائد 7% سنوياً (متوسط S&P500)'}</div>
      </div>
    </Link>
  )
}

export function RecentTransactionsCard({ transactions }: { transactions: Pick<Transaction, 'id' | 'type' | 'amount' | 'category' | 'description' | 'transaction_date'>[] }) {
  const { t } = useI18n()
  return (
    <div className={styles.recentTxCard}>
      <div className={styles.recentTxHeader}>
        <span className={styles.recentTxTitle}>{t('dash_recent')}</span>
        <Link href="/dashboard/transactions" className={styles.viewAllLink}>{t('dash_view_all')}</Link>
      </div>
      {transactions.length === 0 ? (
        <p className={styles.noTxText}>{t('dash_no_transactions')}</p>
      ) : (
        <div className={styles.txList}>
          {transactions.map(tx => (
            <div key={tx.id} className={`${styles.txRow} tx-row`}>
              <div className={`${styles.txIconBox} ${tx.type === 'income' ? styles.txIconBoxIncome : styles.txIconBoxExpense}`}>
                {tx.type === 'income' ? '💰' : '💸'}
              </div>
              <div className={styles.txInfo}>
                <div className={styles.txDescription}>{tx.description || tx.category || '—'}</div>
                <div className={styles.txDate}>{tx.transaction_date}</div>
              </div>
              <div className={`${styles.txAmount} ${tx.type === 'income' ? styles.txAmountIncome : styles.txAmountExpense}`}>
                {tx.type === 'income' ? '+' : '−'}{Number(tx.amount).toFixed(0)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
