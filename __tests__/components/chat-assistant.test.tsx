/**
 * @jest-environment jsdom
 */
import { ReadableStream } from 'node:stream/web'
import { TextEncoder } from 'node:util'
if (typeof global.ReadableStream === 'undefined') {
  (global as any).ReadableStream = ReadableStream
}
if (typeof global.TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder
}
if (typeof global.Response === 'undefined') {
  try {
    const nf: any = require('node-fetch')
    if (nf?.Response) {
      ;(global as any).Response = nf.Response
    }
  } catch {}
}
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ChatAssistant from '@/components/dashboard/chat-assistant'
import { I18nProvider } from '@/lib/i18n'

// Mock hooks
jest.mock('@/lib/user-context', () => ({
  useUser: () => ({
    user: { id: 'u1' },
    profile: { currency: 'JOD' },
  }),
}))

jest.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({
    totalBalance: 1000,
    loading: false,
  }),
}))

jest.mock('@/lib/byok/vault', () => ({
  getProviderKey: jest.fn(async () => 'sk-test'),
  hasProviderKey: jest.fn(async () => true),
  isVaultUnavailable: () => false,
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'user_byok_keys') {
        const chain: any = {
          select: () => chain,
          eq: () => chain,
          order: () => Promise.resolve({
            data: [
              { id: 'k1', provider_id: 'openai', key_name: 'test-key' },
            ],
            error: null,
          }),
        }
        return chain
      }
      if (table === 'transactions') {
        const chain: any = {
          select: () => chain,
          eq: () => chain,
          gte: () => chain,
          lte: () => Promise.resolve({ data: [], error: null }),
          then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
        }
        return chain
      }
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => Promise.resolve({ data: [], error: null }),
        then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
      }
      return chain
    },
  }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>
})

jest.mock('@/lib/byok/client', () => ({
  byokAgent: jest.fn(),
}))

jest.mock('@/lib/byok/chat', () => {
  const actual = jest.requireActual('@/lib/byok/chat')
  return {
    ...actual,
    buildChatBody: jest.fn(),
    readStream: jest.fn(),
  }
})

const { byokAgent } = require('@/lib/byok/client')
const { readAgentStream } = require('@/lib/byok/chat')

function agentEventStream(events: any[]): Response {
  const chunks = events.map((e) => `data: ${JSON.stringify(e)}\n\n`)
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(new TextEncoder().encode(c))
      controller.close()
    },
  }) as any
  return new Response(stream as any, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  }) as any
}

describe('ChatAssistant component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(byokAgent as jest.Mock).mockReset()
  })

  it('shows checking budgets trace and deep link to budgets', async () => {
    const res = agentEventStream([
      { type: 'trace', tool: 'get_budgets', status: 'running' },
      { type: 'tool_result', tool: 'get_budgets', ok: true },
      { type: 'delta', text: 'Budgets look fine.' },
      { type: 'done' },
    ])
    ;(byokAgent as jest.Mock).mockResolvedValue(res)

    render(
      <I18nProvider>
        <ChatAssistant />
      </I18nProvider>
    )

    const providerSelect = await screen.findByLabelText(/Provider/i)
    fireEvent.change(providerSelect, { target: { value: 'openai' } })
    // Select key if needed
    await waitFor(() => {
      const keySelect = screen.queryByLabelText(/API key/i)
      if (keySelect) {
        fireEvent.change(keySelect, { target: { value: 'k1' } })
      }
    })
    await new Promise(r => setTimeout(r, 100))
    const input = await screen.findByPlaceholderText(/Ask about your finances/i)
    fireEvent.change(input, { target: { value: 'show my budgets' } })
    await waitFor(() => {
      const sendBtn = screen.getByLabelText(/Send/i)
      expect(sendBtn).not.toBeDisabled()
    })
    const sendBtn = screen.getByLabelText(/Send/i)
    fireEvent.click(sendBtn)

    await waitFor(() => {
      expect(screen.getByText(/Go to Budgets/i)).toBeInTheDocument()
      const link = screen.getByText(/Go to Budgets/i).closest('a')
      expect(link?.getAttribute('href')).toBe('/dashboard/budgets')
    })
  })

  /**
   * Regression (2026-10-29): `/api/byok/agent` relays the provider's status
   * verbatim, but the chat UI collapsed every non-401/429 failure into
   * "Something went wrong". A dead NVIDIA model (410), an unknown slug (404) and
   * a provider outage (5xx) are three different, actionable problems.
   */
  describe('maps upstream statuses to actionable messages', () => {
    const cases: Array<[number, RegExp]> = [
      [404, /does not recognise this model/i],
      [410, /has been removed by the provider/i],
      [500, /having an outage right now/i],
      [503, /having an outage right now/i],
    ]

    it.each(cases)('HTTP %i shows its own message', async (status, copy) => {
      ;(byokAgent as jest.Mock).mockResolvedValue(
        new Response('{}', { status }) as any
      )

      render(
        <I18nProvider>
          <ChatAssistant />
        </I18nProvider>
      )

      const providerSelect = await screen.findByLabelText(/Provider/i)
      fireEvent.change(providerSelect, { target: { value: 'openai' } })
      await waitFor(() => {
        const keySelect = screen.queryByLabelText(/API key/i)
        if (keySelect) {
          fireEvent.change(keySelect, { target: { value: 'k1' } })
        }
      })
      await new Promise(r => setTimeout(r, 100))
      const input = await screen.findByPlaceholderText(/Ask about your finances/i)
      fireEvent.change(input, { target: { value: 'hello' } })
      await waitFor(() => {
        expect(screen.getByLabelText(/Send/i)).not.toBeDisabled()
      })
      fireEvent.click(screen.getByLabelText(/Send/i))

      await waitFor(() => {
        expect(screen.getByText(copy)).toBeInTheDocument()
      })
      // The generic fallback must NOT be what the user sees.
      expect(
        screen.queryByText(/Something went wrong while talking to the model/i)
      ).toBeNull()
    })
  })
})
