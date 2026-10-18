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

/**
 * Fresh Zakat haul (Hawl) state, driven by the `sync_zakat_haul_state` RPC
 * (migration 20261021000000). Calling the RPC both reads and advances the
 * user's haul clock, so this is safe to run on dashboard mount — it keeps the
 * `zakat_haul_tracking` row in sync rather than mutating on every read.
 */
export function useZakatHawl() {
  const { user } = useUser()
  const supabase = useMemo(() => createClient(), [])

  return useQuery({
    queryKey: ['zakat-hawl', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ZakatHawlState> => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase.rpc('sync_zakat_haul_state', {
        p_user_id: user.id,
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
