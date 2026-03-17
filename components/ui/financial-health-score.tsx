'use client'
import { useI18n } from '@/lib/i18n'

interface Props {
  income: number
  expenses: number
  totalDebt: number
  invValue: number
  goalsSaved: number
  goalsTarget: number
  txCount: number
}

function calcScore(p: Props) {
  let score = 0
  const tips: { ar: string; en: string }[] = []

  // 1. نسبة الادخار (30 نقطة)
  const savingsRate = p.income > 0 ? (p.income - p.expenses) / p.income : 0
  if (savingsRate >= 0.2) score += 30
  else if (savingsRate >= 0.1) score += 20
  else if (savingsRate > 0) score += 10
  else tips.push({ ar: 'حاول توفير 20% من دخلك الشهري', en: 'Try to save 20% of your monthly income' })

  // 2. نسبة الديون (25 نقطة)
  const debtRatio = p.income > 0 ? p.totalDebt / (p.income * 12) : 1
  if (debtRatio === 0) score += 25
  else if (debtRatio < 0.3) score += 20
  else if (debtRatio < 0.6) score += 10
  else tips.push({ ar: 'ديونك مرتفعة — ركز على السداد أولاً', en: 'Your debt is high — focus on repayment first' })

  // 3. صندوق الطوارئ (20 نقطة)
  const emergencyRatio = p.income > 0 ? p.goalsSaved / (p.income * 3) : 0
  if (emergencyRatio >= 1) score += 20
  else if (emergencyRatio >= 0.5) score += 12
  else if (emergencyRatio > 0) score += 6
  else tips.push({ ar: 'ابنِ صندوق طوارئ يعادل 3 أشهر من دخلك', en: 'Build an emergency fund equal to 3 months of income' })

  // 4. الاستثمار (15 نقطة)
  if (p.invValue > 0) score += 15
  else tips.push({ ar: 'ابدأ الاستثمار حتى بمبالغ صغيرة', en: 'Start investing even with small amounts' })

  // 5. انتظام التتبع (10 نقطة)
  if (p.txCount >= 10) score += 10
  else if (p.txCount >= 5) score += 6
  else if (p.txCount > 0) score += 3
  else tips.push({ ar: 'سجّل معاملاتك يومياً للتحكم في مصاريفك', en: 'Log your transactions daily to control spending' })

  return { score: Math.min(score, 100), tips }
}

function getStatus(score: number, lang: string) {
  if (score >= 80) return { label: lang === 'ar' ? 'ممتاز 🌟' : 'Excellent 🌟', color: '#10B981' }
  if (score >= 60) return { label: lang === 'ar' ? 'جيد 💪' : 'Good 💪', color: '#3B7EF6' }
  if (score >= 40) return { label: lang === 'ar' ? 'متوسط ⚡' : 'Fair ⚡', color: '#F59E0B' }
  return { label: lang === 'ar' ? 'يحتاج تحسين 🔴' : 'Needs Improvement 🔴', color: '#EF4444' }
}

export function FinancialHealthScore(props: Props) {
  const { lang } = useI18n()
  const { score, tips } = calcScore(props)
  const { label, color } = getStatus(score, lang)

  const bars = [
    { key: 'savings',   ar: 'الادخار',   en: 'Savings',   max: 30, val: props.income > 0 ? Math.min(30, Math.round((Math.max(0, props.income - props.expenses) / props.income) * 150)) : 0, color: '#10B981' },
    { key: 'debt',      ar: 'الديون',    en: 'Debt',      max: 25, val: props.totalDebt === 0 ? 25 : Math.max(0, 25 - Math.round((props.totalDebt / Math.max(props.income * 12, 1)) * 25)), color: '#3B7EF6' },
    { key: 'emergency', ar: 'الطوارئ',   en: 'Emergency', max: 20, val: Math.min(20, Math.round((props.goalsSaved / Math.max(props.income * 3, 1)) * 20)), color: '#8B5CF6' },
    { key: 'investing', ar: 'الاستثمار', en: 'Investing',  max: 15, val: props.invValue > 0 ? 15 : 0, color: '#F59E0B' },
    { key: 'tracking',  ar: 'التتبع',    en: 'Tracking',  max: 10, val: Math.min(10, props.txCount), color: '#EC4899' },
  ]

  const circumference = 2 * Math.PI * 54
  const dash = (score / 100) * circumference

  return (
    <div style={{ background: 'var(--bg-card)', border: `1px solid ${color}22`, borderRadius: 20, padding: '20px', boxShadow: `0 0 40px ${color}0A` }}>

      {/* Header */}
      <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
        {lang === 'ar' ? '💊 نقاط الصحة المالية' : '💊 Financial Health Score'}
      </div>

      {/* Score Circle + Bars */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>

        {/* الدائرة */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--bg-elevated)" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke={color} strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              strokeDashoffset={circumference * 0.25}
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>/100</div>
          </div>
        </div>

        {/* الأشرطة */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color }}>{label}</div>
          {bars.map(b => (
            <div key={b.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>{lang === 'ar' ? b.ar : b.en}</span>
                <span style={{ fontSize: 10, color: b.color, fontWeight: 800 }}>{b.val}/{b.max}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                <div style={{ width: `${(b.val / b.max) * 100}%`, height: '100%', background: b.color, borderRadius: 2, transition: 'width 1s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* نصيحة */}
      {tips.length > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#F59E0B', marginBottom: 4 }}>
            💡 {lang === 'ar' ? 'نصيحة للتحسين' : 'Improvement Tip'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {tips[0][lang as 'ar' | 'en']}
          </div>
        </div>
      )}
    </div>
  )
}
