/**
 * Agent Tool Registry (Phase B, Step 1)
 *
 * The single bridge between an LLM tool call and Fajrak's data layer. Each
 * entry carries:
 *   - `parameters` — the JSON Schema advertised to the provider (what the
 *     model is allowed to send)
 *   - `schema`     — the Zod schema this process actually accepts (the
 *     provider's output is untrusted; never skip this)
 *   - `kind` / `scope` / `requiresConfirmation` — policy metadata used by the
 *     loop in Step 2 (a `write` tool may not run without `confirmed: true`)
 *   - `execute`    — the implementation, bound to the caller's RLS client
 *
 * Design rules:
 *   - No service-role client is constructed here. Executors only use
 *     `ctx.client`, which the agent route builds from the user's session
 *     (Critical Rule 5).
 *   - All aggregation math lives in SQL RPCs (Critical Rules 10/11). The
 *     registry never computes Zakat, Nisab, or Hawl values.
 *   - The model never invents an FX rate: `create_transaction` converts
 *     through `lib/unified-tools` → `lib/exchange-rate` and fails closed when
 *     no rate is available.
 */

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchExchangeRateServer } from '@/lib/exchange-rate'
import {
  createTransaction,
  getBudgets,
  getDebts,
  getGoals,
  getProfileCurrency,
  getRecentTransactions,
  getValidCategories,
  sanitizeDescription,
  validateCategory,
} from '@/lib/unified-tools'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types'

// ============================================================
// Public types
// ============================================================

export type AgentToolKind = 'read' | 'write'

/** Mirrors the PAT scope vocabulary used by the MCP server. */
export type AgentToolScope = 'read_transactions' | 'read_balances' | 'create_transaction'

export interface AgentToolContext {
  /** The authenticated user. RLS enforces `auth.uid() = user_id`. */
  userId: string
  /** Session-bound client (never the service-role client). */
  client: SupabaseClient
  /**
   * Explicit user approval for a write tool. Set to `true` only after the user
   * has seen and approved the pending action — never from model output.
   */
  confirmed?: boolean
  /** PAT id when the call originates from an API key; `null` for sessions. */
  apiKeyId?: string | null
}

/** Minimal JSON Schema shape accepted by OpenAI/Anthropic/Gemini tool APIs. */
export interface AgentToolParameters {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
  additionalProperties: false
}

export interface AgentTool {
  name: string
  description: string
  kind: AgentToolKind
  scope: AgentToolScope
  requiresConfirmation: boolean
  parameters: AgentToolParameters
  schema: z.ZodType
  execute(args: unknown, ctx: AgentToolContext): Promise<unknown>
}

// ============================================================
// get_spending_breakdown
// ============================================================

const spendingBreakdownSchema = z.strictObject({
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
})

const getSpendingBreakdownTool: AgentTool = {
  name: 'get_spending_breakdown',
  description:
    "Return the user's expenses for one month grouped by category, with each category's budget limit, remaining budget, and percent used. Amounts are in the user's profile currency. Defaults to the current month when no year/month is given. Use this for questions like 'how much did I spend on food this month?' or 'where is my budget leaking?'.",
  kind: 'read',
  scope: 'read_transactions',
  requiresConfirmation: false,
  parameters: {
    type: 'object',
    properties: {
      year: {
        type: 'integer',
        minimum: 2000,
        maximum: 2100,
        description: 'Gregorian year, e.g. 2026. Defaults to the current year.',
      },
      month: {
        type: 'integer',
        minimum: 1,
        maximum: 12,
        description: 'Month number 1-12. Defaults to the current month.',
      },
    },
    required: [],
    additionalProperties: false,
  },
  schema: spendingBreakdownSchema,
  async execute(args, ctx) {
    const input = spendingBreakdownSchema.parse(args)
    const now = new Date()
    const year = input.year ?? now.getUTCFullYear()
    const month = input.month ?? now.getUTCMonth() + 1

    const { data, error } = await ctx.client.rpc('get_spending_breakdown', {
      p_user_id: ctx.userId,
      p_year: year,
      p_month: month,
    })
    if (error) throw error
    return data
  },
}

// ============================================================
// get_financial_snapshot
// ============================================================

const financialSnapshotSchema = z.strictObject({
  usd_to_local_rate: z.number().positive().optional(),
  gold_price_per_gram: z.number().positive().optional(),
  silver_price_per_gram: z.number().positive().optional(),
})

const getFinancialSnapshotTool: AgentTool = {
  name: 'get_financial_snapshot',
  description:
    "Return the user's complete financial position: net worth, account balances, investments, goals, debts, unread alerts and health score (from get_financial_dashboard), plus active Zakat hauls and their due dates (from get_zakat_hauls). Pass gold_price_per_gram and silver_price_per_gram to also receive the full Zakat calculation (get_zakat_summary). Never compute Zakat, Nisab or Hawl yourself — always read the RPC values.",
  kind: 'read',
  scope: 'read_balances',
  requiresConfirmation: false,
  parameters: {
    type: 'object',
    properties: {
      usd_to_local_rate: {
        type: 'number',
        exclusiveMinimum: 0,
        description:
          'USD to profile-currency rate used to convert investments. Omit to let the server fetch the current rate.',
      },
      gold_price_per_gram: {
        type: 'number',
        exclusiveMinimum: 0,
        description: 'Current gold price per gram in the profile currency. Required for Zakat.',
      },
      silver_price_per_gram: {
        type: 'number',
        exclusiveMinimum: 0,
        description: 'Current silver price per gram in the profile currency. Required for Zakat.',
      },
    },
    required: [],
    additionalProperties: false,
  },
  schema: financialSnapshotSchema,
  async execute(args, ctx) {
    const input = financialSnapshotSchema.parse(args)

    const currency = await getProfileCurrency(ctx.userId, { client: ctx.client })

    let usdToLocalRate = input.usd_to_local_rate
    if (usdToLocalRate == null) {
      if (currency === 'USD') {
        usdToLocalRate = 1
      } else {
        // Server-side lookup: the model must not invent an FX rate.
        usdToLocalRate = (await fetchExchangeRateServer('USD', currency)) ?? 1
      }
    }

    const [dashboard, hauls] = await Promise.all([
      ctx.client.rpc('get_financial_dashboard', {
        p_user_id: ctx.userId,
        p_usd_to_local_rate: usdToLocalRate,
      }),
      ctx.client.rpc('get_zakat_hauls', { p_user_id: ctx.userId }),
    ])

    if (dashboard.error) throw dashboard.error
    if (hauls.error) throw hauls.error

    const snapshot: Record<string, unknown> = {
      ok: true,
      currency,
      usd_to_local_rate: usdToLocalRate,
      dashboard: dashboard.data,
      zakat_hauls: hauls.data,
    }

    if (input.gold_price_per_gram != null && input.silver_price_per_gram != null) {
      const zakat = await ctx.client.rpc('get_zakat_summary', {
        p_user_id: ctx.userId,
        p_gold_price_per_gram: input.gold_price_per_gram,
        p_silver_price_per_gram: input.silver_price_per_gram,
        p_usd_to_local_rate: usdToLocalRate,
      })
      if (zakat.error) throw zakat.error
      snapshot.zakat = zakat.data
    }

    return snapshot
  },
}

// ============================================================
// Phase 1 read tools — debts, budgets, goals, recent transactions
// ============================================================
//
// Each tool is a pure pass-through to an RPC (the executors do no math), which
// keeps a single source of truth for balances and aggregation. Scopes follow
// the existing PAT vocabulary; all four are reads and never need confirmation.

const getDebtsSchema = z.strictObject({})

const getDebtsTool: AgentTool = {
  name: 'get_debts',
  description:
    "List the user's active debts and receivables: remaining balance, monthly payment, end date and next due date. Unpaid and soft-deleted rows are handled by the server. Amounts are in the user's profile currency. Use this for questions like 'how much debt do I still owe?' or 'which payment is due next?'.",
  kind: 'read',
  scope: 'read_balances',
  requiresConfirmation: false,
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  schema: getDebtsSchema,
  async execute(args, ctx) {
    getDebtsSchema.parse(args)
    return getDebts(ctx.userId, { client: ctx.client })
  },
}

const getBudgetsSchema = z.strictObject({
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
})

const getBudgetsTool: AgentTool = {
  name: 'get_budgets',
  description:
    "Return the user's budgets for one month: each category's limit, actual spend, remaining amount and percent used. Only categories that have a budget are returned. Amounts are in the user's profile currency. Defaults to the current month. Use this for questions like 'am I over budget?' or 'how much is left for food this month?'.",
  kind: 'read',
  scope: 'read_transactions',
  requiresConfirmation: false,
  parameters: {
    type: 'object',
    properties: {
      year: {
        type: 'integer',
        minimum: 2000,
        maximum: 2100,
        description: 'Gregorian year, e.g. 2026. Defaults to the current year.',
      },
      month: {
        type: 'integer',
        minimum: 1,
        maximum: 12,
        description: 'Month number 1-12. Defaults to the current month.',
      },
    },
    required: [],
    additionalProperties: false,
  },
  schema: getBudgetsSchema,
  async execute(args, ctx) {
    const input = getBudgetsSchema.parse(args)
    const now = new Date()
    const year = input.year ?? now.getUTCFullYear()
    const month = input.month ?? now.getUTCMonth() + 1
    return getBudgets(ctx.userId, year, month, { client: ctx.client })
  },
}

const getGoalsSchema = z.strictObject({})

const getGoalsTool: AgentTool = {
  name: 'get_goals',
  description:
    "List the user's savings goals with target amount, amount saved so far, target date and percent complete. Amounts are in the user's profile currency. Use this for questions like 'how close am I to my goal?' or 'when will I finish saving for X?'.",
  kind: 'read',
  scope: 'read_balances',
  requiresConfirmation: false,
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  schema: getGoalsSchema,
  async execute(args, ctx) {
    getGoalsSchema.parse(args)
    return getGoals(ctx.userId, { client: ctx.client })
  },
}

const getRecentTransactionsSchema = z.strictObject({
  limit: z.number().int().min(1).max(50).optional(),
})

const getRecentTransactionsTool: AgentTool = {
  name: 'get_recent_transactions',
  description:
    "Return the user's most recent income and expense transactions, newest first: base-currency amount, type, category, description, date, plus the original amount and currency the user entered. Transfers are excluded and soft-deleted rows are hidden. Defaults to 10 rows (max 50). Use this for questions like 'what did I spend on yesterday?' or 'show my last transactions'.",
  kind: 'read',
  scope: 'read_transactions',
  requiresConfirmation: false,
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 50,
        description: 'How many transactions to return (1-50). Defaults to 10.',
      },
    },
    required: [],
    additionalProperties: false,
  },
  schema: getRecentTransactionsSchema,
  async execute(args, ctx) {
    const input = getRecentTransactionsSchema.parse(args)
    return getRecentTransactions(ctx.userId, input.limit ?? 10, { client: ctx.client })
  },
}

// ============================================================
// create_transaction (write — confirmation-gated)
// ============================================================

const TRANSACTION_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES] as const

const createTransactionSchema = z
  .strictObject({
    type: z.enum(['income', 'expense']),
    amount: z.number().positive(),
    currency: z
      .string()
      .regex(/^[A-Za-z]{3}$/, 'currency must be a 3-letter ISO 4217 code')
      .optional(),
    category: z.string().min(1).max(100),
    description: z.string().max(500).nullable().optional(),
    transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    account_id: z.uuid().nullable().optional(),
  })
  .superRefine((value, refinement) => {
    if (!validateCategory(value.type, value.category)) {
      refinement.addIssue({
        code: 'custom',
        path: ['category'],
        message: `Invalid category for a ${value.type}. Valid categories: ${getValidCategories(
          value.type
        ).join(', ')}`,
      })
    }
  })

const createTransactionTool: AgentTool = {
  name: 'create_transaction',
  description:
    "Prepare a new income or expense transaction. This is a write action: it only runs after the user explicitly confirms the exact amount, currency, category and date in the conversation. `amount` is in `currency` (or the profile currency when omitted); the server converts it and stores the original amount, currency and exchange rate.",
  kind: 'write',
  scope: 'create_transaction',
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['income', 'expense'] },
      amount: {
        type: 'number',
        exclusiveMinimum: 0,
        description: 'Positive amount in `currency` (or the profile currency).',
      },
      currency: {
        type: 'string',
        pattern: '^[A-Za-z]{3}$',
        description: 'ISO 4217 code the user entered, e.g. USD. Defaults to the profile currency.',
      },
      category: {
        type: 'string',
        enum: TRANSACTION_CATEGORIES,
        description:
          'Must belong to the selected type: expense and income have different category sets.',
      },
      description: {
        type: ['string', 'null'],
        maxLength: 500,
        description: 'Optional short note.',
      },
      transaction_date: {
        type: 'string',
        format: 'date',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'Date in YYYY-MM-DD.',
      },
      account_id: {
        type: ['string', 'null'],
        format: 'uuid',
        description: 'Optional account id; omit for the default cash flow.',
      },
    },
    required: ['type', 'amount', 'category', 'transaction_date'],
    additionalProperties: false,
  },
  schema: createTransactionSchema,
  async execute(args, ctx) {
    const input = createTransactionSchema.parse(args)

    // The confirmation gate is enforced here, not only by the loop: even a
    // caller that bypasses the policy layer cannot write without approval.
    if (!ctx.confirmed) {
      throw new Error(
        'create_transaction requires explicit user confirmation (confirmed: true)'
      )
    }

    // Defence in depth: re-validate the pairing against the live category lists.
    if (!validateCategory(input.type, input.category)) {
      throw new Error(`Invalid category for a ${input.type}: ${input.category}`)
    }

    const transaction = await createTransaction(
      {
        user_id: ctx.userId,
        type: input.type,
        amount: input.amount,
        original_currency: input.currency ?? null,
        category: input.category,
        description: sanitizeDescription(input.description ?? null),
        transaction_date: input.transaction_date,
        account_id: input.account_id ?? null,
      },
      { client: ctx.client }
    )

    return { ok: true, transaction }
  },
}

// ============================================================
// Registry
// ============================================================

export const AGENT_TOOLS: readonly AgentTool[] = [
  getSpendingBreakdownTool,
  getFinancialSnapshotTool,
  getDebtsTool,
  getBudgetsTool,
  getGoalsTool,
  getRecentTransactionsTool,
  createTransactionTool,
]

const AGENT_TOOLS_BY_NAME = new Map(AGENT_TOOLS.map((tool) => [tool.name, tool]))

export function getAgentTool(name: string): AgentTool | undefined {
  return AGENT_TOOLS_BY_NAME.get(name)
}
