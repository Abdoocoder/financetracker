import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  McpServer,
  createMcpHandler,
  type AuthInfo,
  type McpRequestContext,
  type ServerContext,
} from '@modelcontextprotocol/server'
import { verifyApiKey, writeAuditLog } from '@/lib/api-keys'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types'

/**
 * Fajrak MCP Server (Feature B)
 *
 * Exposes three Model Context Protocol tools over Streamable HTTP using the
 * v2 `@modelcontextprotocol/server` SDK. Authentication uses the same
 * Personal Access Token (PAT) system as the REST webhook — `fjk_live_…`
 * tokens checked via `verifyApiKey` — with a per-key rate limit and mandated
 * `api_audit_log` entries.
 *
 * Scope vocabulary matches the existing API (not colon-style):
 *   - get_balances         → read_balances
 *   - get_cashflow_summary → read_transactions
 *   - create_transaction   → create_transaction
 *
 * The SDK performs no token verification of its own (`createMcpHandler`'
 * `authInfo` is strict pass-through), so this route authenticates + rate
 * limits BEFORE handing the request to the MCP handler, then forwards the
 * verified identity as `AuthInfo` for the tools to read via `ctx.http.authInfo`.
 */

const MCP_SERVER_NAME = 'fajrak'
const MCP_SERVER_VERSION = '1.0.0'

const MAX_DESCRIPTION_LENGTH = 500

// ══════════════════════════════════════════════════════════
// Tool input schemas (v2 `z.object({...})` form)
// ══════════════════════════════════════════════════════════
const getBalancesSchema = z.object({})
const getCashflowSummarySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD').optional(),
})
const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional().nullable(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  account_id: z.string().uuid().optional().nullable(),
})

const VALID_CATEGORIES: Set<string> = new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])

// ══════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════
function sanitizeDescription(desc: string | null | undefined): string | null {
  if (!desc) return null
  return desc
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'&]/g, '')
    .trim()
    .slice(0, MAX_DESCRIPTION_LENGTH)
}

/** Extract caller identity + metadata from the AuthInfo threaded into tool contexts. */
function callerFrom(ctx: ServerContext, fallbackAuth?: AuthInfo): {
  userId: string
  keyId: string
  scopes: string[]
} {
  const auth = ctx.http?.authInfo ?? fallbackAuth
  if (!auth) {
    throw new Error('Missing authInfo in MCP tool context')
  }
  const keyId =
    typeof auth.extra?.keyId === 'string' ? auth.extra.keyId : ''
  const userId = auth.clientId
  const scopes = auth.scopes ?? []
  return { userId, keyId, scopes }
}

function requireScope(
  ctx: ServerContext,
  fallbackAuth: AuthInfo | undefined,
  scope: string
): { userId: string; keyId: string } {
  const caller = callerFrom(ctx, fallbackAuth)
  if (!caller.scopes.includes(scope)) {
    throw new Error(`insufficient_scope: missing ${scope}`)
  }
  return { userId: caller.userId, keyId: caller.keyId }
}

/** Fire-and-forget audit log entry (never blocks the tool result). */
function audit(
  keyId: string,
  userId: string,
  action: string,
  payload?: Record<string, unknown>
): void {
  writeAuditLog({ apiKeyId: keyId, userId, action, payload }).catch(() => {})
}

// ══════════════════════════════════════════════════════════
// MCP handler factory — one fresh McpServer per request, keyed on authInfo
// ══════════════════════════════════════════════════════════
const mcpHandler = createMcpHandler((mcpCtx: McpRequestContext) => {
  const server = new McpServer({ name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION })

  // ── get_balances ─────────────────────────────────────────
  server.registerTool(
    'get_balances',
    {
      title: 'Get Account Balances',
      description:
        "Return the current balance of every account belonging to the authenticated user. Requires the 'read_balances' scope.",
      inputSchema: getBalancesSchema,
    },
    async (_args, ctx) => {
      const { userId, keyId } = requireScope(ctx, mcpCtx.authInfo, 'read_balances')
      const supabase = createAdminClient()
      const { data, error } = await supabase.rpc('get_account_balances', {
        p_user_id: userId,
      })
      if (error) {
        return {
          content: [{ type: 'text', text: 'Failed to fetch balances' }],
          isError: true,
        }
      }
      audit(keyId, userId, 'read_balances', { count: Array.isArray(data) ? data.length : 0 })
      const accounts = data ?? []
      return {
        content: [{ type: 'text', text: JSON.stringify({ ok: true, accounts }) }],
        structuredContent: { ok: true, accounts },
      }
    }
  )

  // ── get_cashflow_summary ─────────────────────────────────
  server.registerTool(
    'get_cashflow_summary',
    {
      title: 'Get Cash Flow Summary',
      description:
        "Aggregate income and expense totals over an optional date range (inclusive). Requires the 'read_transactions' scope.",
      inputSchema: getCashflowSummarySchema,
    },
    async (args, ctx) => {
      const { userId, keyId } = requireScope(ctx, mcpCtx.authInfo, 'read_transactions')
      const supabase = createAdminClient()

      let query = supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', userId)
        .is('deleted_at', null)

      if (args.from) query = query.gte('transaction_date', args.from)
      if (args.to) query = query.lte('transaction_date', args.to)

      const { data, error } = await query
      if (error) {
        return { content: [{ type: 'text', text: 'Failed to fetch cash flow' }], isError: true }
      }

      const txs = data ?? []
      let income = 0
      let expense = 0
      for (const tx of txs) {
        if (tx.type === 'income') income += tx.amount
        else if (tx.type === 'expense') expense += tx.amount
      }
      const summary = {
        ok: true,
        period: { from: args.from ?? null, to: args.to ?? null },
        income,
        expense,
        net: income - expense,
        transaction_count: txs.length,
      }
      audit(keyId, userId, 'read_transactions', {
        from: args.from ?? null,
        to: args.to ?? null,
        transaction_count: txs.length,
      })
      return {
        content: [{ type: 'text', text: JSON.stringify(summary) }],
        structuredContent: summary,
      }
    }
  )

  // ── create_transaction ───────────────────────────────────
  server.registerTool(
    'create_transaction',
    {
      title: 'Create Transaction',
      description:
        "Create a new income or expense transaction for the authenticated user. Requires the 'create_transaction' scope.",
      inputSchema: createTransactionSchema,
    },
    async (args, ctx) => {
      const { userId, keyId } = requireScope(ctx, mcpCtx.authInfo, 'create_transaction')

      if (!VALID_CATEGORIES.has(args.category)) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Invalid category',
                valid_expense: [...EXPENSE_CATEGORIES],
                valid_income: [...INCOME_CATEGORIES],
              }),
            },
          ],
          isError: true,
        }
      }

      const supabase = createAdminClient()
      const { data: tx, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: args.type,
          amount: args.amount,
          category: args.category,
          description: sanitizeDescription(args.description),
          transaction_date: args.transaction_date,
          account_id: args.account_id ?? null,
        })
        .select('id, type, amount, category, transaction_date, created_at')
        .single()

      if (error) {
        return { content: [{ type: 'text', text: 'Failed to create transaction' }], isError: true }
      }

      audit(keyId, userId, 'create_transaction', {
        transaction_id: tx.id,
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
      })
      return {
        content: [{ type: 'text', text: JSON.stringify({ ok: true, transaction: tx }) }],
        structuredContent: { ok: true, transaction: tx },
      }
    }
  )

  return server
})

// ══════════════════════════════════════════════════════════
// Shared request wrapper — authenticate + rate limit, then MCP
// ══════════════════════════════════════════════════════════
async function handle(request: NextRequest): Promise<Response> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header. Expected: Bearer fjk_live_...' },
        { status: 401 }
      )
    }
    const apiKey = authHeader.slice(7)

    // 1. Verify PAT (covers revoked/expired keys) and get identity + scopes
    const keyData = await verifyApiKey(apiKey)
    if (!keyData) {
      return NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401 })
    }

    // 2. Per-key rate limit
    const rl = rateLimit(request, {
      limit: keyData.rateLimitPerMin,
      windowMs: 60_000,
      identifier: `mcp:${keyData.keyId}`,
    })
    if (!rl.ok) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rl.headers })
    }

    // 3. Thread verified identity into the MCP handler as AuthInfo
    const authInfo: AuthInfo = {
      token: apiKey,
      clientId: keyData.userId,
      scopes: keyData.scopes,
      extra: { keyId: keyData.keyId, rateLimitPerMin: keyData.rateLimitPerMin },
    }

    return await mcpHandler.fetch(request, { authInfo })
  } catch (err) {
    console.error('[mcp] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
export const DELETE = handle
export const OPTIONS = handle
