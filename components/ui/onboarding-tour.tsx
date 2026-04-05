'use client'
import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'
import { usePathname } from 'next/navigation'

const TOUR_KEYS: Record<string, string> = {
  '/dashboard':              'tour_dashboard',
  '/dashboard/transactions': 'tour_transactions',
  '/dashboard/debts':        'tour_debts',
  '/dashboard/budgets':      'tour_budgets',
  '/dashboard/goals':        'tour_goals',
  '/dashboard/investments':  'tour_investments',
  '/dashboard/learn':        'tour_learn',
  '/dashboard/alerts':       'tour_alerts',
}

const TOURS: Record<string, { ar: { title: string; desc: string }; en: { title: string; desc: string } }[]> = {
  '/dashboard': [
    {
      ar: { title: '👋 مرحباً في لوحة التحكم', desc: 'هنا ملخص كامل لوضعك المالي — دخلك، مصاريفك، وصافيك هذا الشهر.' },
      en: { title: '👋 Welcome to Dashboard', desc: 'Here\'s a complete summary of your finances — income, expenses, and net this month.' },
    },
    {
      ar: { title: '⚡ الإضافة السريعة', desc: 'أضف دخلاً أو مصروفاً بضغطة واحدة. التتبع اليومي يغير حياتك المالية.' },
      en: { title: '⚡ Quick Add', desc: 'Add income or expense in one tap. Daily tracking transforms your financial life.' },
    },
    {
      ar: { title: '💊 نقاط الصحة المالية', desc: 'رقم من 0-100 يقيس صحتك المالية. كلما ارتفع كلما كنت أقرب للحرية المالية.' },
      en: { title: '💊 Financial Health Score', desc: 'A score from 0-100 measuring your financial health. The higher, the closer to financial freedom.' },
    },
    {
      ar: { title: '🗺️ خارطة الثراء', desc: 'تتبع رحلتك من الوعي المالي حتى الحرية المالية عبر 5 مراحل.' },
      en: { title: '🗺️ Wealth Roadmap', desc: 'Track your journey from financial awareness to financial freedom through 5 stages.' },
    },
  ],
  '/dashboard/transactions': [
    {
      ar: { title: '💸 صفحة المعاملات', desc: 'سجّل كل دخل ومصروف هنا. كلما سجلت أكثر كلما فهمت وضعك المالي بشكل أدق.' },
      en: { title: '💸 Transactions', desc: 'Log every income and expense here. The more you track, the better you understand your finances.' },
    },
    {
      ar: { title: '🔍 البحث والفلترة', desc: 'ابحث عن أي معاملة أو فلتر حسب النوع أو الشهر بسهولة.' },
      en: { title: '🔍 Search & Filter', desc: 'Search any transaction or filter by type or month easily.' },
    },
    {
      ar: { title: '📥 تصدير CSV', desc: 'صدّر معاملاتك كملف Excel لمراجعتها خارج التطبيق.' },
      en: { title: '📥 Export CSV', desc: 'Export your transactions as an Excel file for external review.' },
    },
  ],
  '/dashboard/debts': [
    {
      ar: { title: '💳 إدارة الديون', desc: 'تتبع كل ديونك مع شريط تقدم مرئي. الشفافية مع نفسك أول خطوة للسداد.' },
      en: { title: '💳 Debt Management', desc: 'Track all your debts with a visual progress bar. Being honest with yourself is the first step to repayment.' },
    },
    {
      ar: { title: '📅 خصم تلقائي', desc: 'حدد يوم الخصم لكل دين وسيخصم تلقائياً كل شهر.' },
      en: { title: '📅 Auto Deduction', desc: 'Set a deduction day for each debt and it will automatically deduct every month.' },
    },
    {
      ar: { title: '🎉 احتفال السداد', desc: 'عند سداد دين كامل — احتفال وألعاب نارية! 🎊 كل دين مسدد انتصار.' },
      en: { title: '🎉 Payoff Celebration', desc: 'When you fully pay off a debt — celebration and confetti! 🎊 Every paid debt is a victory.' },
    },
    {
      ar: { title: '🏦 الخصم التلقائي', desc: 'فعّل "تلقائي من البنك" ليخصم القسط تلقائياً كل شهر دون تدخل منك — أو اختر "يدوي" لتسجيله بنفسك مع تذكير.' },
      en: { title: '🏦 Auto Deduction', desc: 'Enable "Auto from Bank" to automatically deduct the installment every month — or choose "Manual" to log it yourself with a reminder.' },
    },
  ],
  '/dashboard/budgets': [
    {
      ar: { title: '📊 الميزانية الذكية', desc: 'خطط إنفاقك الشهري واحصل على تحليل فوري ومستشار مالي ذكي.' },
      en: { title: '📊 Smart Budget', desc: 'Plan your monthly spending and get instant analysis and a smart financial advisor.' },
    },
    {
      ar: { title: '📐 قاعدة 50/30/20', desc: '50% للضروريات، 30% للرغبات، 20% للادخار — توزيع مثالي مقترح تلقائياً.' },
      en: { title: '📐 50/30/20 Rule', desc: '50% for needs, 30% for wants, 20% for savings — automatically suggested optimal distribution.' },
    },
  ],
  '/dashboard/goals': [
    {
      ar: { title: '🎯 أهداف الادخار', desc: 'حدد هدفاً مالياً وتابع تقدمك. الأهداف المكتوبة أكثر احتمالاً للتحقق بنسبة 42%.' },
      en: { title: '🎯 Savings Goals', desc: 'Set a financial goal and track your progress. Written goals are 42% more likely to be achieved.' },
    },
    {
      ar: { title: '💰 إضافة دفعات', desc: 'أضف مبلغاً لهدفك في أي وقت وشاهد شريط التقدم يرتفع.' },
      en: { title: '💰 Add Contributions', desc: 'Add an amount to your goal anytime and watch the progress bar rise.' },
    },
  ],
  '/dashboard/investments': [
    {
      ar: { title: '📈 محفظتك الاستثمارية', desc: 'تتبع أسهمك وعملاتك الرقمية مع أسعار حية وحساب الربح والخسارة.' },
      en: { title: '📈 Your Portfolio', desc: 'Track your stocks and crypto with live prices and profit/loss calculations.' },
    },
    {
      ar: { title: '✅ استثمار حلال', desc: 'ندعم الأسهم الحلال مثل SPUS وغيرها — استثمر بطمأنينة.' },
      en: { title: '✅ Halal Investing', desc: 'We support halal stocks like SPUS and others — invest with peace of mind.' },
    },
  ],
  '/dashboard/learn': [
    {
      ar: { title: '📚 درس اليوم', desc: 'درس مالي يومي مخصص لمرحلتك — مبني على أبحاث علم السلوك المالي.' },
      en: { title: '📚 Today\'s Lesson', desc: 'Daily financial lesson tailored to your stage — based on behavioral finance research.' },
    },
    {
      ar: { title: '🔥 السلسلة اليومية', desc: 'حافظ على سلسلتك بإتمام درس كل يوم. الاستمرارية هي سر النجاح.' },
      en: { title: '🔥 Daily Streak', desc: 'Maintain your streak by completing a lesson every day. Consistency is the secret to success.' },
    },
    {
      ar: { title: '🕌 دروس إسلامية', desc: 'كل 7 أيام درس من القرآن والسنة مرتبط بالرزق والثروة.' },
      en: { title: '🕌 Islamic Lessons', desc: 'Every 7 days a lesson from the Quran and Sunnah related to provision and wealth.' },
    },
  ],
  '/dashboard/alerts': [
    {
      ar: { title: '🔔 التنبيهات الذكية', desc: 'تنبيهات يومية تحللها الذكاء الاصطناعي بناءً على بياناتك الحقيقية.' },
      en: { title: '🔔 Smart Alerts', desc: 'Daily alerts analyzed by AI based on your real data.' },
    },
    {
      ar: { title: '⚠️ أنواع التنبيهات', desc: 'تحذيرات عند تجاوز الميزانية، إنجازات عند الادخار، وتذكيرات للأقساط.' },
      en: { title: '⚠️ Alert Types', desc: 'Warnings when budget is exceeded, achievements when saving, and reminders for installments.' },
    },
  ],
}

export function OnboardingTour() {
  const { lang } = useI18n()
  const pathname = usePathname()
  const [step, setStep] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const key = TOUR_KEYS[pathname]
    if (!key) return
    const done = localStorage.getItem(key)
    if (!done) setTimeout(() => { setStep(0); setShow(true) }, 1500)
  }, [pathname])

  const steps = TOURS[pathname] ?? []

  function next() {
    if (step < steps.length - 1) setStep(s => s + 1)
    else complete()
  }

  function complete() {
    const key = TOUR_KEYS[pathname]
    if (key) localStorage.setItem(key, 'true')
    setShow(false)
  }

  if (!show || steps.length === 0) return null

  const current = steps[step]
  const info = current[lang as 'ar' | 'en'] ?? current['ar']

  if (!info) return null

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9998, backdropFilter: 'blur(2px)' }} onClick={complete} />
      <div style={{
        position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
        width: 'min(340px, calc(100vw - 32px))',
        background: 'var(--bg-card)', border: '1px solid rgba(59,126,246,0.3)',
        borderRadius: 20, padding: '20px', zIndex: 9999,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= step ? 'var(--accent-blue)' : 'var(--border)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>{info.title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>{info.desc}</div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={complete} style={{ padding: '9px 16px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {lang === 'ar' ? 'تخطي' : 'Skip'}
          </button>
          <button onClick={next} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--accent-blue)', border: 'none', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            {step < steps.length - 1
              ? (lang === 'ar' ? `التالي ← (${step + 1}/${steps.length})` : `Next → (${step + 1}/${steps.length})`)
              : (lang === 'ar' ? '✅ فهمت!' : '✅ Got it!')}
          </button>
        </div>
      </div>
    </>
  )
}
