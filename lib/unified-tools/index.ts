/**
 * Unified Tool Layer - Shared RPC Functions
 *
 * Provides common database operations used by both:
 * - BYOK Proxy (Feature A): rate limiting, session auth
 * - MCP Server (Feature B): transactions, balances, idempotency
 * - Agent loop (Feature C): same operations, but RLS-bound
 *
 * Client resolution (Critical Rule 5)
 * -----------------------------------
 * Every function takes an optional `ToolContext`:
 *
 *   - Agent loop  → `{ client }` where `client` is built from the user's
 *                   session (`createClient()` / Bearer JWT), so PostgreSQL
 *                   RLS applies and `auth.uid() = user_id` is enforced.
 *   - MCP / PATs  → omit the context; the service-role admin client is used
 *                   exactly as before (scope + audit checks happen in the
 *                   route before these helpers run).
 *
 * Omitting the context is the only way to reach the admin client, so an agent
 * call site cannot fall back to it by accident.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchExchangeRateServer } from '@/lib/exchange-rate'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types'

// ============================================================
// Client resolution
// ============================================================

/**
 * Execution context shared by every tool function.
 * Provide `client` to run under RLS (agent loop); omit it for the
 * service-role MCP/PAT path.
 */
export interface ToolContext {
  client?: SupabaseClient
}

/**
 * Returns the caller's RLS client when supplied, otherwise the service-role
 * admin client (MCP/PAT/cron paths).
 */
export function resolveClient(ctx?: ToolContext): SupabaseClient {
  return ctx?.client ?? createAdminClient()
}

// ============================================================
// Types
// ============================================================

export interface AccountBalance {
  id: string
  name: string
  type: string
  currency: string
  balance: number
}

export interface CreateTransactionInput {
  user_id: string
  type: 'income' | 'expense'
  /**
   * Amount as entered by the user — in `original_currency` when supplied,
   * otherwise in the user's profile (base) currency. The stored `amount`
   * column is always the base-currency equivalent.
   */
  amount: number
  category: string
  description: string | null
  transaction_date: string
  account_id: string | null
  /** Currency the amount was entered in. Defaults to the profile currency. */
  original_currency?: string | null
  /**
   * Explicit `original_currency` → profile-currency rate. When omitted for a
   * foreign currency the rate is fetched from the FX provider. Never inferred
   * from the caller's input alone: a write fails closed without a valid rate.
   */
  exchange_rate?: number | null
}

export interface TransactionRecord {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  transaction_date: string
  created_at: string
}

export interface CashflowSummary {
  ok: true
  period: { from: string | null; to: string | null }
  income: number
  expense: number
  net: number
  transaction_count: number
}

export interface IdempotencyStatus {
  status: 'available' | 'duplicate' | 'processing'
  transaction_id?: string
}

/** Fallback used when a profile row is missing; matches `profiles.currency`. */
const DEFAULT_CURRENCY = 'JOD'

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

// ============================================================
// Profile helpers
// ============================================================

/**
 * Reads the user's base currency. Uses the caller's client, so under RLS only
 * the user's own profile row is visible.
 */
export async function getProfileCurrency(userId: string, ctx?: ToolContext): Promise<string> {
  const supabase = resolveClient(ctx)
  const { data, error } = await supabase
    .from('profiles')
    .select('currency')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return (data?.currency || DEFAULT_CURRENCY).toUpperCase()
}

// ============================================================
// Rate Limiting (shared by BYOK proxy)
// ============================================================

/**
 * Increments the per-user proxy usage counter for the current minute window.
 * Used by BYOK proxy to enforce 30 req/min limit.
 * Returns the current count after increment.
 */
export async function bumpProxyUsage(userId: string, ctx?: ToolContext): Promise<number> {
  const supabase = resolveClient(ctx)
  const { data, error } = await supabase.rpc('bump_proxy_usage', {
    p_user_id: userId,
  })
  if (error) throw error
  return data as number
}

// ============================================================
// Account Balances (used by MCP get_balances)
// ============================================================

/**
 * Fetches all account balances for a user.
 * Uses the optimized RPC from migration 048.
 */
export async function getAccountBalances(
  userId: string,
  ctx?: ToolContext
): Promise<AccountBalance[]> {
  const supabase = resolveClient(ctx)
  const { data, error } = await supabase.rpc('get_account_balances', {
    p_user_id: userId,
  })
  if (error) throw error
  return (data as AccountBalance[]) ?? []
}

// ============================================================
// Cash Flow Summary (used by MCP get_cashflow_summary)
// ============================================================

/**
 * Aggregates income and expense totals over an optional date range.
 *
 * NOTE: This is a TypeScript helper that queries `transactions` directly via
 * PostgREST. There is intentionally NO `get_cashflow_summary` RPC in the
 * database — the aggregation is simple enough that PostgREST handles it, and
 * it needs to run with different client contexts (MCP tool with PAT-scoped
 * admin client, agent tool with JWT-scoped client). Adding an RPC would
 * require either two grants layers or a caller-context branch.
 *
 * Do not "fix" this by adding an RPC unless you can prove a perf win over
 * PostgREST's aggregation on a narrow index scan.
 *
 * Confirmed 2026-10-24 (recon-4): zero callers of `rpc('get_cashflow_summary', ...)`.
 */
export async function getCashflowSummary(
  userId: string,
  from?: string,
  to?: string,
  ctx?: ToolContext
): Promise<CashflowSummary> {
  const supabase = resolveClient(ctx)

  let query = supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userId)
    .is('deleted_at', null)

  if (from) query = query.gte('transaction_date', from)
  if (to) query = query.lte('transaction_date', to)

  const { data, error } = await query
  if (error) throw error

  const txs = (data ?? []) as Array<{ type: 'income' | 'expense'; amount: number }>
  let income = 0
  let expense = 0
  for (const tx of txs) {
    if (tx.type === 'income') income += tx.amount
    else if (tx.type === 'expense') expense += tx.amount
  }

  return {
    ok: true,
    period: { from: from ?? null, to: to ?? null },
    income,
    expense,
    net: income - expense,
    transaction_count: txs.length,
  }
}

// ============================================================
// Transaction Creation (used by MCP + agent create_transaction)
// ============================================================

/**
 * Creates a new transaction with validation.
 *
 * Multi-currency contract (matches the web/mobile insert paths):
 *   - `amount` (column)            = entered amount × exchange rate
 *   - `original_amount` (column)   = entered amount
 *   - `original_currency` (column) = entered currency
 *   - `exchange_rate` (column)     = entered → profile-currency rate
 *
 * All three columns are always written. Previous versions inserted the input
 * object verbatim, leaving the trio NULL and corrupting base-currency totals.
 */
export async function createTransaction(
  input: CreateTransactionInput,
  ctx?: ToolContext
): Promise<TransactionRecord> {
  const supabase = resolveClient(ctx)
  const profileCurrency = await getProfileCurrency(input.user_id, { client: supabase })

  const originalCurrency = (input.original_currency || profileCurrency).toUpperCase()
  const isBaseCurrency = originalCurrency === profileCurrency

  let exchangeRate: number
  if (isBaseCurrency) {
    // Same currency: the stored rate is always 1, even if a stale one is passed.
    exchangeRate = 1
  } else if (input.exchange_rate != null) {
    exchangeRate = input.exchange_rate
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      throw new Error(`Invalid exchange_rate for ${originalCurrency} -> ${profileCurrency}`)
    }
  } else {
    const fetched = await fetchExchangeRateServer(originalCurrency, profileCurrency)
    if (!fetched) {
      // Fail closed: never write a foreign amount at an unknown rate.
      throw new Error(
        `Could not determine exchange rate ${originalCurrency} -> ${profileCurrency}`
      )
    }
    exchangeRate = fetched
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: input.user_id,
      type: input.type,
      amount: roundCurrency(input.amount * exchangeRate),
      original_amount: input.amount,
      original_currency: originalCurrency,
      exchange_rate: exchangeRate,
      category: input.category,
      description: input.description,
      transaction_date: input.transaction_date,
      account_id: input.account_id,
    })
    .select('id, type, amount, original_amount, original_currency, exchange_rate, category, transaction_date, created_at')
    .single()

  if (error) throw error
  return data as TransactionRecord
}

// ============================================================
// Category Validation (shared)
// ============================================================
//
// Single source of truth: the same constants the web UI and the REST webhook
// (`app/api/webhook/transaction/route.ts`) use. The previous private copies
// here were stale (missing 'إيجار / قسط', 'صلة رحم', 'عمل حر', ...), so a valid
// client category could be rejected by the tool layer.

export function validateCategory(type: 'income' | 'expense', category: string): boolean {
  const validForType = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  return (validForType as readonly string[]).includes(category)
}

export function getValidCategories(type: 'income' | 'expense'): readonly string[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

// ============================================================
// Idempotency (used by MCP create_transaction)
// ============================================================

/**
 * Checks and reserves an idempotency key.
 * Returns status: 'available' (new), 'duplicate' (existing with transaction), 'processing' (existing, no transaction yet)
 */
export async function checkAndReserveIdempotencyKey(
  userId: string,
  keyHash: string,
  expiresAt?: string,
  ctx?: ToolContext
): Promise<IdempotencyStatus> {
  const supabase = resolveClient(ctx)
  const { data, error } = await supabase.rpc('check_and_reserve_idempotency_key', {
    p_user_id: userId,
    p_key_hash: keyHash,
    p_expires_at: expiresAt,
  })
  if (error) throw error
  return data as IdempotencyStatus
}

/**
 * Marks an idempotency key as completed with the created transaction ID.
 */
export async function completeIdempotencyKey(
  userId: string,
  keyHash: string,
  transactionId: string,
  ctx?: ToolContext
): Promise<void> {
  const supabase = resolveClient(ctx)
  const { error } = await supabase.rpc('complete_idempotency_key', {
    p_user_id: userId,
    p_key_hash: keyHash,
    p_transaction_id: transactionId,
  })
  if (error) throw error
}

/**
 * Fetches an existing transaction by ID for idempotent replay.
 */
export async function getTransactionById(
  userId: string,
  transactionId: string,
  ctx?: ToolContext
): Promise<TransactionRecord | null> {
  const supabase = resolveClient(ctx)
  const { data, error } = await supabase
    .from('transactions')
    .select('id, type, amount, category, transaction_date, created_at')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data as TransactionRecord | null
}

// ============================================================
// Sanitization (shared)
// ============================================================

const MAX_DESCRIPTION_LENGTH = 500

export function sanitizeDescription(desc: string | null | undefined): string | null {
  if (!desc) return null
  return desc
    .replace(/<[^>]*>/g, '')
    .replace(/[<>\"'&]/g, '')
    .trim()
    .slice(0, MAX_DESCRIPTION_LENGTH)
}

// ============================================================
// Audit Logging (shared)
// ============================================================

export interface AuditLogEntry {
  /** `null` for session-authenticated agent calls (no PAT involved). */
  apiKeyId: string | null
  userId: string
  action: string
  payload?: Record<string, unknown>
}

export async function writeAuditLog(entry: AuditLogEntry, ctx?: ToolContext): Promise<void> {
  const supabase = resolveClient(ctx)
  const { error } = await supabase.from('api_audit_log').insert({
    api_key_id: entry.apiKeyId,
    user_id: entry.userId,
    action: entry.action,
    payload: entry.payload ?? {},
  })
  if (error) {
    // Audit log failure should not block the main operation
    console.error('[unified-tools] audit log failed:', error.message)
  }
}
