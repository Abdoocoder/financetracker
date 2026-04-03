// Mock must come before imports
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}))

import { renderHook, waitFor, act } from '@testing-library/react'
import { useAccounts } from '../../hooks/useAccounts'

// Proxy chain: supports infinite chaining; when awaited resolves to `resolveWith`
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

const mockAccounts = [
  {
    id: 'acc1',
    user_id: 'user1',
    name: 'الحساب الجاري',
    opening_balance: '1000',
    is_default: true,
    is_archived: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'acc2',
    user_id: 'user1',
    name: 'التوفير',
    opening_balance: '500',
    is_default: false,
    is_archived: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
]

const mockTxs = [
  { account_id: 'acc1', transfer_to_account_id: null, type: 'income',  amount: '200' },
  { account_id: 'acc1', transfer_to_account_id: null, type: 'expense', amount: '50'  },
  { account_id: 'acc1', transfer_to_account_id: 'acc2', type: 'transfer', amount: '100' },
  { account_id: 'acc2', transfer_to_account_id: null,  type: 'income',  amount: '300' },
  { account_id: null,   transfer_to_account_id: 'acc2', type: 'transfer', amount: '100' },
]

function setupMock(accountData = mockAccounts, txData = mockTxs) {
  mockFrom.mockClear()
  mockFrom.mockImplementation((table: string) => {
    if (table === 'accounts') return chainProxy({ data: accountData, error: null })
    if (table === 'transactions') return chainProxy({ data: txData, error: null })
    return chainProxy({ data: null, error: null })
  })
}

describe('useAccounts', () => {
  beforeEach(() => {
    setupMock()
  })

  it('starts with loading=true and empty accounts', () => {
    const { result } = renderHook(() => useAccounts('user1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.accounts).toEqual([])
  })

  it('keeps loading=true and empty state when userId is undefined', () => {
    const { result } = renderHook(() => useAccounts(undefined))
    expect(result.current.loading).toBe(true)
    expect(result.current.accounts).toEqual([])
    expect(result.current.totalBalance).toBe(0)
  })

  it('loads accounts and computes balances', async () => {
    const { result } = renderHook(() => useAccounts('user1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.accounts).toHaveLength(2)
  })

  it('computes balance for acc1 correctly', async () => {
    const { result } = renderHook(() => useAccounts('user1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const acc1 = result.current.accounts.find(a => a.id === 'acc1')!
    // opening=1000, income=200, expense=50, xferOut=100, xferIn=0
    // balance = 1000 + 200 - 50 + 0 - 100 = 1050
    expect(acc1.balance).toBe(1050)
  })

  it('computes balance for acc2 correctly', async () => {
    const { result } = renderHook(() => useAccounts('user1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const acc2 = result.current.accounts.find(a => a.id === 'acc2')!
    // opening=500, income=300, expense=0, xferIn (from acc1)=100 + (from null)=100 = 200, xferOut=0
    // balance = 500 + 300 - 0 + 200 - 0 = 1000
    expect(acc2.balance).toBe(1000)
  })

  it('computes totalBalance', async () => {
    const { result } = renderHook(() => useAccounts('user1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.totalBalance).toBe(2050)  // 1050 + 1000
  })

  it('handles null accounts data', async () => {
    mockFrom.mockImplementation(() => chainProxy({ data: null, error: null }))
    const { result } = renderHook(() => useAccounts('user1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.accounts).toEqual([])
  })

  it('createAccount inserts and refetches', async () => {
    const { result } = renderHook(() => useAccounts('user1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    mockFrom.mockClear()
    await act(async () => {
      await result.current.createAccount({
        name: 'New Account',
        opening_balance: 0,
        currency: 'KWD',
        type: 'checking',
        is_default: false,
        is_archived: false,
      } as any)
    })
    expect(mockFrom).toHaveBeenCalledWith('accounts')
  })

  it('createAccount does nothing when userId is undefined', async () => {
    const { result } = renderHook(() => useAccounts(undefined))
    mockFrom.mockClear()
    await act(async () => {
      await result.current.createAccount({ name: 'X', opening_balance: 0 } as any)
    })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('updateAccount calls update and refetches', async () => {
    const { result } = renderHook(() => useAccounts('user1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    mockFrom.mockClear()
    await act(async () => {
      await result.current.updateAccount('acc1', { name: 'Updated' })
    })
    expect(mockFrom).toHaveBeenCalledWith('accounts')
  })

  it('deleteAccount soft-deletes and refetches', async () => {
    const { result } = renderHook(() => useAccounts('user1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    mockFrom.mockClear()
    await act(async () => {
      await result.current.deleteAccount('acc1')
    })
    expect(mockFrom).toHaveBeenCalledWith('accounts')
  })

  it('transferBetween inserts a transfer transaction', async () => {
    const { result } = renderHook(() => useAccounts('user1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    mockFrom.mockClear()
    await act(async () => {
      await result.current.transferBetween('acc1', 'acc2', 50, '2024-06-01', 'Test transfer')
    })
    expect(mockFrom).toHaveBeenCalledWith('transactions')
  })

  it('transferBetween does nothing when userId is undefined', async () => {
    const { result } = renderHook(() => useAccounts(undefined))
    mockFrom.mockClear()
    await act(async () => {
      await result.current.transferBetween('acc1', 'acc2', 50, '2024-06-01')
    })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('transferBetween works without optional note', async () => {
    const { result } = renderHook(() => useAccounts('user1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    mockFrom.mockClear()
    await act(async () => {
      await result.current.transferBetween('acc1', 'acc2', 100, '2024-06-01')
    })
    expect(mockFrom).toHaveBeenCalledWith('transactions')
  })

  it('exposes fetchAccounts function', async () => {
    const { result } = renderHook(() => useAccounts('user1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(typeof result.current.fetchAccounts).toBe('function')
    mockFrom.mockClear()
    await act(async () => {
      await result.current.fetchAccounts()
    })
    expect(mockFrom).toHaveBeenCalled()
  })
})
