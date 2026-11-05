import { clerkMiddleware } from '@clerk/nextjs/server'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Phase 2: all routes are public while Clerk is being wired in.
// Route protection will be enabled in a later phase.

export function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  const styleSrc = "style-src 'self' 'unsafe-inline'"

  const isE2E = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1') === true
  const ollamaConnectSrc = isDev ? ' http://localhost:11434' : ''
  const localSupabaseConnectSrc = (isDev || isE2E) ? ' http://127.0.0.1:54321 ws://127.0.0.1:54321' : ''

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    styleSrc,
    "img-src 'self' blob: data: https:",
    "font-src 'self'",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    `connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in https://va.vercel-scripts.com https://*.googleapis.com https://*.ingest.us.sentry.io https://*.clerk.accounts.dev https://*.clerk.dev${ollamaConnectSrc}${localSupabaseConnectSrc}`,
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]
  if (!isDev) {
    // Production is served over https, so clients may upgrade any stray
    // http: subresource loads. Skipped in development because the local dev
    // server is plain HTTP: the directive makes browsers rewrite SPA router
    // navigations (e.g. router.push('/dashboard') after login) to https and
    // abort them with ERR_SSL_PROTOCOL_ERROR (flaky e2e).
    directives.push("upgrade-insecure-requests")
  }
  return directives.join('; ')
}

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl

  // Defense-in-depth: the matcher below already excludes public pages, so this
  // guard only fires if someone widens the matcher again. Skip Clerk & Supabase
  // so a matcher regression cannot silently reintroduce auth calls on public routes.
  const isProtectedPath =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/__clerk')

  if (!isProtectedPath) {
    return NextResponse.next()
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const cspHeader = buildCspHeader(nonce)

  // تمرير nonce إلى الـ Server Components وفرض CSP على كل استجابة
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })
  supabaseResponse.headers.set('Content-Security-Policy', cspHeader)

  // Supabase server client is kept for backward compatibility: existing
  // server components read the `x-user-id` header set below.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          supabaseResponse.headers.set('Content-Security-Policy', cspHeader)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  // Clerk auth state (all routes are public for now; nothing is enforced).
  const { userId, sessionId } = await auth()

  // Supabase user context for legacy server components.
  const { data: { user } } = await supabase.auth.getUser()

  // تمرير user id في header لتجنب استدعاء getUser() في كل صفحة
  if (user) {
    supabaseResponse.headers.set('x-user-id', user.id)
    supabaseResponse.headers.set('x-user-email', user.email ?? '')
  }

  // Clerk identity for new Clerk-based code.
  if (userId) {
    supabaseResponse.headers.set('x-clerk-user-id', userId)
    supabaseResponse.headers.set('x-clerk-session-id', sessionId ?? '')
  }

  return supabaseResponse
})

export const config = {
  // Only the routes that actually need Clerk/Supabase work are matched.
  //
  // The previous catch-all `'/((?!_next/static|_next/image|favicon.ico|...).*)'`
  // forced this Proxy function to be instantiated and executed for *every*
  // request (marketing pages, blog, legal, sitemap, Sentry tunnel, ...), even
  // though the function immediately returned `NextResponse.next()` for them.
  // That early return did no work, so excluding those paths from the matcher is
  // behaviour-identical for the response — it only stops the function from
  // being billed/executed. Static assets were already handled by Next.
  //
  // `/auth-confirm` is listed explicitly because it is a route handler at
  // `app/auth-confirm/route.ts` and does not fall under `/auth/:path*`.
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/auth/:path*',
    '/auth-confirm',
    '/onboarding',
    '/__clerk/:path*'
  ],
}