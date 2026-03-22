'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { toast } from '@/components/ui/toast'
import { useI18n } from '@/lib/i18n'
import { clearUserCache } from '@/lib/cache'
import { fetchExchangeRate } from '@/lib/currency'
import type { Transaction } from '@/types'

const PAGE_SIZE = 20

export type TransactionFilter = 'all' | 'income' | 'expense'

export interface TransactionForm {
  type: string
  amount: string
  original_amount: string
  original_currency: string
  exchange_rate: string
  category: string
  description: string
  transaction_date: string
  is_recurring: boolean
  recurring_day: number
  recurring_auto: boolean
}

const DEFAULT_FORM: TransactionForm = {
  type: 'expense',
  amount: '',
  original_amount: '',
  original_currency: '', // سيتم تعبئتها من ملف المستخدم
  exchange_rate: '1',
  category: '',
  description: '',
  transaction_date: new Date().toISOString().split('T')[0],
  is_recurring: false,
  recurring_day: new Date().getDate(),
  recurring_auto: true,
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

  const { user: currentUser, profile } = useUser()
  const { t, lang } = useI18n()
  const supabase = createClient()

  // جلب سعر الصرف تلقائياً
  useEffect(() => {
    async function getRate() {
      if (!profile?.currency || !form.original_currency) return
      if (form.original_currency === profile.currency) {
        setForm(f => ({ ...f, exchange_rate: '1' }))
        return
      }
      const rate = await fetchExchangeRate(form.original_currency, profile.currency)
      if (rate) {
        setForm(f => ({ ...f, exchange_rate: rate.toString() }))
      }
    }
    getRate()
  }, [form.original_currency, profile?.currency])

  // تحديث المبلغ المعادل (Amount) تلقائياً
  useEffect(() => {
    const orig = parseFloat(form.original_amount.replace(",", ".")) || 0
    const rate = parseFloat(form.exchange_rate.replace(",", ".")) || 1
    const baseAmount = (orig * rate).toFixed(2)
    setForm(f => ({ ...f, amount: baseAmount }))
  }, [form.original_amount, form.exchange_rate])

  const load = useCallback(async () => {
    const user = currentUser
    if (!user) return
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)
    setTransactions((data as Transaction[]) ?? [])
    setLoading(false)
  }, [currentUser, supabase])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditingId(null)
    setForm({
      ...DEFAULT_FORM,
      original_currency: profile?.currency || 'JOD',
    })
    setShowForm(true)
  }

  function startEdit(tx: Transaction) {
    setEditingId(tx.id)
    setForm({
      type: tx.type,
      amount: tx.amount.toString(),
      original_amount: (tx.original_amount || tx.amount).toString(),
      original_currency: tx.original_currency || profile?.currency || 'JOD',
      exchange_rate: (tx.exchange_rate || 1).toString(),
      category: tx.category ?? '',
      description: tx.description ?? '',
      transaction_date: tx.transaction_date,
      is_recurring: tx.is_recurring ?? false,
      recurring_day: tx.recurring_day ?? new Date().getDate(),
      recurring_auto: tx.recurring_auto ?? true,
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
        type: form.type, 
        amount: parseFloat(form.amount.replace(",", ".")),
        original_amount: parseFloat(form.original_amount.replace(",", ".")),
        original_currency: form.original_currency,
        exchange_rate: parseFloat(form.exchange_rate.replace(",", ".")),
        category: form.category, description: form.description,
        transaction_date: form.transaction_date,
      }).eq('id', editingId)
      if (error) { toast.error(t('toast_error_save')); setSaving(false); return }
      toast.success(t('toast_edited'))
    } else {
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id, type: form.type, 
        amount: parseFloat(form.amount.replace(",", ".")),
        original_amount: parseFloat(form.original_amount.replace(",", ".")),
        original_currency: form.original_currency,
        exchange_rate: parseFloat(form.exchange_rate.replace(",", ".")),
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
      .order('created_at', { ascending: false })
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
