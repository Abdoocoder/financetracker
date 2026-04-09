import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Account } from '@/types'

export function useAccounts(userId: string | undefined) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  async function fetchAccounts() {
    if (!userId) return

    // جلب الحسابات والأرصدة بالتوازي — نفس منطق Flutter (get_account_balances RPC)
    const [{ data }, { data: balances }] = await Promise.all([
      supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('is_default', { ascending: false })
        .order('created_at'),
      supabase.rpc('get_account_balances', { p_user_id: userId }),
    ])

    if (!data) { setLoading(false); return }

    const balanceMap: Record<string, number> = {}
    for (const b of (balances ?? [])) {
      balanceMap[b.account_id] = Number(b.current_balance)
    }

    const withBalance = data.map(acc => ({
      ...acc,
      balance: balanceMap[acc.id] ?? Number(acc.opening_balance),
    }))

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
