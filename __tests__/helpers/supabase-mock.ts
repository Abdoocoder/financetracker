/**
 * Fluent Supabase query builder mock.
 * Supports the chained query pattern: from().select().eq().eq().gt()
 * The chain is awaitable and resolves to `defaultResult`.
 */
export function createFluentQuery(defaultResult: unknown = { data: [], error: null }) {
  const q: any = {}

  const chainMethods = [
    'select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'in', 'not', 'order', 'limit', 'is', 'head', 'single', 'match',
  ]
  chainMethods.forEach((m) => {
    q[m] = jest.fn().mockReturnValue(q)
  })

  // Make the chain awaitable (thenable)
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(defaultResult).then(resolve)
  q.catch = (reject: (e: unknown) => unknown) => Promise.resolve(defaultResult).catch(reject)
  q.finally = (fn: () => void) => Promise.resolve(defaultResult).finally(fn)

  // Mutation helpers — return new promises, not the fluent chain
  q.insert = jest.fn().mockResolvedValue({ data: null, error: null })
  q.upsert = jest.fn().mockResolvedValue({ data: null, error: null })
  q.update = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ data: null, error: null }),
  })
  q.delete = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ data: null, error: null }),
  })

  return q
}

/**
 * Creates a mock Supabase client.
 * `tableResults` maps table name → { data, error } that the query resolves to.
 * Tables not listed default to { data: [], error: null }.
 */
export function createMockSupabase(tableResults: Record<string, unknown> = {}) {
  return {
    from: jest.fn().mockImplementation((table: string) => {
      const result = tableResults[table] ?? { data: [], error: null }
      return createFluentQuery(result)
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('not authenticated'),
      }),
    },
  }
}

/** Build a NextRequest with an Authorization: Bearer header */
export function makeRequest(
  path: string,
  { secret, method = 'GET' }: { secret?: string; method?: string } = {}
) {
  const { NextRequest } = require('next/server') as typeof import('next/server')
  const headers: Record<string, string> = {}
  if (secret) headers['authorization'] = `Bearer ${secret}`
  return new NextRequest(`http://localhost${path}`, { method, headers })
}
