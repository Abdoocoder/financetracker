'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { useState } from 'react'

const MAIN_NAV = [
  { href: '/dashboard',              icon: '⌂',  label: 'الرئيسية'   },
  { href: '/dashboard/transactions', icon: '⇅',  label: 'المعاملات' },
  { href: '/dashboard/debts',        icon: '◈',  label: 'الديون'    },
  { href: '/dashboard/investments',  icon: '◎',  label: 'الاستثمار' },
]

const MORE_NAV = [
  { href: '/dashboard/goals',    icon: '◉', label: 'الأهداف'   },
  { href: '/dashboard/alerts',   icon: '◇', label: 'التنبيهات' },
  { href: '/dashboard/settings', icon: '⊙', label: 'الإعدادات' },
]

const ALL_NAV = [...MAIN_NAV, ...MORE_NAV]

export default function Sidebar({ alertsCount = 0 }: { alertsCount?: number }) {
  const pathname = usePathname()
  const { lang, setLang } = useI18n()
  const [showMore, setShowMore] = useState(false)

  const isMoreActive = MORE_NAV.some(item => pathname.startsWith(item.href))

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside style={{
        display: 'none', width: 220, flexShrink: 0,
        background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)',
        height: '100vh', position: 'sticky', top: 0,
        flexDirection: 'column', padding: '20px 12px',
      }} className="desktop-sidebar">
        <div style={{ padding: '0 8px 20px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: 'white', boxShadow: '0 4px 16px var(--accent-blue-glow)' }}>₣</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)' }}>FinanceTracker</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>إدارة مالية ذكية</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {ALL_NAV.map(item => {
            const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: isActive ? 'var(--accent-blue-dim)' : 'transparent', border: `1px solid ${isActive ? 'rgba(59,126,246,0.2)' : 'transparent'}`, color: isActive ? 'var(--accent-blue-light)' : 'var(--text-secondary)', fontSize: 13, fontWeight: isActive ? 700 : 500, transition: 'all 0.15s', position: 'relative' }}>
                  {isActive && <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, borderRadius: '0 2px 2px 0', background: 'var(--accent-blue)', boxShadow: '0 0 8px var(--accent-blue)' }} />}
                  <span style={{ fontSize: 16, opacity: isActive ? 1 : 0.5 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.href === '/dashboard/alerts' && alertsCount > 0 && (
                    <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: 'var(--accent-red)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{alertsCount}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>
        <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.2)', color: 'var(--accent-blue-light)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            🌐 {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(7,11,20,0.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '10px 2px 18px', gap: 4 }} className="mobile-nav">

        {/* Main 4 items */}
        {MAIN_NAV.map(item => {
          const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} style={{ flex: 1, textDecoration: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 2px', position: 'relative' }}>
                {isActive && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 44, height: 36, borderRadius: 12, background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.2)' }} />}
                <span style={{ fontSize: 26, lineHeight: 1, position: 'relative', zIndex: 1, color: isActive ? 'var(--accent-blue-light)' : 'var(--text-muted)', transition: 'color 0.15s' }}>
                  {item.icon}
                </span>
                <span style={{ fontSize: 9, fontWeight: isActive ? 800 : 500, color: isActive ? 'var(--accent-blue-light)' : 'var(--text-muted)', position: 'relative', zIndex: 1, letterSpacing: '-0.01em' }}>
                  {item.label}
                </span>
              </div>
            </Link>
          )
        })}

        {/* More button */}
        <button onClick={() => setShowMore(true)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 2px', position: 'relative' }}>
            {isMoreActive && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 44, height: 36, borderRadius: 12, background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.2)' }} />}
            <div style={{ fontSize: 18, lineHeight: 1, position: 'relative', zIndex: 1, color: isMoreActive ? 'var(--accent-blue-light)' : 'var(--text-muted)', display: 'flex', gap: 2 }}>
              {alertsCount > 0 ? (
                <span style={{ position: 'relative' }}>
                  ◇
                  <span style={{ position: 'absolute', top: -4, right: -6, width: 14, height: 14, borderRadius: 7, background: 'var(--accent-red)', color: 'white', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{alertsCount > 9 ? '9+' : alertsCount}</span>
                </span>
              ) : '⋯'}
            </div>
            <span style={{ fontSize: 9, fontWeight: isMoreActive ? 800 : 500, color: isMoreActive ? 'var(--accent-blue-light)' : 'var(--text-muted)', position: 'relative', zIndex: 1 }}>
              المزيد
            </span>
          </div>
        </button>
      </nav>

      {/* ── More Sheet ── */}
      {showMore && (
        <>
          {/* Backdrop */}
          <div onClick={() => setShowMore(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} className="mobile-nav" />

          {/* Sheet */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
            background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)',
            borderRadius: '20px 20px 0 0',
            padding: '12px 20px 40px',
          }} className="mobile-nav">
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-light)', margin: '0 auto 20px' }} />

            {/* More items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
              {MORE_NAV.map(item => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href} onClick={() => setShowMore(false)} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 14,
                      background: isActive ? 'var(--accent-blue-dim)' : 'var(--bg-card)',
                      border: `1px solid ${isActive ? 'rgba(59,126,246,0.2)' : 'var(--border)'}`,
                    }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: isActive ? 'rgba(59,126,246,0.15)' : 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: isActive ? 'var(--accent-blue-light)' : 'var(--text-muted)' }}>
                        {item.icon}
                        {item.href === '/dashboard/alerts' && alertsCount > 0 && (
                          <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, background: 'var(--accent-red)', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{alertsCount}</span>
                        )}
                      </div>
                      <span style={{ fontSize: 15, fontWeight: isActive ? 800 : 600, color: isActive ? 'var(--accent-blue-light)' : 'var(--text-primary)', flex: 1 }}>{item.label}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>←</span>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Lang toggle */}
            <button onClick={() => { setLang(lang === 'ar' ? 'en' : 'ar'); setShowMore(false) }} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.2)', color: 'var(--accent-blue-light)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              🌐 {lang === 'ar' ? 'English' : 'العربية'}
            </button>
          </div>
        </>
      )}

      <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar { display: flex !important; }
          .mobile-nav { display: none !important; }
        }
      `}</style>
    </>
  )
}
