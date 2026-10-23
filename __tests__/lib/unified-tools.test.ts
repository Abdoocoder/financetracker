/**
 * @jest-environment node
 *
 * Contract tests for the shared unified-tools layer after the Phase B Step 1
 * refactor:
 *
 *   1. `createTransaction` must always persist the multi-currency trio
 *      (`original_amount` / `original_currency` / `exchange_rate`) — the bug
 *      was that the insert omitted them, so every MCP/agent write landed with
 *      NULLs and the dashboard reported the wrong base amount.
 *   2. Every tool function must accept an RLS-bound Supabase client so the
 *      agent loop never silently falls back to the service-role admin client
 *      (Critical Rule 5). Omitting the client keeps the MCP/PAT behaviour:
 *      the admin client is used.
 */
import {
  createTransaction,
  getAccountBalances,
  getProfileCurrency,
  type ToolContext,
} from '@/lib/unified-tools'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchExchangeRateServer } from '@/lib/exchange-rate'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/exchange-rate', () => ({
  fetchExchangeRateServer: jest.fn(),
}))

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockFetchRate = fetchExchangeRateServer as jest.MockedFunction<
  typeof fetchExchangeRateServer
>

interface FakeClientOptions {
  /** Row returned for `profiles.select('currency')`. `null` = no profile row. */
  currency?: string | null
  insertData?: Record<string, unknown>
  rpcData?: unknown
}

interface InsertCall {
  table: string
  payload: Record<string, unknown>
}

interface RpcCall {
  name: string
  args: unknown
}

function makeFakeClient(options: FakeClientOptions = {}) {
  const inserts: InsertCall[] = []
  const rpcCalls: RpcCall[] = []

  const client = {
    from(table: string) {
      const builder: Record<string, unknown> = {}
      Object.assign(builder, {
        select: () => builder,
        insert: (payload: Record<string, unknown>) => {
          inserts.push({ table, payload })
          return builder
        },
        eq: () => builder,
        is: () => builder,
        gte: () => builder,
        lte: () => builder,
        maybeSingle: async () => ({
          data:
            table === 'profiles' && options.currency !== null
              ? { currency: options.currency ?? 'JOD' }
              : null,
          error: null,
        }),
        single: async () => ({
          data: {
            id: 'tx-1',
            type: 'expense',
            amount: 0,
            category: 'طعام وشراب',
            transaction_date: '2026-10-23',
            created_at: '2026-10-23T00:00:00.000Z',
            ...options.insertData,
          },
          error: null,
        }),
      })
      return builder
    },
    rpc: async (name: string, args: unknown) => {
      rpcCalls.push({ name, args })
      return { data: options.rpcData ?? null, error: null }
    },
  }

  return { client, inserts, rpcCalls }
}

function asCtx(client: unknown): ToolContext {
  return { client: client as ToolContext['client'] }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('client resolution (RLS-safe vs admin)', () => {
  it('uses the caller-provided RLS client and never constructs the admin client', async () => {
    const fake = makeFakeClient({ rpcData: [{ id: 'acc-1' }] })

    const result = await getAccountBalances('user-1', asCtx(fake.client))

    expect(result).toEqual([{ id: 'acc-1' }])
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
    expect(fake.rpcCalls).toEqual([
      { name: 'get_account_balances', args: { p_user_id: 'user-1' } },
    ])
  })

  it('falls back to the admin client when no context is supplied (MCP/PAT path)', async () => {
    const fake = makeFakeClient({ rpcData: [] })
    mockCreateAdminClient.mockReturnValue(fake.client as never)

    await getAccountBalances('user-1')

    expect(mockCreateAdminClient).toHaveBeenCalledTimes(1)
    expect(fake.rpcCalls).toHaveLength(1)
  })

  it('reads the profile currency through the same RLS client', async () => {
    const fake = makeFakeClient({ currency: 'AED' })

    const currency = await getProfileCurrency('user-1', asCtx(fake.client))

    expect(currency).toBe('AED')
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('defaults to JOD when the profile row is missing', async () => {
    const fake = makeFakeClient({ currency: null })

    await expect(getProfileCurrency('user-1', asCtx(fake.client))).resolves.toBe('JOD')
  })
})

describe('createTransaction multi-currency payload', () => {
  const baseInput = {
    user_id: 'user-1',
    type: 'expense' as const,
    amount: 25,
    category: 'طعام وشراب',
    description: 'غداء',
    transaction_date: '2026-10-23',
    account_id: null,
  }

  it('persists original_amount/original_currency/exchange_rate in the profile currency', async () => {
    const fake = makeFakeClient({ currency: 'JOD' })

    await createTransaction(baseInput, asCtx(fake.client))

    expect(fake.inserts).toHaveLength(1)
    expect(fake.inserts[0].table).toBe('transactions')
    expect(fake.inserts[0].payload).toEqual(
      expect.objectContaining({
        amount: 25,
        original_amount: 25,
        original_currency: 'JOD',
        exchange_rate: 1,
      })
    )
    expect(mockFetchRate).not.toHaveBeenCalled()
  })

  it('converts a foreign amount into the base currency and keeps the entered amount', async () => {
    const fake = makeFakeClient({ currency: 'JOD' })

    await createTransaction(
      { ...baseInput, amount: 100, original_currency: 'USD' },
      asCtx(fake.client)
    )

    expect(mockFetchRate).toHaveBeenCalledWith('USD', 'JOD')
    expect(fake.inserts[0].payload).toEqual(
      expect.objectContaining({
        amount: 70.9,
        original_amount: 100,
        original_currency: 'USD',
        exchange_rate: 0.709,
      })
    )
  })

  it('honours an explicit exchange rate and normalises the currency code', async () => {
    const fake = makeFakeClient({ currency: 'JOD' })

    await createTransaction(
      { ...baseInput, amount: 10, original_currency: 'usd', exchange_rate: 0.71 },
      asCtx(fake.client)
    )

    expect(mockFetchRate).not.toHaveBeenCalled()
    expect(fake.inserts[0].payload).toEqual(
      expect.objectContaining({
        amount: 7.1,
        original_currency: 'USD',
        exchange_rate: 0.71,
      })
    )
  })

  it('ignores a stale rate when the entered currency is the base currency', async () => {
    const fake = makeFakeClient({ currency: 'JOD' })

    await createTransaction(
      { ...baseInput, amount: 40, original_currency: 'jod', exchange_rate: 3.5 },
      asCtx(fake.client)
    )

    expect(fake.inserts[0].payload).toEqual(
      expect.objectContaining({ amount: 40, original_currency: 'JOD', exchange_rate: 1 })
    )
  })

  it('fails closed instead of writing a bad rate when the FX lookup fails', async () => {
    const fake = makeFakeClient({ currency: 'JOD' })
    mockFetchRate.mockResolvedValueOnce(null)

    await expect(
      createTransaction(
        { ...baseInput, amount: 100, original_currency: 'USD' },
        asCtx(fake.client)
      )
    ).rejects.toThrow(/exchange rate/i)

    expect(fake.inserts).toHaveLength(0)
  })

  it('uses exactly one client for the profile lookup and the insert', async () => {
    const fake = makeFakeClient({ currency: 'JOD' })

    await createTransaction(baseInput, asCtx(fake.client))

    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })
})

beforeEach(() => {
  mockFetchRate.mockResolvedValue(0.709)
})
