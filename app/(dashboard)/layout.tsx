'use client'
import { useEffect, useState } from 'react'
import { UserProvider, useUser } from '@/lib/user-context'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/layout/Sidebar'
import { ToastProvider } from '@/components/ui/toast'
import { I18nProvider } from '@/lib/i18n'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const [alertsCount, setAlertsCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    supabase.from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .then(({ count }) => setAlertsCount(count ?? 0))
  }, [user, supabase])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', direction: 'rtl' }}>
      <Sidebar alertsCount={alertsCount} />
      <main style={{
        flex: 1,
        padding: '20px 16px',
        paddingBottom: '96px',
        maxWidth: '100%',
        overflowX: 'hidden',
        minHeight: '100vh',
      }}>
        {children}
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <I18nProvider>
        <ToastProvider>
          <DashboardContent>{children}</DashboardContent>
        </ToastProvider>
      </I18nProvider>
    </UserProvider>
  )
}
