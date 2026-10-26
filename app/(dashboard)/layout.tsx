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
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <DashboardShell>{children}</DashboardShell>
}
