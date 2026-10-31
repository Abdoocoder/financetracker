import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createAdminClient } from '@/lib/supabase/admin'

// Clerk webhook event types we care about
type ClerkUserCreatedEvent = {
  type: 'user.created'
  data: {
    id: string // e.g., "user_2abc..."
    email_addresses: Array<{
      id: string
      email_address: string
      verification: { status: string; strategy: string }
    }>
    first_name: string | null
    last_name: string | null
    username: string | null
    image_url: string
    created_at: number
    updated_at: number
  }
}

type ClerkWebhookEvent = ClerkUserCreatedEvent

function verifyWebhookSignature(
  payload: string,
  headers: Headers,
  secret: string
): ClerkWebhookEvent {
  const svixId = headers.get('svix-id')
  const svixTimestamp = headers.get('svix-timestamp')
  const svixSignature = headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error('Missing Svix headers')
  }

  const wh = new Webhook(secret)
  const verified = wh.verify(payload, {
    'svix-id': svixId,
    'svix-timestamp': svixTimestamp,
    'svix-signature': svixSignature,
  })
  if (!verified) throw new Error('Verification returned empty payload')
  return verified as ClerkWebhookEvent
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[webhook/clerk] CLERK_WEBHOOK_SECRET not configured')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  // ── 1. Get raw body for signature verification ─────────────────
  const rawBody = await request.text()

  // ── 2. Verify signature ────────────────────────────────────────
  let event: ClerkWebhookEvent
  try {
    event = verifyWebhookSignature(rawBody, request.headers, webhookSecret)
  } catch (err) {
    console.error('[webhook/clerk] Signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  // ── 3. Handle user.created ────────────────────────────────────
  if (event.type === 'user.created') {
    const user = event.data
    const clerkId = user.id // "user_2abc..."

    // Get primary email
    const primaryEmail = user.email_addresses.find(
      (e) => e.verification?.status === 'verified'
    )?.email_address ?? user.email_addresses[0]?.email_address

    if (!primaryEmail) {
      console.error('[webhook/clerk] No email address found for user:', clerkId)
      return NextResponse.json(
        { error: 'User has no email address' },
        { status: 400 }
      )
    }

    // Build full name
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || null

    // ── 4. Upsert profile using admin client ─────────────────────
    try {
      const supabase = createAdminClient()

      const { error } = await supabase.from('profiles').upsert(
        {
          id: clerkId, // Clerk sub becomes the profile PK (text)
          email: primaryEmail,
          full_name: fullName,
          currency: 'KWD', // Default currency (Kuwaiti Dinar - Gulf-first)
          lang: 'ar', // Default language (Arabic)
          onboarding_done: false,
          created_at: new Date(user.created_at).toISOString(),
          updated_at: new Date(user.updated_at).toISOString(),
        },
        {
          onConflict: 'id',
          ignoreDuplicates: true, // Idempotent: Clerk may retry webhook
        }
      )

      if (error) {
        console.error('[webhook/clerk] Profile upsert failed:', error)
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        )
      }

      console.log('[webhook/clerk] Profile created for user:', clerkId)
    } catch (err) {
      console.error('[webhook/clerk] Unexpected DB error:', err)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }

  // ── 5. Acknowledge other events silently ──────────────────────
  // We only act on user.created; other events are acknowledged to
  // prevent Clerk from retrying unnecessarily.

  return NextResponse.json({ ok: true })
}