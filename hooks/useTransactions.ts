'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { toast } from '@/components/ui/toast'
import { useI18n } from '@/lib/i18n'
import type { Transaction } from '@/types'

const PAGE_SIZE = 20

export type TransactionFilter = 'all' | 'income' | 'expense'

export interface TransactionForm {
  type: string
  amount: string
  category: string
  description: string
  transaction_date: string
}

const DEFAULT_FORM: TransactionForm = {
  type: 'expense',
  amount: '',
  category: '',
  description: '',
  transaction_date: new Date().toISOString().split('T')[0],
}

function clearUserCache(userId: string) {
  try {
    sessionStorage.removeItem(`dashboard_${userId}`)
    sessionStorage.removeItem(`tx_${userId}`)
    sessionStorage.removeItem(`debts_${userId}`)
    sessionStorage.removeItem(`goals_${userId}`)
    sessionStorage.removeItem(`inv_${userId}`)
  } catch {}
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TransactionForm>(DEFAULT_FORM)
  const [filter, setFilter] = useState<TransactionFilter>('all')
  const [search, setSearch] = useState('')
  const now = new Date()
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1)
  const [filterYear, setFilterYear] = useState(now.getFullYear())
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { user: currentUser } = useUser()
  const { t, lang } = useI18n()
  const supabase = createClient()

  const load = useCallback(async () => {
    const user = currentUser
    if (!user) return
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .limit(100)
    setTransactions((data as Transaction[]) ?? [])
    setLoading(false)
  }, [currentUser, supabase])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setShowForm(true)
  }

  function startEdit(tx: Transaction) {
    setEditingId(tx.id)
    setForm({
      type: tx.type,
      amount: tx.amount.toString(),
      category: tx.category ?? '',
      description: tx.description ?? '',
      transaction_date: tx.transaction_date,
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setErrors({})
  }

  async function saveTransaction() {
    const errs: Record<string, string> = {}
    if (!form.amount) errs.amount = lang === 'en' ? 'Amount required' : 'المبلغ مطلوب'
    if (!form.category) errs.category = lang === 'en' ? 'Category required' : 'الفئة مطلوبة'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSaving(true)
    const user = currentUser
    if (!user) return
    if (editingId) {
      const { error } = await supabase.from('transactions').update({
        type: form.type, amount: parseFloat(form.amount),
        category: form.category, description: form.description,
        transaction_date: form.transaction_date,
      }).eq('id', editingId)
      if (error) { toast.error(t('toast_error_save')); setSaving(false); return }
      toast.success(t('toast_edited'))
    } else {
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id, type: form.type, amount: parseFloat(form.amount),
        category: form.category, description: form.description,
        transaction_date: form.transaction_date,
      })
      if (error) { toast.error(t('toast_error_save')); setSaving(false); return }
      toast.success(form.type === 'income' ? t('toast_income_added') : t('toast_expense_added'))
    }
    clearUserCache(user.id)
    closeForm()
    setSaving(false)
    load()
  }

  async function loadMore() {
    const user = currentUser
    if (!user || loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    const firstDay = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`
    const lastDay = new Date(filterYear, filterMonth, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('transactions').select('*')
      .eq('user_id', user.id)
      .gte('transaction_date', firstDay).lte('transaction_date', lastDay)
      .order('transaction_date', { ascending: false })
      .range(nextPage * PAGE_SIZE, (nextPage + 1) * PAGE_SIZE - 1)
    const result = (data as Transaction[]) ?? []
    setTransactions(prev => [...prev, ...result])
    setPage(nextPage)
    setHasMore(result.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  async function deleteTransaction(id: string) {
    const user = currentUser
    setDeletingId(id)
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
    if (user) clearUserCache(user.id)
    toast.success(t('toast_deleted'))
    setDeletingId(null)
  }

  function exportCSV() {
    const rows = [
      lang === 'en'
        ? ['Date', 'Type', 'Category', 'Description', 'Amount']
        : ['التاريخ', 'النوع', 'الفئة', 'الوصف', 'المبلغ'],
      ...transactions.map(tx => [
        tx.transaction_date,
        tx.type === 'income' ? (lang === 'en' ? 'Income' : 'دخل') : (lang === 'en' ? 'Expense' : 'مصروف'),
        tx.category, tx.description ?? '', tx.amount,
      ]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `معاملات-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const searched = search.trim()
    ? transactions.filter(t =>
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.category?.toLowerCase().includes(search.toLowerCase()) ||
        String(t.amount).includes(search))
    : transactions

  const filtered = searched.filter(tx => filter === 'all' || tx.type === filter)
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
  const net = totalIncome - totalExpense

  return {
    transactions, filtered, loading, saving, deletingId,
    totalIncome, totalExpense, net,
    hasMore, loadingMore, loadMore,
    showForm, form, setForm, editingId, errors,
    openAdd, startEdit, closeForm, saveTransaction,
    filter, setFilter, search, setSearch,
    filterMonth, setFilterMonth, filterYear, setFilterYear,
    deleteTransaction, exportCSV, load,
    confirmDelete, setConfirmDelete,
  }
}
