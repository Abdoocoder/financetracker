'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { toast } from '@/components/ui/toast'
import { useI18n } from '@/lib/i18n'
import { PageHeader } from '@/components/ui/page-header'
import { AddButton } from '@/components/ui/add-button'
import { StatBar } from '@/components/ui/stat-bar'
import { Modal } from '@/components/ui/modal'
import { FormField, Input, Select, SaveButton } from '@/components/ui/form-field'
import { EmptyState } from '@/components/ui/empty-state'
import { usePullToRefresh } from '@/lib/use-pull-to-refresh'
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh'
import { clearUserCache } from '@/lib/cache'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const PRIORITY_CONFIG = [
  { color: '#EF4444', ar: 'عالية جداً', en: 'Very High' },
  { color: '#F59E0B', ar: 'عالية',      en: 'High'      },
  { color: '#3B7EF6', ar: 'متوسطة',    en: 'Medium'    },
  { color: '#8B9CC8', ar: 'منخفضة',    en: 'Low'       },
  { color: '#4A5568', ar: 'مؤجلة',     en: 'Deferred'  },
]

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
        <div style={{ fontSize: 15, color: 'var(--accent-green-light)', fontWeight: 700, marginBottom: 12 }}>"{debtName}"</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>تهانيّ! لقد سددت هذا الدين بالكامل. خطوة عظيمة نحو حريتك المالية 💪</div>
        <button onClick={onClose} style={{ marginTop: 24, padding: '10px 28px', borderRadius: 12, background: 'var(--accent-green)', color: 'white', border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          شكراً 🙌
        </button>
      </div>
    </div>
  )
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<any[]>([])
  const [paidDebts, setPaidDebts] = useState<any[]>([])
  const [showPaid, setShowPaid] = useState(false)
  const [totalPaidAmount, setTotalPaidAmount] = useState(0)
  const { user: currentUser } = useUser()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', original_amount: '', remaining_amount: '', monthly_payment: '', due_date: '', priority: '3', notes: '', payment_day: '1', auto_deduct: false })
  const [saving, setSaving] = useState(false)
  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [payingSaving, setPayingSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string|null>(null)
  const [celebration, setCelebration] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const supabase = createClient()
  const { t, lang } = useI18n()
  const { el: pageRef, refreshing } = usePullToRefresh(async () => { await load() })

  const load = useCallback(async () => {
    const user = currentUser
    if (!user) return
    // الديون النشطة
    const { data: active } = await supabase.from('debts').select('*').eq('user_id', user.id).eq('is_paid', false).order('priority')
    setDebts(active ?? [])
    // الديون المسددة
    const { data: paid } = await supabase.from('debts').select('*').eq('user_id', user.id).eq('is_paid', true).order('updated_at', { ascending: false })
    setPaidDebts(paid ?? [])
    // إجمالي المبالغ المسددة
    const total = (paid ?? []).reduce((a, d) => a + Number(d.original_amount), 0)
    setTotalPaidAmount(total)
    setLoading(false)
  }, [supabase, currentUser])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditingId(null)
    setForm({ name: '', original_amount: '', remaining_amount: '', monthly_payment: '', due_date: '', priority: '3', notes: '', payment_day: '1', auto_deduct: false })
    setShowForm(true)
  }

  function startEdit(d: any) {
    setEditingId(d.id)
    setForm({ name: d.name, original_amount: d.original_amount.toString(), remaining_amount: d.remaining_amount.toString(), monthly_payment: d.monthly_payment?.toString() ?? '', due_date: d.due_date ?? '', priority: d.priority.toString(), notes: d.notes ?? '', payment_day: d.payment_day?.toString() ?? '1', auto_deduct: d.auto_deduct ?? false })
    setShowForm(true)
  }

  async function saveDebt() {
    if (!form.name || !form.original_amount) { toast.warning(t('toast_fill_required')); return }
    setSaving(true)
    const user = currentUser
    if (!user) return
    if (editingId) {
      const { error } = await supabase.from('debts').update({ name: form.name, original_amount: parseFloat(form.original_amount.replace(",", ".")), remaining_amount: parseFloat(form.remaining_amount.replace(",", ".")), monthly_payment: parseFloat(form.monthly_payment.replace(",", ".")) || 0, due_date: form.due_date || null, priority: parseInt(form.priority), notes: form.notes || null, payment_day: parseInt(form.payment_day) || 1, auto_deduct: form.auto_deduct }).eq('id', editingId)
      if (error) { toast.error(t('toast_error_save')); setSaving(false); return }
      toast.success(t('toast_edited'))
    } else {
      const { error } = await supabase.from('debts').insert({ user_id: user.id, name: form.name, original_amount: parseFloat(form.original_amount.replace(",", ".")), remaining_amount: parseFloat(form.original_amount.replace(",", ".")), monthly_payment: parseFloat(form.monthly_payment.replace(",", ".")) || 0, due_date: form.due_date || null, priority: parseInt(form.priority), notes: form.notes || null, payment_day: parseInt(form.payment_day) || 1, auto_deduct: form.auto_deduct })
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
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) { toast.warning(t('toast_fill_required')); return }
    setPayingSaving(true)
    const user = currentUser
    if (!user) return
    const debt = debts.find(d => d.id === debtId)
    if (!debt) return
    const newRemaining = Math.max(0, debt.remaining_amount - amount)
    await supabase.from('debt_payments').insert({ debt_id: debtId, user_id: user.id, amount, payment_date: new Date().toISOString().split('T')[0] })
    await supabase.from('debts').update({ remaining_amount: newRemaining, is_paid: newRemaining === 0 }).eq('id', debtId)
    if (newRemaining === 0) {
      // ── احتفال ──
      setCelebration(debt.name)
      setShowConfetti(true)
      clearUserCache(user.id)
    } else {
      toast.success(`${t('toast_payment_done')} ${amount} JOD`)
    }
    setPaymentDebtId(null); setPaymentAmount(''); setPayingSaving(false); load()
  }

  const totalRemaining = debts.reduce((a, d) => a + Number(d.remaining_amount), 0)
  const totalOriginal  = debts.reduce((a, d) => a + Number(d.original_amount), 0)
  const totalMonthly   = debts.reduce((a, d) => a + Number(d.monthly_payment), 0)
  const paidPct = totalOriginal > 0 ? ((totalOriginal - totalRemaining) / totalOriginal * 100) : 0

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
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
        { label: t('debts_total'),    value: totalRemaining.toFixed(0), color: 'var(--accent-red-light)'   },
        { label: t('debts_paid_pct'), value: `${paidPct.toFixed(0)}%`, color: 'var(--accent-green-light)' },
        { label: t('debts_monthly'),  value: totalMonthly.toFixed(0),  color: 'var(--accent-amber-light)'  },
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
        <EmptyState icon="🎉" title={t('debts_empty')} subtitle="لا ديون نشطة — أحسنت!" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {debts.map(debt => {
            const pct = Number(debt.original_amount) > 0
              ? ((Number(debt.original_amount) - Number(debt.remaining_amount)) / Number(debt.original_amount) * 100)
              : 0
            const pri = PRIORITY_CONFIG[(debt.priority ?? 3) - 1] ?? PRIORITY_CONFIG[2]
            return (
              <div key={debt.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 18, padding: '16px',
                borderRight: `3px solid ${pri.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${pri.color}18`, border: `1px solid ${pri.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: pri.color, boxShadow: `0 0 8px ${pri.color}` }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 2 }}>{debt.name}</div>
                    {debt.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{debt.notes}</div>}
                  </div>
                  <div style={{ textAlign: 'left', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-red-light)', fontFamily: 'monospace' }}>
                      {Number(debt.remaining_amount).toFixed(0)}<span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 2 }}> JOD</span>
                    </div>
                    {debt.monthly_payment > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{Number(debt.monthly_payment).toFixed(0)}/شهر</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => startEdit(debt)} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.2)', color: 'var(--accent-blue-light)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</button>
                    <button onClick={() => setConfirmDelete(debt.id)} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-red-light)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                </div>
                <div className="progress-track" style={{ marginBottom: 10 }}>
                  <div className="progress-fill gradient-green" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{pct.toFixed(0)}% مسدد</span>
                  {paymentDebtId === debt.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                        placeholder={lang === "en" ? "Amount" : "المبلغ"} autoFocus onKeyDown={e => e.key === 'Enter' && makePayment(debt.id)}
                        style={{ width: 90, padding: '7px 10px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'inherit', outline: 'none', textAlign: 'center' }} />
                      <button onClick={() => makePayment(debt.id)} disabled={payingSaving}
                        style={{ padding: '7px 12px', borderRadius: 8, background: 'var(--accent-green)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: 'inherit', opacity: payingSaving ? 0.5 : 1 }}>
                        {payingSaving ? '⏳' : (lang === 'en' ? '✓ Pay' : '✓ دفع')}
                      </button>
                      <button onClick={() => { setPaymentDebtId(null); setPaymentAmount('') }}
                        style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setPaymentDebtId(debt.id); setPaymentAmount('') }}
                      style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--accent-green-dim)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--accent-green-light)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      + دفعة
                    </button>
                  )}
                </div>
              </div>
            )
          })}
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
        <Modal title={editingId ? t('debts_edit') : t('debts_new')} onClose={() => setShowForm(false)}>
          <FormField label={t('debts_name')}>
            <Input placeholder={lang === "en" ? "e.g. Visa Card" : "مثال: بطاقة Visa"} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label={t('debts_original')}>
              <Input type="number" placeholder="0" value={form.original_amount} onChange={e => setForm(f => ({ ...f, original_amount: e.target.value }))} />
            </FormField>
            <FormField label={t('debts_remaining')}>
              <Input type="number" placeholder="0" value={form.remaining_amount} onChange={e => setForm(f => ({ ...f, remaining_amount: e.target.value }))} />
            </FormField>
            <FormField label={t('debts_monthly')}>
              <Input type="number" placeholder="0" value={form.monthly_payment} onChange={e => setForm(f => ({ ...f, monthly_payment: e.target.value }))} />
            </FormField>
            <FormField label={t('debts_due_date')}>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="الأولوية">
            <Select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              {PRIORITY_CONFIG.map((p, i) => (
                <option key={i+1} value={i+1}>{lang === 'en' ? p.en : p.ar}</option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('debts_notes')}>
            <Input placeholder={lang === "en" ? "Optional notes" : "ملاحظات اختيارية"} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </FormField>
          <FormField label={t('debts_payment_day')}>
            <Input type="number" placeholder="1" value={form.payment_day} onChange={e => setForm(f => ({ ...f, payment_day: e.target.value }))} />
          </FormField>
          <FormField label={t('debts_auto_deduct')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <button
                onClick={() => setForm(f => ({ ...f, auto_deduct: !f.auto_deduct }))}
                style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: form.auto_deduct ? 'var(--accent-green)' : 'var(--bg-elevated)', transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, transition: 'right 0.2s', right: form.auto_deduct ? 3 : 23 }} />
              </button>
              <span style={{ fontSize: 13, color: form.auto_deduct ? 'var(--accent-green-light)' : 'var(--text-muted)', fontWeight: 600 }}>
                {form.auto_deduct ? t('debts_auto_on') : t('debts_auto_off')}
              </span>
            </div>
          </FormField>
          <SaveButton label={editingId ? t('debts_save_edit') : t('debts_save')} loading={saving} onClick={saveDebt} />
        </Modal>
      )}
    </div>
  )
}
