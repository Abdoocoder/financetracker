'use client'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'

interface Props { lang: string; data: any; net: number; income: number; expenses: number }

export function ChallengesCard({ lang, data, net, income, expenses }: Props) {
  const { t } = useI18n()
  const [activeChallenge, setActiveChallenge] = useState<number | null>(null)
  const challenges = [
    { id: 1, icon: '🍔', title: lang === 'en' ? 'No Restaurants Week'        : 'أسبوع بدون مطاعم',         days: 7  },
    { id: 2, icon: '💰', title: lang === 'en' ? 'Save 10% of Income'         : 'وفّر 10% من دخلك',          days: 30 },
    { id: 3, icon: '📉', title: lang === 'en' ? 'Spend Less Than Last Month' : 'أنفق أقل من الشهر الماضي', days: 30 },
    { id: 4, icon: '🎯', title: lang === 'en' ? 'Zero Extra Spending'        : 'صفر مصاريف غير ضرورية',     days: 14 },
  ]
  function getProgress(id: number): number {
    if (!data) return 0
    if (id === 1) { const f = (data.categories ?? []).find(([c]: [string,number]) => c === 'طعام')?.[1] ?? 0; return f === 0 ? 100 : Math.max(0, 100 - (f / 50 * 100)) }
    if (id === 2) { const t = income * 0.1; return t > 0 ? Math.min(100, (net / t) * 100) : 0 }
    if (id === 3) { const p = data?.prevExpenses ?? 0; return p > 0 ? Math.min(100, ((p - expenses) / p) * 100) : 0 }
    if (id === 4) { const e = (data.categories ?? []).find(([c]: [string,number]) => c === 'ترفيه')?.[1] ?? 0; return e === 0 ? 100 : 0 }
    return 0
  }
  const active = challenges.find(c => c.id === activeChallenge)
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>🏆 {t('dash_challenges')}</span>
        {activeChallenge && <button onClick={() => setActiveChallenge(null)} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{lang === 'en' ? 'All' : 'الكل'}</button>}
      </div>
      {active ? (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{active.icon}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{active.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{active.days} {lang === 'en' ? 'days' : 'يوم'}</div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-elevated)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${Math.max(0, getProgress(active.id))}%`, borderRadius: 4, background: 'var(--accent-blue)', transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--accent-blue-light)', fontFamily: 'monospace' }}>{Math.max(0, getProgress(active.id)).toFixed(0)}%</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {challenges.map(c => {
            const pct = Math.max(0, getProgress(c.id))
            return (
              <button key={c.id} onClick={() => setActiveChallenge(c.id)} style={{ padding: '12px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.3 }}>{c.title}</div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-elevated)', overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: pct >= 100 ? '#10B981' : 'var(--accent-blue)', transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 900, color: pct >= 100 ? 'var(--accent-green-light)' : 'var(--accent-blue-light)', fontFamily: 'monospace' }}>{pct >= 100 ? '✅ ' : ''}{pct.toFixed(0)}%</div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
