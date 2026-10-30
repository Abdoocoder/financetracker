import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db/neon'
import { verifyCronAuth } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Keeps the probe inside a browser / uptime-monitor budget instead of hanging. */
const QUERY_TIMEOUT_MS = 5000

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Neon query timed out after ${ms}ms`)),
          ms
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Fajrak is privacy-first, so an unauthenticated probe must not disclose how
 * many accounts exist. The row count is only returned to a caller holding
 * CRON_SECRET; everyone else gets reachability + latency.
 */
function isAuthorized(request: NextRequest): boolean {
  try {
    return verifyCronAuth(request)
  } catch {
    // CRON_SECRET not configured → keep the detail view closed rather than
    // letting a misconfiguration 500 a health probe.
    return false
  }
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now()

  try {
    const sql = getSql()
    const rows = await withTimeout(
      sql`select count(*)::int as count from public.profiles`,
      QUERY_TIMEOUT_MS
    )

    const body: Record<string, unknown> = {
      ok: true,
      database: 'reachable',
      latencyMs: Date.now() - startedAt,
    }

    if (isAuthorized(request)) {
      body.profiles = rows[0]?.count ?? null
    }

    return NextResponse.json(body, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    // Log server-side only — never echo connection strings or driver errors
    // back to the caller.
    console.error(
      '[health/db] Neon probe failed:',
      error instanceof Error ? error.message : error
    )

    return NextResponse.json(
      { ok: false, database: 'unreachable', latencyMs: Date.now() - startedAt },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
