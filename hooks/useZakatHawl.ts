'use client'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'

export interface ZakatHawlState {
  /** null when below Nisab (no active haul clock) */
  nisabReachedAt: string | null
  currentHaulDueAt: string | null
  /** null when below Nisab; <= 0 when the haul is due or overdue */
  daysRemaining: number | null
  /** Zakat amount due this haul, in the user's local currency */
  zakatDue: number
  isEligible: boolean
}

export interface ZakatHawlPrices {
  /** Live gold price per gram in the user's local currency */
  goldPrice?: number
  /** Live silver price per gram in the user's local currency */
  silverPrice?: number
  /** USD → local currency rate */
  fxRate?: number
}

/**
 * Fresh Zakat haul (Hawl) state, driven by the `sync_zakat_haul_state` RPC
 * (migration 20261021000000). Calling the RPC both reads and advances the
 * user's haul clock. When `prices` are supplied they are passed to the RPC so
 * Nisab is evaluated against live market prices rather than the stale
 * defaults (gold 30 / silver 0.35 / fx 1.0), preventing a display read from
 * wrongly starting or clearing the hawl clock. Omit `prices` only when the
 * caller has no live quotes (the RPC defaults then apply).
 */
export function useZakatHawl(prices?: ZakatHawlPrices) {
  const { user } = useUser()
  const supabase = useMemo(() => createClient(), [])

  return useQuery({
    queryKey: ['zakat-hawl', user?.id, prices?.goldPrice, prices?.silverPrice, prices?.fxRate],
    enabled: !!user,
    queryFn: async (): Promise<ZakatHawlState> => {
      if (!user) throw new Error('User not authenticated')

      // تمرير الأسعار الحيّة فقط عند توفرها؛ وإلا تُبقي القيم الافتراضية في الـ RPC
      const priceParams: Record<string, number> = {}
      if (prices?.goldPrice != null) priceParams.p_gold_price = prices.goldPrice
      if (prices?.silverPrice != null) priceParams.p_silver_price = prices.silverPrice
      if (prices?.fxRate != null) priceParams.p_fx_rate = prices.fxRate

      const { data, error } = await supabase.rpc('sync_zakat_haul_state', {
        p_user_id: user.id,
        ...priceParams,
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
    // The haul clock moves on the order of days, not seconds — an hour of
    // freshness is plenty and avoids hammering the RPC on every navigation.
    staleTime: 60 * 60 * 1000,
  })
}
