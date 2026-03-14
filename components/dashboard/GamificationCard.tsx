'use client'
import { useState, useEffect } from 'react'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'

const BADGE_INFO: Record<string, { icon: string; ar: string; en: string }> = {
  first_tx:    { icon: '⚡', ar: 'الخطوة الأولى',    en: 'First Step' },
  streak_3:    { icon: '🔥', ar: '3 أيام متواصلة',   en: '3-Day Streak' },
  streak_7:    { icon: '💪', ar: 'أسبوع كامل',       en: 'Full Week' },
  streak_30:   { icon: '🏆', ar: 'شهر بدون توقف',    en: 'Month Streak' },
  tx_50:       { icon: '📝', ar: 'مسجّل نشيط',       en: 'Active Tracker' },
  tx_100:      { icon: '📊', ar: 'محترف التتبع',      en: 'Tracking Pro' },
  saver_10:    { icon: '💰', ar: 'مدخر مبتدئ',       en: 'Beginner Saver' },
  saver_20:    { icon: '💎', ar: 'مدخر ذكي',         en: 'Smart Saver' },
  saver_30:    { icon: '👑', ar: 'مدخر محترف',       en: 'Pro Saver' },
  debt_paid:   { icon: '🎉', ar: 'محارب الديون',     en: 'Debt Warrior' },
  debt_free:   { icon: '🦅', ar: 'حر من الديون',     en: 'Debt Free' },
  investor:    { icon: '📈', ar: 'مستثمر مبتدئ',     en: 'New Investor' },
  inv_profit:  { icon: '🚀', ar: 'استثمار رابح',      en: 'Profitable Investor' },
  emergency:   { icon: '🛡️', ar: 'صندوق الطوارئ',    en: 'Emergency Fund' },
  net_positive:{ icon: '✨', ar: 'صافي إيجابي',       en: 'Net Positive' },
}

const LEVEL_COLORS = ['', '#6B7280', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B']

export function GamificationCard() {
  const { user } = useUser()
  const { lang } = useI18n()
  const ar = lang === 'ar'
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!user) return
    // جلب البيانات الحالية
    fetch(`/api/gamification?user_id=${user.id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))

    // تحديث الإنجازات في الخلفية
    setUpdating(true)
    fetch('/api/gamification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    })
      .then(r => r.json())
      .then(d => { setData(d); setUpdating(false) })
      .catch(() => setUpdating(false))
  }, [user])

  if (loading || !data) return null

  const levelInfo = data.levelInfo ?? data.level
  const levelNum = typeof levelInfo === 'object' ? levelInfo.level : levelInfo
  const levelTitle = typeof levelInfo === 'object' ? (ar ? levelInfo.title_ar : levelInfo.title_en) : `Level ${levelNum}`
  const nextPoints = typeof levelInfo === 'object' ? levelInfo.next : 9999
  const points = data.total_points ?? data.points ?? 0
  const streak = data.streak_days ?? data.streak ?? 0
  const badges: string[] = data.badges ?? []
  const levelColor = LEVEL_COLORS[Math.min(levelNum, 6)]
  const progressPct = Math.min((points / nextPoints) * 100, 100)

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${levelColor}33`,
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${levelColor}15, ${levelColor}08)`,
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              {ar ? 'رحلة الثروة' : 'Wealth Journey'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: levelColor }}>{levelTitle}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: levelColor, fontFamily: 'monospace', lineHeight: 1 }}>{points}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>{ar ? 'نقطة' : 'pts'}</div>
          </div>
        </div>

        {/* شريط التقدم للمستوى التالي */}
        {nextPoints < 9999 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
              <span>{ar ? 'للمستوى التالي' : 'Next level'}</span>
              <span>{points} / {nextPoints}</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: levelColor, borderRadius: 99, transition: 'width 0.8s ease' }} />
            </div>
          </div>
        )}
      </div>

      {/* الإحصاءات */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--border)' }}>
        <div style={{ background: 'var(--bg-card)', padding: '12px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, marginBottom: 2 }}>
            {streak >= 7 ? '🔥' : streak >= 3 ? '💪' : '⚡'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: streak > 0 ? '#F59E0B' : 'var(--text-muted)', fontFamily: 'monospace' }}>{streak}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>{ar ? 'يوم متواصل' : 'Day Streak'}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '12px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, marginBottom: 2 }}>🏅</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-blue-light)', fontFamily: 'monospace' }}>{badges.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>{ar ? 'شارة' : 'Badges'}</div>
        </div>
      </div>

      {/* الشارات */}
      {badges.length > 0 && (
        <div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {ar ? 'شاراتك' : 'Your Badges'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {badges.map(id => {
              const b = BADGE_INFO[id]
              if (!b) return null
              return (
                <div key={id} title={ar ? b.ar : b.en} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px', borderRadius: 100,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  fontSize: 12, fontWeight: 700,
                  color: 'var(--text-secondary)',
                }}>
                  <span style={{ fontSize: 14 }}>{b.icon}</span>
                  <span style={{ fontSize: 11 }}>{ar ? b.ar : b.en}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* تحفيز إذا لا توجد شارات */}
      {badges.length === 0 && (
        <div style={{ padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            {ar ? '🎯 سجّل أول معاملة لتبدأ رحلتك واكسب أول شارة!' : '🎯 Log your first transaction to start your journey!'}
          </div>
        </div>
      )}

      {updating && (
        <div style={{ padding: '6px 16px', background: 'var(--bg-elevated)', textAlign: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>⏳ {ar ? 'جاري تحديث الإنجازات...' : 'Updating achievements...'}</span>
        </div>
      )}
    </div>
  )
}
