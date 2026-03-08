'use client'
// components/layout/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'الرئيسية' },
  { href: '/dashboard/transactions', icon: '💰', label: 'المعاملات' },
  { href: '/dashboard/debts', icon: '💳', label: 'الديون' },
  { href: '/dashboard/investments', icon: '📈', label: 'الاستثمارات' },
  { href: '/dashboard/goals', icon: '🎯', label: 'الأهداف' },
  { href: '/dashboard/alerts', icon: '🔔', label: 'التنبيهات' },
  { href: '/dashboard/settings', icon: '⚙️', label: 'الإعدادات' },
]

export default function Sidebar({ alertsCount }: { alertsCount: number }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 flex flex-col border-l shrink-0" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-9 h-9 rounded-xl gradient-blue flex items-center justify-center text-white font-bold">ف</div>
        <div>
          <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>FinanceTracker</div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>إدارة مالية ذكية</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative"
              style={{
                background: isActive ? 'rgba(79,142,247,0.15)' : 'transparent',
                color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
              }}>
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {item.href === '/dashboard/alerts' && alertsCount > 0 && (
                <span className="absolute left-3 top-2 w-5 h-5 rounded-full gradient-red text-white text-xs flex items-center justify-center font-bold">
                  {alertsCount > 9 ? '9+' : alertsCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
          style={{ color: 'var(--text-secondary)' }}>
          <span>🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  )
}
