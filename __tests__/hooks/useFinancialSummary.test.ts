// Mock must come before imports
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}))

import { renderHook, waitFor, act } from '@testing-library/react'
import { useFinancialSummary } from '../../hooks/useFinancialSummary'

// Proxy chain: any method call returns the same proxy; when awaited resolves to `resolveWith`
function chainProxy(resolveWith: any) {
  const proxy: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return (resolve: any) => Promise.resolve(resolveWith).then(resolve)
        if (prop === 'catch') return (reject: any) => Promise.resolve(resolveWith).catch(reject)
        if (prop === 'finally') return (fn: any) => Promise.resolve(resolveWith).finally(fn)
        return () => proxy
      },
    }
  )
  return proxy
}

const txData = [
  { type: 'income',  amount: '1000' },
  { type: 'income',  amount: '500' },
  { type: 'expense', amount: '300' },
]

const debtData = [
  { monthly_payment: '200' },
]

describe('useFinancialSummary', () => {
  beforeEach(() => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'transactions') return chainProxy({ data: txData, error: null })
      return chainProxy({ data: debtData, error: null })
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
    mockFrom.mockImplementation(() => chainProxy({ data: null, error: null }))
    const { result } = renderHook(() => useFinancialSummary('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.income).toBe(0)
    expect(result.current.expenses).toBe(0)
    expect(result.current.debtPayments).toBe(0)
    expect(result.current.net).toBe(0)
  })

  it('handles empty arrays (all zeros)', async () => {
    mockFrom.mockImplementation(() => chainProxy({ data: [], error: null }))
    const { result } = renderHook(() => useFinancialSummary('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.income).toBe(0)
    expect(result.current.net).toBe(0)
  })

  it('handles multiple debt payments', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'transactions') return chainProxy({ data: [], error: null })
      return chainProxy({ data: [{ monthly_payment: '100' }, { monthly_payment: '150' }], error: null })
    })
    const { result } = renderHook(() => useFinancialSummary('user-2'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.debtPayments).toBe(250)
    expect(result.current.net).toBe(-250)
  })
})
