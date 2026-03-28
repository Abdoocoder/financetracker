import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(c: { name: string; value: string; options?: Record<string, unknown> }[]) { cookiesToSet.push(...c) },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.session?.access_token) {
      const redirectUrl = new URL(next, request.url)
      redirectUrl.searchParams.set('t', data.session.access_token)
      const response = NextResponse.redirect(redirectUrl)
      cookiesToSet.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
      )
      return response
    }
  }

  // No code (Supabase implicit flow) OR PKCE exchange failed.
  // The access_token may be in the URL hash (#access_token=...) which the server cannot read.
  // Serve a tiny HTML page that reads the hash client-side and redirects with it preserved.
  const nextEncoded = encodeURIComponent(next)
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><script>var h=window.location.hash,n=decodeURIComponent('${nextEncoded}');if(h&&h.indexOf('access_token')!==-1){window.location.replace(n+h)}else{window.location.replace('/login?error=auth')}</script></head><body></body></html>`,
    { headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' } }
  )
}
