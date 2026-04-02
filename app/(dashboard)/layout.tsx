'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { UserProvider, useUser } from '@/lib/user-context'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/layout/Sidebar'
import { ToastProvider } from '@/components/ui/toast'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { I18nProvider, useI18n } from '@/lib/i18n'
import { PushPrompt } from '@/components/ui/push-prompt'
import { InstallPrompt } from '@/components/ui/install-prompt'
import { WelcomeModal } from '@/components/ui/welcome-modal'
import { OnboardingTour } from '@/components/ui/onboarding-tour'
import { GlobalFAB } from '@/components/ui/fab'

function TranslatedErrorBoundary({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  return <ErrorBoundary t={t}>{children}</ErrorBoundary>
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const { lang } = useI18n()
  const [alertsCount, setAlertsCount] = useState(0)
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchCount = useCallback(async () => {
    if (!user) return
    const { count } = await supabase.from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    setAlertsCount(count ?? 0)
  }, [user, supabase])

  // debounced version — تمنع طلبات متعددة عند تغييرات متتالية سريعة
  const fetchCountDebounced = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchCount, 500)
  }, [fetchCount])

  useEffect(() => {
    if (!user) return
    fetchCount()
    const channel = supabase
      .channel('alerts-count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'alerts',
        filter: `user_id=eq.${user.id}`,
      }, fetchCountDebounced)
      .subscribe()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [user, pathname, fetchCount, fetchCountDebounced, supabase])

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
      <InstallPrompt />
      <WelcomeModal />
      <OnboardingTour />
      {children}
      </main>
      <GlobalFAB />

    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <I18nProvider>
        <ToastProvider>
          <TranslatedErrorBoundary>
            <DashboardContent>
      {children}</DashboardContent>
          </TranslatedErrorBoundary>
        </ToastProvider>
      </I18nProvider>
    </UserProvider>
  )
}
