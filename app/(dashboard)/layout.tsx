'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useUser } from '@/lib/user-context'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/layout/Sidebar'
import { ToastProvider } from '@/components/ui/toast'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useI18n } from '@/lib/i18n'
import dynamic from 'next/dynamic'
import { GlobalFAB } from '@/components/ui/fab'

const PushPrompt = dynamic(() => import('@/components/ui/push-prompt').then(m => ({ default: m.PushPrompt })), { ssr: false, loading: () => null })
const InstallPrompt = dynamic(() => import('@/components/ui/install-prompt').then(m => ({ default: m.InstallPrompt })), { ssr: false, loading: () => null })
const WelcomeModal = dynamic(() => import('@/components/ui/welcome-modal').then(m => ({ default: m.WelcomeModal })), { ssr: false, loading: () => null })
const OnboardingTour = dynamic(() => import('@/components/ui/onboarding-tour').then(m => ({ default: m.OnboardingTour })), { ssr: false, loading: () => null })

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
