/**
 * @jest-environment node
 */
import { sendPushToUser } from '@/lib/push-send'

// Mock Supabase admin client with proper chaining
const mockInsert = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockHead = jest.fn()

jest.mock('@/lib/supabase/admin', () => {
  const mockFrom = jest.fn((table: string) => {
    if (table === 'notification_history') {
      return {
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
            head: true,
          }),
        }),
        insert: mockInsert,
      }
    }
    return {
      insert: mockInsert,
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }
  })
  return {
    createAdminClient: jest.fn(() => ({
      from: mockFrom,
    })),
  }
})

describe('sendPushToUser — writes action_url to notification_history', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockSelect.mockResolvedValue({ data: null, error: null, count: 0 })
    mockEq.mockResolvedValue({ data: null, error: null, count: 0 })
  })

  it('includes action_url in notification_history data when url provided', async () => {
    await sendPushToUser(
      'user-123',
      'Test Title',
      'Test Message',
      '/dashboard/budgets',  // url
      'warning'              // tag
    )

    // Verify insert was called on notification_history
    expect(mockInsert).toHaveBeenCalled()
    
    // The insert should include the URL in the data field
    const insertCall = mockInsert.mock.calls.find(c => 
      c[0]?.data?.url === '/dashboard/budgets'
    )
    expect(insertCall).toBeDefined()
    expect(insertCall[0].data.url).toBe('/dashboard/budgets')
  })

  it('uses category default URL when no explicit url provided', async () => {
    await sendPushToUser(
      'user-123',
      'Test Title',
      'Test Message',
      undefined,  // no url
      'warning'   // tag -> BudgetAlert category -> default /dashboard/budgets
    )

    const insertCall = mockInsert.mock.calls.find(c => 
      c[0]?.data?.url === '/dashboard/budgets'
    )
    expect(insertCall).toBeDefined()
    expect(insertCall[0].data.url).toBe('/dashboard/budgets')
  })

  it('passes fingerprint to notification_history for deduplication', async () => {
    const customFingerprint = 'custom_fingerprint_123'
    await sendPushToUser(
      'user-123',
      'Test Title',
      'Test Message',
      '/dashboard/budgets',
      'warning',
      undefined,  // supabaseClient
      customFingerprint
    )

    const insertCall = mockInsert.mock.calls.find(c => 
      c[0]?.fingerprint === customFingerprint
    )
    expect(insertCall).toBeDefined()
    expect(insertCall[0].fingerprint).toBe(customFingerprint)
  })

  it('does not insert when fingerprint already exists (deduplication)', async () => {
    mockEq.mockResolvedValueOnce({ data: { id: 'existing' }, error: null, count: 1 })

    const result = await sendPushToUser(
      'user-123',
      'Test Title',
      'Test Message',
      '/dashboard/budgets',
      'warning'
    )

    // Should return 0 (duplicate) and not call insert
    expect(result).toBe(0)
    expect(mockInsert).not.toHaveBeenCalled()
  })
})