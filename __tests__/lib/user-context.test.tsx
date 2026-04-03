import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { createClient } from '../../lib/supabase/client'

// Pre-define the mock so we can control it and reuse it
const mockSupabase = {
  auth: {
    getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
}

// Mock the supabase client factory to return our pre-defined mock
jest.mock('../../lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase)
}))

// NOW import the provider
import { UserProvider, useUser } from '../../lib/user-context'

const TestComponent = () => {
  const { user, profile, loading } = useUser()
  if (loading) return <div>Loading...</div>
  return (
    <div>
      <span data-testid="user">{user?.email || 'Guest'}</span>
      <span data-testid="profile">{profile?.full_name || 'No Profile'}</span>
    </div>
  )
}

describe('UserProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show guest state when no user is logged in', async () => {
    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    expect(screen.getByTestId('user').textContent).toBe('Guest')
  })

  it('should load user and profile when authenticated', async () => {
    const mockUser = { id: 'u1', email: 'test@example.com' }
    const mockProfile = { id: 'u1', full_name: 'Test User' }

    ;(mockSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({ data: { user: mockUser }, error: null })
    ;(mockSupabase.single as jest.Mock).mockResolvedValueOnce({ data: mockProfile, error: null })

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@example.com')
      expect(screen.getByTestId('profile').textContent).toBe('Test User')
    })
  })

  it('should update state when onAuthStateChange fires', async () => {
    let stateChangeCallback: any
    ;(mockSupabase.auth.onAuthStateChange as jest.Mock).mockImplementationOnce((cb: any) => {
      stateChangeCallback = cb
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const newUser = { id: 'u2', email: 'new@example.com' }
    const newProfile = { id: 'u2', full_name: 'New User' }
    
    // Simulate auth state change
    await act(async () => {
      ;(mockSupabase.single as jest.Mock).mockResolvedValueOnce({ data: newProfile, error: null })
      stateChangeCallback('SIGNED_IN', { user: newUser })
    })

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('new@example.com')
      expect(screen.getByTestId('profile').textContent).toBe('New User')
    })
  })
})
