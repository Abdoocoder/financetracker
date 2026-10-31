import { NextRequest } from 'next/server'
import { POST } from '@/app/api/webhooks/clerk/route'

// Mock dependencies
jest.mock('svix', () => ({
  Webhook: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

import { Webhook } from 'svix'
import { createAdminClient } from '@/lib/supabase/admin'

const MockWebhook = Webhook as jest.MockedClass<typeof Webhook>
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

describe('POST /api/webhooks/clerk', () => {
  const webhookSecret = 'whsec_test_secret_12345678901234567890123456789012'
  const clerkUserId = 'user_2abc123def456'
  const testEmail = 'test@example.com'
  const testFirstName = 'Ahmed'
  const testLastName = 'Al-Rashid'

  const userCreatedPayload = {
    type: 'user.created',
    data: {
      id: clerkUserId,
      email_addresses: [
        {
          id: 'email_123',
          email_address: testEmail,
          verification: { status: 'verified', strategy: 'email_code' },
        },
      ],
      first_name: testFirstName,
      last_name: testLastName,
      username: 'ahmed_rashid',
      image_url: 'https://img.clerk.com/...',
      created_at: Date.now(),
      updated_at: Date.now(),
    },
  }

  let mockVerify: jest.Mock
  let mockSupabaseUpsert: jest.Mock
  let mockSupabaseFrom: jest.Mock
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CLERK_WEBHOOK_SECRET = webhookSecret

    // Mock Webhook instance verify method
    mockVerify = jest.fn().mockReturnValue(userCreatedPayload)
    MockWebhook.mockImplementation(() => ({
      verify: mockVerify,
    } as any))

    // Mock Supabase
    mockSupabaseUpsert = jest.fn().mockResolvedValue({ error: null })
    mockSupabaseFrom = jest.fn(() => ({
      upsert: mockSupabaseUpsert,
    }))
    mockSupabase = {
      from: mockSupabaseFrom,
    }
    mockCreateAdminClient.mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    delete process.env.CLERK_WEBHOOK_SECRET
  })

  function createRequest(body: object, headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'svix-id': 'msg_test',
        'svix-timestamp': String(Math.floor(Date.now() / 1000)),
        'svix-signature': 'v1,g0h1i2j3k4l5m6n7o8p9',
        'content-type': 'application/json',
        ...headers,
      },
    })
  }

  it('returns 200 and creates profile for user.created event', async () => {
    const request = createRequest(userCreatedPayload)

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ ok: true })

    // Verify Webhook was instantiated with secret
    expect(MockWebhook).toHaveBeenCalledWith(webhookSecret)

    // Verify signature verification was called
    expect(mockVerify).toHaveBeenCalled()

    // Verify admin client was created
    expect(mockCreateAdminClient).toHaveBeenCalled()

    // Verify profile upsert was called with correct data
    expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles')
    expect(mockSupabaseUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: clerkUserId,
        email: testEmail,
        full_name: 'Ahmed Al-Rashid',
        currency: 'KWD',
        lang: 'ar',
        onboarding_done: false,
      }),
      { onConflict: 'id', ignoreDuplicates: true }
    )
  })

  it('returns 400 when signature verification fails', async () => {
    // Mock verify to throw
    mockVerify.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const request = createRequest(userCreatedPayload)
    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({ error: 'Invalid signature' })

    // Supabase should not be called
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('returns 500 when CLERK_WEBHOOK_SECRET is not configured', async () => {
    delete process.env.CLERK_WEBHOOK_SECRET

    const request = createRequest(userCreatedPayload)
    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json).toEqual({ error: 'Webhook secret not configured' })

    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('returns 400 when user has no email address', async () => {
    const payloadNoEmail = {
      ...userCreatedPayload,
      data: {
        ...userCreatedPayload.data,
        email_addresses: [],
      },
    }

    // Update mock to return the no-email payload
    mockVerify.mockReturnValue(payloadNoEmail)

    const request = createRequest(payloadNoEmail)
    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({ error: 'User has no email address' })

    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('returns 500 when profile upsert fails', async () => {
    mockSupabaseUpsert.mockResolvedValue({
      error: { message: 'duplicate key', code: '23505' },
    })

    const request = createRequest(userCreatedPayload)
    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json).toEqual({ error: 'Failed to create profile' })
  })

  it('handles user with only first name (no last name)', async () => {
    const payloadFirstNameOnly = {
      ...userCreatedPayload,
      data: {
        ...userCreatedPayload.data,
        first_name: 'Fatima',
        last_name: null,
      },
    }
    mockVerify.mockReturnValue(payloadFirstNameOnly)

    const request = createRequest(payloadFirstNameOnly)
    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ ok: true })

    expect(mockSupabaseUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'Fatima',
      }),
      { onConflict: 'id', ignoreDuplicates: true }
    )
  })

  it('handles user with only last name (no first name)', async () => {
    const payloadLastNameOnly = {
      ...userCreatedPayload,
      data: {
        ...userCreatedPayload.data,
        first_name: null,
        last_name: 'Al-Salem',
      },
    }
    mockVerify.mockReturnValue(payloadLastNameOnly)

    const request = createRequest(payloadLastNameOnly)
    const response = await POST(request)

    expect(response.status).toBe(200)

    expect(mockSupabaseUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'Al-Salem',
      }),
      { onConflict: 'id', ignoreDuplicates: true }
    )
  })

  it('handles user with no name at all', async () => {
    const payloadNoName = {
      ...userCreatedPayload,
      data: {
        ...userCreatedPayload.data,
        first_name: null,
        last_name: null,
      },
    }
    mockVerify.mockReturnValue(payloadNoName)

    const request = createRequest(payloadNoName)
    const response = await POST(request)

    expect(response.status).toBe(200)

    expect(mockSupabaseUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: null,
      }),
      { onConflict: 'id', ignoreDuplicates: true }
    )
  })

  it('uses first verified email when multiple emails exist', async () => {
    const payloadMultipleEmails = {
      ...userCreatedPayload,
      data: {
        ...userCreatedPayload.data,
        email_addresses: [
          {
            id: 'email_1',
            email_address: 'unverified@example.com',
            verification: { status: 'unverified', strategy: 'email_code' },
          },
          {
            id: 'email_2',
            email_address: 'verified@example.com',
            verification: { status: 'verified', strategy: 'email_code' },
          },
        ],
      },
    }
    mockVerify.mockReturnValue(payloadMultipleEmails)

    const request = createRequest(payloadMultipleEmails)
    const response = await POST(request)

    expect(response.status).toBe(200)

    expect(mockSupabaseUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'verified@example.com',
      }),
      { onConflict: 'id', ignoreDuplicates: true }
    )
  })

  it('acknowledges other event types silently (returns 200)', async () => {
    const otherEventPayload = {
      type: 'user.updated',
      data: {
        id: clerkUserId,
        email_addresses: [{ email_address: testEmail, verification: { status: 'verified', strategy: 'email_code' } }],
        first_name: testFirstName,
        last_name: testLastName,
      },
    }
    // Return the other event payload from verify
    mockVerify.mockReturnValue(otherEventPayload)

    const request = createRequest(otherEventPayload)
    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ ok: true })

    // No Supabase call for non-user.created events
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })
})