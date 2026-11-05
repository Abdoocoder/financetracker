import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from './dashboard-shell'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Defense-in-depth: proxy.ts (middleware) is the first gate, but a middleware
  // matcher regression, an early-return bug, or a bypassed CSP path would expose
  // the whole dashboard shell. Verify the session server-side before rendering.
  const supabase = await createClient()
  // getClaims() verifies the session JWT locally against the project's cached
  // JWKS when the project uses asymmetric signing keys, so no request is made to
  // the Auth server. getUser() always performs that round-trip on every
  // dashboard navigation. For legacy symmetric-secret projects getClaims()
  // degrades to the same server call as getUser(), so this is never slower.
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims?.sub) {
    redirect('/login')
  }

  return <DashboardShell>{children}</DashboardShell>
}
