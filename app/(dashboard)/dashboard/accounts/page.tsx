'use client'
import { useState } from 'react'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'
import { useAccounts } from '@/hooks/useAccounts'
import type { Account, AccountType } from '@/types'
import { PageHeader } from '@/components/ui/page-header'

// ── Skeleton للتحميل ─────────────────────────────────
function AccountsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="skeleton" style={{ height: 100, borderRadius: 20 }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <div className="skeleton" style={{ flex: 1, height: 46, borderRadius: 14 }} />
        <div className="skeleton" style={{ flex: 1, height: 46, borderRadius: 14 }} />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton" style={{ height: 80, borderRadius: 18 }} />
      ))}
    </div>
  )
}

// ── Dialog تأكيد الحذف ───────────────────────────────
function ConfirmArchiveDialog({ lang, onConfirm, onCancel }: { lang: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onCancel}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>📦</div>
        <h3 style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 8px', textAlign: 'center' }}>
          {lang === 'en' ? 'Archive Account?' : 'أرشفة الحساب؟'}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 20px', lineHeight: 1.5 }}>
          {lang === 'en' ? 'The account will be hidden but all its transactions will be preserved.' : 'سيُخفى الحساب مع الاحتفاظ بجميع معاملاته.'}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {lang === 'en' ? 'Cancel' : 'إلغاء'}
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--accent-red-light)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {lang === 'en' ? 'Archive' : 'أرشفة'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── أيقونات وألوان الحسابات ──────────────────────────
const ACCOUNT_TYPES: { type: AccountType; icon: string; labelAr: string; labelEn: string; color: string }[] = [
  { type: 'bank',        icon: '🏦', labelAr: 'بنك',           labelEn: 'Bank',         color: '#3B7EF6' },
  { type: 'cash',        icon: '💵', labelAr: 'نقدي',          labelEn: 'Cash',         color: '#10B981' },
  { type: 'savings',     icon: '🏛️', labelAr: 'توفير',         labelEn: 'Savings',      color: '#8B5CF6' },
  { type: 'credit_card', icon: '💳', labelAr: 'بطاقة ائتمان',  labelEn: 'Credit Card',  color: '#EF4444' },
]

const PRESET_COLORS = ['#3B7EF6','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#EC4899','#64748B']

function typeInfo(type: AccountType) {
  return ACCOUNT_TYPES.find(t => t.type === type) ?? ACCOUNT_TYPES[0]
}

// ── بطاقة حساب ───────────────────────────────────────
function AccountCard({ acc, currency, lang, onEdit, onDelete }: {
  acc: Account; currency: string; lang: string
  onEdit: (a: Account) => void
  onDelete: (a: Account) => void
}) {
  const info = typeInfo(acc.type)
  const bal = acc.balance ?? 0
  const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 18,
      border: `1px solid ${acc.color}33`,
      padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: `${acc.color}20`,
        border: `1px solid ${acc.color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>{acc.icon}</div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{acc.name}</span>
          {acc.is_default && (
            <span style={{ fontSize: 9, fontWeight: 700, color: acc.color, background: `${acc.color}18`, border: `1px solid ${acc.color}30`, padding: '1px 6px', borderRadius: 100 }}>
              {lang === 'en' ? 'Default' : 'افتراضي'}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {lang === 'en' ? info.labelEn : info.labelAr}
        </div>
      </div>

      <div style={{ textAlign: 'end' }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: bal >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', fontFamily: 'monospace' }}>
          {bal >= 0 ? '+' : '-'}{fmt(Math.abs(bal))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{currency}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button onClick={() => onEdit(acc)} aria-label={lang === 'en' ? 'Edit account' : 'تعديل الحساب'}
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)', transition: 'opacity 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          ✏️
        </button>
        {!acc.is_default && (
          <button onClick={() => onDelete(acc)} aria-label={lang === 'en' ? 'Archive account' : 'أرشفة الحساب'}
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--accent-red-light)', transition: 'opacity 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            🗑️
          </button>
        )}
      </div>
    </div>
  )
}

// ── Modal إنشاء/تعديل حساب ───────────────────────────
function AccountModal({ account, lang, onSave, onClose }: {
  account?: Account; lang: string
  onSave: (data: Partial<Account>) => Promise<void>
  onClose: () => void
}) {
  const info = account ? typeInfo(account.type) : ACCOUNT_TYPES[0]
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'bank')
  const [openingBalance, setOpeningBalance] = useState(account?.opening_balance?.toString() ?? '0')
  const [color, setColor] = useState(account?.color ?? '#3B7EF6')
  const [icon, setIcon] = useState(account?.icon ?? '🏦')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), type, opening_balance: parseFloat(openingBalance) || 0, color, icon })
    setSaving(false)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
            {account ? (lang === 'en' ? 'Edit Account' : 'تعديل الحساب') : (lang === 'en' ? 'New Account' : 'حساب جديد')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* نوع الحساب */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
            {lang === 'en' ? 'Account Type' : 'نوع الحساب'}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ACCOUNT_TYPES.map(t => (
              <button key={t.type} onClick={() => { setType(t.type); setColor(t.color); setIcon(t.icon) }}
                style={{
                  padding: '10px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                  background: type === t.type ? `${t.color}18` : 'var(--bg-elevated)',
                  border: `1px solid ${type === t.type ? t.color : 'var(--border)'}`,
                  color: type === t.type ? t.color : 'var(--text-muted)',
                  fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                <span>{t.icon}</span>
                <span>{lang === 'en' ? t.labelEn : t.labelAr}</span>
              </button>
            ))}
          </div>
        </div>

        {/* الاسم */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            {lang === 'en' ? 'Account Name' : 'اسم الحساب'}
          </label>
          <input
            autoFocus
            value={name} onChange={e => setName(e.target.value)}
            placeholder={lang === 'en' ? 'e.g. Arab Bank' : 'مثال: البنك العربي'}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* الرصيد الابتدائي */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            {lang === 'en' ? 'Opening Balance' : 'الرصيد الابتدائي'}
          </label>
          <input
            type="number" min="0" step="0.01"
            value={openingBalance} onChange={e => setOpeningBalance(e.target.value)}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* اللون */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
            {lang === 'en' ? 'Color' : 'اللون'}
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: `3px solid ${color === c ? 'var(--text-primary)' : 'transparent'}`, cursor: 'pointer', padding: 0 }} />
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving || !name.trim()}
          style={{ width: '100%', padding: 14, borderRadius: 14, background: color, border: 'none', color: 'white', fontSize: 15, fontWeight: 900, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit' }}>
          {saving ? '⏳ ...' : lang === 'en' ? 'Save' : 'حفظ'}
        </button>
      </div>
    </div>
  )
}

// ── Modal التحويل بين الحسابات ────────────────────────
function TransferModal({ accounts, lang, onSave, onClose }: {
  accounts: Account[]; lang: string
  onSave: (fromId: string, toId: string, amount: number, date: string, note: string) => Promise<void>
  onClose: () => void
}) {
  const [fromId, setFromId] = useState(accounts.find(a => a.is_default)?.id ?? accounts[0]?.id ?? '')
  const [toId, setToId]     = useState(accounts.find(a => !a.is_default)?.id ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate]     = useState(new Date().toISOString().split('T')[0])
  const [note, setNote]     = useState('')
  const [saving, setSaving] = useState(false)

  const selectStyle = { width: '100%', padding: '11px 14px', borderRadius: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }

  async function handleSave() {
    if (!fromId || !toId || fromId === toId || !amount) return
    setSaving(true)
    await onSave(fromId, toId, parseFloat(amount), date, note)
    setSaving(false)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
            🔄 {lang === 'en' ? 'Transfer Between Accounts' : 'تحويل بين الحسابات'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{lang === 'en' ? 'From' : 'من'}</label>
          <select value={fromId} onChange={e => setFromId(e.target.value)} style={selectStyle}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{lang === 'en' ? 'To' : 'إلى'}</label>
          <select value={toId} onChange={e => setToId(e.target.value)} style={selectStyle}>
            {accounts.filter(a => a.id !== fromId).map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{lang === 'en' ? 'Amount' : 'المبلغ'}</label>
          <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={selectStyle} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{lang === 'en' ? 'Date' : 'التاريخ'}</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={selectStyle} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{lang === 'en' ? 'Note (optional)' : 'ملاحظة (اختياري)'}</label>
          <input value={note} onChange={e => setNote(e.target.value)} style={selectStyle} />
        </div>

        <button onClick={handleSave} disabled={saving || !amount || fromId === toId}
          style={{ width: '100%', padding: 14, borderRadius: 14, background: '#3B7EF6', border: 'none', color: 'white', fontSize: 15, fontWeight: 900, cursor: 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit' }}>
          {saving ? '⏳ ...' : lang === 'en' ? 'Transfer' : 'تحويل'}
        </button>
      </div>
    </div>
  )
}

// ── الصفحة الرئيسية ───────────────────────────────────
export default function AccountsPage() {
  const { user } = useUser()
  const { t, lang } = useI18n()
  const { accounts, loading, totalBalance, createAccount, updateAccount, deleteAccount, transferBetween } = useAccounts(user?.id)
  const currency = accounts.find(a => a.is_default)?.currency ?? 'JOD'

  const [showCreate, setShowCreate] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | undefined>()
  const [showTransfer, setShowTransfer] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<Account | null>(null)

  const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)

  if (loading) return <AccountsSkeleton />

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader title={lang === 'en' ? '💰 Accounts' : '💰 الحسابات'} />

      {/* إجمالي الرصيد */}
      <div style={{
        background: totalBalance >= 0 ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.04))' : 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.04))',
        border: `1px solid ${totalBalance >= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
        borderRadius: 20, padding: '20px 22px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          {lang === 'en' ? 'Total Balance' : 'إجمالي الرصيد'}
        </div>
        <div style={{ fontSize: 36, fontWeight: 900, color: totalBalance >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
          {totalBalance >= 0 ? '+' : '-'}{fmt(Math.abs(totalBalance))}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{currency}</div>
      </div>

      {/* أزرار */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => setShowCreate(true)}
          style={{ flex: 1, padding: '12px', borderRadius: 14, background: '#3B7EF6', border: 'none', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
          + {lang === 'en' ? 'New Account' : 'حساب جديد'}
        </button>
        {accounts.length >= 2 && (
          <button onClick={() => setShowTransfer(true)}
            style={{ flex: 1, padding: '12px', borderRadius: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
            🔄 {lang === 'en' ? 'Transfer' : 'تحويل'}
          </button>
        )}
      </div>

      {/* قائمة الحسابات */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {accounts.map(acc => (
          <AccountCard key={acc.id} acc={acc} currency={currency} lang={lang}
            onEdit={a => setEditAccount(a)}
            onDelete={a => setConfirmDeleteId(a)}
          />
        ))}
      </div>

      {showCreate && (
        <AccountModal lang={lang} onSave={async d => { await createAccount(d as any) }} onClose={() => setShowCreate(false)} />
      )}

      {editAccount && (
        <AccountModal lang={lang} account={editAccount} onSave={async d => { await updateAccount(editAccount.id, d) }} onClose={() => setEditAccount(undefined)} />
      )}

      {showTransfer && accounts.length >= 2 && (
        <TransferModal accounts={accounts} lang={lang}
          onSave={async (f, t, a, d, n) => { await transferBetween(f, t, a, d, n) }}
          onClose={() => setShowTransfer(false)}
        />
      )}

      {confirmDeleteId && (
        <ConfirmArchiveDialog
          lang={lang}
          onConfirm={async () => { await deleteAccount(confirmDeleteId.id); setConfirmDeleteId(null) }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}
