import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// المسارات التي تتطلب تسجيل دخول
const PROTECTED_PATHS = [
  '/dashboard',
  '/transactions',
  '/debts',
  '/investments',
  '/alerts',
  '/budgets',
  '/goals',
  '/settings',
]

function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' blob: data: https:",
    "font-src 'self'",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    `connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in https://va.vercel-scripts.com https://*.googleapis.com`,
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ')
}

export async function proxy(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p))

  // مستخدم غير مسجّل يحاول الوصول لصفحة محمية
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // مستخدم مسجّل يحاول الوصول لصفحة auth
  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // تمرير user id في header لتجنب استدعاء getUser() في كل صفحة
  if (user) {
    supabaseResponse.headers.set('x-user-id', user.id)
    supabaseResponse.headers.set('x-user-email', user.email ?? '')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icon-.*\\.png|manifest\\.json|sw\\.js|firebase-messaging-sw\\.js|monitoring|api/cron).*)',
  ],
}