'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useUser } from '@/lib/user-context'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/layout/Sidebar'
import { ToastProvider } from '@/components/ui/toast'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useI18n } from '@/lib/i18n'
import { PushPrompt } from '@/components/ui/push-prompt'
import { InstallPrompt } from '@/components/ui/install-prompt'
import { WelcomeModal } from '@/components/ui/welcome-modal'
import { OnboardingTour } from '@/components/ui/onboarding-tour'
import { GlobalFAB } from '@/components/ui/fab'

import styles from './dashboard-layout.module.css'

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
    <div className={styles.container} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Sidebar alertsCount={alertsCount} />
      <main className={styles.main}>
        
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
    <ToastProvider>
      <TranslatedErrorBoundary>
        <DashboardContent>{children}</DashboardContent>
      </TranslatedErrorBoundary>
    </ToastProvider>
  )
}
