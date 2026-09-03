import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Account } from '@/types'

export function useAccounts(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()

  const queryKey = ['accounts', userId]

  const { data: accounts = [], isPending } = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async (): Promise<Account[]> => {
      if (!userId) return []

      // جلب الحسابات والأرصدة بالتوازي — نفس منطق Flutter (get_account_balances RPC)
      const [{ data }, { data: balances, error: balancesError }] = await Promise.all([
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', userId)
          .eq('is_archived', false)
          .order('is_default', { ascending: false })
          .order('created_at'),
        supabase.rpc('get_account_balances', { p_user_id: userId }),
      ])
      if (balancesError) console.error('[useAccounts] get_account_balances RPC failed:', balancesError.message)

      if (!data) return []

      const balanceMap: Record<string, number> = {}
      for (const b of (balances ?? [])) {
        balanceMap[b.account_id] = Number(b.current_balance)
      }

      return data.map(acc => ({
        ...acc,
        balance: balanceMap[acc.id] ?? Number(acc.opening_balance),
      }))
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'balance'>) => {
      if (!userId) return
      await supabase.from('accounts').insert({ ...data, user_id: userId })
    },
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Account> }) => {
      await supabase.from('accounts').update(data).eq('id', id)
    },
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('accounts').update({ is_archived: true }).eq('id', id)
    },
    onSuccess: invalidate,
  })

  const transferMutation = useMutation({
    mutationFn: async ({ fromId, toId, amount, date, note }: {
      fromId: string
      toId: string
      amount: number
      date: string
      note?: string
    }) => {
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
    },
    onSuccess: invalidate,
  })

  const totalBalance = accounts.reduce((a, acc) => a + (acc.balance ?? 0), 0)

  return {
    accounts,
    loading: isPending,
    totalBalance,
    fetchAccounts: () => queryClient.refetchQueries({ queryKey }),
    createAccount: createMutation.mutateAsync,
    updateAccount: (id: string, data: Partial<Account>) => updateMutation.mutateAsync({ id, data }),
    deleteAccount: (id: string) => deleteMutation.mutateAsync(id),
    transferBetween: (fromId: string, toId: string, amount: number, date: string, note?: string) =>
      transferMutation.mutateAsync({ fromId, toId, amount, date, note }),
  }
}
