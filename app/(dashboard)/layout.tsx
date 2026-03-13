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

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
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
        <NotificationReminder />
      {children}
      </main>
    </div>
  )
}

function NotificationReminder() {
  const { lang } = useI18n()
  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'default') return
    // مرة واحدة يومياً فقط
    const key = 'notif_reminder_' + new Date().toDateString()
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    // تأخير 3 ثواني بعد فتح التطبيق
    const timer = setTimeout(() => {
      const msg = lang === 'en'
        ? '🔔 Enable notifications to get daily financial tips and alerts'
        : '🔔 فعّل الإشعارات للحصول على تنبيهات مالية يومية تساعدك في توفير المال'
      if (confirm(msg)) {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            new Notification('FinanceTracker 🎉', {
              body: lang === 'en' ? 'Notifications enabled!' : 'تم تفعيل الإشعارات ✅',
              icon: '/icon-192.png'
            })
          }
        })
      }
    }, 3000)
    return () => clearTimeout(timer)
  }, [lang])
  return null
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
    <UserProvider>
      <I18nProvider>
        <ToastProvider>
          <ErrorBoundary>
            <DashboardContent><NotificationReminder />
      {children}</DashboardContent>
          </ErrorBoundary>
        </ToastProvider>
      </I18nProvider>
    </UserProvider>
    </ThemeProvider>
  )
}
