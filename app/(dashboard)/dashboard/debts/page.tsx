'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { PageSkeleton, ListSkeleton, Skeleton } from '@/components/ui/skeleton'

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
    round: Math.random() > 0.5,
  }))

  return (
    <div className="fixed inset-0 z-[999] pointer-events-none overflow-hidden">
      <style>{pieces.map(p =>
        `.cf-${p.id}{position:absolute;left:${p.left.toFixed(2)}%;top:-20px;width:${p.size.toFixed(1)}px;height:${p.size.toFixed(1)}px;border-radius:${p.round ? '50%' : '2px'};background:${p.color};animation:confettiFall 3s ${p.delay.toFixed(2)}s ease-in forwards}`
      ).join('')}</style>
      {pieces.map(p => (
        <div key={p.id} className={`cf-${p.id}`} />
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
  const { t } = useI18n()
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-[8px]"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-card)] border border-[rgba(16,185,129,0.4)] rounded-3xl px-8 py-10 text-center max-w-xs m-4 shadow-[0_0_60px_rgba(16,185,129,0.3)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-[56px] mb-4">🎉</div>
        <div className="text-[22px] font-black text-[var(--text-primary)] mb-2">{t('debts_celebration_title')}</div>
        <div className="text-[15px] text-[var(--accent-green-light)] font-bold mb-3">&quot;{debtName}&quot;</div>
        <div className="text-[13px] text-[var(--text-muted)] leading-relaxed">{t('debts_celebration_msg')}</div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 px-7 py-2.5 rounded-xl bg-[var(--accent-green)] text-white border-none font-[inherit] text-sm font-bold cursor-pointer"
        >
          {t('debts_celebration_btn')}
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
    paid_from_account: false,
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
  const supabase = useMemo(() => createClient(), [])
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
    // ── جلب query ين بالتوازي (~300ms → ~150ms) ──
    const [{ data: active }, { data: paid }] = await Promise.all([
      supabase.from('debts').select('*').eq('user_id', currentUser.id).eq('is_paid', false).order('priority'),
      supabase.from('debts').select('*').eq('user_id', currentUser.id).eq('is_paid', true).order('updated_at', { ascending: false }),
    ])
    const total = (paid ?? []).reduce((a, d) => a + Number(d.original_amount), 0)
    setDebts(active ?? [])
    setPaidDebts(paid ?? [])
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
      paid_from_account: false,
      currency: baseCurrency,
      exchange_rate: '1',
      debt_type: 'owed' as 'owed' | 'receivable',
    })
    setShowForm(true)
  }

  function startEdit(d: Debt) {
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
      paid_from_account: false,
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
      category: t('debts_received_cat'),
      description: t('debts_received_desc', { name: debt.name }),
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
      // إضافة معاملة دخل إذا استلم المبلغ (دين علي)
      if (!error && form.received_amount && form.debt_type === 'owed') {
        await supabase.from('transactions').insert({
          user_id: currentUser.id,
          type: 'income',
          amount: origBase,
          original_amount: isMulti ? origForeign : origBase,
          original_currency: form.currency,
          exchange_rate: rate,
          category: t('debts_loan_received_cat'),
          description: t('debts_loan_received_desc', { name: form.name }),
          transaction_date: new Date().toISOString().split('T')[0],
        })
      }
      // إضافة معاملة مصروف إذا أعطى المبلغ من حسابه الحالي (دين لي)
      if (!error && form.paid_from_account && form.debt_type === 'receivable') {
        await supabase.from('transactions').insert({
          user_id: currentUser.id,
          type: 'expense',
          amount: origBase,
          original_amount: isMulti ? origForeign : origBase,
          original_currency: form.currency,
          exchange_rate: rate,
          category: t('debts_loan_given_cat'),
          description: t('debts_loan_given_desc', { name: form.name }),
          transaction_date: new Date().toISOString().split('T')[0],
        })
      }
      if (error) { toast.error(t('toast_error_save')); setSaving(false); return }
      toast.success(t('toast_debt_added'))
    }
    setShowForm(false); setSaving(false); load()
  }

  const deleteDebt = useCallback(async (id: string) => {
    await supabase.from('debts').delete().eq('id', id)
    setDebts(prev => prev.filter(d => d.id !== id))
    toast.success(t('toast_deleted'))
  }, [supabase, t])

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

    const { error: paymentError } = await supabase.from('debt_payments').insert({
      debt_id: debtId,
      user_id: currentUser.id,
      amount: amountInBaseCurrency,
      original_amount: payAmount,
      original_currency: paymentCurrency,
      exchange_rate: rateToBaseCurrency,
      payment_date: new Date().toISOString().split('T')[0]
    })
    if (paymentError) {
      toast.error(t('toast_error_generic'))
      setPayingSaving(false)
      return
    }

    if ((debt.debt_type ?? 'owed') === 'owed') {
      await supabase.from('transactions').insert({
        user_id: currentUser.id,
        type: 'expense',
        amount: amountInBaseCurrency,
        original_amount: payAmount,
        original_currency: paymentCurrency,
        exchange_rate: rateToBaseCurrency,
        category: 'ديون',
        description: `المسدد: ${debt.name}`,
        transaction_date: new Date().toISOString().split('T')[0],
      })
    }

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

  const { owedDebts, receivableDebts, totalRemaining, totalOriginal, totalMonthly, totalOwed, totalReceivable, paidPct } = useMemo(() => {
    const owed = debts.filter(d => (d.debt_type ?? 'owed') === 'owed' && !d.is_paid)
    const recv = debts.filter(d => d.debt_type === 'receivable' && !d.is_paid)
    const tRem = debts.reduce((a, d) => a + Number(d.remaining_amount), 0)
    const tOri = debts.reduce((a, d) => a + Number(d.original_amount), 0)
    const tMon = debts.reduce((a, d) => a + Number(d.monthly_payment), 0)
    return {
      owedDebts: owed,
      receivableDebts: recv,
      totalRemaining: tRem,
      totalOriginal: tOri,
      totalMonthly: tMon,
      totalOwed: owed.reduce((a, d) => a + Number(d.remaining_amount), 0),
      totalReceivable: recv.reduce((a, d) => a + Number(d.remaining_amount), 0),
      paidPct: tOri > 0 ? ((tOri - tRem) / tOri * 100) : 0,
    }
  }, [debts])

  if (loading) return <PageSkeleton />

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
        <div className="bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] rounded-2xl px-4 py-3.5 mb-2 flex items-center gap-3">
          <div className="text-[28px]">💪</div>
          <div>
            <div className="text-xs text-[var(--text-muted)] mb-0.5">{t('debts_total_paid_label')}</div>
            <div className="text-lg font-black text-[var(--accent-green-light)] font-mono">{totalPaidAmount.toFixed(0)} {baseCurrency}</div>
          </div>
          <div className="mr-auto">
            <div className="text-[11px] text-[var(--text-muted)] mb-0.5">{t('debts_paid_title')}</div>
            <div className="text-base font-black text-[var(--accent-green-light)]">{paidDebts.length} 🎯</div>
          </div>
        </div>
      )}

      {debts.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3.5 mb-4">
          <div className="flex justify-between mb-2.5">
            <span className="text-xs font-bold text-[var(--text-secondary)]">{t('debts_progress')}</span>
            <span className="text-xs font-black text-[var(--accent-green-light)]">{paidPct.toFixed(1)}%</span>
          </div>
          <div className="progress-track h-[10px]">
            <style>{`.debt-pct-fill{width:${Math.min(paidPct, 100).toFixed(2)}%}`}</style>
            <div className="progress-fill gradient-green debt-pct-fill" />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-[var(--text-muted)]">{t('debts_paid_summary', { amount: (totalOriginal - totalRemaining).toFixed(0) })} {baseCurrency}</span>
            <span className="text-[10px] text-[var(--text-muted)]">{t('debts_original_label', { amount: totalOriginal.toFixed(0) })} {baseCurrency}</span>
          </div>
        </div>
      )}

      {debts.length === 0 ? (
        <EmptyState icon="🎉" title={t('debts_empty')} subtitle={t('debts_empty_sub')} />
      ) : (
        <>
          {owedDebts.length > 0 && (
            <button
              type="button"
              onClick={() => setShowOwed(p => !p)}
              className="w-full px-4 py-3 rounded-2xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[#EF4444] text-[13px] font-bold cursor-pointer font-[inherit] flex items-center justify-between mb-2"
            >
              <span>💳 {t('debts_tab_owed')} ({owedDebts.length})</span>
              <div className="flex items-center gap-2">
                {!showOwed && <span className="font-mono font-black">{totalOwed.toFixed(0)} {baseCurrency}</span>}
                <span className="text-base">{showOwed ? '▲' : '▼'}</span>
              </div>
            </button>
          )}
          <div className="flex flex-col gap-2.5">
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
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowReceivable(p => !p)}
            className="w-full px-4 py-3 rounded-2xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] text-[#10B981] text-[13px] font-bold cursor-pointer font-[inherit] flex items-center justify-between"
          >
            <span>💰 {t('debts_tab_receivable')} ({receivableDebts.length})</span>
            <div className="flex items-center gap-2">
              {!showReceivable && <span className="font-mono font-black">{totalReceivable.toFixed(0)} {baseCurrency}</span>}
              <span className="text-base">{showReceivable ? '▲' : '▼'}</span>
            </div>
          </button>
          {showReceivable && (
            <div className="flex flex-col gap-2.5 mt-2">
              {receivableDebts.map(debt => {
                return (
                  <div key={debt.id} className="bg-[rgba(16,185,129,0.04)] border border-[rgba(16,185,129,0.15)] rounded-[18px] p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0 mt-1" />
                        <div>
                          <div className="text-[15px] font-extrabold text-[var(--text-primary)]">{debt.name}</div>
                          {debt.notes && <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{debt.notes}</div>}
                          {debt.due_date && (
                            <div className="text-[11px] text-[#10B981] mt-1 font-semibold">
                              {t('debts_receive_date_label', { date: new Date(debt.due_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-base font-black text-[#10B981] font-mono">
                          {Number(debt.remaining_amount).toFixed(0)} {debt.currency || 'JOD'}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                          {t('debts_original_label', { amount: Number(debt.original_amount).toFixed(0) })}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => receiveDebt(debt)}
                        className="flex-1 px-3.5 py-[7px] rounded-lg bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.3)] text-[#10B981] text-xs font-bold cursor-pointer font-[inherit]"
                      >
                        ✅ {t('debts_receive_btn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(debt)}
                        className="px-3.5 py-[7px] rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] text-xs cursor-pointer font-[inherit]"
                        aria-label={t('toast_edited')}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(debt.id)}
                        className="px-3.5 py-[7px] rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[#EF4444] text-xs cursor-pointer font-[inherit]"
                        aria-label={t('debts_delete_title')}
                      >
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
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowPaid(p => !p)}
            className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] text-[13px] font-bold cursor-pointer font-[inherit] flex items-center justify-between"
          >
            <span>✅ {t('debts_paid_title')} ({paidDebts.length})</span>
            <span className="text-base">{showPaid ? '▲' : '▼'}</span>
          </button>

          {showPaid && (
            <div className="flex flex-col gap-2 mt-2">
              {paidDebts.map(debt => (
                <div key={debt.id} className="bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.15)] rounded-2xl px-4 py-3.5 flex items-center gap-3">
                  <div className="text-2xl">✅</div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-[var(--text-primary)]">{debt.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {debt.updated_at ? new Date(debt.updated_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : ''}
                    </div>
                  </div>
                  <div className="text-sm font-black text-[var(--accent-green-light)] font-mono">
                    {Number(debt.original_amount).toFixed(0)} {baseCurrency}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={t('debts_delete_title')}
          message={t('trans_delete_msg')}
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
          saving={saving}
          onSave={saveDebt}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
