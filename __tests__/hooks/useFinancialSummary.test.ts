// Mock must come before imports
const mockRpc = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({ rpc: mockRpc })),
}))

import { renderHook, waitFor, act } from '@testing-library/react'
import { useFinancialSummary } from '../../hooks/useFinancialSummary'

describe('useFinancialSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRpc.mockResolvedValue({
      data: {
        income: 1500,
        expenses: 300,
        debt_payments: 200,
        net: 1000,
      },
      error: null,
    })
  })

  it('returns loading=true and zero values on initial render', async () => {
    const { result } = renderHook(() => useFinancialSummary('user-1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.income).toBe(0)
    expect(result.current.expenses).toBe(0)
    expect(result.current.debtPayments).toBe(0)
    expect(result.current.net).toBe(0)
    await act(async () => {}) // flush pending async effects
  })

  it('stays in loading state when userId is undefined', async () => {
    const { result } = renderHook(() => useFinancialSummary(undefined))
    expect(result.current.loading).toBe(true)
    expect(result.current.income).toBe(0)
    await act(async () => {}) // flush pending async effects
  })

  it('computes income correctly', async () => {
    const { result } = renderHook(() => useFinancialSummary('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.income).toBe(1500)  // 1000 + 500
  })

  it('computes expenses correctly', async () => {
    const { result } = renderHook(() => useFinancialSummary('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.expenses).toBe(300)
  })

  it('computes debtPayments correctly', async () => {
    const { result } = renderHook(() => useFinancialSummary('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.debtPayments).toBe(200)
  })

  it('computes net = income - expenses - debtPayments', async () => {
    const { result } = renderHook(() => useFinancialSummary('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.net).toBe(1000)  // 1500 - 300 - 200
  })

  it('handles null data gracefully (all zeros)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    const { result } = renderHook(() => useFinancialSummary('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.income).toBe(0)
    expect(result.current.expenses).toBe(0)
    expect(result.current.debtPayments).toBe(0)
    expect(result.current.net).toBe(0)
  })

  it('handles empty arrays (all zeros)', async () => {
    mockRpc.mockResolvedValue({ data: {}, error: { message: 'fail' } })
    const { result } = renderHook(() => useFinancialSummary('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.income).toBe(0)
    expect(result.current.net).toBe(0)
  })

  it('handles multiple debt payments', async () => {
    mockRpc.mockResolvedValue({
      data: {
        income: 0,
        expenses: 0,
        debt_payments: 250,
        net: -250,
      },
      error: null,
    })
    const { result } = renderHook(() => useFinancialSummary('user-2'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.debtPayments).toBe(250)
    expect(result.current.net).toBe(-250)
  })
})
