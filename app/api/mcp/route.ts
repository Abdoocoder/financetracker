import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  McpServer,
  createMcpHandler,
  type AuthInfo,
  type McpRequestContext,
  type ServerContext,
} from '@modelcontextprotocol/server'
import { verifyApiKey } from '@/lib/api-keys'
import { rateLimit } from '@/lib/rate-limit'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types'
import {
  getAccountBalances,
  getCashflowSummary,
  createTransaction,
  validateCategory,
  getValidCategories,
  checkAndReserveIdempotencyKey,
  completeIdempotencyKey,
  getTransactionById,
  sanitizeDescription,
  writeAuditLog,
} from '@/lib/unified-tools'

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
  idempotency_key: z.string().min(1).max(128).optional(),
})

// ══════════════════════════════════════════════════════════
// Helpers (use unified-tools for shared functions)
// ══════════════════════════════════════════════════════════

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

// Required scope per tool — enforced at the HTTP layer (PRD §5.4: a key missing
// the scope for the invoked tool must receive 403 Forbidden, not a tool error).
const TOOL_SCOPES: Record<string, string> = {
  get_balances: 'read_balances',
  get_cashflow_summary: 'read_transactions',
  create_transaction: 'create_transaction',
}

/**
 * HTTP-level scope gate. Reads (a clone of) the JSON-RPC payload and, for every
 * `tools/call`, denies the request with 403 when the key lacks the required
 * scope. Unparseable bodies, non-POST methods, discovery methods and unknown
 * tools pass through to the SDK which returns its own JSON-RPC errors.
 */
async function enforceToolScope(
  request: NextRequest,
  scopes: string[]
): Promise<{ ok: boolean; status?: number; body?: unknown }> {
  if (request.method !== 'POST') return { ok: true }
  const body = await request.clone().text()
  if (!body) return { ok: true }

  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return { ok: true }
  }

  const calls = Array.isArray(payload) ? payload : [payload]
  for (const call of calls) {
    if (!call || typeof call !== 'object') continue
    const rpc = call as Record<string, unknown>
    const name = (rpc.params as Record<string, unknown> | undefined)?.name
    if (rpc.method !== 'tools/call' || typeof name !== 'string') continue

    const required = TOOL_SCOPES[name]
    if (required && !scopes.includes(required)) {
      return {
        ok: false,
        status: 403,
        body: {
          error: 'insufficient_scope',
          message: `API key lacks required scope "${required}" for tool "${name}"`,
          required_scope: required,
          tool: name,
        },
      }
    }
  }
  return { ok: true }
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
      const accounts = await getAccountBalances(userId)
      audit(keyId, userId, 'read_balances', { count: accounts.length })
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
      const summary = await getCashflowSummary(userId, args.from, args.to)
      audit(keyId, userId, 'read_transactions', {
        from: args.from ?? null,
        to: args.to ?? null,
        transaction_count: summary.transaction_count,
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
        "Create a new income or expense transaction for the authenticated user. Requires the 'create_transaction' scope. Accepts optional 'idempotency_key' to prevent duplicate transactions on retries.",
      inputSchema: createTransactionSchema,
    },
    async (args, ctx) => {
      const { userId, keyId } = requireScope(ctx, mcpCtx.authInfo, 'create_transaction')

      // Handle idempotency key if provided
      let idempotencyKeyHash: string | null = null
      if (args.idempotency_key) {
        const { createHash } = await import('crypto')
        idempotencyKeyHash = createHash('sha256').update(args.idempotency_key).digest('hex')

        const idemResult = await checkAndReserveIdempotencyKey(userId, idempotencyKeyHash)

        if (idemResult.status === 'duplicate') {
          // Return existing transaction
          const existingTxId = idemResult.transaction_id!
          const existingTx = await getTransactionById(userId, existingTxId)

          if (!existingTx) {
            return { content: [{ type: 'text', text: 'Original transaction not found' }], isError: true }
          }

          audit(keyId, userId, 'create_transaction_idempotent_replay', {
            transaction_id: existingTxId,
            idempotency_key_hash: idempotencyKeyHash,
          })

          return {
            content: [{ type: 'text', text: JSON.stringify({ ok: true, transaction: existingTx, idempotent_replay: true }) }],
            structuredContent: { ok: true, transaction: existingTx, idempotent_replay: true },
          }
        } else if (idemResult.status === 'processing') {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Transaction with this idempotency key is still being processed' }) }],
            isError: true,
          }
        }
        // status === 'available' - proceed to create
      }

      // Validate category
      if (!validateCategory(args.type, args.category)) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Invalid category',
                valid_expense: getValidCategories('expense'),
                valid_income: getValidCategories('income'),
              }),
            },
          ],
          isError: true,
        }
      }

      // Create the transaction
      const tx = await createTransaction({
        user_id: userId,
        type: args.type,
        amount: args.amount,
        category: args.category,
        description: sanitizeDescription(args.description),
        transaction_date: args.transaction_date,
        account_id: args.account_id ?? null,
      })

      // Complete idempotency key if provided
      if (idempotencyKeyHash) {
        try {
          await completeIdempotencyKey(userId, idempotencyKeyHash, tx.id)
        } catch (completeError) {
          console.error('[mcp] complete_idempotency_key error:', completeError)
          // Don't fail the request - transaction was created successfully
        }
      }

      audit(keyId, userId, 'create_transaction', {
        transaction_id: tx.id,
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        idempotency_key_hash: idempotencyKeyHash,
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

    // 2.5 HTTP-level scope enforcement — a key without the required scope gets
    // 403 Forbidden before the request reaches the MCP handler (PRD §5.4 / QA).
    const scopeGate = await enforceToolScope(request, keyData.scopes)
    if (!scopeGate.ok) {
      return NextResponse.json(scopeGate.body, { status: scopeGate.status ?? 403 })
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
