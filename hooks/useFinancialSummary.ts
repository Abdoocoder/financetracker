import { useState, useEffect, useMemo } from 'react'
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
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!userId) {
      setSummary({ income: 0, expenses: 0, debtPayments: 0, net: 0, loading: true })
      return
    }
    async function load() {
      const now = new Date()
      const { data, error } = await supabase.rpc('get_monthly_financial_summary', {
        p_user_id: userId,
        p_year: now.getFullYear(),
        p_month: now.getMonth() + 1,
      })

      if (error || !data) {
        setSummary({ income: 0, expenses: 0, debtPayments: 0, net: 0, loading: false })
        return
      }

      setSummary({
        income: Number(data.income ?? 0),
        expenses: Number(data.expenses ?? 0),
        debtPayments: Number(data.debt_payments ?? 0),
        net: Number(data.net ?? 0),
        loading: false,
      })
    }
    load()
  }, [userId, supabase])

  return summary
}
