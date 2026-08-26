import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyApiKey, writeAuditLog } from '@/lib/api-keys'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types'

const MAX_DESCRIPTION_LENGTH = 500
const MAX_PAYLOAD_BYTES = 1024
const MAX_READ_LIMIT = 50

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional().nullable(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  account_id: z.string().uuid().optional().nullable(),
})

type TransactionBody = z.infer<typeof transactionSchema>

const VALID_CATEGORIES: Set<string> = new Set([
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
])

function sanitizeDescription(desc: string | null | undefined): string | null {
  if (!desc) return null
  return desc
    .replace(/<[^>]*>/g, '')       // strip HTML tags
    .replace(/[<>"'&]/g, '')       // strip dangerous chars
    .trim()
    .slice(0, MAX_DESCRIPTION_LENGTH)
}

/** Shared: extract + verify API key from Authorization header. Returns null if invalid. */
async function authenticateKey(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return verifyApiKey(authHeader.slice(7))
}

// ══════════════════════════════════════════════════════════
// GET — Read transactions or balances (requires read scope)
// ══════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {
  try {
    const keyData = await authenticateKey(request)
    if (!keyData) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
    }

    const action = request.nextUrl.searchParams.get('action') ?? 'transactions'

    // Scope check
    const requiredScope = action === 'balances' ? 'read_balances' : 'read_transactions'
    if (!keyData.scopes.includes(requiredScope)) {
      return NextResponse.json(
        { error: `API key does not have ${requiredScope} scope` },
        { status: 403 }
      )
    }

    // Rate limit
    const rl = rateLimit(request, {
      limit: keyData.rateLimitPerMin,
      windowMs: 60_000,
      identifier: `webhook:${keyData.keyId}`,
    })
    if (!rl.ok) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rl.headers })
    }

    const supabase = createAdminClient()

    if (action === 'balances') {
      const { data, error } = await supabase.rpc('get_account_balances', {
        p_user_id: keyData.userId,
      })
      if (error) {
        return NextResponse.json({ error: 'Failed to fetch balances' }, { status: 500 })
      }

      writeAuditLog({
        apiKeyId: keyData.keyId,
        userId: keyData.userId,
        action: 'read_balances',
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      }).catch(() => {})

      return NextResponse.json({ ok: true, accounts: data })
    }

    // Default: read transactions
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10) || 20,
      MAX_READ_LIMIT
    )
    const offset = parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10) || 0
    const type = request.nextUrl.searchParams.get('type') // 'income' | 'expense' | null
    const category = request.nextUrl.searchParams.get('category')
    const from = request.nextUrl.searchParams.get('from') // YYYY-MM-DD
    const to = request.nextUrl.searchParams.get('to')     // YYYY-MM-DD

    let query = supabase
      .from('transactions')
      .select('id, type, amount, category, description, transaction_date, account_id, created_at')
      .eq('user_id', keyData.userId)
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type === 'income' || type === 'expense') query = query.eq('type', type)
    if (category) query = query.eq('category', category)
    if (from) query = query.gte('transaction_date', from)
    if (to) query = query.lte('transaction_date', to)

    const { data: txs, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    writeAuditLog({
      apiKeyId: keyData.keyId,
      userId: keyData.userId,
      action: 'read_transactions',
      payload: { limit, offset, type, category, from, to, count: txs?.length ?? 0 },
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    }).catch(() => {})

    return NextResponse.json({ ok: true, transactions: txs, count: txs?.length ?? 0 })
  } catch (err) {
    console.error('[webhook/transaction] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // ── 1. Extract API key ────────────────────────────
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header. Expected: Bearer fjk_live_...' },
        { status: 401 }
      )
    }
    const apiKey = authHeader.slice(7)

    // ── 2. Verify API key ─────────────────────────────
    const keyData = await verifyApiKey(apiKey)
    if (!keyData) {
      return NextResponse.json(
        { error: 'Invalid or revoked API key' },
        { status: 401 }
      )
    }

    // ── 3. Check scope ────────────────────────────────
    if (!keyData.scopes.includes('create_transaction')) {
      return NextResponse.json(
        { error: 'API key does not have create_transaction scope' },
        { status: 403 }
      )
    }

    // ── 4. Rate limit (per API key) ───────────────────
    const rl = rateLimit(request, {
      limit: keyData.rateLimitPerMin,
      windowMs: 60_000,
      identifier: `webhook:${keyData.keyId}`,
    })
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rl.headers }
      )
    }

    // ── 5. Parse + validate body ──────────────────────
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: `Payload too large. Maximum: ${MAX_PAYLOAD_BYTES} bytes` },
        { status: 413 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const parsed = transactionSchema.safeParse(body)
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      )
    }

    const data: TransactionBody = parsed.data

    // ── 6. Validate category ──────────────────────────
    if (!VALID_CATEGORIES.has(data.category)) {
      return NextResponse.json(
        {
          error: 'Invalid category',
          valid_expense: [...EXPENSE_CATEGORIES],
          valid_income: [...INCOME_CATEGORIES],
        },
        { status: 400 }
      )
    }

    // ── 7. Insert transaction (admin client) ──────────
    const supabase = createAdminClient()
    const { data: tx, error: insertError } = await supabase
      .from('transactions')
      .insert({
        user_id: keyData.userId,
        type: data.type,
        amount: data.amount,
        category: data.category,
        description: sanitizeDescription(data.description),
        transaction_date: data.transaction_date,
        account_id: data.account_id ?? null,
      })
      .select('id, type, amount, category, transaction_date, created_at')
      .single()

    if (insertError) {
      console.error('[webhook/transaction] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      )
    }

    // ── 8. Audit log (fire and forget) ────────────────
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const userAgent = request.headers.get('user-agent') ?? null
    writeAuditLog({
      apiKeyId: keyData.keyId,
      userId: keyData.userId,
      action: 'create_transaction',
      payload: { transaction_id: tx.id, type: tx.type, amount: tx.amount, category: tx.category },
      ip: ip ?? undefined,
      userAgent: userAgent ?? undefined,
    }).catch(err => console.error('[webhook/transaction] Audit log error:', err))

    // ── 9. Success ────────────────────────────────────
    return NextResponse.json({
      ok: true,
      message: 'Transaction created successfully',
      transaction: tx,
    }, {
      headers: {
        'X-RateLimit-Limit': String(rl.headers['X-RateLimit-Limit']),
        'X-RateLimit-Remaining': String(rl.headers['X-RateLimit-Remaining']),
      },
    })
  } catch (err) {
    console.error('[webhook/transaction] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
