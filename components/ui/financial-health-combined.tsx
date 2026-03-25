'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  income: number
  expenses: number
  totalDebt: number
  invValue: number
  goalsSaved: number
  goalsTarget: number
  txCount: number
}

interface RoadmapData {
  score: number
  stage: number
  strengths: string[]
  improvements: string[]
  nextStep: string
  nextStepDetail: string
  debtRatio: number
  hasEmergencyFund: boolean
  isInvesting: boolean
  netWorth: number
  smallestDebt: { name: string; amount: number; monthly: number } | null
}

function calcHealthScore(p: Props) {
  let score = 0
  const savingsRate = p.income > 0 ? (p.income - p.expenses) / p.income : 0
  if (savingsRate >= 0.2) score += 30
  else if (savingsRate >= 0.1) score += 20
  else if (savingsRate > 0) score += 10

  const debtRatio = p.income > 0 ? p.totalDebt / (p.income * 12) : 1
  if (debtRatio === 0) score += 25
  else if (debtRatio < 0.3) score += 20
  else if (debtRatio < 0.6) score += 10

  const emergencyRatio = p.income > 0 ? p.goalsSaved / (p.income * 3) : 0
  if (emergencyRatio >= 1) score += 20
  else if (emergencyRatio >= 0.5) score += 12
  else if (emergencyRatio > 0) score += 6

  if (p.invValue > 0) score += 15

  if (p.txCount >= 10) score += 10
  else if (p.txCount >= 5) score += 6
  else if (p.txCount > 0) score += 3

  return Math.min(score, 100)
}

export function FinancialHealthCombined(props: Props) {
  const { user } = useUser()
  const { lang, t } = useI18n()
  const ar = lang === 'ar'
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<'score' | 'roadmap' | 'history'>('score')
  const [scoreHistory, setScoreHistory] = useState<{recorded_at: string; score: number}[]>([])
  const supabase = createClient()

  const score = calcHealthScore(props)

  const loadRoadmap = useCallback(async () => {
    if (!user) return
    const now = new Date()
    const firstDay = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    const today = now.toISOString().split('T')[0]

    const [profileRes, txRes, debtsRes, goalsRes, invRes] = await Promise.all([
      supabase.from('profiles').select('monthly_income, asset_real_estate, asset_vehicles, asset_jewelry, asset_other').eq('id', user.id).single(),
      supabase.from('transactions').select('amount, type').eq('user_id', user.id).gte('transaction_date', firstDay).lte('transaction_date', today),
      supabase.from('debts').select('name, remaining_amount, monthly_payment').eq('user_id', user.id).eq('is_paid', false),
      supabase.from('savings_goals').select('target_amount, current_amount').eq('user_id', user.id),
      supabase.from('investments').select('shares, current_price').eq('user_id', user.id),
    ])

    const income = profileRes.data?.monthly_income ?? 0
    const totalPersonalAssets = (profileRes.data?.asset_real_estate ?? 0) + (profileRes.data?.asset_vehicles ?? 0) + (profileRes.data?.asset_jewelry ?? 0) + (profileRes.data?.asset_other ?? 0)
    const txList = txRes.data ?? []
    const debts = debtsRes.data ?? []
    const goals = goalsRes.data ?? []
    const investments = invRes.data ?? []

    const monthlyExpenses = txList.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
    const monthlyDebtPayment = debts.reduce((a, d) => a + Number(d.monthly_payment), 0)
    const totalDebt = debts.reduce((a, d) => a + Number(d.remaining_amount), 0)
    const totalSavings = goals.reduce((a, g) => a + Number(g.current_amount), 0)
    const totalInvested = investments.reduce((a, i) => a + (Number(i.shares) * Number(i.current_price)), 0)
    const emergencyTarget = monthlyExpenses * 3

    const debtRatio = income > 0 ? (monthlyDebtPayment / income) * 100 : 0
    const hasEmergencyFund = totalSavings >= emergencyTarget && emergencyTarget > 0
    const isInvesting = totalInvested > 0
    const isTracking = txList.length >= 5

    // المرحلة
    let stage = 1
    if (isTracking) stage = 2
    if (isTracking && debtRatio < 35) stage = 3
    if (isTracking && debtRatio < 35 && hasEmergencyFund) stage = 4
    if (isTracking && debtRatio < 35 && hasEmergencyFund && isInvesting) stage = 5

    // نقاط القوة
    const strengths: string[] = []
    if (isTracking) strengths.push(ar ? 'تتبع مصاريفك بانتظام ✅' : 'Tracking expenses regularly ✅')
    if (debtRatio < 35) strengths.push(ar ? `نسبة ديونك ${debtRatio.toFixed(0)}% — صحية ✅` : `Debt ratio ${debtRatio.toFixed(0)}% — healthy ✅`)
    if (hasEmergencyFund) strengths.push(ar ? 'لديك صندوق طوارئ ✅' : 'Emergency fund ready ✅')
    if (isInvesting) strengths.push(ar ? 'تستثمر بانتظام ✅' : 'Investing regularly ✅')

    // نقاط التحسين
    const improvements: string[] = []
    if (!isTracking) improvements.push(ar ? 'سجّل مصاريفك يومياً' : 'Track expenses daily')
    if (debtRatio >= 35) improvements.push(ar ? `نسبة ديونك ${debtRatio.toFixed(0)}% — مرتفعة` : `Debt ratio ${debtRatio.toFixed(0)}% — high`)
    if (!hasEmergencyFund) improvements.push(ar ? 'لا يوجد صندوق طوارئ' : 'No emergency fund')
    if (!isInvesting) improvements.push(ar ? 'لم تبدأ الاستثمار بعد' : 'Not investing yet')

    // الخطوة التالية
    const smallestDebt = debts.length > 0 ? debts.sort((a, b) => Number(a.remaining_amount) - Number(b.remaining_amount))[0] : null
    let nextStep = '', nextStepDetail = ''

    if (!isTracking) {
      nextStep = ar ? 'ابدأ بتسجيل مصاريفك' : 'Start tracking expenses'
      nextStepDetail = ar ? 'سجّل كل مصروف اليوم — 5 معاملات تكفي للبداية' : 'Log every expense today'
    } else if (debtRatio >= 35 && smallestDebt) {
      nextStep = ar ? `ركز على سداد "${smallestDebt.name}"` : `Pay off "${smallestDebt.name}" first`
      nextStepDetail = ar ? `بعد سداده ستوفر ${smallestDebt.monthly_payment} JOD شهرياً للأبد` : `After paying it off, you'll save ${smallestDebt.monthly_payment} JOD/month`
    } else if (!hasEmergencyFund) {
      const needed = Math.max(0, emergencyTarget - totalSavings)
      const monthly = Math.ceil(needed / 6)
      nextStep = ar ? 'ابنِ صندوق الطوارئ' : 'Build emergency fund'
      nextStepDetail = ar ? `ادخر ${monthly} JOD شهرياً — ستصل للهدف في 6 أشهر` : `Save ${monthly} JOD/month — reach goal in 6 months`
    } else if (!isInvesting) {
      const investAmount = Math.floor((income - monthlyDebtPayment - monthlyExpenses) * 0.2)
      nextStep = ar ? 'ابدأ الاستثمار الآن' : 'Start investing now'
      nextStepDetail = ar ? `استثمر ${Math.max(0, investAmount)} JOD شهرياً في SPUS — حلال ومتنوع` : `Invest ${Math.max(0, investAmount)} JOD/month in SPUS`
    } else {
      nextStep = ar ? 'زِد استثماراتك' : 'Increase investments'
      nextStepDetail = ar ? 'أنت في المسار الصحيح — زد نسبة الاستثمار 5% كل سنة' : "You're on track — increase investments by 5% yearly"
    }

    setRoadmap({
      score, stage, strengths, improvements, nextStep, nextStepDetail,
      debtRatio, hasEmergencyFund, isInvesting,
      netWorth: totalPersonalAssets + totalInvested + totalSavings - totalDebt,
      smallestDebt: smallestDebt ? { name: smallestDebt.name, amount: Number(smallestDebt.remaining_amount), monthly: Number(smallestDebt.monthly_payment) } : null
    })
  }, [user, ar, supabase, score])

  useEffect(() => {
    loadRoadmap()
  }, [loadRoadmap])

  async function loadHistory() {
    if (!user) return
    const { data } = await supabase.from('health_score_history')
      .select('recorded_at, score')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: true })
      .limit(30)
    setScoreHistory(data ?? [])
  }

  useEffect(() => {
    if (tab === 'history') loadHistory()
  }, [tab])

  // ── الألوان ──
  const scoreColor = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'
  const scoreLabel = score >= 80
    ? (ar ? 'ممتاز 🌟' : 'Excellent 🌟')
    : score >= 60 ? (ar ? 'جيد 💪' : 'Good 💪')
    : score >= 40 ? (ar ? 'متوسط ⚡' : 'Fair ⚡')
    : (ar ? 'يحتاج تحسين 🔴' : 'Needs Improvement 🔴')

  const stageNames = ar
    ? ['', 'الوعي المالي', 'التحكم المالي', 'الاحتياطي المالي', 'بناء الثروة', 'الحرية المالية']
    : ['', 'Awareness', 'Control', 'Reserve', 'Wealth Building', 'Financial Freedom']
  const stageColors = ['', '#6B7280', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981']

  // ── الدائرة ──
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const dash = (score / 100) * circumference

  // ── الأشرطة ──
  const bars = [
    { key: 'savings',   label: ar ? t('health_savings') : 'Savings',   max: 30, val: props.income > 0 ? Math.min(30, Math.round((Math.max(0, props.income - props.expenses) / props.income) * 150)) : 0, color: '#10B981' },
    { key: 'debt',      label: ar ? t('health_debt') : 'Debt',         max: 25, val: props.totalDebt === 0 ? 25 : Math.max(0, 25 - Math.round((props.totalDebt / Math.max(props.income * 12, 1)) * 25)), color: '#3B7EF6' },
    { key: 'emergency', label: ar ? t('health_emergency') : 'Emergency', max: 20, val: Math.min(20, Math.round((props.goalsSaved / Math.max(props.income * 3, 1)) * 20)), color: '#8B5CF6' },
    { key: 'investing', label: ar ? t('health_investing') : 'Investing', max: 15, val: props.invValue > 0 ? 15 : 0, color: '#F59E0B' },
    { key: 'tracking',  label: ar ? t('health_tracking') : 'Tracking',  max: 10, val: Math.min(10, props.txCount), color: '#EC4899' },
  ]

  const stage = roadmap?.stage ?? 1

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: `1px solid var(--border)`, overflow: 'hidden' }}>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {(['score', 'roadmap', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '12px', background: 'none', border: 'none',
            borderBottom: tab === t ? `2px solid ${scoreColor}` : '2px solid transparent',
            color: tab === t ? scoreColor : 'var(--text-muted)',
            fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}>
            {t === 'score' ? (ar ? '💊 الصحة' : '💊 Score')
            : t === 'roadmap' ? (ar ? '🗺️ الخريطة' : '🗺️ Roadmap')
            : (ar ? '📈 التاريخ' : '📈 History')}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Health Score ── */}
      {tab === 'score' && (
        <div style={{ padding: '24px 20px' }}>

          {/* الدائرة الكاملة */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ position: 'relative', width: 180, height: 180 }}>
              <svg width="180" height="180" viewBox="0 0 180 180">
                {/* خلفية */}
                <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--bg-elevated)" strokeWidth="12" />
                {/* التقدم */}
                <circle
                  cx="90" cy="90" r={radius} fill="none"
                  stroke={scoreColor} strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference}`}
                  strokeDashoffset={circumference * 0.25}
                  style={{ transition: 'stroke-dasharray 1.2s ease', filter: `drop-shadow(0 0 8px ${scoreColor}60)` }}
                />
              </svg>
              {/* النص في المنتصف */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 42, fontWeight: 900, color: scoreColor, lineHeight: 1, fontFamily: 'monospace' }}>{score}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>/ 100</div>
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: scoreColor, marginTop: 8 }}>{scoreLabel}</div>
          </div>

          {/* الأشرطة */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bars.map(b => (
              <div key={b.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>{b.label}</span>
                  <span style={{ fontSize: 12, color: b.color, fontWeight: 800 }}>{b.val}/{b.max}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                  <div style={{ width: `${(b.val / b.max) * 100}%`, height: '100%', background: b.color, borderRadius: 3, transition: 'width 1.2s ease' }} />
                </div>
              </div>
            ))}
          </div>

          {/* نصيحة */}
          {roadmap && roadmap.improvements.length > 0 && (
            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#F59E0B', marginBottom: 4 }}>
                💡 {ar ? t('health_tip') : 'Improvement Tip'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {roadmap.improvements[0]}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Wealth Roadmap ── */}
      {tab === 'roadmap' && roadmap && (
        <div>
          {/* صافي الثروة */}
          {roadmap.netWorth !== 0 && (
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: roadmap.netWorth >= 0 ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>💎 {ar ? 'صافي ثروتك' : 'Net Worth'}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ar ? 'أصول + استثمارات − ديون' : 'Assets + Investments − Debts'}</div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: roadmap.netWorth >= 0 ? '#10B981' : '#EF4444', fontFamily: 'monospace' }}>
                {roadmap.netWorth >= 0 ? '+' : ''}{roadmap.netWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })} JOD
              </div>
            </div>
          )}

          {/* شريط المراحل */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>
              {ar ? `المرحلة ${stage} من 5 — ${stageNames[stage]}` : `Stage ${stage} of 5 — ${stageNames[stage]}`}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1,2,3,4,5].map(s => (
                <div key={s} style={{ flex: 1, height: 6, borderRadius: 3, background: s <= stage ? stageColors[s] : 'var(--bg-secondary)', transition: 'background 0.3s' }} />
              ))}
            </div>
          </div>

          {/* الخطوة التالية */}
          <div style={{ padding: '16px 20px', background: 'rgba(59,126,246,0.04)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6 }}>⚡ {ar ? 'الخطوة التالية' : 'Next Step'}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>{roadmap.nextStep}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{roadmap.nextStepDetail}</div>
          </div>

          {/* تفاصيل */}
          <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', padding: '12px 20px', background: 'none', border: 'none', borderBottom: expanded ? '1px solid var(--border)' : 'none', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{ar ? 'عرض التحليل الكامل' : 'Show full analysis'}</span>
            <span>{expanded ? '▲' : '▼'}</span>
          </button>

          {expanded && (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {roadmap.strengths.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#10B981', marginBottom: 8 }}>✅ {ar ? 'نقاط القوة' : 'Strengths'}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {roadmap.strengths.map((s, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>{s}</div>
                    ))}
                  </div>
                </div>
              )}
              {roadmap.improvements.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#F59E0B', marginBottom: 8 }}>🔶 {ar ? 'تحتاج تحسين' : 'Needs Improvement'}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {roadmap.improvements.map((s, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>{s}</div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 8 }}>🗺️ {ar ? 'مسيرتك' : 'Your Journey'}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[1,2,3,4,5].map(s => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: s === stage ? `${stageColors[s]}15` : 'var(--bg-secondary)', border: `1px solid ${s === stage ? stageColors[s] + '40' : 'var(--border)'}`, opacity: s > stage + 1 ? 0.5 : 1 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: s <= stage ? stageColors[s] : 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: s <= stage ? 'white' : 'var(--text-muted)', fontWeight: 900, flexShrink: 0 }}>
                        {s <= stage ? '✓' : s}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: s === stage ? 900 : 600, color: s === stage ? stageColors[s] : 'var(--text-secondary)' }}>{stageNames[s]}</div>
                      {s === stage && <div style={{ marginRight: 'auto', fontSize: 10, color: stageColors[s], fontWeight: 700 }}>{ar ? 'أنت هنا' : 'You are here'}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'roadmap' && !roadmap && (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="skeleton" style={{ height: 20, borderRadius: 10, width: '60%', margin: '0 auto 12px' }} />
          <div className="skeleton" style={{ height: 60, borderRadius: 10 }} />
        </div>
      )}

      {tab === 'history' && (
        <div style={{ padding: '20px' }}>
          {scoreHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              {ar ? 'لا يوجد سجل بعد — سيُضاف كل يوم تلقائياً' : 'No history yet — recorded daily automatically'}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 16 }}>
                {ar ? `آخر ${scoreHistory.length} يوم` : `Last ${scoreHistory.length} days`}
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={scoreHistory} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis dataKey="recorded_at" tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                    tickFormatter={(v: string) => v.slice(5)} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any) => [`${v}/100`, ar ? 'الصحة المالية' : 'Health Score']}
                    labelFormatter={(l: any) => l}
                  />
                  <Line type="monotone" dataKey="score" stroke={scoreColor} strokeWidth={2.5}
                    dot={false} activeDot={{ r: 5, fill: scoreColor }} />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ar ? 'الأدنى' : 'Min'}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#EF4444' }}>{Math.min(...scoreHistory.map(h => h.score))}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ar ? 'المتوسط' : 'Avg'}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#F59E0B' }}>{Math.round(scoreHistory.reduce((a, h) => a + h.score, 0) / scoreHistory.length)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ar ? 'الأعلى' : 'Max'}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#10B981' }}>{Math.max(...scoreHistory.map(h => h.score))}</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
