'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { useState } from 'react'
import {
  LayoutDashboard, ArrowUpDown, CreditCard,
  TrendingUp, Target, Bell, Settings, Globe,
  ChevronLeft, ChevronRight, MoreHorizontal, PieChart, BookOpen, HelpCircle,
  Flame, Star, FileText, Wallet, Bot
} from 'lucide-react'

const MAIN_NAV = [
  { href: '/dashboard',              Icon: LayoutDashboard, key: 'nav_home'         },
  { href: '/dashboard/transactions', Icon: ArrowUpDown,     key: 'nav_transactions' },
  { href: '/dashboard/accounts',     Icon: Wallet,          key: 'nav_accounts'     },
  { href: '/dashboard/debts',        Icon: CreditCard,      key: 'nav_debts'        },
  { href: '/dashboard/chat',         Icon: Bot,             key: 'nav_chat'         },
]

const MORE_NAV = [
  { href: '/dashboard/debts',        Icon: CreditCard,      key: 'nav_debts'        },
  { href: '/dashboard/budgets',      Icon: PieChart,        key: 'nav_budgets'      },
  { href: '/dashboard/goals',       Icon: Target,     key: 'nav_goals'        },
  { href: '/dashboard/investments', Icon: TrendingUp, key: 'nav_investments'  },
  { href: '/dashboard/fire',   Icon: Flame,      key: 'nav_fire'         },
  { href: '/dashboard/zakat',  Icon: Star,        key: 'nav_zakat'        },
  { href: '/dashboard/pdf-report', Icon: FileText, key: 'nav_pdf'          },
  { href: '/dashboard/learn',        Icon: BookOpen,   key: 'nav_learn'        },
  { href: '/dashboard/alerts',      Icon: Bell,       key: 'nav_alerts'       },
  { href: '/dashboard/settings',    Icon: Settings,   key: 'nav_settings'     },
  { href: '/dashboard/help',          Icon: HelpCircle, key: 'nav_help'         },
]

export default function Sidebar({ alertsCount = 0 }: { alertsCount?: number }) {
  const pathname = usePathname()
  const { lang, setLang, t } = useI18n()
  const [showMore, setShowMore] = useState(false)
  const isMoreActive = MORE_NAV.some(item => pathname.startsWith(item.href))

  const handleLangToggle = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar';
    setLang(newLang);
    document.cookie = `lang=${newLang}; path=/; max-age=31536000`;
  }

  return (
    <>
      <aside style={{
        display: 'none', width: 240, flexShrink: 0,
        height: '100vh', position: 'sticky', top: 0,
        flexDirection: 'column', padding: '24px 16px',
        zIndex: 50,
      }} className="desktop-sidebar glass-sidebar">
        <div style={{ padding: '0 8px 24px', marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="glow-avatar" style={{ width: 42, height: 42, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
              <Image src="/icon-512.png" alt={t('app_name')} width={42} height={42} style={{ objectFit: 'cover' }} priority />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>{t('app_name')}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{t('app_subtitle')}</div>
            </div>
          </div>
        </div>
        <nav aria-label={t('nav_main_aria')} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Core */}
          {MAIN_NAV.map(({ href, Icon, key }) => {
            const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <div className={`nav-item ${isActive ? 'nav-item-active' : ''}`} style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, 
                  padding: '12px 14px', borderRadius: 14, 
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--accent-blue-light)' : 'var(--text-secondary)',
                }}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} opacity={isActive ? 1 : 0.6} />
                  <span style={{ flex: 1 }}>{t(key)}</span>
                </div>
              </Link>
            )
          })}
          {/* Separator + Tools group */}
          <div style={{ margin: '16px 8px 6px', fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8 }}>
            {t('nav_group_tools')}
          </div>
          {MORE_NAV.slice(0, 8).map(({ href, Icon, key }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <div className={`nav-item ${isActive ? 'nav-item-active' : ''}`} style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, 
                  padding: '12px 14px', borderRadius: 14, 
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--accent-blue-light)' : 'var(--text-secondary)',
                }}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} opacity={isActive ? 1 : 0.6} />
                  <span style={{ flex: 1 }}>{t(key)}</span>
                  {key === 'nav_alerts' && alertsCount > 0 && (
                    <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: 'var(--accent-red)', color: 'white', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(239,68,68,0.4)' }}>{alertsCount}</span>
                  )}
                </div>
              </Link>
            )
          })}
          {/* Separator + Account group */}
          <div style={{ margin: '16px 8px 6px', fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8 }}>
            {t('nav_group_account')}
          </div>
          {MORE_NAV.slice(8).map(({ href, Icon, key }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <div className={`nav-item ${isActive ? 'nav-item-active' : ''}`} style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, 
                  padding: '12px 14px', borderRadius: 14, 
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--accent-blue-light)' : 'var(--text-secondary)',
                }}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} opacity={isActive ? 1 : 0.6} />
                  <span style={{ flex: 1 }}>{t(key)}</span>
                  {key === 'nav_alerts' && alertsCount > 0 && (
                    <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: 'var(--accent-red)', color: 'white', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(239,68,68,0.4)' }}>{alertsCount}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>
        <div style={{ paddingTop: 16, marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={handleLangToggle} aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'} style={{ width: '100%', padding: '12px', borderRadius: 14, background: 'rgba(59,126,246,0.1)', border: '1px solid rgba(59,126,246,0.15)', color: 'var(--accent-blue-light)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s' }} className="btn-press">
            <Globe size={16} /> {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav aria-label={t('nav_quick_aria')} style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(7,11,20,0.98)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center',
        padding: '10px 8px',
        paddingBottom: 'max(18px, env(safe-area-inset-bottom))',
      }} className="mobile-nav">

        {(lang === 'ar' ? [...MAIN_NAV].reverse() : MAIN_NAV).map(({ href, Icon, key }) => {
          const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          return (
            <Link key={href} href={href} style={{ flex: 1, textDecoration: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '2px 4px', position: 'relative' }}>
                {isActive && (
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
                  {t(key)}
                </span>
              </div>
            </Link>
          )
        })}

        <button onClick={() => setShowMore(true)} aria-label={t('nav_more')} aria-expanded={showMore} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
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
              {t('nav_more')}
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
            maxHeight: '85dvh',
            display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.25s ease',
          }} className="mobile-nav">
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '14px auto 16px', flexShrink: 0 }} />
            <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px', paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {MORE_NAV.map(({ href, Icon, key }) => {
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
                        {key === 'nav_alerts' && alertsCount > 0 && (
                          <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, background: 'var(--accent-red)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', boxShadow: '0 0 8px rgba(239,68,68,0.5)' }}>
                            {alertsCount}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 15, fontWeight: isActive ? 800 : 600, color: isActive ? 'var(--accent-blue-light)' : 'var(--text-primary)', flex: 1 }}>
                        {t(key)}
                      </span>
                      {lang === 'ar' ? <ChevronLeft size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
                    </div>
                  </Link>
                )
              })}
            </div>
            <button onClick={handleLangToggle} style={{ width: '100%', padding: '13px', borderRadius: 14, background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.2)', color: 'var(--accent-blue-light)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Globe size={16} /> {lang === 'ar' ? 'English' : 'العربية'}
            </button>
            </div>
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
