'use client'
import { useI18n } from '@/lib/i18n'
import type { TransactionFilter } from '@/hooks/useTransactions'

interface Props {
  search: string
  onSearchChange: (v: string) => void
  filter: TransactionFilter
  onFilterChange: (f: TransactionFilter) => void
}

export function TransactionFilters({ search, onSearchChange, filter, onFilterChange }: Props) {
  const { lang } = useI18n()
  return (
    <>
      <div style={{ padding: '0 0 12px', position: 'relative' }}>
        <input type="text" value={search} onChange={e => onSearchChange(e.target.value)}
          placeholder={lang === 'ar' ? '🔍 ابحث عن معاملة...' : '🔍 Search transactions...'}
          style={{ width: '100%', padding: '11px 14px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        {search && (
          <button onClick={() => onSearchChange('')} style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: 0 }}>✕</button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all', 'income', 'expense'] as const).map(f => (
          <button key={f} onClick={() => onFilterChange(f)} style={{ flex: 1, padding: '9px 4px', borderRadius: 12, background: filter === f ? 'var(--accent-blue)' : 'var(--bg-card)', color: filter === f ? 'white' : 'var(--text-muted)', border: `1px solid ${filter === f ? 'transparent' : 'var(--border)'}`, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {f === 'all' ? (lang === 'en' ? 'All' : 'الكل') : f === 'income' ? `💰 ${lang === 'en' ? 'Income' : 'دخل'}` : `💸 ${lang === 'en' ? 'Expense' : 'مصروف'}`}
          </button>
        ))}
      </div>
    </>
  )
}
