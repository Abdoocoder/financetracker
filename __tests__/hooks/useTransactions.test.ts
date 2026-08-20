// All mocks must come before imports
const mockFrom = jest.fn()
const mockGetUser = jest.fn()
const mockGetSession = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser, getSession: mockGetSession },
  })),
}))

const mockUser = { id: 'user-123', email: 'test@example.com' }
const mockProfile = { currency: 'KWD', full_name: 'Test User' }

jest.mock('@/lib/user-context', () => ({
  useUser: jest.fn(() => ({ user: mockUser, profile: mockProfile })),
}))

jest.mock('@/lib/i18n', () => ({
  useI18n: jest.fn(() => ({
    t: (key: string) => key,
    lang: 'ar',
  })),
}))

jest.mock('@/components/ui/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/lib/cache', () => ({
  clearUserCache: jest.fn(),
}))

jest.mock('@/lib/currency', () => ({
  fetchExchangeRate: jest.fn().mockResolvedValue(null),
}))

import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTransactions } from '../../hooks/useTransactions'
import { toast } from '@/components/ui/toast'
import { clearUserCache } from '@/lib/cache'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children)

beforeEach(() => {
  queryClient.clear()
})

// Proxy chain: supports any method chaining; resolves to `data` when awaited
function chainProxy(data: any) {
  const proxy: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return (resolve: any) => Promise.resolve(data).then(resolve)
        if (prop === 'catch') return (reject: any) => Promise.resolve(data).catch(reject)
        if (prop === 'finally') return (fn: any) => Promise.resolve(data).finally(fn)
        return () => proxy
      },
    }
  )
  return proxy
}

const mockTxData = [
  { id: 'tx1', type: 'income',  amount: 1000, category: 'salary',  description: 'راتب',    transaction_date: '2024-06-15', user_id: 'user-123' },
  { id: 'tx2', type: 'expense', amount: 200,  category: 'food',    description: 'طعام',    transaction_date: '2024-06-10', user_id: 'user-123' },
  { id: 'tx3', type: 'expense', amount: 50,   category: 'ديون',    description: 'قسط',     transaction_date: '2024-06-05', user_id: 'user-123' },
]

function setupMock(txData = mockTxData) {
  mockFrom.mockClear()
  mockFrom.mockImplementation(() => chainProxy({ data: txData, error: null }))
}

describe('useTransactions — initialization', () => {
  beforeEach(() => setupMock())

  it('starts with loading=true', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('starts with showForm=false', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    expect(result.current.showForm).toBe(false)
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('starts with empty errors', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    expect(result.current.errors).toEqual({})
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('starts with filter=all and empty search', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    expect(result.current.filter).toBe('all')
    expect(result.current.search).toBe('')
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('exposes current month and year', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    const now = new Date()
    expect(result.current.filterMonth).toBe(now.getMonth() + 1)
    expect(result.current.filterYear).toBe(now.getFullYear())
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('loads transactions after mount', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.transactions).toHaveLength(3)
  })
})

describe('useTransactions — form management', () => {
  beforeEach(() => setupMock())

  it('openAdd opens the form', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.openAdd())
    expect(result.current.showForm).toBe(true)
    expect(result.current.editingId).toBeNull()
  })

  it('closeForm closes the form and clears errors', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.openAdd())
    expect(result.current.showForm).toBe(true)
    act(() => result.current.closeForm())
    expect(result.current.showForm).toBe(false)
    expect(result.current.errors).toEqual({})
  })

  it('startEdit sets editingId and populates form', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    const tx = result.current.transactions[0]
    act(() => result.current.startEdit(tx as any))
    expect(result.current.editingId).toBe(tx.id)
    expect(result.current.showForm).toBe(true)
    expect(result.current.form.type).toBe(tx.type)
    expect(result.current.form.category).toBe(tx.category)
  })

  it('setForm updates form field', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setForm(f => ({ ...f, category: 'new-cat' })))
    expect(result.current.form.category).toBe('new-cat')
  })
})

describe('useTransactions — filtering and searching', () => {
  beforeEach(() => setupMock())

  it('setFilter changes the active filter', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setFilter('income'))
    expect(result.current.filter).toBe('income')
    expect(result.current.filtered.every(t => t.type === 'income')).toBe(true)
  })

  it('setFilter("expense") shows only expenses', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setFilter('expense'))
    expect(result.current.filtered.every(t => t.type === 'expense')).toBe(true)
  })

  it('setSearch filters by description', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setSearch('راتب'))
    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].id).toBe('tx1')
  })

  it('setSearch with empty string shows all', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setSearch('x'))
    act(() => result.current.setSearch(''))
    expect(result.current.filtered).toHaveLength(3)
  })

  it('setSearch filters by category', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setSearch('food'))
    expect(result.current.filtered[0].id).toBe('tx2')
  })

  it('setSearch filters by amount string', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setSearch('1000'))
    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].id).toBe('tx1')
  })

  it('setSearch is case-insensitive', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setSearch('FOOD'))
    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].category).toBe('food')
  })
})

describe('useTransactions — sorting', () => {
  beforeEach(() => setupMock())

  it('sorts by date desc by default', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    // Dates: tx1 (15th), tx2 (10th), tx3 (5th)
    expect(result.current.filtered[0].id).toBe('tx1')
    expect(result.current.filtered[1].id).toBe('tx2')
    expect(result.current.filtered[2].id).toBe('tx3')
  })

  it('sorts by date asc', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setSortOrder('asc'))
    expect(result.current.filtered[0].id).toBe('tx3')
    expect(result.current.filtered[1].id).toBe('tx2')
    expect(result.current.filtered[2].id).toBe('tx1')
  })

  it('sorts by amount desc', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setSortBy('amount'))
    act(() => result.current.setSortOrder('desc'))
    // Amounts: tx1 (1000), tx2 (200), tx3 (50)
    expect(result.current.filtered[0].id).toBe('tx1')
    expect(result.current.filtered[1].id).toBe('tx2')
    expect(result.current.filtered[2].id).toBe('tx3')
  })

  it('sorts by amount asc', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setSortBy('amount'))
    act(() => result.current.setSortOrder('asc'))
    expect(result.current.filtered[0].id).toBe('tx3')
    expect(result.current.filtered[1].id).toBe('tx2')
    expect(result.current.filtered[2].id).toBe('tx1')
  })
})

describe('useTransactions — computed totals', () => {
  beforeEach(() => setupMock())

  it('computes totalIncome', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.totalIncome).toBe(1000)
  })

  it('computes totalExpense', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.totalExpense).toBe(250)  // 200 + 50
  })

  it('computes totalDebtPayments for debt categories', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.totalDebtPayments).toBe(50)  // only 'ديون' category
  })

  it('computes totalRealExpense = totalExpense - totalDebtPayments', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.totalRealExpense).toBe(200)  // 250 - 50
  })

  it('computes net = income - expense', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.net).toBe(750)  // 1000 - 250
  })
})

describe('useTransactions — saveTransaction validation', () => {
  beforeEach(() => setupMock())

  it('sets errors when amount and category missing', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.openAdd())
    await act(async () => {
      await result.current.saveTransaction()
    })
    expect(result.current.errors.amount).toBeTruthy()
    expect(result.current.errors.category).toBeTruthy()
  })

  it('sets error when only category missing', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.openAdd())
    act(() => result.current.setForm(f => ({ ...f, amount: '100' })))
    await act(async () => {
      await result.current.saveTransaction()
    })
    expect(result.current.errors.category).toBeTruthy()
    expect(result.current.errors.amount).toBeFalsy()
  })
})

describe('useTransactions — deleteTransaction', () => {
  beforeEach(() => setupMock())

  it('removes transaction from local state', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.transactions).toHaveLength(3)

    await act(async () => {
      await result.current.deleteTransaction('tx1')
    })

    expect(result.current.transactions.find(t => t.id === 'tx1')).toBeUndefined()
    expect(clearUserCache).toHaveBeenCalledWith(mockUser.id)
    expect(toast.success).toHaveBeenCalled()
  })
})

describe('useTransactions — month/year navigation', () => {
  beforeEach(() => setupMock())

  it('setFilterMonth updates filterMonth', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setFilterMonth(3))
    expect(result.current.filterMonth).toBe(3)
    // Flush pending background load()
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })
  })

  it('setFilterYear updates filterYear', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setFilterYear(2023))
    expect(result.current.filterYear).toBe(2023)
    // Flush pending background load()
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })
  })
})

describe('useTransactions — currency logic', () => {
  beforeEach(() => {
    setupMock()
    jest.clearAllMocks()
  })

  it('updates exchange_rate when original_currency changes', async () => {
    const { fetchExchangeRate } = require('@/lib/currency')
    fetchExchangeRate.mockResolvedValue(3.1)
    
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      result.current.setForm(f => ({ ...f, original_currency: 'USD' }))
    })

    await waitFor(() => {
      expect(result.current.form.exchange_rate).toBe('3.1')
    })
  })

  it('sets exchange_rate to 1 when original_currency matches profile currency', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      // Profile currency is KWD in mock
      result.current.setForm(f => ({ ...f, original_currency: 'KWD' }))
    })

    await waitFor(() => {
      expect(result.current.form.exchange_rate).toBe('1')
    })
  })

  it('automatically updates amount based on original_amount and exchange_rate', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      result.current.setForm(f => ({ ...f, original_amount: '100', exchange_rate: '0.5' }))
    })

    await waitFor(() => {
      expect(result.current.form.amount).toBe('50.00')
    })
  })
})

describe('useTransactions — saveTransaction integration', () => {
  beforeEach(() => setupMock())

  it('calls supabase.insert on saveTransaction when not editing', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.openAdd()
      result.current.setForm(f => ({ 
        ...f, 
        amount: '500', 
        category: 'Salary', 
        original_amount: '500',
        original_currency: 'KWD'
      }))
    })

    await act(async () => {
      await result.current.saveTransaction()
    })

    expect(mockFrom).toHaveBeenCalledWith('transactions')
    expect(toast.success).toHaveBeenCalled()
    expect(result.current.showForm).toBe(false)
  })

  it('calls supabase.update on saveTransaction when editing', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const tx = mockTxData[0]
    act(() => {
      result.current.startEdit(tx as any)
      result.current.setForm(f => ({ ...f, amount: '1200' }))
    })

    await act(async () => {
      await result.current.saveTransaction()
    })

    expect(mockFrom).toHaveBeenCalledWith('transactions')
    expect(toast.success).toHaveBeenCalledWith('toast_edited')
  })
})

describe('useTransactions — monthToDateNet and advanced totals', () => {
  it('computes monthToDateNet correctly based on today', async () => {
    const today = new Date().toISOString().split('T')[0]
    const futureDate = '2099-01-01'
    
    const customData = [
      { type: 'income',  amount: 1000, transaction_date: today },
      { type: 'expense', amount: 200,  transaction_date: today },
      { type: 'income',  amount: 5000, transaction_date: futureDate }, // Should be ignored in MTD
    ]
    setupMock(customData as any)

    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    
    // MTD Net should be 1000 - 200 = 800
    expect(result.current.monthToDateNet).toBe(800)
    // Total Net includes future: 1000 - 200 + 5000 = 5800
    expect(result.current.net).toBe(5800)
  })
})

describe('useTransactions — pagination and export', () => {
  beforeEach(() => setupMock())

  it('loadMore updates page and appends transactions', async () => {
    // Provide 20 items so hasMore stays true
    const twentyItems = Array.from({ length: 20 }, (_, i) => ({
      id: `tx-init-${i}`, type: 'income', amount: 100, transaction_date: '2024-06-01'
    }))
    setupMock(twentyItems as any)

    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasMore).toBe(true)
    
    setupMock([{ id: 'tx-new', amount: 99, type: 'income', transaction_date: '2024-06-01', category: 'other', description: '', user_id: 'test-user' }])
    
    await act(async () => {
      await result.current.loadMore()
    })

    await waitFor(() => expect(result.current.loadingMore).toBe(false))
    expect(result.current.transactions).toHaveLength(21)
  })

  it('computes totalRealExpense correctly by excluding debt categories', async () => {
    const customData = [
      { type: 'expense', amount: 500, category: 'Food', transaction_date: '2024-06-01' },
      { type: 'expense', amount: 200, category: 'Debts', transaction_date: '2024-06-01' }, // Debt category
      { type: 'income',  amount: 1000, category: 'Salary', transaction_date: '2024-06-01' },
    ]
    setupMock(customData as any)

    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    
    expect(result.current.totalExpense).toBe(700)
    expect(result.current.totalDebtPayments).toBe(200)
    expect(result.current.totalRealExpense).toBe(500) // 700 - 200
  })

  it('exportCSV triggers a download', async () => {
    // Mock URL
    global.URL.createObjectURL = jest.fn(() => 'blob:abc')
    global.URL.revokeObjectURL = jest.fn()
    
    const mockClick = jest.fn()
    const mockA = { click: mockClick, setAttribute: jest.fn(), style: {}, href: '', download: '' }
    
    const realCreateElement = document.createElement
    const spy = jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') return mockA as any
      return realCreateElement.call(document, tagName)
    })

    const { result } = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.exportCSV()
    })

    expect(mockClick).toHaveBeenCalled()
    expect(mockA.download).toContain('.csv')
    
    spy.mockRestore()
  })
})
