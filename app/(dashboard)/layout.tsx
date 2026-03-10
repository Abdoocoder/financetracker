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
    const fetchAlerts = async () => {
      const { count } = await supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      setAlertsCount(count ?? 0)
    }
    fetchAlerts()
  }, [user, supabase])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar alertsCount={alertsCount} />
      <main style={{
        flex: 1,
        padding: '24px 20px',
        paddingBottom: '90px',
        maxWidth: '100%',
        overflowX: 'hidden'
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
