import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import OnboardingPage from '../../app/(auth)/onboarding/page'
import { I18nProvider } from '../../lib/i18n'

// Mock Next.js router
const mockPush = jest.fn()
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

const mockUser = { id: 'test-user-id', email: 'test@example.com', user_metadata: { full_name: 'Test User' } }
const mockUpsert = jest.fn(() => Promise.resolve({ error: null }))
const mockUpdate = jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) }))
const mockInsert = jest.fn(() => Promise.resolve({ error: null }))

// Chain proxy for Supabase matching
function chainProxy(data: any = null, error: any = null) {
  const proxy: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return (resolve: any) => Promise.resolve({ data, error }).then(resolve)
        if (prop === 'catch') return (reject: any) => Promise.reject(error).catch(reject)
        if (prop === 'single') return () => Promise.resolve({ data, error })
        return () => proxy
      },
    }
  )
  return proxy
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: mockUser }, error: null })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: { access_token: 'token' } }, error: null })),
    },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          upsert: mockUpsert,
          update: mockUpdate,
          select: () => chainProxy(null, null)
        }
      }
      if (table === 'transactions') {
        return {
          insert: mockInsert,
          delete: () => chainProxy(null, null),
          ...chainProxy(null, null)
        }
      }
      return chainProxy(null, null)
    },
  }),
}))

// Mock detectCurrency
jest.mock('@/lib/detectCurrency', () => ({
  detectCurrency: () => ({ currency: 'JOD', countryName: 'Jordan', confidence: 'high' }),
}))

// Mock CurrencyButton to avoid complex UI testing
jest.mock('@/components/ui/currency-picker', () => ({
  CurrencyButton: ({ value, onChange }: any) => (
    <select data-testid="currency-btn" value={value} onChange={e => onChange(e.target.value)}>
      <option value="JOD">JOD</option>
      <option value="USD">USD</option>
    </select>
  ),
}))

jest.setTimeout(15000)

describe('Onboarding integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  it('completes the full onboarding flow', async () => {
    await act(async () => {
      render(
        <I18nProvider>
          <OnboardingPage />
        </I18nProvider>
      )
    })

    // Step 1: Profile
    await waitFor(() => expect(screen.getByPlaceholderText(/full name/i)).toBeInTheDocument())
    
    fireEvent.change(screen.getByPlaceholderText(/full name/i), { target: { value: 'Abdoor' } })
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '1000' } })
    
    const nextBtn = screen.getByRole('button', { name: /next/i })
    fireEvent.click(nextBtn)

    await waitFor(() => expect(mockUpsert).toHaveBeenCalled())
    
    // Step 2: First Transaction
    await waitFor(() => expect(screen.getByText(/first transaction/i)).toBeInTheDocument())
    
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '50' } })
    // Category select
    const categorySelect = screen.getByRole('combobox')
    fireEvent.change(categorySelect, { target: { value: 'طعام' } })
    
    const saveBtn = screen.getByRole('button', { name: /save & continue/i })
    fireEvent.click(saveBtn)

    await waitFor(() => expect(mockInsert).toHaveBeenCalled())

    // Step 3: Welcome
    await waitFor(() => expect(screen.getByText(/welcome/i)).toBeInTheDocument())
    
    const startBtn = screen.getByRole('button', { name: /start your journey/i })
    fireEvent.click(startBtn)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('allows skipping the first transaction', async () => {
    await act(async () => {
      render(
        <I18nProvider>
          <OnboardingPage />
        </I18nProvider>
      )
    })

    // Step 1 -> Next
    await waitFor(() => fireEvent.change(screen.getByPlaceholderText(/full name/i), { target: { value: 'Abdoor' } }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    // Step 2 -> Skip
    await waitFor(() => screen.getByText(/skip/i))
    fireEvent.click(screen.getByText(/skip/i))

    // Should reach Step 3
    await waitFor(() => expect(screen.getByText(/welcome/i)).toBeInTheDocument())
  })
})
