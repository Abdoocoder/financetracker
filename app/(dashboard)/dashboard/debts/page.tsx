'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { toast } from '@/components/ui/toast'
import { useI18n } from '@/lib/i18n'
import type { Debt } from '@/types'
import { PageHeader } from '@/components/ui/page-header'
import { AddButton } from '@/components/ui/add-button'
import { StatBar } from '@/components/ui/stat-bar'
import { EmptyState } from '@/components/ui/empty-state'
import { usePullToRefresh } from '@/lib/use-pull-to-refresh'
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh'
import { clearUserCache } from '@/lib/cache'
import { haptic } from '@/lib/haptic'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CURRENCIES, fetchExchangeRate } from '@/lib/currency'
import { DebtCard } from './_components/DebtCard'
import { DebtForm } from './_components/DebtForm'

// ── Confetti Component ──
function Confetti({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000)
    return () => clearTimeout(timer)
  }, [onDone])

  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    color: ['#10B981', '#3B7EF6', '#F59E0B', '#8B5CF6', '#EF4444'][Math.floor(Math.random() * 5)],
    size: Math.random() * 8 + 6,
  }))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, pointerEvents: 'none', overflow: 'hidden' }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.left}%`,
          top: '-20px',
          width: p.size,
          height: p.size,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          background: p.color,
          animation: `confettiFall 3s ${p.delay}s ease-in forwards`,
        }} />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ── Celebration Modal ──
function CelebrationModal({ debtName, onClose }: { debtName: string, onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 24, padding: '40px 32px', textAlign: 'center', maxWidth: 320, margin: 16, boxShadow: '0 0 60px rgba(16,185,129,0.3)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>أحرار من الدين!</div>
        <div style={{ fontSize: 15, color: 'var(--accent-green-light)', fontWeight: 700, marginBottom: 12 }}>&quot;{debtName}&quot;</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>تهانيّ! لقد سددت هذا الدين بالكامل. خطوة عظيمة نحو حريتك المالية 💪</div>
        <button onClick={onClose} style={{ marginTop: 24, padding: '10px 28px', borderRadius: 12, background: 'var(--accent-green)', color: 'white', border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          شكراً 🙌
        </button>
      </div>
    </div>
  )
}

export default function DebtsPage() {
  const [showOwed, setShowOwed] = useState(true)
  const [showReceivable, setShowReceivable] = useState(true)
  const [debts, setDebts] = useState<Debt[]>([])
  const [paidDebts, setPaidDebts] = useState<Debt[]>([])
  const [showPaid, setShowPaid] = useState(false)
  const [totalPaidAmount, setTotalPaidAmount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    original_amount: '',
    original_amount_foreign: '',
    remaining_amount: '',
    monthly_payment: '',
    due_date: '',
    priority: '3',
    notes: '',
    payment_day: '1',
    auto_deduct: false,
    received_amount: false,
    currency: '',
    exchange_rate: '1',
    debt_type: 'owed' as 'owed' | 'receivable'
  })
  const [saving, setSaving] = useState(false)
  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentCurrency, setPaymentCurrency] = useState('')
  const [payingSaving, setPayingSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [celebration, setCelebration] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const supabase = createClient()
  const { t, lang } = useI18n()
  const { el: pageRef, refreshing } = usePullToRefresh(async () => { await load(true) })

  const { user: currentUser, profile } = useUser()
  const baseCurrency = profile?.currency || 'JOD'

  useEffect(() => {
    if (!form.currency && baseCurrency) setForm(f => ({ ...f, currency: baseCurrency }))
  }, [baseCurrency, form.currency])

  // جلب سعر الصرف تلقائياً للنموذج
  useEffect(() => {
    async function getRate() {
      if (!form.currency || !baseCurrency || form.currency === baseCurrency) {
        setForm(f => ({ ...f, exchange_rate: '1' }))
        return
      }
      const rate = await fetchExchangeRate(form.currency, baseCurrency)
      if (rate) setForm(f => ({ ...f, exchange_rate: rate.toString() }))
    }
    getRate()
  }, [form.currency, baseCurrency])

  const load = useCallback(async (silent = false) => {
    if (!currentUser) return
    if (!silent) setLoading(true)
    // الديون النشطة
    const { data: active } = await supabase.from('debts').select('*').eq('user_id', currentUser.id).eq('is_paid', false).order('priority')
    setDebts(active ?? [])
    // الديون المسددة
    const { data: paid } = await supabase.from('debts').select('*').eq('user_id', currentUser.id).eq('is_paid', true).order('updated_at', { ascending: false })
    setPaidDebts(paid ?? [])
    // إجمالي المبالغ المسددة
    const total = (paid ?? []).reduce((a, d) => a + Number(d.original_amount), 0)
    setTotalPaidAmount(total)
    setLoading(false)
  }, [supabase, currentUser])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditingId(null)
    setForm({
      name: '',
      original_amount: '',
      original_amount_foreign: '',
      remaining_amount: '',
      monthly_payment: '',
      due_date: '',
      priority: '3',
      notes: '',
      payment_day: '1',
      auto_deduct: false,
      received_amount: false,
      currency: baseCurrency,
      exchange_rate: '1',
      debt_type: 'owed' as 'owed' | 'receivable',
    })
    setShowForm(true)
  }

  function startEdit(d: any) {
    setEditingId(d.id)
    setForm({
      name: d.name,
      original_amount: d.original_amount.toString(),
      original_amount_foreign: (d.original_amount_foreign || d.original_amount).toString(),
      remaining_amount: d.remaining_amount.toString(),
      monthly_payment: d.monthly_payment?.toString() ?? '',
      due_date: d.due_date ?? '',
      priority: d.priority.toString(),
      notes: d.notes ?? '',
      payment_day: d.payment_day?.toString() ?? '1',
      auto_deduct: d.auto_deduct ?? false,
      received_amount: false,
      currency: d.currency || baseCurrency,
      exchange_rate: d.exchange_rate?.toString() ?? '1',
      debt_type: (d.debt_type ?? 'owed') as 'owed' | 'receivable',
    })
    setShowForm(true)
  }

  async function receiveDebt(debt: Debt) {
    if (!currentUser) return
    const { error } = await supabase.from('debts').update({ is_paid: true }).eq('id', debt.id)
    if (error) { toast.error(t('toast_error_save')); return }
    await supabase.from('transactions').insert({
      user_id: currentUser.id,
      type: 'income',
      amount: Number(debt.remaining_amount),
      category: lang === 'ar' ? 'دين مستلم' : 'Debt Received',
      description: lang === 'ar' ? `استلام دين: ${debt.name}` : `Debt Received: ${debt.name}`,
      transaction_date: new Date().toISOString().split('T')[0],
    })
    toast.success(t('debts_received_msg'))
    setCelebration(debt.name)
    setShowConfetti(true)
    await load(true)
  }

  async function saveDebt() {
    if (!form.name || (!form.original_amount && !form.original_amount_foreign)) { toast.warning(t('toast_fill_required')); return }
    setSaving(true)
    if (!currentUser) return

    const isMulti = form.currency !== baseCurrency
    const origForeign = parseFloat(form.original_amount_foreign.replace(",", ".")) || 0
    const rate = parseFloat(form.exchange_rate) || 1
    const origBase = isMulti ? (origForeign * rate) : parseFloat(form.original_amount.replace(",", "."))

    if (editingId) {
      const { error } = await supabase.from('debts').update({
        name: form.name,
        original_amount: origBase,
        original_amount_foreign: isMulti ? origForeign : origBase,
        remaining_amount: isMulti ? (origForeign * rate) : parseFloat(form.remaining_amount.replace(",", ".")),
        remaining_amount_foreign: isMulti ? origForeign : origBase,
        currency: form.currency,
        exchange_rate: rate,
        monthly_payment: parseFloat(form.monthly_payment.replace(",", ".")) || 0,
        due_date: form.due_date || null, priority: parseInt(form.priority), notes: form.notes || null, payment_day: parseInt(form.payment_day) || 1, auto_deduct: form.auto_deduct, debt_type: form.debt_type
      }).eq('id', editingId)
      if (error) { toast.error(t('toast_error_save')); setSaving(false); return }
      toast.success(t('toast_edited'))
    } else {
      const { error } = await supabase.from('debts').insert({
        user_id: currentUser.id,
        name: form.name,
        original_amount: origBase,
        original_amount_foreign: isMulti ? origForeign : origBase,
        remaining_amount: origBase,
        remaining_amount_foreign: isMulti ? origForeign : origBase,
        currency: form.currency,
        exchange_rate: rate,
        monthly_payment: parseFloat(form.monthly_payment.replace(",", ".")) || 0,
        due_date: form.due_date || null, priority: parseInt(form.priority), notes: form.notes || null, payment_day: parseInt(form.payment_day) || 1, auto_deduct: form.auto_deduct, debt_type: form.debt_type
      })
      // إضافة معاملة دخل إذا استلم المبلغ
      if (!error && form.received_amount) {
        await supabase.from('transactions').insert({
          user_id: currentUser.id,
          type: 'income',
          amount: origBase,
          original_amount: isMulti ? origForeign : origBase,
          original_currency: form.currency,
          exchange_rate: rate,
          category: lang === 'ar' ? 'قرض مستلم' : 'Loan Received',
          description: lang === 'ar' ? `قرض مستلم: ${form.name}` : `Loan Received: ${form.name}`,
          transaction_date: new Date().toISOString().split('T')[0],
        })
      }
      if (error) { toast.error(t('toast_error_save')); setSaving(false); return }
      toast.success(t('toast_debt_added'))
    }
    setShowForm(false); setSaving(false); load()
  }

  async function deleteDebt(id: string) {
    await supabase.from('debts').delete().eq('id', id)
    setDebts(prev => prev.filter(d => d.id !== id))
    toast.success(t('toast_deleted'))
  }

  async function makePayment(debtId: string) {
    const payAmount = parseFloat(paymentAmount)
    if (!payAmount || payAmount <= 0) { toast.warning(t('toast_fill_required')); return }
    setPayingSaving(true)
    if (!currentUser) return
    const debt = debts.find(d => d.id === debtId)
    if (!debt) return

    // جلب سعر الصرف إذا كانت عملة الدفع مختلفة عن عملة الدين
    let rateToDebtCurrency = 1
    let rateToBaseCurrency = 1
    const debtCurrency = debt.currency || baseCurrency

    if (paymentCurrency !== debtCurrency) {
      const rate = await fetchExchangeRate(paymentCurrency, debtCurrency)
      if (rate) rateToDebtCurrency = rate
    }
    if (paymentCurrency !== baseCurrency) {
      const rate = await fetchExchangeRate(paymentCurrency, baseCurrency)
      if (rate) rateToBaseCurrency = rate
    }

    const amountInDebtCurrency = payAmount * rateToDebtCurrency
    const amountInBaseCurrency = payAmount * rateToBaseCurrency

    const newRemainingForeign = Math.max(0, (debt.remaining_amount_foreign || debt.remaining_amount) - amountInDebtCurrency)
    const newRemainingBase = Math.max(0, debt.remaining_amount - amountInBaseCurrency)

    await supabase.from('debt_payments').insert({
      debt_id: debtId,
      user_id: currentUser.id,
      amount: amountInBaseCurrency,
      original_amount: payAmount,
      original_currency: paymentCurrency,
      exchange_rate: rateToBaseCurrency,
      payment_date: new Date().toISOString().split('T')[0]
    })

    // تعليم تنبيه الدين كمقروء تلقائياً
    const paidDebt = debts.find(d => d.id === debtId)
    if (paidDebt) {
      await supabase.from('alerts')
        .update({ is_read: true })
        .eq('user_id', currentUser.id)
        .eq('is_read', false)
        .ilike('title', `%${paidDebt.name}%`)
    }
    await supabase.from('debts').update({
      remaining_amount: newRemainingBase,
      remaining_amount_foreign: newRemainingForeign,
      is_paid: newRemainingBase <= 0.01
    }).eq('id', debtId)

    if (newRemainingBase <= 0.01) {
      // ── احتفال ──
      setCelebration(debt.name)
      setShowConfetti(true)
      haptic(200)
      clearUserCache(currentUser.id)
    } else {
      toast.success(`${t('toast_payment_done')} ${payAmount} ${paymentCurrency}`)
    }
    setPaymentDebtId(null); setPaymentAmount(''); setPaymentCurrency(''); setPayingSaving(false); load()
  }

  const totalRemaining = debts.reduce((a, d) => a + Number(d.remaining_amount), 0)
  const totalOriginal = debts.reduce((a, d) => a + Number(d.original_amount), 0)
  const totalMonthly = debts.reduce((a, d) => a + Number(d.monthly_payment), 0)
  const paidPct = totalOriginal > 0 ? ((totalOriginal - totalRemaining) / totalOriginal * 100) : 0
  const owedDebts = debts.filter(d => (d.debt_type ?? 'owed') === 'owed' && !d.is_paid)
  const receivableDebts = debts.filter(d => d.debt_type === 'receivable' && !d.is_paid)
  const totalOwed = owedDebts.reduce((a, d) => a + Number(d.remaining_amount), 0)
  const totalReceivable = receivableDebts.reduce((a, d) => a + Number(d.remaining_amount), 0)

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[0, 1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
    </div>
  )

  return (
    <div className="animate-fade-in" ref={pageRef}>
      <PullToRefreshIndicator refreshing={refreshing} />

      {/* ── Confetti ── */}
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      {/* ── Celebration Modal ── */}
      {celebration && (
        <CelebrationModal debtName={celebration} onClose={() => setCelebration(null)} />
      )}

      <PageHeader
        title={t('debts_title')}
        subtitle={`${debts.length} ${t('debts_active')}`}
        action={<AddButton label={t('debts_add')} onClick={openAdd} />}
      />

      <StatBar stats={[
        { label: t('debts_total'), value: totalRemaining.toFixed(0), color: 'var(--accent-red-light)' },
        { label: t('debts_paid_pct'), value: `${paidPct.toFixed(0)}%`, color: 'var(--accent-green-light)' },
        { label: t('debts_monthly'), value: totalMonthly.toFixed(0), color: 'var(--accent-amber-light)' },
      ]} />

      {/* ── إحصائية المبالغ المسددة ── */}
      {totalPaidAmount > 0 && (
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 28 }}>💪</div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>إجمالي ما سددته</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-green-light)', fontFamily: 'monospace' }}>{totalPaidAmount.toFixed(0)} JOD</div>
          </div>
          <div style={{ marginRight: 'auto' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>ديون مسددة</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-green-light)' }}>{paidDebts.length} 🎯</div>
          </div>
        </div>
      )}

      {debts.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{t('debts_progress')}</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--accent-green-light)' }}>{paidPct.toFixed(1)}%</span>
          </div>
          <div className="progress-track" style={{ height: 10 }}>
            <div className="progress-fill gradient-green" style={{ width: `${Math.min(paidPct, 100)}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>مسدد: {(totalOriginal - totalRemaining).toFixed(0)} JOD</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>الأصل: {totalOriginal.toFixed(0)} JOD</span>
          </div>
        </div>
      )}

      {debts.length === 0 ? (
        <EmptyState icon="🎉" title={t('debts_empty')} subtitle={t('debts_empty_sub')} />
      ) : (
        <>
          {owedDebts.length > 0 && (
            <button onClick={() => setShowOwed(p => !p)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>💳 {t('debts_tab_owed')} ({owedDebts.length})</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {!showOwed && <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{totalOwed.toFixed(0)} {baseCurrency}</span>}
                <span style={{ fontSize: 16 }}>{showOwed ? '▲' : '▼'}</span>
              </div>
            </button>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {showOwed && owedDebts.map(debt => (
            <DebtCard
              key={debt.id}
              debt={debt}
              baseCurrency={baseCurrency}
              lang={lang}
              paymentDebtId={paymentDebtId}
              paymentAmount={paymentAmount}
              paymentCurrency={paymentCurrency}
              payingSaving={payingSaving}
              onEdit={startEdit}
              onDelete={setConfirmDelete}
              onStartPayment={id => { setPaymentDebtId(id); setPaymentAmount('') }}
              onCancelPayment={() => { setPaymentDebtId(null); setPaymentAmount(''); setPaymentCurrency('') }}
              onConfirmPayment={makePayment}
              onPaymentAmountChange={setPaymentAmount}
              onPaymentCurrencyChange={setPaymentCurrency}
            />
          ))}
        </div>
        </>
      )}

      {/* ── قسم ديون لي ── */}
      {receivableDebts.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => setShowReceivable(p => !p)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 14, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>💰 {t('debts_tab_receivable')} ({receivableDebts.length})</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!showReceivable && <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{totalReceivable.toFixed(0)} {baseCurrency}</span>}
              <span style={{ fontSize: 16 }}>{showReceivable ? '▲' : '▼'}</span>
            </div>
          </button>
          {showReceivable && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {receivableDebts.map(debt => {
                const pri = PRIORITY_CONFIG[(debt.priority ?? 3) - 1] ?? PRIORITY_CONFIG[2]
                return (
                  <div key={debt.id} style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 18, padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', flexShrink: 0, marginTop: 4 }} />
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{debt.name}</div>
                          {debt.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{debt.notes}</div>}
                          {debt.due_date && (
                            <div style={{ fontSize: 11, color: '#10B981', marginTop: 4, fontWeight: 600 }}>
                              📅 موعد الاستلام: {new Date(debt.due_date).toLocaleDateString('ar-EG')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#10B981', fontFamily: 'monospace' }}>
                          {Number(debt.remaining_amount).toFixed(0)} {debt.currency || 'JOD'}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          الأصل: {Number(debt.original_amount).toFixed(0)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={() => receiveDebt(debt)}
                        style={{ flex: 1, padding: '7px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        ✅ {t('debts_receive_btn')}
                      </button>
                      <button onClick={() => startEdit(debt)}
                        style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                        ✏️
                      </button>
                      <button onClick={() => setConfirmDelete(debt.id)}
                        style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── تبويب الديون المسددة ── */}
      {paidDebts.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => setShowPaid(p => !p)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>✅ الديون المسددة ({paidDebts.length})</span>
            <span style={{ fontSize: 16 }}>{showPaid ? '▲' : '▼'}</span>
          </button>

          {showPaid && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {paidDebts.map(debt => (
                <div key={debt.id} style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 24 }}>✅</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{debt.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {debt.updated_at ? new Date(debt.updated_at).toLocaleDateString('ar-EG') : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent-green-light)', fontFamily: 'monospace' }}>
                    {Number(debt.original_amount).toFixed(0)} JOD
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="حذف الدين"
          message="هل أنت متأكد من حذف هذا الدين؟ لا يمكن التراجع."
          onConfirm={() => { deleteDebt(confirmDelete); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {showForm && (
        <DebtForm
          form={form}
          setForm={setForm}
          editingId={editingId}
          baseCurrency={baseCurrency}
          lang={lang}
          t={t}
          saving={saving}
          onSave={saveDebt}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
