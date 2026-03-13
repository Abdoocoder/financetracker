'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { useState } from 'react'
import {
  LayoutDashboard, ArrowUpDown, CreditCard,
  TrendingUp, Target, Bell, Settings, Globe,
  ChevronLeft, MoreHorizontal, PieChart
} from 'lucide-react'

const MAIN_NAV = [
  { href: '/dashboard',              Icon: LayoutDashboard, ar: 'الرئيسية',  en: 'Home'         },
  { href: '/dashboard/transactions', Icon: ArrowUpDown,     ar: 'المعاملات', en: 'Transactions' },
  { href: '/dashboard/debts',        Icon: CreditCard,      ar: 'الديون',    en: 'Debts'        },
  { href: '/dashboard/budgets',      Icon: PieChart,        ar: 'الميزانية', en: 'Budget'       },
]

const MORE_NAV = [
  { href: '/dashboard/goals',       Icon: Target,     ar: 'الأهداف',    en: 'Goals'       },
  { href: '/dashboard/investments', Icon: TrendingUp, ar: 'الاستثمار',  en: 'Investments' },
  { href: '/dashboard/alerts',      Icon: Bell,       ar: 'التنبيهات',  en: 'Alerts'      },
  { href: '/dashboard/settings',    Icon: Settings,   ar: 'الإعدادات',  en: 'Settings'    },
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
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'white', fontSize: 16, boxShadow: '0 4px 16px var(--accent-blue-glow)' }}>₣</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)' }}>FinanceTracker</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{lang === 'en' ? 'Smart Finance Manager' : 'إدارة مالية ذكية'}</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {ALL_NAV.map(({ href, Icon, ar, en }) => {
            const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: isActive ? 'var(--accent-blue-dim)' : 'transparent', border: `1px solid ${isActive ? 'rgba(59,126,246,0.2)' : 'transparent'}`, color: isActive ? 'var(--accent-blue-light)' : 'var(--text-secondary)', fontSize: 13, fontWeight: isActive ? 700 : 500, transition: 'all 0.15s', position: 'relative' }}>
                  {isActive && <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, borderRadius: '0 2px 2px 0', background: 'var(--accent-blue)', boxShadow: '0 0 8px var(--accent-blue)' }} />}
                  <Icon size={18} opacity={isActive ? 1 : 0.5} />
                  <span style={{ flex: 1 }}>{lang === 'en' ? en : ar}</span>
                  {href === '/dashboard/alerts' && alertsCount > 0 && (
                    <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: 'var(--accent-red)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{alertsCount}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>
        <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.2)', color: 'var(--accent-blue-light)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Globe size={14} /> {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(7,11,20,0.98)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center',
        padding: '10px 8px',
        paddingBottom: 'max(18px, env(safe-area-inset-bottom))',
      }} className="mobile-nav">

        {MAIN_NAV.map(({ href, Icon, ar, en }) => {
          const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          return (
            <Link key={href} href={href} style={{ flex: 1, textDecoration: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '2px 4px', position: 'relative' }}>
                {/* Active pill */}
                {isActive && (
                  <div style={{
                    position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                    width: 44, height: 3, borderRadius: 2,
                    background: 'var(--accent-blue)',
                    boxShadow: '0 0 8px var(--accent-blue)',
                  }} />
                )}
                {/* Icon container */}
                <div style={{
                  width: 44, height: 36, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'var(--accent-blue-dim)' : 'transparent',
                  transition: 'all 0.2s ease',
                }}>
                  <Icon
                    size={22}
                    color={isActive ? 'var(--accent-blue-light)' : 'var(--text-muted)'}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </div>
                <span style={{
                  fontSize: 11, fontWeight: isActive ? 800 : 500,
                  color: isActive ? 'var(--accent-blue-light)' : 'var(--text-muted)',
                  letterSpacing: isActive ? '0.01em' : 0,
                  transition: 'all 0.2s ease',
                }}>
                  {lang === 'en' ? en : ar}
                </span>
              </div>
            </Link>
          )
        })}

        {/* More button */}
        <button onClick={() => setShowMore(true)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '2px 4px', position: 'relative' }}>
            {isMoreActive && (
              <div style={{
                position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                width: 44, height: 3, borderRadius: 2,
                background: 'var(--accent-blue)',
                boxShadow: '0 0 8px var(--accent-blue)',
              }} />
            )}
            <div style={{
              width: 44, height: 36, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isMoreActive ? 'var(--accent-blue-dim)' : 'transparent',
              position: 'relative',
              transition: 'all 0.2s ease',
            }}>
              <MoreHorizontal
                size={22}
                color={isMoreActive ? 'var(--accent-blue-light)' : 'var(--text-muted)'}
                strokeWidth={isMoreActive ? 2.5 : 1.8}
              />
              {alertsCount > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 4,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: 'var(--accent-red)', color: 'white',
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px',
                  boxShadow: '0 0 6px rgba(239,68,68,0.6)',
                }}>
                  {alertsCount > 9 ? '9+' : alertsCount}
                </span>
              )}
            </div>
            <span style={{
              fontSize: 11, fontWeight: isMoreActive ? 800 : 500,
              color: isMoreActive ? 'var(--accent-blue-light)' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
            }}>
              {lang === 'en' ? 'More' : 'المزيد'}
            </span>
          </div>
        </button>
      </nav>

      {/* ── More Sheet ── */}
      {showMore && (
        <>
          <div onClick={() => setShowMore(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} className="mobile-nav" />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border)',
            borderRadius: '28px 28px 0 0',
            padding: '0 20px',
            paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
            animation: 'slideUp 0.25s ease',
          }} className="mobile-nav">
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '14px auto 20px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {MORE_NAV.map(({ href, Icon, ar, en }) => {
                const isActive = pathname.startsWith(href)
                return (
                  <Link key={href} href={href} onClick={() => setShowMore(false)} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '13px 16px', borderRadius: 16,
                      background: isActive ? 'var(--accent-blue-dim)' : 'var(--bg-card)',
                      border: `1px solid ${isActive ? 'rgba(59,126,246,0.25)' : 'var(--border)'}`,
                      transition: 'all 0.15s',
                    }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                        background: isActive ? 'rgba(59,126,246,0.15)' : 'var(--bg-elevated)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative',
                      }}>
                        <Icon size={20} color={isActive ? 'var(--accent-blue-light)' : 'var(--text-muted)'} strokeWidth={isActive ? 2.5 : 1.8} />
                        {href === '/dashboard/alerts' && alertsCount > 0 && (
                          <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, background: 'var(--accent-red)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', boxShadow: '0 0 8px rgba(239,68,68,0.5)' }}>
                            {alertsCount}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 15, fontWeight: isActive ? 800 : 600, color: isActive ? 'var(--accent-blue-light)' : 'var(--text-primary)', flex: 1 }}>
                        {lang === 'en' ? en : ar}
                      </span>
                      <ChevronLeft size={18} color="var(--text-muted)" />
                    </div>
                  </Link>
                )
              })}
            </div>
            <button onClick={() => { setLang(lang === 'ar' ? 'en' : 'ar'); setShowMore(false) }} style={{ width: '100%', padding: '13px', borderRadius: 14, background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.2)', color: 'var(--accent-blue-light)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Globe size={16} /> {lang === 'ar' ? 'English' : 'العربية'}
            </button>
          </div>
        </>
      )}

      <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar { display: flex !important; }
          .mobile-nav { display: none !important; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
