'use client'
import { SwipeRow } from '@/components/ui/swipe-row'
import type { Transaction } from '@/types'

interface Props {
  tx: Transaction
  deletingId: string | null
  onEdit: (tx: Transaction) => void
  onDelete: (id: string) => void
}

export function TransactionItem({ tx, deletingId, onEdit, onDelete }: Props) {
  return (
    <SwipeRow onDelete={() => onDelete(tx.id)} opacity={deletingId === tx.id ? 0.4 : 1}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, direction: 'rtl' }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: tx.type === 'income' ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)', border: `1px solid ${tx.type === 'income' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          {tx.type === 'income' ? '💰' : '💸'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tx.description || tx.category}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.category} · {tx.transaction_date}</div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 900, fontFamily: 'monospace', flexShrink: 0, color: tx.type === 'income' ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
          {tx.type === 'income' ? '+' : '−'}{Number(tx.amount).toFixed(0)}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => onEdit(tx)} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.2)', color: 'var(--accent-blue-light)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</button>
          <button onClick={() => onDelete(tx.id)} disabled={deletingId === tx.id} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-red-light)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      </div>
    </SwipeRow>
  )
}
