import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login', '/register', '/forgot-password', '/reset-password',
  '/api/auth/callback', '/api/confirm',
]

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  // مستخدم غير مسجّل يحاول الوصول لصفحة محمية
  if (!user && !isPublic) {
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
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|icon-.*\\.png|manifest\\.json|sw\\.js|api/cron).*)'],
}
