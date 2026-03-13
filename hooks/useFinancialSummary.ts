import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FinancialSummary {
  income: number
  expenses: number
  debtPayments: number
  net: number
  loading: boolean
}

export function useFinancialSummary(userId: string | undefined): FinancialSummary {
  const [summary, setSummary] = useState<FinancialSummary>({
    income: 0, expenses: 0, debtPayments: 0, net: 0, loading: true
  })
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return
    async function load() {
      const now = new Date()
      const firstDay = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
      const lastDay  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()}`

      const [txRes, debtRes] = await Promise.all([
        supabase.from('transactions').select('type, amount')
          .eq('user_id', userId)
          .gte('transaction_date', firstDay)
          .lte('transaction_date', lastDay),
        supabase.from('debts').select('monthly_payment')
          .eq('user_id', userId)
          .eq('is_paid', false)
      ])

      const income       = (txRes.data ?? []).filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
      const expenses     = (txRes.data ?? []).filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
      const debtPayments = (debtRes.data ?? []).reduce((a, d) => a + Number(d.monthly_payment), 0)
      const net          = income - expenses - debtPayments

      setSummary({ income, expenses, debtPayments, net, loading: false })
    }
    load()
  }, [userId])

  return summary
}
