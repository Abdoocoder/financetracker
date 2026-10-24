'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'

export interface UseZakatHawlOpts {
  goldPrice: number
  silverPrice: number
  fxRate: number
  enabled?: boolean
}

export function useZakatHawl({ goldPrice, silverPrice, fxRate, enabled = true }: UseZakatHawlOpts) {
  const { user } = useUser()
  const pricesValid =
    Number.isFinite(goldPrice) && goldPrice > 0 &&
    Number.isFinite(silverPrice) && silverPrice > 0 &&
    Number.isFinite(fxRate) && fxRate > 0
  return useQuery({
    queryKey: ['zakat-hawl', user?.id, goldPrice, silverPrice, fxRate],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('sync_zakat_haul_state', {
        p_user_id: user!.id, p_gold_price: goldPrice,
        p_silver_price: silverPrice, p_fx_rate: fxRate,
      })
      if (error) throw error

      const row = (data ?? {}) as Record<string, unknown>
      return {
        nisabReachedAt: (row.nisab_reached_at as string | null) ?? null,
        currentHaulDueAt: (row.current_haul_due_at as string | null) ?? null,
        daysRemaining:
          row.days_remaining == null ? null : Number(row.days_remaining),
        zakatDue: Number(row.zakat_due ?? 0),
        isEligible: Boolean(row.is_eligible),
      }
    },
    enabled: !!user && enabled && pricesValid,
    staleTime: 60_000,
  })
}