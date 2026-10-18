// Mock must come before imports
const mockRpc = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({ rpc: mockRpc })),
}))

const mockUseUser = jest.fn((): { user: { id: string } | null; profile: null } => ({
  user: { id: 'user-1' },
  profile: null,
}))

jest.mock('@/lib/user-context', () => ({
  useUser: () => mockUseUser(),
}))

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useZakatHawl } from '../../hooks/useZakatHawl'

// A fresh QueryClient per test — react-query caches by ['zakat-hawl', userId],
// so a shared client would leak the first test's resolved data into later ones.
const makeWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useZakatHawl', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockUseUser.mockReturnValue({ user: { id: 'user-1' }, profile: null })
  })

  it('calls sync_zakat_haul_state with the current user id', async () => {
    mockRpc.mockResolvedValue({
      data: {
        nisab_reached_at: '2026-01-01T00:00:00Z',
        current_haul_due_at: '2026-12-20T00:00:00Z',
        days_remaining: 150,
        is_eligible: true,
        nisab_effective: 208.25,
        zakat_due: 125,
        zakatable_assets: 5000,
      },
      error: null,
    })

    const { result } = renderHook(() => useZakatHawl(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockRpc).toHaveBeenCalledWith('sync_zakat_haul_state', { p_user_id: 'user-1' })
    expect(result.current.data).toEqual({
      nisabReachedAt: '2026-01-01T00:00:00Z',
      currentHaulDueAt: '2026-12-20T00:00:00Z',
      daysRemaining: 150,
      zakatDue: 125,
      isEligible: true,
    })
  })

  it('maps a below-nisab response (null dates / null days_remaining)', async () => {
    mockRpc.mockResolvedValue({
      data: {
        nisab_reached_at: null,
        current_haul_due_at: null,
        days_remaining: null,
        is_eligible: false,
        nisab_effective: 208.25,
        zakat_due: 0,
        zakatable_assets: 50,
      },
      error: null,
    })

    const { result } = renderHook(() => useZakatHawl(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({
      nisabReachedAt: null,
      currentHaulDueAt: null,
      daysRemaining: null,
      zakatDue: 0,
      isEligible: false,
    })
  })

  it('coerces numeric strings from the RPC JSON to numbers', async () => {
    mockRpc.mockResolvedValue({
      data: {
        nisab_reached_at: '2026-01-01T00:00:00Z',
        current_haul_due_at: '2026-12-20T00:00:00Z',
        days_remaining: '7',
        is_eligible: true,
        zakat_due: '127.5',
      },
      error: null,
    })

    const { result } = renderHook(() => useZakatHawl(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.daysRemaining).toBe(7)
    expect(result.current.data?.zakatDue).toBe(127.5)
  })

  it('surfaces an RPC error instead of rendering stale state', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const { result } = renderHook(() => useZakatHawl(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })

  it('is disabled (RPC not called) when there is no user', async () => {
    mockUseUser.mockReturnValue({ user: null, profile: null })

    const { result } = renderHook(() => useZakatHawl(), { wrapper: makeWrapper() })

    await new Promise((r) => setTimeout(r, 50))
    expect(mockRpc).not.toHaveBeenCalled()
    expect(result.current.fetchStatus).toBe('idle')
  })
})
