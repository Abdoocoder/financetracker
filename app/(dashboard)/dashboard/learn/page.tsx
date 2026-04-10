'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptic'
import { getLessonForStage, determineStage, type FinancialStage, type DailyLesson } from '@/lib/daily-lessons'
import { PageHeader } from '@/components/ui/page-header'

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? current + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

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
  const { lang, currentLang } = useI18n()
  const supabase = createClient()
  const [lesson, setLesson] = useState<DailyLesson | null>(null)
  const [stage, setStage] = useState<FinancialStage>('awareness')
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [streak, setStreak] = useState(0)
  const [sharing, setSharing] = useState(false)

  const loadLesson = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const now = new Date()
      const dayOfMonth = now.getDate()

      const [txRes, debtRes, goalRes, invRes] = await Promise.all([
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('debts').select('remaining_amount, monthly_payment').eq('user_id', user.id).eq('is_paid', false),
        supabase.from('savings_goals').select('current_amount, target_amount').eq('user_id', user.id),
        supabase.from('investments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      const { data: profile } = await supabase.from('profiles').select('monthly_income').eq('id', user.id).single()
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

      const savingsRate = income > 0 ? ((income - debts.reduce((a,d) => a + Number(d.monthly_payment), 0)) / income) * 100 : 0

      setLesson(getLessonForStage(userStage, dayOfMonth, lang as 'ar' | 'en', {
        debtRatio,
        savingsRate,
        txCount: txRes.count ?? 0,
        streak: streak,
        hasInvestments: (invRes.count ?? 0) > 0,
      }))

      // جلب streak من Supabase
      const { data: profileData } = await supabase
        .from('profiles')
        .select('lesson_streak, last_lesson_date')
        .eq('id', user.id)
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
  }, [user, supabase, lang, streak, currentLang])

  useEffect(() => {
    loadLesson()
  }, [loadLesson])

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

    // تحديث الإنجازات
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return
      fetch('/api/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ user_id: user!.id }),
      })
    })
  }

  async function shareLesson() {
    if (!lesson || sharing) return
    setSharing(true)
    haptic(50)
    try {
      const W = 1080, H = 1350
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!

      // انتظار تحميل الخطوط
      await document.fonts.ready

      // خلفية متدرجة كحلية
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#0A1628')
      bg.addColorStop(1, '#162440')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // لمعة ذهبية في الزاوية
      const glow = ctx.createRadialGradient(W / 2, 160, 0, W / 2, 160, 400)
      glow.addColorStop(0, 'rgba(245,158,11,0.12)')
      glow.addColorStop(1, 'rgba(245,158,11,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)

      // شعار التطبيق
      const logo = new Image()
      logo.src = '/icon-512.png'
      await new Promise<void>(res => { logo.onload = () => res(); logo.onerror = () => res() })
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(W / 2 - 60, 50, 120, 120, 24)
      ctx.clip()
      ctx.drawImage(logo, W / 2 - 60, 50, 120, 120)
      ctx.restore()

      // اسم التطبيق
      ctx.direction = 'rtl'
      ctx.textAlign = 'center'
      ctx.font = 'bold 52px Cairo, Arial'
      ctx.fillStyle = '#F59E0B'
      ctx.fillText('فجرك', W / 2, 225)

      // خط فاصل ذهبي
      const lineGrad = ctx.createLinearGradient(80, 0, W - 80, 0)
      lineGrad.addColorStop(0, 'rgba(245,158,11,0)')
      lineGrad.addColorStop(0.5, 'rgba(245,158,11,0.8)')
      lineGrad.addColorStop(1, 'rgba(245,158,11,0)')
      ctx.strokeStyle = lineGrad
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(80, 250)
      ctx.lineTo(W - 80, 250)
      ctx.stroke()

      // عنوان الدرس
      ctx.font = 'bold 52px Cairo, Arial'
      ctx.fillStyle = '#FFFFFF'
      const titleLines = wrapText(ctx, lesson.title, W - 160)
      let y = 330
      for (const line of titleLines) {
        ctx.fillText(line, W / 2, y)
        y += 68
      }

      y += 20

      // نص الدرس
      ctx.font = '36px Cairo, Arial'
      ctx.fillStyle = '#94A3B8'
      const bodyLines = wrapText(ctx, lesson.body, W - 160)
      for (const line of bodyLines.slice(0, 10)) {
        ctx.fillText(line, W / 2, y)
        y += 54
      }

      // خط سفلي
      ctx.strokeStyle = lineGrad
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(80, H - 120)
      ctx.lineTo(W - 80, H - 120)
      ctx.stroke()

      // رابط الموقع
      ctx.font = '34px Cairo, Arial'
      ctx.fillStyle = '#64748B'
      ctx.fillText('fajrak.com', W / 2, H - 65)

      // مشاركة الصورة
      canvas.toBlob(async blob => {
        if (!blob) return
        const file = new File([blob], 'fajrak-lesson.png', { type: 'image/png' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: currentLang === 'ar' ? 'درس اليوم من فجرك' : "Today's lesson from Fajrak" })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'fajrak-lesson.png'
          a.click()
          URL.revokeObjectURL(url)
        }
        setSharing(false)
      }, 'image/png')
    } catch {
      setSharing(false)
    }
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
        title={currentLang === 'ar' ? 'درس اليوم' : "Today's Lesson"}
        subtitle={currentLang === 'ar' ? 'تعلم خطوة كل يوم نحو حريتك المالية' : 'One step every day toward financial freedom'}
      />

      {/* مرحلتك + السلسلة */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, padding: '14px 16px', borderRadius: 16, background: 'var(--bg-card)', border: `1px solid ${info.color}33`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{info.icon}</span>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{currentLang === 'ar' ? 'مرحلتك' : 'Your Stage'}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: info.color }}>{info[currentLang]}</div>
          </div>
        </div>
        <div style={{ padding: '14px 16px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 24 }}>🔥</span>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>{currentLang === 'ar' ? 'السلسلة' : 'Streak'}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#F59E0B' }}>{streak}</div>
          </div>
        </div>
      </div>

      {/* خارطة التقدم */}
      <div style={{ padding: '16px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase' }}>
          {currentLang === 'ar' ? 'رحلتك المالية' : 'Your Financial Journey'}
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
              {currentLang === 'ar' ? '← طبّق الدرس' : 'Apply Lesson →'}
            </a>
            {!completed && (
              <button onClick={markComplete} style={{
                padding: '12px 16px', borderRadius: 12,
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                color: '#10B981', fontSize: 13, fontWeight: 800, cursor: 'pointer',
              }}>
                ✅ {currentLang === 'ar' ? 'أتممت الدرس' : 'Done'}
              </button>
            )}
            {completed && (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontSize: 13, fontWeight: 800 }}>
                ✅ {currentLang === 'ar' ? 'مكتمل' : 'Completed'}
              </div>
            )}
            <button
              onClick={shareLesson}
              disabled={sharing}
              title={currentLang === 'ar' ? 'شارك الدرس' : 'Share lesson'}
              style={{
                padding: '12px 14px', borderRadius: 12,
                background: sharing ? 'rgba(245,158,11,0.05)' : 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)',
                color: '#F59E0B', fontSize: 18, cursor: sharing ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'opacity 0.2s', opacity: sharing ? 0.5 : 1,
              }}
            >
              {sharing ? '⏳' : '📤'}
            </button>
          </div>
        </div>
      )}

      {/* نصيحة اليوم */}
      <div style={{ padding: '16px 20px', borderRadius: 16, background: 'rgba(59,126,246,0.06)', border: '1px solid rgba(59,126,246,0.15)' }}>
        <div style={{ fontSize: 12, color: 'var(--accent-blue-light)', fontWeight: 800, marginBottom: 6 }}>
          💡 {currentLang === 'ar' ? 'هل تعلم؟' : 'Did you know?'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {currentLang === 'ar'
            ? 'الدروس تتغير يومياً وتُخصَّص لمرحلتك المالية الحالية. كل 7 أيام يأتيك درس إسلامي مرتبط بالرزق.'
            : 'Lessons change daily and are tailored to your current financial stage. Every 7 days you receive an Islamic lesson about provision.'}
        </div>
      </div>
    </div>
  )
}
