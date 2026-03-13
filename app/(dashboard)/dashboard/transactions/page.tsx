'use client'
export const dynamic = 'force-dynamic'

import { PageHeader }             from '@/components/ui/page-header'
import { AddButton }              from '@/components/ui/add-button'
import { StatBar }                from '@/components/ui/stat-bar'
import { EmptyState }             from '@/components/ui/empty-state'
import { ConfirmDialog }          from '@/components/ui/confirm-dialog'
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh'
import { usePullToRefresh }       from '@/lib/use-pull-to-refresh'
import { useI18n }                from '@/lib/i18n'
import { useTransactions }        from '@/hooks/useTransactions'
import { TransactionItem }        from '@/components/transactions/TransactionItem'
import { TransactionFilters }     from '@/components/transactions/TransactionFilters'
import { TransactionFormModal }   from '@/components/transactions/TransactionFormModal'

export default function TransactionsPage() {
  const { t, lang } = useI18n()
  const tx = useTransactions()
  const { el: pageRef, refreshing } = usePullToRefresh(async () => { await tx.load() })

  if (tx.loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[0,1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 16 }} />)}
    </div>
  )

  return (
    <div className="animate-fade-in" ref={pageRef}>
      <PullToRefreshIndicator refreshing={refreshing} />
      <PageHeader
        title={t('trans_title')}
        subtitle={`${tx.transactions.length} ${lang === 'en' ? 'transactions' : 'معاملة'}`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={tx.exportCSV} style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              📥 CSV
            </button>
            <AddButton label={`+ ${lang === 'en' ? 'Add' : 'إضافة'}`} onClick={tx.openAdd} />
          </div>
        }
      />
      <StatBar stats={[
        { label: t('dash_income'),   value: `${tx.totalIncome.toFixed(0)}+`,  color: 'var(--accent-green-light)' },
        { label: t('dash_expenses'), value: `${tx.totalExpense.toFixed(0)}`,  color: 'var(--accent-red-light)'   },
        { label: t('dash_net'),      value: `${tx.net >= 0 ? '+' : ''}${tx.net.toFixed(0)}`, color: tx.net >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' },
      ]} />
      <TransactionFilters
        search={tx.search}
        onSearchChange={tx.setSearch}
        filter={tx.filter}
        onFilterChange={tx.setFilter}
      />
      {tx.filtered.length === 0 ? (
        <EmptyState icon="💸" title={t('trans_empty')} action={<AddButton label={`+ ${t('trans_add')}`} onClick={tx.openAdd} />} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tx.filtered.map(item => (
            <TransactionItem key={item.id} tx={item} deletingId={tx.deletingId} onEdit={tx.startEdit} onDelete={(id) => tx.setConfirmDelete(id)} />
          ))}
        </div>
      )}
      {tx.hasMore && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <button onClick={tx.loadMore} disabled={tx.loadingMore} style={{ padding: '12px 32px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, cursor: tx.loadingMore ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: tx.loadingMore ? 0.6 : 1 }}>
            {tx.loadingMore ? '⏳ ...' : `${lang === 'en' ? 'Load More' : 'تحميل المزيد'} ↓`}
          </button>
        </div>
      )}
      {tx.confirmDelete && (
        <ConfirmDialog
          title={lang === 'en' ? 'Delete Transaction' : 'حذف المعاملة'}
          message={lang === 'en' ? 'Are you sure? This cannot be undone.' : 'هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.'}
          onConfirm={() => { tx.deleteTransaction(tx.confirmDelete!); tx.setConfirmDelete(null) }}
          onCancel={() => tx.setConfirmDelete(null)}
        />
      )}
      {tx.showForm && (
        <TransactionFormModal
          editingId={tx.editingId}
          form={tx.form}
          saving={tx.saving}
          onClose={tx.closeForm}
          onSave={tx.saveTransaction}
          onChange={(updates) => tx.setForm(prev => ({ ...prev, ...updates }))}
        />
      )}
    </div>
  )
}
