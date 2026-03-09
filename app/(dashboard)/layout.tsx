import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const { count: alertsCount } = await supabase
    .from('alerts').select('*', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('is_read', false)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 10 }}>
      <Sidebar alertsCount={alertsCount ?? 0} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header profile={profile} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '90px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
