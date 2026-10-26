/**
 * @jest-environment node
 *
 * Contract tests for the Phase 1 agent read tools:
 *   get_debts, get_budgets, get_goals, get_recent_transactions
 *
 * These tools are thin pass-throughs: the executor validates input with Zod
 * and calls a shared helper in `lib/unified-tools`, which calls the RPC. The
 * tests below inject a fake Supabase client through the tool context, so the
 * assertions cover the real helper → `rpc()` path (name + arguments) without
 * touching a database or the service-role client.
 *
 * All four are reads: none may require confirmation or mutate anything.
 */
import { AGENT_TOOLS, getAgentTool, type AgentToolContext } from '@/lib/agent/tools'

interface RpcCall {
  name: string
  args: unknown
}

interface FakeClient {
  from: () => never
  rpc: (name: string, args: unknown) => Promise<{ data: unknown; error: unknown }>
}

function makeFakeClient(rpcData: unknown = []) {
  const rpcCalls: RpcCall[] = []
  const client: FakeClient = {
    from: () => {
      throw new Error('read tool executors must not query tables directly')
    },
    rpc: async (name: string, args: unknown) => {
      rpcCalls.push({ name, args })
      return { data: rpcData, error: null }
    },
  }
  return { client, rpcCalls }
}

function ctx(client: FakeClient): AgentToolContext {
  return { userId: 'user-1', client: client as unknown as AgentToolContext['client'] }
}

function tool(name: string) {
  const found = getAgentTool(name)
  if (!found) throw new Error(`tool ${name} not registered`)
  return found
}

const READ_TOOL_NAMES = [
  'get_budgets',
  'get_debts',
  'get_goals',
  'get_recent_transactions',
] as const

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date('2026-10-23T12:00:00.000Z'))
})

afterAll(() => {
  jest.useRealTimers()
})

describe('read tool registry metadata', () => {
  it.each(READ_TOOL_NAMES)('%s is a read tool that never needs confirmation', (name) => {
    expect(tool(name)).toMatchObject({ kind: 'read', requiresConfirmation: false })
  })

  it('uses the documented scopes', () => {
    expect(tool('get_debts').scope).toBe('read_balances')
    expect(tool('get_goals').scope).toBe('read_balances')
    expect(tool('get_budgets').scope).toBe('read_transactions')
    expect(tool('get_recent_transactions').scope).toBe('read_transactions')
  })

  it('registers all four tools alongside the existing registry', () => {
    const names = AGENT_TOOLS.map((t) => t.name)
    for (const name of READ_TOOL_NAMES) expect(names).toContain(name)
  })

  it('ships a closed provider schema and a matching Zod schema', () => {
    for (const name of READ_TOOL_NAMES) {
      const t = tool(name)
      expect(t.parameters).toMatchObject({ type: 'object', additionalProperties: false })
      expect(t.description.length).toBeGreaterThan(20)
      expect(t.schema.safeParse({}).success).toBe(true)
    }
  })
})

describe('get_debts', () => {
  it('accepts an empty argument object and rejects unknown keys', () => {
    expect(tool('get_debts').schema.safeParse({}).success).toBe(true)
    expect(tool('get_debts').schema.safeParse({ limit: 5 }).success).toBe(false)
  })

  it('calls get_debts with the caller id and returns the RPC rows unchanged', async () => {
    const rows = [
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
    ]
    const fake = makeFakeClient(rows)

    const result = await tool('get_debts').execute({}, ctx(fake.client))

    expect(fake.rpcCalls).toEqual([{ name: 'get_debts', args: { p_user_id: 'user-1' } }])
    expect(result).toEqual(rows)
  })

  it('surfaces an RPC error instead of returning a partial result', async () => {
    const client: FakeClient = {
      from: () => {
        throw new Error('unused')
      },
      rpc: async () => ({ data: null, error: new Error('boom') }),
    }

    await expect(tool('get_debts').execute({}, ctx(client))).rejects.toThrow('boom')
  })
})

describe('get_budgets', () => {
  it('accepts an empty object and in-range year/month', () => {
    const schema = tool('get_budgets').schema
    expect(schema.safeParse({}).success).toBe(true)
    expect(schema.safeParse({ year: 2026, month: 2 }).success).toBe(true)
    expect(schema.safeParse({ year: 1999, month: 2 }).success).toBe(false)
    expect(schema.safeParse({ year: 2026, month: 13 }).success).toBe(false)
    expect(schema.safeParse({ year: 2026, month: 0 }).success).toBe(false)
    expect(schema.safeParse({ year: '2026', month: 2 }).success).toBe(false)
    expect(schema.safeParse({ year: 2026, month: 2, extra: true }).success).toBe(false)
  })

  it('defaults to the current UTC month', async () => {
    const rows = [{ category: 'طعام وشراب', monthly_limit: 200, spent: 50, remaining: 150, percentage: 25 }]
    const fake = makeFakeClient(rows)

    const result = await tool('get_budgets').execute({}, ctx(fake.client))

    expect(fake.rpcCalls).toEqual([
      {
        name: 'get_budgets',
        args: { p_user_id: 'user-1', p_year: 2026, p_month: 10 },
      },
    ])
    expect(result).toEqual(rows)
  })

  it('passes an explicit year/month through', async () => {
    const fake = makeFakeClient([])

    await tool('get_budgets').execute({ year: 2025, month: 12 }, ctx(fake.client))

    expect(fake.rpcCalls[0]).toEqual({
      name: 'get_budgets',
      args: { p_user_id: 'user-1', p_year: 2025, p_month: 12 },
    })
  })

  it('rejects an out-of-range month before hitting the database', async () => {
    const fake = makeFakeClient()

    await expect(tool('get_budgets').execute({ month: 13 }, ctx(fake.client))).rejects.toThrow()

    expect(fake.rpcCalls).toHaveLength(0)
  })
})

describe('get_goals', () => {
  it('accepts an empty argument object and rejects unknown keys', () => {
    expect(tool('get_goals').schema.safeParse({}).success).toBe(true)
    expect(tool('get_goals').schema.safeParse({ year: 2026 }).success).toBe(false)
  })

  it('calls get_goals with the caller id', async () => {
    const rows = [
      {
        id: 'goal-1',
        name: 'Emergency fund',
        target_amount: 10000,
        current_amount: 2500,
        target_date: '2027-06-01',
        percentage: 25,
      },
    ]
    const fake = makeFakeClient(rows)

    const result = await tool('get_goals').execute({}, ctx(fake.client))

    expect(fake.rpcCalls).toEqual([{ name: 'get_goals', args: { p_user_id: 'user-1' } }])
    expect(result).toEqual(rows)
  })
})

describe('get_recent_transactions', () => {
  it('accepts an empty object and a 1..50 limit, rejecting everything else', () => {
    const schema = tool('get_recent_transactions').schema
    expect(schema.safeParse({}).success).toBe(true)
    expect(schema.safeParse({ limit: 1 }).success).toBe(true)
    expect(schema.safeParse({ limit: 50 }).success).toBe(true)
    expect(schema.safeParse({ limit: 0 }).success).toBe(false)
    expect(schema.safeParse({ limit: 51 }).success).toBe(false)
    expect(schema.safeParse({ limit: 2.5 }).success).toBe(false)
    expect(schema.safeParse({ limit: '10' }).success).toBe(false)
  })

  it('defaults to 10 rows', async () => {
    const rows = [
      {
        id: 'tx-1',
        amount: 8.86,
        type: 'expense',
        category: 'طعام وشراب',
        description: 'قهوة',
        date: '2026-10-22',
        original_amount: 12.5,
        original_currency: 'USD',
      },
    ]
    const fake = makeFakeClient(rows)

    const result = await tool('get_recent_transactions').execute({}, ctx(fake.client))

    expect(fake.rpcCalls).toEqual([
      {
        name: 'get_recent_transactions',
        args: { p_user_id: 'user-1', p_limit: 10 },
      },
    ])
    expect(result).toEqual(rows)
  })

  it('passes an explicit limit through', async () => {
    const fake = makeFakeClient([])

    await tool('get_recent_transactions').execute({ limit: 25 }, ctx(fake.client))

    expect(fake.rpcCalls[0]).toEqual({
      name: 'get_recent_transactions',
      args: { p_user_id: 'user-1', p_limit: 25 },
    })
  })

  it('normalises a null RPC payload to an empty array', async () => {
    const fake = makeFakeClient(null)

    await expect(
      tool('get_recent_transactions').execute({}, ctx(fake.client))
    ).resolves.toEqual([])
  })
})
