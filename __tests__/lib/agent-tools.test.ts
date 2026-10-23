/**
 * @jest-environment node
 *
 * Contract tests for the Phase B Step 1 agent tool registry.
 *
 * The registry is the single bridge between an LLM tool call and the database:
 *   - provider-facing JSON Schema (what the model may send)
 *   - Zod validation (what this process accepts)
 *   - metadata (`kind`, `scope`, `requiresConfirmation`)
 *   - an executor bound to the caller's RLS client
 *
 * The write tool (`create_transaction`) is confirmation-gated: the executor
 * refuses to run unless the caller explicitly sets `confirmed: true`, so a
 * model cannot mutate data on its own.
 */
import { AGENT_TOOLS, getAgentTool, type AgentToolContext } from '@/lib/agent/tools'
import { createTransaction, getProfileCurrency } from '@/lib/unified-tools'
import { fetchExchangeRateServer } from '@/lib/exchange-rate'

jest.mock('@/lib/unified-tools', () => ({
  createTransaction: jest.fn(),
  getProfileCurrency: jest.fn(async () => 'JOD'),
  sanitizeDescription: jest.fn((desc: string | null | undefined) =>
    desc
      ? desc
          .replace(/<[^>]*>/g, '')
          .replace(/[<>"'&]/g, '')
          .trim()
          .slice(0, 500)
      : null
  ),
  validateCategory: jest.fn(
    (type: 'income' | 'expense', category: string) =>
      ({
        expense: ['طعام وشراب', 'مواصلات', 'إيجار / قسط'],
        income: ['راتب', 'عمل حر'],
      })[type].includes(category)
  ),
  getValidCategories: jest.fn((type: 'income' | 'expense') =>
    type === 'income' ? ['راتب', 'عمل حر'] : ['طعام وشراب', 'مواصلات', 'إيجار / قسط']
  ),
}))

jest.mock('@/lib/exchange-rate', () => ({
  fetchExchangeRateServer: jest.fn(async () => 0.709),
}))

const mockCreateTransaction = createTransaction as jest.MockedFunction<typeof createTransaction>
const mockGetProfileCurrency = getProfileCurrency as jest.MockedFunction<typeof getProfileCurrency>
const mockFetchRate = fetchExchangeRateServer as jest.MockedFunction<typeof fetchExchangeRateServer>

interface RpcCall {
  name: string
  args: unknown
}

function makeFakeClient(rpcData: Record<string, unknown> = {}) {
  const rpcCalls: RpcCall[] = []
  const client = {
    from: () => {
      throw new Error('registry executors must not query tables directly')
    },
    rpc: async (name: string, args: unknown) => {
      rpcCalls.push({ name, args })
      return { data: rpcData[name] ?? null, error: null }
    },
  }
  return { client, rpcCalls }
}

function ctx(client: unknown, extra: Partial<AgentToolContext> = {}): AgentToolContext {
  return {
    userId: 'user-1',
    client: client as AgentToolContext['client'],
    ...extra,
  }
}

function tool(name: string) {
  const found = getAgentTool(name)
  if (!found) throw new Error(`tool ${name} not registered`)
  return found
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetProfileCurrency.mockResolvedValue('JOD')
  mockFetchRate.mockResolvedValue(0.709)
  jest.useFakeTimers()
  jest.setSystemTime(new Date('2026-10-23T12:00:00.000Z'))
})

afterAll(() => {
  jest.useRealTimers()
})

describe('registry shape', () => {
  it('exposes exactly the three MVP tools', () => {
    expect(AGENT_TOOLS.map((t) => t.name).sort()).toEqual([
      'create_transaction',
      'get_financial_snapshot',
      'get_spending_breakdown',
    ])
  })

  it('marks reads vs the confirmation-gated write', () => {
    expect(tool('get_spending_breakdown')).toMatchObject({
      kind: 'read',
      scope: 'read_transactions',
      requiresConfirmation: false,
    })
    expect(tool('get_financial_snapshot')).toMatchObject({
      kind: 'read',
      scope: 'read_balances',
      requiresConfirmation: false,
    })
    expect(tool('create_transaction')).toMatchObject({
      kind: 'write',
      scope: 'create_transaction',
      requiresConfirmation: true,
    })
  })

  it('returns undefined for unknown tools', () => {
    expect(getAgentTool('drop_database')).toBeUndefined()
  })

  it.each(AGENT_TOOLS.map((t) => [t.name, t] as const))(
    '%s ships a closed provider JSON schema and a Zod schema',
    (_name, t) => {
      expect(t.parameters).toMatchObject({ type: 'object', additionalProperties: false })
      expect(typeof t.description).toBe('string')
      expect(t.description.length).toBeGreaterThan(20)
      expect(t.schema.safeParse({}).success).toBe(
        Array.isArray((t.parameters as { required?: unknown[] }).required) &&
          (t.parameters as { required: unknown[] }).required.length === 0
      )
    }
  )
})

describe('get_spending_breakdown', () => {
  it('defaults to the current UTC month and uses the caller RLS client', async () => {
    const fake = makeFakeClient({
      get_spending_breakdown: { ok: true, total_expense: 120, categories: [] },
    })

    const result = await tool('get_spending_breakdown').execute({}, ctx(fake.client))

    expect(fake.rpcCalls).toEqual([
      { name: 'get_spending_breakdown', args: { p_user_id: 'user-1', p_year: 2026, p_month: 10 } },
    ])
    expect(result).toEqual({ ok: true, total_expense: 120, categories: [] })
  })

  it('passes explicit year/month through', async () => {
    const fake = makeFakeClient({ get_spending_breakdown: { ok: true } })

    await tool('get_spending_breakdown').execute({ year: 2026, month: 2 }, ctx(fake.client))

    expect(fake.rpcCalls[0].args).toEqual({ p_user_id: 'user-1', p_year: 2026, p_month: 2 })
  })

  it('rejects a month outside 1..12 before hitting the database', async () => {
    const fake = makeFakeClient()

    await expect(
      tool('get_spending_breakdown').execute({ month: 13 }, ctx(fake.client))
    ).rejects.toThrow()

    expect(fake.rpcCalls).toHaveLength(0)
  })
})

describe('get_financial_snapshot', () => {
  it('combines dashboard, FX rate and zakat hauls', async () => {
    mockGetProfileCurrency.mockResolvedValue('JOD')
    const fake = makeFakeClient({
      get_financial_dashboard: { net_worth: 1000 },
      get_zakat_hauls: [{ source: 'holding' }],
    })

    const result = await tool('get_financial_snapshot').execute({}, ctx(fake.client))

    expect(mockFetchRate).toHaveBeenCalledWith('USD', 'JOD')
    expect(fake.rpcCalls.map((c) => c.name)).toEqual([
      'get_financial_dashboard',
      'get_zakat_hauls',
    ])
    expect(fake.rpcCalls[0].args).toEqual({ p_user_id: 'user-1', p_usd_to_local_rate: 0.709 })
    expect(result).toMatchObject({
      ok: true,
      currency: 'JOD',
      usd_to_local_rate: 0.709,
      dashboard: { net_worth: 1000 },
      zakat_hauls: [{ source: 'holding' }],
    })
  })

  it('adds the zakat summary when metal prices are provided (math stays in the RPC)', async () => {
    const fake = makeFakeClient({
      get_financial_dashboard: { net_worth: 0 },
      get_zakat_hauls: [],
      get_zakat_summary: { is_eligible: true, zakat_due: 25 },
    })

    const result = await tool('get_financial_snapshot').execute(
      { gold_price_per_gram: 30, silver_price_per_gram: 0.35, usd_to_local_rate: 0.709 },
      ctx(fake.client)
    )

    expect(fake.rpcCalls.map((c) => c.name)).toContain('get_zakat_summary')
    expect(fake.rpcCalls.find((c) => c.name === 'get_zakat_summary')?.args).toEqual({
      p_user_id: 'user-1',
      p_gold_price_per_gram: 30,
      p_silver_price_per_gram: 0.35,
      p_usd_to_local_rate: 0.709,
    })
    expect(result).toMatchObject({ zakat: { zakat_due: 25 } })
  })

  it('does not call the zakat summary when prices are missing', async () => {
    const fake = makeFakeClient({
      get_financial_dashboard: {},
      get_zakat_hauls: [],
    })

    const result = await tool('get_financial_snapshot').execute({}, ctx(fake.client))

    expect(fake.rpcCalls.map((c) => c.name)).not.toContain('get_zakat_summary')
    expect(result).not.toHaveProperty('zakat')
  })
})

describe('create_transaction confirmation gate', () => {
  const args = {
    type: 'expense' as const,
    amount: 12.5,
    currency: 'USD',
    category: 'طعام وشراب',
    description: '<b>قهوة</b>',
    transaction_date: '2026-10-23',
  }

  it('refuses to write without explicit confirmation', async () => {
    const fake = makeFakeClient()

    await expect(tool('create_transaction').execute(args, ctx(fake.client))).rejects.toThrow(
      /confirm/i
    )

    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })

  it('writes through the RLS client once confirmed, preserving original currency', async () => {
    const fake = makeFakeClient()
    mockCreateTransaction.mockResolvedValue({
      id: 'tx-1',
      type: 'expense',
      amount: 8.86,
      category: 'طعام وشراب',
      transaction_date: '2026-10-23',
      created_at: '2026-10-23T00:00:00.000Z',
    })

    const result = await tool('create_transaction').execute(
      args,
      ctx(fake.client, { confirmed: true })
    )

    expect(mockCreateTransaction).toHaveBeenCalledWith(
      {
        user_id: 'user-1',
        type: 'expense',
        amount: 12.5,
        original_currency: 'USD',
        category: 'طعام وشراب',
        description: 'قهوة',
        transaction_date: '2026-10-23',
        account_id: null,
      },
      { client: fake.client }
    )
    expect(result).toMatchObject({ ok: true, transaction: { id: 'tx-1' } })
  })

  it('rejects a category that does not belong to the transaction type', async () => {
    const fake = makeFakeClient()

    await expect(
      tool('create_transaction').execute(
        { ...args, type: 'income', category: 'طعام وشراب' },
        ctx(fake.client, { confirmed: true })
      )
    ).rejects.toThrow()

    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })

  it('rejects a non-positive amount at validation time', async () => {
    await expect(
      tool('create_transaction').schema.safeParseAsync({ ...args, amount: 0 })
    ).resolves.toMatchObject({ success: false })
  })
})
