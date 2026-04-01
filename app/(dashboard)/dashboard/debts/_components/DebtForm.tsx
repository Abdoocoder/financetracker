import { Modal } from '@/components/ui/modal'
import { FormField, Input, Select, SaveButton } from '@/components/ui/form-field'
import { CURRENCIES } from '@/lib/currency'

const PRIORITY_CONFIG = [
  { color: '#EF4444', ar: 'عالية جداً', en: 'Very High' },
  { color: '#F59E0B', ar: 'عالية', en: 'High' },
  { color: '#3B7EF6', ar: 'متوسطة', en: 'Medium' },
  { color: '#8B9CC8', ar: 'منخفضة', en: 'Low' },
  { color: '#4A5568', ar: 'مؤجلة', en: 'Deferred' },
]

interface FormState {
  name: string
  original_amount: string
  original_amount_foreign: string
  remaining_amount: string
  monthly_payment: string
  due_date: string
  priority: string
  notes: string
  payment_day: string
  auto_deduct: boolean
  received_amount: boolean
  currency: string
  exchange_rate: string
  debt_type: 'owed' | 'receivable'
}

interface Props {
  form: FormState
  setForm: (updater: (f: FormState) => FormState) => void
  editingId: string | null
  baseCurrency: string
  lang: string
  t: (key: string) => string
  saving: boolean
  onSave: () => void
  onClose: () => void
}

export function DebtForm({ form, setForm, editingId, baseCurrency, lang, t, saving, onSave, onClose }: Props) {
  return (
    <Modal title={editingId ? t('debts_edit') : t('debts_new')} onClose={onClose}>
      {/* نوع الدين */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setForm(f => ({ ...f, debt_type: 'owed' }))}
          style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
            background: form.debt_type === 'owed' ? 'rgba(239,68,68,0.15)' : 'var(--bg-secondary)',
            color: form.debt_type === 'owed' ? '#EF4444' : 'var(--text-muted)' }}>
          💳 {t('debts_type_owed')}
        </button>
        <button onClick={() => setForm(f => ({ ...f, debt_type: 'receivable' }))}
          style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
            background: form.debt_type === 'receivable' ? 'rgba(16,185,129,0.15)' : 'var(--bg-secondary)',
            color: form.debt_type === 'receivable' ? '#10B981' : 'var(--text-muted)' }}>
          💰 {t('debts_type_receivable')}
        </button>
      </div>

      <FormField label={t('debts_name')}>
        <Input placeholder={t('debts_name_hint')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <FormField label={lang === 'en' ? 'Amount' : 'المبلغ'}>
          <Input type="number" placeholder="0"
            value={form.currency === baseCurrency ? form.original_amount : form.original_amount_foreign}
            onChange={e => form.currency === baseCurrency
              ? setForm(f => ({ ...f, original_amount: e.target.value }))
              : setForm(f => ({ ...f, original_amount_foreign: e.target.value }))} />
        </FormField>
        <FormField label={lang === 'en' ? 'Currency' : 'العملة'}>
          <Select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
            {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
          </Select>
        </FormField>
      </div>

      {form.currency !== baseCurrency && (
        <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 12, marginBottom: 12, border: '1px dashed var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label={t('trans_exchange_rate') || 'سعر الصرف'}>
              <Input type="number" step="0.0001" value={form.exchange_rate} onChange={e => setForm(f => ({ ...f, exchange_rate: e.target.value }))} />
            </FormField>
            <FormField label="المعادل">
              <div style={{ padding: '10px', borderRadius: 8, background: 'var(--bg-card)', color: 'var(--accent-green-light)', fontWeight: 900, textAlign: 'center', fontSize: 13 }}>
                {(parseFloat(form.original_amount_foreign) * parseFloat(form.exchange_rate) || 0).toFixed(2)} {baseCurrency}
              </div>
            </FormField>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
            <option key={i + 1} value={i + 1}>{lang === 'en' ? p.en : p.ar}</option>
          ))}
        </Select>
      </FormField>

      {!editingId && (
        <FormField label={lang === 'ar' ? '💳 استلمت هذا المبلغ' : '💳 I received this amount'}>
          <div
            onClick={() => setForm(f => ({ ...f, received_amount: !f.received_amount }))}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              borderRadius: 10, cursor: 'pointer',
              background: form.received_amount ? 'rgba(16,185,129,0.1)' : 'var(--bg-elevated)',
              border: `1px solid ${form.received_amount ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
              transition: 'all 0.2s',
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 6,
              background: form.received_amount ? '#10B981' : 'transparent',
              border: `2px solid ${form.received_amount ? '#10B981' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {form.received_amount && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: form.received_amount ? '#10B981' : 'var(--text-secondary)' }}>
                {lang === 'ar' ? 'نعم، استلمت هذا المبلغ اليوم' : 'Yes, I received this amount today'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {lang === 'ar' ? 'سيُضاف تلقائياً كدخل في معاملاتك' : 'Will be added automatically as income in your transactions'}
              </div>
            </div>
          </div>
        </FormField>
      )}

      <FormField label={t('debts_notes')}>
        <Input placeholder={t('debts_notes_hint')} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
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

      <SaveButton label={editingId ? t('debts_save_edit') : t('debts_save')} loading={saving} onClick={onSave} />
    </Modal>
  )
}
