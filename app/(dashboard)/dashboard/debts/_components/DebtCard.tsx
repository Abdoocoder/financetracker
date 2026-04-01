import type { Debt } from '@/types'
import { CURRENCIES } from '@/lib/currency'

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

export function DebtCard({
  debt, baseCurrency, lang,
  paymentDebtId, paymentAmount, paymentCurrency, payingSaving,
  onEdit, onDelete, onStartPayment, onCancelPayment, onConfirmPayment,
  onPaymentAmountChange, onPaymentCurrencyChange,
}: Props) {
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

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 18, padding: '16px',
      borderRight: `3px solid ${pri.color}`,
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${pri.color}18`, border: `1px solid ${pri.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: pri.color, boxShadow: `0 0 8px ${pri.color}` }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 2 }}>{debt.name}</div>
          {debt.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{debt.notes}</div>}
          {(debt.auto_deduct || isOverdue || daysUntil !== null) && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {debt.auto_deduct && (
                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 5, background: 'rgba(59,126,246,0.12)', color: 'var(--accent-blue-light)', fontWeight: 700 }}>⚡ تلقائي</span>
              )}
              {isOverdue && (
                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 5, background: 'rgba(239,68,68,0.12)', color: 'var(--accent-red-light)', fontWeight: 700 }}>🔴 متأخر</span>
              )}
              {daysUntil === 0 && (
                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 5, background: 'rgba(245,158,11,0.15)', color: 'var(--accent-amber-light)', fontWeight: 700 }}>🔔 اليوم!</span>
              )}
              {daysUntil !== null && daysUntil > 0 && (
                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 5, background: 'rgba(100,116,139,0.1)', color: 'var(--text-muted)', fontWeight: 600 }}>📅 بعد {daysUntil} يوم</span>
              )}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'left', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-red-light)', fontFamily: 'monospace' }}>
            {Number(debt.remaining_amount_foreign || debt.remaining_amount).toFixed(0)}
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 2 }}> {debt.currency || baseCurrency}</span>
          </div>
          {debt.currency && debt.currency !== baseCurrency && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>≈ {Number(debt.remaining_amount).toFixed(0)} {baseCurrency}</div>
          )}
          {debt.monthly_payment > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{Number(debt.monthly_payment).toFixed(0)}/شهر</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => onEdit(debt)} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.2)', color: 'var(--accent-blue-light)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</button>
          <button onClick={() => onDelete(debt.id)} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-red-light)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      </div>

      {/* ── Progress ── */}
      <div className="progress-track" style={{ marginBottom: 10 }}>
        <div className="progress-fill gradient-green" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>

      {/* ── Footer ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{pct.toFixed(0)}% مسدد</span>
        {isPaying ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <select
              value={paymentCurrency || debt.currency || baseCurrency}
              onChange={e => onPaymentCurrencyChange(e.target.value)}
              style={{ padding: '6px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 11, fontFamily: 'inherit', outline: 'none' }}
            >
              {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
            </select>
            <input
              type="number"
              value={paymentAmount}
              onChange={e => onPaymentAmountChange(e.target.value)}
              placeholder={lang === 'en' ? 'Amount' : 'المبلغ'}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && onConfirmPayment(debt.id)}
              style={{ width: 70, padding: '7px 10px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'inherit', outline: 'none', textAlign: 'center' }}
            />
            <button onClick={() => onConfirmPayment(debt.id)} disabled={payingSaving}
              style={{ padding: '7px 12px', borderRadius: 8, background: 'var(--accent-green)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: 'inherit', opacity: payingSaving ? 0.5 : 1 }}>
              {payingSaving ? '⏳' : '✓'}
            </button>
            <button onClick={onCancelPayment}
              style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
          </div>
        ) : (
          <button onClick={() => onStartPayment(debt.id)}
            style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--accent-green-dim)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--accent-green-light)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            + دفعة
          </button>
        )}
      </div>
    </div>
  )
}
