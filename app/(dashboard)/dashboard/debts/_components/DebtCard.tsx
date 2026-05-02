import { memo, useRef, useEffect } from 'react'
import type { Debt } from '@/types'
import { CURRENCIES } from '@/lib/currency'
import { useI18n } from '@/lib/i18n'
import styles from './DebtCard.module.css'

const PRIORITY_CONFIG = [
  { color: '#EF4444', ar: 'عالية جداً', en: 'Very High' },
  { color: '#F59E0B', ar: 'عالية', en: 'High' },
  { color: '#3B7EF6', ar: 'متوسطة', en: 'Medium' },
  { color: '#8B9CC8', ar: 'منخفضة', en: 'Low' },
  { color: '#4A5568', ar: 'مؤجلة', en: 'Deferred' },
]

interface Props {
  debt: Debt
  baseCurrency: string
  lang: string
  paymentDebtId: string | null
  paymentAmount: string
  paymentCurrency: string
  payingSaving: boolean
  onEdit: (debt: Debt) => void
  onDelete: (id: string) => void
  onStartPayment: (id: string) => void
  onCancelPayment: () => void
  onConfirmPayment: (id: string) => void
  onPaymentAmountChange: (v: string) => void
  onPaymentCurrencyChange: (v: string) => void
}

export const DebtCard = memo(function DebtCard({
  debt, baseCurrency, lang,
  paymentDebtId, paymentAmount, paymentCurrency, payingSaving,
  onEdit, onDelete, onStartPayment, onCancelPayment, onConfirmPayment,
  onPaymentAmountChange, onPaymentCurrencyChange,
}: Props) {
  const { t } = useI18n()
  const fillRef = useRef<HTMLDivElement>(null)
  const pct = Number(debt.original_amount) > 0
    ? ((Number(debt.original_amount) - Number(debt.remaining_amount)) / Number(debt.original_amount) * 100)
    : 0
  const pri = PRIORITY_CONFIG[(debt.priority ?? 3) - 1] ?? PRIORITY_CONFIG[2]
  const todayDate = new Date()
  const todayDay = todayDate.getDate()
  const payDay = debt.payment_day ?? 0
  const daysUntil = payDay > 0
    ? (todayDay <= payDay
      ? payDay - todayDay
      : Math.ceil((new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, payDay).getTime() - new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDay).getTime()) / 86400000))
    : null
  const isOverdue = debt.due_date ? new Date(debt.due_date) < todayDate : false
  const isPaying = paymentDebtId === debt.id
  const priority = debt.priority ?? 3
  const pctClamped = Math.min(pct, 100)

  useEffect(() => {
    if (fillRef.current) {
      fillRef.current.style.width = `${pctClamped}%`
    }
  }, [pctClamped])

  return (
    <div
      className={styles.card}
      data-priority={priority}
    >
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.priorityIcon}>
          <div className={styles.priorityDot} />
        </div>
        <div className={styles.headerMain}>
          <div className={styles.debtName}>{debt.name}</div>
          {debt.notes && <div className={styles.debtNotes}>{debt.notes}</div>}
          {(debt.auto_deduct || isOverdue || daysUntil !== null) && (
            <div className={styles.badges}>
              {debt.auto_deduct && (
                <span className={styles.badgeBlue}>⚡ {t('debts_auto_deduct')}</span>
              )}
              {isOverdue && (
                <span className={styles.badgeRed}>🔴 {t('debts_overdue')}</span>
              )}
              {daysUntil === 0 && (
                <span className={styles.badgeAmber}>🔔 {t('debts_today')}</span>
              )}
              {daysUntil !== null && daysUntil > 0 && (
                <span className={styles.badgeMuted}>📅 {t('debts_after_days', { n: daysUntil })}</span>
              )}
            </div>
          )}
        </div>
        <div className={styles.amountBlock}>
          <div className={styles.amountPrimary}>
            {Number(
              (debt.currency && debt.currency !== baseCurrency)
                ? (debt.remaining_amount_foreign || debt.remaining_amount)
                : debt.remaining_amount
            ).toFixed(0)}
            <span className={styles.amountCurrency}> {debt.currency || baseCurrency}</span>
          </div>
          {debt.currency && debt.currency !== baseCurrency && (
            <div className={styles.amountSecondary}>≈ {Number(debt.remaining_amount).toFixed(0)} {baseCurrency}</div>
          )}
          {debt.monthly_payment > 0 && <div className={styles.monthlyPayment}>{Number(debt.monthly_payment).toFixed(0)}{t('debts_per_month')}</div>}
        </div>
        <div className={styles.actionButtons}>
          <button
            onClick={() => onEdit(debt)}
            aria-label={t('edit_item', { name: debt.name })}
            title={t('edit_item', { name: debt.name })}
            className={styles.btnEdit}
          >✎</button>
          <button
            onClick={() => onDelete(debt.id)}
            aria-label={t('delete_item', { name: debt.name })}
            title={t('delete_item', { name: debt.name })}
            className={styles.btnDelete}
          >✕</button>
        </div>
      </div>

      {/* ── Progress ── */}
      <div className={`progress-track ${styles.progressTrack}`}>
        <div
          ref={fillRef}
          className={`progress-fill gradient-green ${styles.progressFill}`}
        />
      </div>

      {/* ── Footer ── */}
      <div className={styles.footer}>
        <span className={styles.paidLabel}>{t('debts_paid_status', { pct: pct.toFixed(0) })}</span>
        {isPaying ? (
          <div className={styles.paymentRow}>
            <select
              value={paymentCurrency || debt.currency || baseCurrency}
              onChange={e => onPaymentCurrencyChange(e.target.value)}
              className={styles.paymentSelect}
              aria-label={t('trans_currency')}
              title={t('trans_currency')}
            >
              {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
            </select>
            <input
              type="number"
              value={paymentAmount}
              onChange={e => onPaymentAmountChange(e.target.value)}
              placeholder={t('trans_amount')}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && onConfirmPayment(debt.id)}
              className={styles.paymentInput}
            />
            <button
              onClick={() => onConfirmPayment(debt.id)}
              disabled={payingSaving}
              aria-label={t('confirm_payment')}
              className={styles.btnConfirm}
            >
              {payingSaving ? '⏳' : '✓'}
            </button>
            <button
              onClick={onCancelPayment}
              aria-label={t('cancel_payment')}
              className={styles.btnCancel}
            >✕</button>
          </div>
        ) : (
          <button
            onClick={() => onStartPayment(debt.id)}
            className={styles.btnStartPayment}
          >
            {t('debts_add_payment_btn')}
          </button>
        )}
      </div>
    </div>
  )
})
