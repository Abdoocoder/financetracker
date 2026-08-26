import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createApiKey } from '@/lib/api-keys'

const ALLOWED_SCOPES = ['create_transaction', 'read_transactions', 'read_balances'] as const

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createAdminClient()
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const name = body.name?.trim()
    if (!name || name.length > 100) {
      return NextResponse.json({ error: 'Invalid name (1-100 chars)' }, { status: 400 })
    }

    // Validate scopes if provided
    const scopes: string[] | undefined = body.scopes
    if (scopes && Array.isArray(scopes)) {
      for (const s of scopes) {
        if (!ALLOWED_SCOPES.includes(s as typeof ALLOWED_SCOPES[number])) {
          return NextResponse.json(
            { error: `Invalid scope: ${s}. Allowed: ${ALLOWED_SCOPES.join(', ')}` },
            { status: 400 }
          )
        }
      }
    }

    // Limit to 5 active keys per user
    const { count } = await supabase
      .from('user_api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    if ((count ?? 0) >= 5) {
      return NextResponse.json({ error: 'Maximum 5 active API keys per user' }, { status: 400 })
    }

    const result = await createApiKey(user.id, name, { scopes })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[api-keys/create]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
