import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revokeApiKey } from '@/lib/api-keys'

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
    const keyId = body.key_id
    if (!keyId) {
      return NextResponse.json({ error: 'Missing key_id' }, { status: 400 })
    }

    await revokeApiKey(user.id, keyId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api-keys/revoke]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
