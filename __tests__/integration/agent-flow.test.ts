/**
 * @jest-environment node
 *
 * End-to-end style integration test for the agent loop (TASK 1).
 * Proves the full flow: LLM returns a tool_call → server executes the read
 * tool via the session client → streams trace/tool_result/delta/done events.
 */
var mockGetUser = jest.fn()
var mockRpc = jest.fn()
var mockFrom = jest.fn()
var mockCreateClient = jest.fn()
var mockUnwrapProviderKeyWithRotation = jest.fn()
var mockIsKekConfigured = jest.fn()
var mockZeroBytes = jest.fn()
var mockWriteAuditLog = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
}))

jest.mock('@/lib/byok/envelope', () => ({
  unwrapProviderKeyWithRotation: (...args: any[]) => mockUnwrapProviderKeyWithRotation(...args),
  isKekConfigured: () => mockIsKekConfigured(),
  zeroBytes: (...args: any[]) => mockZeroBytes(...args),
}))

jest.mock('@/lib/unified-tools', () => {
  const actual = jest.requireActual('@/lib/unified-tools')
  return {
    ...actual,
    createTransaction: jest.fn(),
    getProfileCurrency: jest.fn(async () => 'JOD'),
    getValidCategories: jest.fn(() => []),
    sanitizeDescription: (desc: string | null | undefined) => desc ?? null,
    validateCategory: jest.fn(() => true),
    writeAuditLog: (...args: any[]) => mockWriteAuditLog(...args),
  }
})

import { POST } from '@/app/api/byok/agent/route'
import { NextRequest } from 'next/server'

const BEARER = 'Bearer test.jwt.token'

beforeEach(() => {
  mockGetUser.mockReset()
  mockRpc.mockReset()
  mockFrom.mockReset()
  mockCreateClient.mockReset()
  mockUnwrapProviderKeyWithRotation.mockReset().mockResolvedValue('sk-test-key')
  mockIsKekConfigured.mockReset().mockReturnValue(true)
  mockZeroBytes.mockReset()
  mockWriteAuditLog.mockReset().mockResolvedValue(undefined)
  global.fetch = jest.fn()

  mockFrom.mockImplementation(() => ({
    insert: jest.fn(async () => ({ error: null })),
  }))
})

function makeSupabase(userId = 'u1') {
  const client = {
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
    from: mockFrom,
  }
  mockCreateClient.mockResolvedValue(client)
  mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null })
  mockRpc.mockImplementation(async (name: string, args: any) => {
    if (name === 'bump_proxy_usage') return { data: 1, error: null }
    if (name === 'get_debts') {
      return {
        data: [
          {
            id: 'debt-1',
            name: 'Car loan',
            total_amount: 12000,
            remaining_balance: 4000,
            monthly_payment: 250,
            end_date: '2028-01-01',
            next_due_date: '2026-11-05',
            debt_type: 'owed',
            is_paid: false,
            priority: 2,
          },
        ],
        error: null,
      }
    }
    return { data: null, error: null }
  })
  return client
}

function sseResponse(chunks: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(new TextEncoder().encode(c))
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

function toolTurn(name: string, args: unknown, text = 'Let me check.'): Response {
  return sseResponse([
    `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
    `data: ${JSON.stringify({
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: 'call_1',
                type: 'function',
                function: { name, arguments: JSON.stringify(args) },
              },
            ],
          },
        },
      ],
    })}\n\n`,
    'data: [DONE]\n\n',
  ])
}

function textTurn(text: string): Response {
  return sseResponse([
    `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
    'data: [DONE]\n\n',
  ])
}

async function readSse(res: Response): Promise<any[]> {
  const text = await res.text()
  return text
    .split('\n\n')
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => JSON.parse(block.replace(/^data:\s*/, '')))
}

function makeAgentRequest(body: Record<string, unknown>, authHeader?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (authHeader) headers.authorization = authHeader
  const base = {
    providerId: 'openai',
    keyId: 'k1',
    env: Buffer.from('env').toString('base64'),
    payload: Buffer.from('payload').toString('base64'),
    model: 'gpt-x',
    systemPrompt: 'You are Fajrak.',
    messages: [{ role: 'user', content: 'Show me my debts' }],
  }
  return new NextRequest('http://localhost/api/byok/agent', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...base, ...body }),
  })
}

describe('Agent flow integration', () => {
  it('runs get_debts tool end-to-end via agent route', async () => {
    const client = makeSupabase('u123')
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(toolTurn('get_debts', {}))
      .mockResolvedValueOnce(textTurn('Here are your debts.'))

    const res = await POST(makeAgentRequest({}, BEARER))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')

    const events = await readSse(res)
    console.log('EVENTS:', JSON.stringify(events))
    const types = events.map((e) => e.type)
    expect(types).toContain('trace')
    expect(types).toContain('tool_result')
    expect(types).toContain('delta')
    expect(types[types.length - 1]).toBe('done')

    // trace indicates get_debts is running
    expect(events.some((e) => e.type === 'trace' && e.tool === 'get_debts')).toBe(true)
    // tool_result with fake debt data
    expect(events.some((e) => e.type === 'tool_result' && e.tool === 'get_debts' && e.ok === true)).toBe(true)
    // final delta
    expect(events.some((e) => e.type === 'delta' && e.text === 'Here are your debts.')).toBe(true)

    // mock Supabase RPC called exactly once with correct user ID
    const debtCalls = mockRpc.mock.calls.filter((c) => c[0] === 'get_debts')
    expect(debtCalls.length).toBe(1)
    expect(debtCalls[0][1]).toEqual({ p_user_id: 'u123' })
  })
})
