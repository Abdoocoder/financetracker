'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { UserProvider, useUser } from '@/lib/user-context'
import { ThemeProvider } from '@/lib/theme-context'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/layout/Sidebar'
import { ToastProvider } from '@/components/ui/toast'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { I18nProvider, useI18n } from '@/lib/i18n'
import { PushPrompt } from '@/components/ui/push-prompt'
import { syncSessionToNative } from '@/lib/capacitor-bridge'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const { lang } = useI18n()
  const [alertsCount, setAlertsCount] = useState(0)
  const pathname = usePathname()
  const supabase = createClient()

  const fetchCount = async () => {
    if (!user) return
    const { count } = await supabase.from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    setAlertsCount(count ?? 0)
  }

  useEffect(() => {
    if (!user) return
    fetchCount()
    // sync session to native Android
    createClient().auth.getSession().then(({ data }) => {
      if (data.session) syncSessionToNative(data.session.access_token, user.id)
    })
    const channel = supabase
      .channel('alerts-count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'alerts',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchCount())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, pathname])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      <Sidebar alertsCount={alertsCount} />
      <main style={{
        flex: 1,
        padding: '20px 16px',
        paddingBottom: '96px',
        maxWidth: '100%',
        overflowX: 'hidden',
        minHeight: '100vh',
      }}>
        
      <PushPrompt />
      {children}
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
    <UserProvider>
      <I18nProvider>
        <ToastProvider>
          <ErrorBoundary>
            <DashboardContent>
      {children}</DashboardContent>
          </ErrorBoundary>
        </ToastProvider>
      </I18nProvider>
    </UserProvider>
    </ThemeProvider>
  )
}
