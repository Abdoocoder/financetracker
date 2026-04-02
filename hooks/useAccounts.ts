import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Account } from '@/types'

export function useAccounts(userId: string | undefined) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  async function fetchAccounts() {
    if (!userId) return
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('is_default', { ascending: false })
      .order('created_at')

    if (!data) { setLoading(false); return }

    // حساب الرصيد لكل حساب
    const { data: txs } = await supabase
      .from('transactions')
      .select('account_id, transfer_to_account_id, type, amount')
      .eq('user_id', userId)

    const withBalance = data.map(acc => {
      const income   = (txs ?? []).filter(t => t.account_id === acc.id && t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
      const expense  = (txs ?? []).filter(t => t.account_id === acc.id && t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
      const xferIn   = (txs ?? []).filter(t => t.transfer_to_account_id === acc.id && t.type === 'transfer').reduce((a, t) => a + Number(t.amount), 0)
      const xferOut  = (txs ?? []).filter(t => t.account_id === acc.id && t.type === 'transfer').reduce((a, t) => a + Number(t.amount), 0)
      return { ...acc, balance: Number(acc.opening_balance) + income - expense + xferIn - xferOut }
    })

    setAccounts(withBalance)
    setLoading(false)
  }

  useEffect(() => { fetchAccounts() }, [userId])

  async function createAccount(data: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'balance'>) {
    if (!userId) return
    await supabase.from('accounts').insert({ ...data, user_id: userId })
    await fetchAccounts()
  }

  async function updateAccount(id: string, data: Partial<Account>) {
    await supabase.from('accounts').update(data).eq('id', id)
    await fetchAccounts()
  }

  async function deleteAccount(id: string) {
    await supabase.from('accounts').update({ is_archived: true }).eq('id', id)
    await fetchAccounts()
  }

  async function transferBetween(fromId: string, toId: string, amount: number, date: string, note?: string) {
    if (!userId) return
    const pairId = crypto.randomUUID()
    await supabase.from('transactions').insert([
      {
        user_id: userId,
        type: 'transfer',
        amount,
        category: 'تحويل',
        description: note ?? 'تحويل بين الحسابات',
        transaction_date: date,
        account_id: fromId,
        transfer_to_account_id: toId,
        transfer_pair_id: pairId,
        is_recurring: false,
      },
    ])
    await fetchAccounts()
  }

  const totalBalance = accounts.reduce((a, acc) => a + (acc.balance ?? 0), 0)

  return { accounts, loading, totalBalance, fetchAccounts, createAccount, updateAccount, deleteAccount, transferBetween }
}
