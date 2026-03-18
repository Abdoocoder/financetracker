'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptic'
import { getLessonForStage, determineStage, type FinancialStage, type DailyLesson } from '@/lib/daily-lessons'
import { PageHeader } from '@/components/ui/page-header'

const stageInfo = {
  awareness:  { ar: 'مرحلة الوعي',      en: 'Awareness Stage',      icon: '🌱', color: '#8B5CF6' },
  debt:       { ar: 'مرحلة سداد الديون', en: 'Debt Freedom Stage',   icon: '💳', color: '#EF4444' },
  emergency:  { ar: 'مرحلة الطوارئ',    en: 'Emergency Fund Stage', icon: '🛡️', color: '#F59E0B' },
  investing:  { ar: 'مرحلة الاستثمار',  en: 'Investing Stage',      icon: '📈', color: '#10B981' },
  wealth:     { ar: 'مرحلة الثروة',     en: 'Wealth Stage',         icon: '👑', color: '#3B7EF6' },
}

const stageOrder: FinancialStage[] = ['awareness', 'debt', 'emergency', 'investing', 'wealth']

export default function LearnPage() {
  const { user } = useUser()
  const { lang } = useI18n()
  const supabase = createClient()
  const [lesson, setLesson] = useState<DailyLesson | null>(null)
  const [stage, setStage] = useState<FinancialStage>('awareness')
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    if (!user) return
    loadLesson()
  }, [user])

  async function loadLesson() {
    setLoading(true)
    try {
      const now = new Date()
      const dayOfMonth = now.getDate()

      const [txRes, debtRes, goalRes, invRes] = await Promise.all([
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('debts').select('remaining_amount, monthly_payment').eq('user_id', user!.id).eq('is_paid', false),
        supabase.from('savings_goals').select('current_amount, target_amount').eq('user_id', user!.id),
        supabase.from('investments').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      ])

      const { data: profile } = await supabase.from('profiles').select('monthly_income').eq('id', user!.id).single()
      const income = profile?.monthly_income ?? 0
      const debts = debtRes.data ?? []
      const goals = goalRes.data ?? []
      const totalDebt = debts.reduce((a, d) => a + Number(d.remaining_amount), 0)
      const totalMonthly = debts.reduce((a, d) => a + Number(d.monthly_payment), 0)
      const debtRatio = income > 0 ? (totalMonthly / income) * 100 : 0
      const totalSavings = goals.reduce((a, g) => a + Number(g.current_amount), 0)
      const emergencyTarget = income * 3

      const userStage = determineStage({
        txCount: txRes.count ?? 0,
        debtRatio,
        totalSavings,
        emergencyTarget,
        isInvesting: (invRes.count ?? 0) > 0,
      })

      setStage(userStage)
      setLesson(getLessonForStage(userStage, dayOfMonth, lang as 'ar' | 'en'))

      // جلب streak من Supabase
      const { data: profileData } = await supabase
        .from('profiles')
        .select('lesson_streak, last_lesson_date')
        .eq('id', user!.id)
        .single()

      const today = now.toISOString().split('T')[0]
      const lastLesson = profileData?.last_lesson_date
      setCompleted(lastLesson === today)
      setStreak(profileData?.lesson_streak ?? 0)

      // sync localStorage للتوافق
      if (lastLesson === today) {
        localStorage.setItem(`lesson_completed_${today}`, 'true')
      }
    } finally {
      setLoading(false)
    }
  }

  async function markComplete() {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem(`lesson_completed_${today}`, 'true')
    setCompleted(true)
    haptic(100)

    // احفظ في Supabase
    const { data: profileData } = await supabase
      .from('profiles')
      .select('lesson_streak, last_lesson_date')
      .eq('id', user!.id)
      .single()

    const lastLesson = profileData?.last_lesson_date
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const newStreak = lastLesson === yesterday ? (profileData?.lesson_streak ?? 0) + 1 : 1

    await supabase.from('profiles').update({
      lesson_streak: newStreak,
      last_lesson_date: today,
    }).eq('id', user!.id)

    setStreak(newStreak)
  }

  const info = stageInfo[stage]
  const stageIdx = stageOrder.indexOf(stage)

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ height: 80, borderRadius: 16, background: 'var(--bg-card)', animation: 'pulse 1.5s infinite' }} />
      <div style={{ height: 200, borderRadius: 16, background: 'var(--bg-card)', animation: 'pulse 1.5s infinite' }} />
    </div>
  )

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title={lang === 'ar' ? 'درس اليوم' : "Today's Lesson"}
        subtitle={lang === 'ar' ? 'تعلم خطوة كل يوم نحو حريتك المالية' : 'One step every day toward financial freedom'}
      />

      {/* مرحلتك + السلسلة */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, padding: '14px 16px', borderRadius: 16, background: 'var(--bg-card)', border: `1px solid ${info.color}33`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{info.icon}</span>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{lang === 'ar' ? 'مرحلتك' : 'Your Stage'}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: info.color }}>{info[lang]}</div>
          </div>
        </div>
        <div style={{ padding: '14px 16px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 24 }}>🔥</span>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>{lang === 'ar' ? 'السلسلة' : 'Streak'}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#F59E0B' }}>{streak}</div>
          </div>
        </div>
      </div>

      {/* خارطة التقدم */}
      <div style={{ padding: '16px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase' }}>
          {lang === 'ar' ? 'رحلتك المالية' : 'Your Financial Journey'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {stageOrder.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < 4 ? 1 : 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: i <= stageIdx ? stageInfo[s].color : 'var(--bg-elevated)',
                border: `2px solid ${i <= stageIdx ? stageInfo[s].color : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, transition: 'all 0.3s',
              }}>
                {i < stageIdx ? '✓' : stageInfo[s].icon}
              </div>
              {i < 4 && <div style={{ flex: 1, height: 2, background: i < stageIdx ? stageInfo[s].color : 'var(--border)', margin: '0 2px' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* الدرس الرئيسي */}
      {lesson && (
        <div style={{ padding: '24px', borderRadius: 20, background: 'var(--bg-card)', border: `1px solid ${info.color}22`, boxShadow: `0 0 40px ${info.color}0A` }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.4 }}>
            {lesson.title}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20 }}>
            {lesson.body}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <a href={lesson.url} style={{
              flex: 1, padding: '12px', borderRadius: 12,
              background: info.color, color: 'white',
              fontSize: 13, fontWeight: 800, textDecoration: 'none',
              textAlign: 'center', display: 'block',
            }}>
              {lang === 'ar' ? '← طبّق الدرس' : 'Apply Lesson →'}
            </a>
            {!completed && (
              <button onClick={markComplete} style={{
                padding: '12px 16px', borderRadius: 12,
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                color: '#10B981', fontSize: 13, fontWeight: 800, cursor: 'pointer',
              }}>
                ✅ {lang === 'ar' ? 'أتممت الدرس' : 'Done'}
              </button>
            )}
            {completed && (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontSize: 13, fontWeight: 800 }}>
                ✅ {lang === 'ar' ? 'مكتمل' : 'Completed'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* نصيحة اليوم */}
      <div style={{ padding: '16px 20px', borderRadius: 16, background: 'rgba(59,126,246,0.06)', border: '1px solid rgba(59,126,246,0.15)' }}>
        <div style={{ fontSize: 12, color: 'var(--accent-blue-light)', fontWeight: 800, marginBottom: 6 }}>
          💡 {lang === 'ar' ? 'هل تعلم؟' : 'Did you know?'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {lang === 'ar'
            ? 'الدروس تتغير يومياً وتُخصَّص لمرحلتك المالية الحالية. كل 7 أيام يأتيك درس إسلامي مرتبط بالرزق.'
            : 'Lessons change daily and are tailored to your current financial stage. Every 7 days you receive an Islamic lesson about provision.'}
        </div>
      </div>
    </div>
  )
}
