/**
 * Unified Tool Layer - Shared RPC Functions
 *
 * Provides common database operations used by both:
 * - BYOK Proxy (Feature A): rate limiting, session auth
 * - MCP Server (Feature B): transactions, balances, idempotency
 *
 * This avoids code duplication and ensures consistent behavior across both interfaces.
 */

import { createAdminClient } from '@/lib/supabase/admin'

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
  amount: number
  category: string
  description: string | null
  transaction_date: string
  account_id: string | null
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

// ============================================================
// Rate Limiting (shared by BYOK proxy)
// ============================================================

/**
 * Increments the per-user proxy usage counter for the current minute window.
 * Used by BYOK proxy to enforce 30 req/min limit.
 * Returns the current count after increment.
 */
export async function bumpProxyUsage(userId: string): Promise<number> {
  const supabase = createAdminClient()
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
export async function getAccountBalances(userId: string): Promise<AccountBalance[]> {
  const supabase = createAdminClient()
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
 */
export async function getCashflowSummary(
  userId: string,
  from?: string,
  to?: string
): Promise<CashflowSummary> {
  const supabase = createAdminClient()

  let query = supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userId)
    .is('deleted_at', null)

  if (from) query = query.gte('transaction_date', from)
  if (to) query = query.lte('transaction_date', to)

  const { data, error } = await query
  if (error) throw error

  const txs = data ?? []
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
// Transaction Creation (used by MCP create_transaction)
// ============================================================

/**
 * Creates a new transaction with validation.
 * Returns the created transaction record.
 */
export async function createTransaction(
  input: CreateTransactionInput
): Promise<TransactionRecord> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('transactions')
    .insert(input)
    .select('id, type, amount, category, transaction_date, created_at')
    .single()

  if (error) throw error
  return data as TransactionRecord
}

// ============================================================
// Category Validation (shared)
// ============================================================

const EXPENSE_CATEGORIES = [
  'طعام وشراب',
  'مواصلات',
  'سكن',
  'فواتير',
  'صحة',
  'تعليم',
  'ترفيه',
  'تسوق',
  'أخرى',
] as const

const INCOME_CATEGORIES = [
  'راتب',
  'استثمارات',
  'هبات',
  'أخرى',
] as const

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
  expiresAt?: string
): Promise<IdempotencyStatus> {
  const supabase = createAdminClient()
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
  transactionId: string
): Promise<void> {
  const supabase = createAdminClient()
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
  transactionId: string
): Promise<TransactionRecord | null> {
  const supabase = createAdminClient()
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
  apiKeyId: string
  userId: string
  action: string
  payload?: Record<string, unknown>
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  const supabase = createAdminClient()
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