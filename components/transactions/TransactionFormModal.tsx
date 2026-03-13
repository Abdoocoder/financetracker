'use client'
import { Modal } from '@/components/ui/modal'
import { FormField, Input, Select, SaveButton } from '@/components/ui/form-field'
import { useI18n } from '@/lib/i18n'
import type { TransactionForm } from '@/hooks/useTransactions'

const CATEGORIES_EXPENSE = ['طعام','مواصلات','فواتير','صحة','تعليم','ترفيه','ملابس','ديون','أخرى']
const CATEGORIES_INCOME  = ['راتب','عمل حر','استثمار','هدية','أخرى']

interface Props {
  editingId: string | null
  form: TransactionForm
  saving: boolean
  onClose: () => void
  onSave: () => void
  onChange: (updates: Partial<TransactionForm>) => void
}

export function TransactionFormModal({ editingId, form, saving, onClose, onSave, onChange }: Props) {
  const { t, lang } = useI18n()
  return (
    <Modal title={editingId ? t('trans_edit') : `+ ${t('trans_add')}`} onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['expense','income'] as const).map(type => (
          <button key={type} onClick={() => onChange({ type, category: '' })} style={{ flex: 1, padding: '11px', borderRadius: 12, background: form.type === type ? (type === 'income' ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)') : 'var(--bg-card)', border: `1px solid ${form.type === type ? (type === 'income' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)') : 'var(--border)'}`, color: form.type === type ? (type === 'income' ? 'var(--accent-green-light)' : 'var(--accent-red-light)') : 'var(--text-muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {type === 'income' ? `💰 ${lang === 'en' ? 'Income' : 'دخل'}` : `💸 ${lang === 'en' ? 'Expense' : 'مصروف'}`}
          </button>
        ))}
      </div>
      <FormField label={lang === 'en' ? 'Amount' : 'المبلغ'}>
        <Input type="number" placeholder="0.00" value={form.amount} onChange={e => onChange({ amount: e.target.value })} />
      </FormField>
      <FormField label={lang === 'en' ? 'Category' : 'الفئة'}>
        <Select value={form.category} onChange={e => onChange({ category: e.target.value })}>
          <option value="">{lang === 'en' ? 'Select category' : 'اختر فئة'}</option>
          {(form.type === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </FormField>
      <FormField label={lang === 'en' ? 'Description' : 'الوصف'}>
        <Input placeholder={lang === 'en' ? 'Optional description' : 'وصف اختياري'} value={form.description} onChange={e => onChange({ description: e.target.value })} />
      </FormField>
      <FormField label={lang === 'en' ? 'Date' : 'التاريخ'}>
        <Input type="date" value={form.transaction_date} onChange={e => onChange({ transaction_date: e.target.value })} />
      </FormField>
      {/* تكرار شهري */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: form.is_recurring ? 12 : 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              🔁 {lang === 'ar' ? 'معاملة متكررة' : 'Recurring'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {lang === 'ar' ? 'تنفيذ تلقائي كل شهر' : 'Auto-execute monthly'}
            </div>
          </div>
          <button
            onClick={() => onChange({ is_recurring: !form.is_recurring })}
            style={{
              width: 48, height: 28, borderRadius: 14,
              background: form.is_recurring ? 'var(--accent-green-light)' : 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              flexShrink: 0
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: 'white',
              position: 'absolute', top: 3,
              left: form.is_recurring ? 23 : 3,
              transition: 'left 0.2s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
            }} />
          </button>
        </div>
        {form.is_recurring && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              {lang === 'ar' ? 'يوم التكرار كل شهر' : 'Repeat day each month'}
            </div>
            <input
              type="number" min="1" max="31"
              value={form.recurring_day}
              onChange={e => onChange({ recurring_day: Number(e.target.value) })}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ fontSize: 11, color: 'var(--accent-green-light)', marginTop: 8, fontWeight: 700 }}>
              ✅ {lang === 'ar' ? 'سيتم التنفيذ تلقائياً كل شهر' : 'Will auto-execute every month'}
            </div>
          </div>
        )}
      </div>

      <SaveButton label={editingId ? (lang === 'en' ? 'Save Changes' : 'حفظ التعديل') : (lang === 'en' ? 'Add' : 'إضافة')} loading={saving} onClick={onSave} />
    </Modal>
  )
}
