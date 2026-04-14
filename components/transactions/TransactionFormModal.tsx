'use client'
import { Modal } from '@/components/ui/modal'
import { FormField, Input, Select, SaveButton } from '@/components/ui/form-field'
import { useI18n } from '@/lib/i18n'
import { CURRENCIES } from '@/lib/currency'
import { useUser } from '@/lib/user-context'
import { useAccounts } from '@/hooks/useAccounts'
import type { TransactionForm } from '@/hooks/useTransactions'

const CATEGORIES_EXPENSE = ['طعام وشراب','مواصلات','فواتير','صحة','تعليم','ترفيه','ملابس','ديون','إيجار / قسط','أخرى']
const CATEGORIES_INCOME  = ['راتب','عمل حر','استثمار','مكافأة','أخرى']

interface Props {
  editingId: string | null
  form: TransactionForm
  saving: boolean
  onClose: () => void
  onSave: () => void
  onChange: (updates: Partial<TransactionForm>) => void
}

export function TransactionFormModal({ editingId, form, saving, onClose, onSave, onChange }: Props) {
  const { t, tCategory } = useI18n()
  const { profile, user } = useUser()
  const baseCurrency = profile?.currency || 'JOD'
  const isMultiCurrency = form.original_currency && form.original_currency !== baseCurrency
  const { accounts } = useAccounts(user?.id)

  return (
    <Modal title={editingId ? t('trans_edit') : `+ ${t('trans_add')}`} onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['expense','income'] as const).map(type => (
          <button key={type} onClick={() => onChange({ type, category: '' })} style={{ flex: 1, padding: '11px', borderRadius: 12, background: form.type === type ? (type === 'income' ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)') : 'var(--bg-card)', border: `1px solid ${form.type === type ? (type === 'income' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)') : 'var(--border)'}`, color: form.type === type ? (type === 'income' ? 'var(--accent-green-light)' : 'var(--accent-red-light)') : 'var(--text-muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {type === 'income' ? `💰 ${t('trans_income')}` : `💸 ${t('trans_expense')}`}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 16 }}>
        <div style={{ flex: 2 }}>
          <FormField label={t('trans_amount')}>
            <Input 
              type="number" 
              placeholder="0.00" 
              autoFocus
              value={isMultiCurrency ? form.original_amount : form.amount} 
              onChange={e => isMultiCurrency ? onChange({ original_amount: e.target.value }) : onChange({ amount: e.target.value, original_amount: e.target.value })} 
            />
          </FormField>
        </div>
        <div style={{ flex: 1 }}>
          <FormField label={t('trans_currency')}>
            <Select value={form.original_currency || baseCurrency} onChange={e => onChange({ original_currency: e.target.value })}>
              {CURRENCIES.map(c => (
                <option key={c.value} value={c.value}>{c.value}</option>
              ))}
            </Select>
          </FormField>
        </div>
      </div>

      {isMultiCurrency && (
        <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 12, marginBottom: 16, border: '1px dashed var(--border)', animation: 'slideDown 0.2s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label={t('trans_exchange_rate')}>
              <Input type="number" step="0.0001" value={form.exchange_rate} onChange={e => onChange({ exchange_rate: e.target.value })} />
            </FormField>
            <FormField label={t('trans_equivalent')}>
              <div style={{ padding: '10px', borderRadius: 8, background: 'var(--bg-card)', color: 'var(--accent-green-light)', fontWeight: 900, direction: 'ltr', textAlign: 'center', fontSize: 13 }}>
                {form.amount} {baseCurrency}
              </div>
            </FormField>
          </div>
          <style>{`
            @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
        </div>
      )}

      <FormField label={t('trans_category')}>
        <Select value={form.category} onChange={e => onChange({ category: e.target.value })}>
          <option value="">{t('trans_select_cat')}</option>
          {(form.type === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map(c => (
            <option key={c} value={c}>{tCategory(c)}</option>
          ))}
        </Select>
      </FormField>
      <FormField label={t('trans_description')}>
        <Input placeholder={t('trans_desc_hint')} value={form.description} onChange={e => onChange({ description: e.target.value })} />
      </FormField>

      {accounts.length > 0 && (
        <FormField label={t('settings_account')}>
          <Select value={form.account_id} onChange={e => onChange({ account_id: e.target.value })}>
            <option value="">{t('trans_default_acc')}</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
            ))}
          </Select>
        </FormField>
      )}

      <FormField label={t('trans_date')}>
        <Input type="date" value={form.transaction_date} onChange={e => onChange({ transaction_date: e.target.value })} />
      </FormField>
      {/* تكرار شهري */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: form.is_recurring ? 12 : 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              🔁 {t('trans_recurring_title')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {t('trans_auto_execute')}
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
              {t('trans_repeat_day')}
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
              ✅ {t('trans_auto_execute')}
            </div>

            {/* نوع التكرار */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>
                {t('trans_payment_type')}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => onChange({ recurring_auto: true })}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                    border: '1px solid ' + (form.recurring_auto !== false ? 'var(--accent-blue)' : 'var(--border)'),
                    background: form.recurring_auto !== false ? 'var(--accent-blue-dim)' : 'var(--bg-card)',
                    color: form.recurring_auto !== false ? 'var(--accent-blue-light)' : 'var(--text-muted)',
                    fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                  }}>
                  🏦 {t('trans_auto_bank')}
                </button>
                <button
                  onClick={() => onChange({ recurring_auto: false })}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                    border: '1px solid ' + (form.recurring_auto === false ? 'var(--accent-amber)' : 'var(--border)'),
                    background: form.recurring_auto === false ? 'rgba(245,158,11,0.1)' : 'var(--bg-card)',
                    color: form.recurring_auto === false ? '#F59E0B' : 'var(--text-muted)',
                    fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                  }}>
                  💬 {t('trans_needs_conf')}
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                {form.recurring_auto !== false ? t('trans_auto_hint') : t('trans_manual_hint')}
              </div>
            </div>
          </div>
        )}
      </div>

      <SaveButton label={editingId ? t('trans_save_edit') : t('trans_add')} loading={saving} onClick={onSave} />
    </Modal>
  )
}
