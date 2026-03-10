'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/lib/i18n'

const NAV = [
  { href: '/dashboard',              icon: '⌂',  labelKey: 'nav_dashboard'    },
  { href: '/dashboard/transactions', icon: '⇅',  labelKey: 'nav_transactions' },
  { href: '/dashboard/debts',        icon: '◈',  labelKey: 'nav_debts'        },
  { href: '/dashboard/investments',  icon: '◎',  labelKey: 'nav_investments'  },
  { href: '/dashboard/goals',        icon: '◉',  labelKey: 'nav_goals'        },
  { href: '/dashboard/alerts',       icon: '◇',  labelKey: 'nav_alerts'       },
  { href: '/dashboard/settings',     icon: '⊙',  labelKey: 'nav_settings'     },
]

export default function Sidebar({ alertsCount = 0 }: { alertsCount?: number }) {
  const pathname = usePathname()
  const { t, lang, setLang } = useI18n()

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside style={{
        display: 'none',
        width: 220, flexShrink: 0,
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        height: '100vh', position: 'sticky', top: 0,
        flexDirection: 'column', padding: '20px 12px',
      }} className="desktop-sidebar">

        {/* Logo */}
        <div style={{ padding: '0 8px 20px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 900, color: 'white',
              boxShadow: '0 4px 16px var(--accent-blue-glow)',
            }}>₣</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)' }}>FinanceTracker</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>إدارة مالية ذكية</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => {
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 12,
                  background: isActive ? 'var(--accent-blue-dim)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(59,126,246,0.2)' : 'transparent'}`,
                  color: isActive ? 'var(--accent-blue-light)' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.15s', position: 'relative',
                }}>
                  {isActive && <div style={{
                    position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: 18, borderRadius: '0 2px 2px 0',
                    background: 'var(--accent-blue)',
                    boxShadow: '0 0 8px var(--accent-blue)',
                  }} />}
                  <span style={{ fontSize: 16, opacity: isActive ? 1 : 0.5 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{t(item.labelKey)}</span>
                  {item.labelKey === 'nav_alerts' && alertsCount > 0 && (
                    <span style={{
                      minWidth: 18, height: 18, borderRadius: 9,
                      background: 'var(--accent-red)', color: 'white',
                      fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 0 8px var(--accent-red-glow)',
                    }}>{alertsCount}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Lang + User */}
        <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 10,
              background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.2)',
              color: 'var(--accent-blue-light)', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8,
            }}>
            🌐 {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(13,18,33,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '8px 4px 12px',
        gap: 2,
      }} className="mobile-nav">
        {NAV.map(item => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              style={{ flex: 1, textDecoration: 'none' }}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '6px 2px',
                position: 'relative',
              }}>
                {/* Active Pill */}
                {isActive && (
                  <div style={{
                    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                    width: 28, height: 28, borderRadius: 10,
                    background: 'var(--accent-blue-dim)',
                    border: '1px solid rgba(59,126,246,0.25)',
                  }} />
                )}

                {/* Icon */}
                <div style={{
                  fontSize: 16, lineHeight: 1, position: 'relative', zIndex: 1,
                  color: isActive ? 'var(--accent-blue-light)' : 'var(--text-muted)',
                  transition: 'color 0.15s',
                }}>
                  {item.icon}
                  {item.labelKey === 'nav_alerts' && alertsCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -4, right: -6,
                      width: 14, height: 14, borderRadius: 7,
                      background: 'var(--accent-red)', color: 'white',
                      fontSize: 8, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{alertsCount > 9 ? '9+' : alertsCount}</span>
                  )}
                </div>

                {/* Label */}
                <span style={{
                  fontSize: 9, fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--accent-blue-light)' : 'var(--text-muted)',
                  position: 'relative', zIndex: 1,
                }}>
                  {t(item.labelKey)}
                </span>
              </div>
            </Link>
          )
        })}

        {/* Lang Toggle */}
        <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          style={{
            flexShrink: 0, width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.2)',
            color: 'var(--accent-blue-light)', fontSize: 10, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {lang === 'ar' ? 'EN' : 'ع'}
        </button>
      </nav>

      <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar { display: flex !important; }
          .mobile-nav { display: none !important; }
        }
      `}</style>
    </>
  )
}
