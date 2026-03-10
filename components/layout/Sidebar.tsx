'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'

export default function Sidebar({ alertsCount }: { alertsCount: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const { t, lang, setLang, isRTL } = useI18n()

  const navItems = [
    { href: '/dashboard',              icon: '🏠', label: t('nav_home')         },
    { href: '/dashboard/transactions', icon: '💰', label: t('nav_transactions') },
    { href: '/dashboard/debts',        icon: '💳', label: t('nav_debts')        },
    { href: '/dashboard/investments',  icon: '📈', label: t('nav_investments')  },
    { href: '/dashboard/goals',        icon: '🎯', label: t('nav_goals')        },
    { href: '/dashboard/alerts',       icon: '🔔', label: t('nav_alerts')       },
    { href: '/dashboard/settings',     icon: '⚙️', label: t('nav_settings')    },
  ]

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const LangToggle = () => (
    <button
      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 12px', borderRadius: '10px', cursor: 'pointer',
        background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
        color: '#60a5fa', fontSize: '13px', fontWeight: 700,
        fontFamily: 'var(--font-cairo), sans-serif',
      }}>
      🌐 {lang === 'ar' ? 'EN' : 'ع'}
    </button>
  )

  return (
    <>
      <style>{`
        .desktop-sidebar { display: none; }
        .mobile-nav { display: flex; }
        @media (min-width: 1024px) {
          .desktop-sidebar { display: flex; }
          .mobile-nav { display: none; }
        }
      `}</style>

      {/* DESKTOP SIDEBAR */}
      <aside className="desktop-sidebar w-64 flex-col shrink-0"
        style={{ background: 'var(--bg-secondary)', borderLeft: isRTL ? '1px solid var(--border)' : 'none', borderRight: isRTL ? 'none' : '1px solid var(--border)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="w-9 h-9 rounded-xl gradient-blue flex items-center justify-center text-white font-black text-sm glow-blue">ف</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '14px', color: 'var(--text-primary)' }}>{t('app_name')}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('app_subtitle')}</div>
            </div>
          </div>
          <LangToggle />
        </div>

        <nav style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '12px',
                  textDecoration: 'none', transition: 'all 0.15s',
                  background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                  color: isActive ? '#60a5fa' : 'var(--text-secondary)',
                  borderRight: isRTL && isActive ? '3px solid var(--accent-blue)' : isRTL ? '3px solid transparent' : 'none',
                  borderLeft: !isRTL && isActive ? '3px solid var(--accent-blue)' : !isRTL ? '3px solid transparent' : 'none',
                  fontWeight: isActive ? 700 : 500, fontSize: '14px',
                  fontFamily: 'var(--font-cairo), sans-serif',
                  position: 'relative',
                }}>
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.href === '/dashboard/alerts' && alertsCount > 0 && (
                  <span style={{
                    marginRight: isRTL ? 'auto' : undefined, marginLeft: !isRTL ? 'auto' : undefined,
                    minWidth: '20px', height: '20px', borderRadius: '10px',
                    background: '#ef4444', color: 'white',
                    fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                  }}>
                    {alertsCount > 9 ? '9+' : alertsCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
          <button onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '12px', cursor: 'pointer',
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', fontSize: '14px',
              fontFamily: 'var(--font-cairo), sans-serif', fontWeight: 500,
            }}>
            <span>🚪</span><span>{t('nav_logout')}</span>
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-50 items-center justify-around px-1"
        style={{
          background: 'rgba(13,17,32,0.96)',
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
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '2px', padding: '6px 4px', borderRadius: '12px',
                position: 'relative', minWidth: '36px', textDecoration: 'none',
              }}>
              <span style={{ fontSize: '18px', lineHeight: 1, opacity: isActive ? 1 : 0.4 }}>
                {item.icon}
              </span>
              <span style={{
                fontSize: '8px', fontWeight: 600,
                color: isActive ? '#60a5fa' : 'var(--text-muted)',
                fontFamily: 'var(--font-cairo), sans-serif',
              }}>
                {item.label}
              </span>
              {isActive && (
                <span style={{
                  position: 'absolute', top: '-1px', left: '50%',
                  transform: 'translateX(-50%)',
                  width: '20px', height: '3px',
                  borderRadius: '2px', background: '#3b82f6',
                }} />
              )}
              {item.href === '/dashboard/alerts' && alertsCount > 0 && (
                <span style={{
                  position: 'absolute', top: '2px', right: '0px',
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
        {/* زر اللغة في الموبايل */}
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '2px', padding: '6px 4px', minWidth: '36px',
            background: 'transparent', border: 'none', cursor: 'pointer',
          }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>🌐</span>
          <span style={{ fontSize: '8px', fontWeight: 700, color: '#60a5fa', fontFamily: 'var(--font-cairo), sans-serif' }}>
            {lang === 'ar' ? 'EN' : 'ع'}
          </span>
        </button>
      </nav>
    </>
  )
}
