'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'الرئيسية' },
  { href: '/dashboard/transactions', icon: '💰', label: 'المعاملات' },
  { href: '/dashboard/debts', icon: '💳', label: 'الديون' },
  { href: '/dashboard/investments', icon: '📈', label: 'الاستثمار' },
  { href: '/dashboard/goals', icon: '🎯', label: 'الأهداف' },
  { href: '/dashboard/alerts', icon: '🔔', label: 'التنبيهات' },
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
    <>
      {/* ===== DESKTOP SIDEBAR - hidden on mobile ===== */}
      <style>{`
        .desktop-sidebar { display: none; }
        .mobile-nav { display: flex; }
        @media (min-width: 1024px) {
          .desktop-sidebar { display: flex; }
          .mobile-nav { display: none; }
        }
      `}</style>

      <aside className="desktop-sidebar w-64 flex-col shrink-0 relative z-10"
        style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-9 h-9 rounded-xl gradient-blue flex items-center justify-center text-white font-black text-sm glow-blue">ف</div>
          <div>
            <div className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>FinanceTracker</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>إدارة مالية ذكية</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all relative"
                style={{
                  background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                  color: isActive ? 'var(--accent-blue-light)' : 'var(--text-secondary)',
                  borderRight: isActive ? '3px solid var(--accent-blue)' : '3px solid transparent',
                  display: 'flex',
                }}>
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
                {item.href === '/dashboard/alerts' && alertsCount > 0 && (
                  <span className="mr-auto w-5 h-5 rounded-full gradient-red text-white text-xs flex items-center justify-center font-bold">
                    {alertsCount > 9 ? '9+' : alertsCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
        <div className="px-3 pb-4" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          <Link href="/dashboard/settings"
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium"
            style={{ color: 'var(--text-secondary)', display: 'flex' }}>
            <span>⚙️</span><span>الإعدادات</span>
          </Link>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium"
            style={{ color: 'var(--text-muted)', display: 'flex' }}>
            <span>🚪</span><span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-50 items-center justify-around px-1"
        style={{
          background: 'rgba(13,17,32,0.95)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border)',
          height: '64px',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: '8px 10px',
                borderRadius: '12px',
                position: 'relative',
                minWidth: '48px',
                textDecoration: 'none',
              }}>
              <span style={{ fontSize: '20px', lineHeight: 1, opacity: isActive ? 1 : 0.4 }}>
                {item.icon}
              </span>
              <span style={{
                fontSize: '9px',
                fontWeight: 600,
                color: isActive ? 'var(--accent-blue-light)' : 'var(--text-muted)',
              }}>
                {item.label}
              </span>
              {isActive && (
                <span style={{
                  position: 'absolute',
                  top: '-1px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '20px',
                  height: '3px',
                  borderRadius: '2px',
                  background: 'var(--accent-blue)',
                }} />
              )}
              {item.href === '/dashboard/alerts' && alertsCount > 0 && (
                <span style={{
                  position: 'absolute', top: '4px', right: '4px',
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: '#ef4444', color: 'white',
                  fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                }}>
                  {alertsCount > 9 ? '9+' : alertsCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
