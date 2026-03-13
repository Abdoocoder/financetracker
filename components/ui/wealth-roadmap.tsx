'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'

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
  monthlyIncome: number
  totalDebt: number
  monthlyDebtPayment: number
  totalPersonalAssets: number
  netWorth: number
  smallestDebt: { name: string; amount: number; monthly: number } | null
}

export function WealthRoadmap() {
  const { user } = useUser()
  const { lang } = useI18n()
  const ar = lang === 'ar'
  const [data, setData] = useState<RoadmapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)

    const now = new Date()
    const firstDay = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    const today = now.toISOString().split('T')[0]

    // جلب البيانات
    const [profileRes, txRes, debtsRes, goalsRes, invRes] = await Promise.all([
      supabase.from('profiles').select('monthly_income, salary_day, asset_real_estate, asset_vehicles, asset_jewelry, asset_other').eq('id', user.id).single(),
      supabase.from('transactions').select('amount, type, category').eq('user_id', user.id).gte('transaction_date', firstDay).lte('transaction_date', today),
      supabase.from('debts').select('name, remaining_amount, monthly_payment').eq('user_id', user.id).eq('is_paid', false),
      supabase.from('savings_goals').select('target_amount, current_amount').eq('user_id', user.id),
      supabase.from('investments').select('shares, avg_buy_price, current_price').eq('user_id', user.id),
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
    const totalInvested = investments.reduce((a, i) => a + (Number(i.shares) * Number(i.avg_buy_price)), 0)
    const emergencyTarget = monthlyExpenses * 3

    const debtRatio = income > 0 ? (monthlyDebtPayment / income) * 100 : 0
    const hasEmergencyFund = totalSavings >= emergencyTarget && emergencyTarget > 0
    const isInvesting = totalInvested > 0
    const isTracking = txList.length >= 5

    // ── حساب الدرجة ──
    let score = 0
    if (isTracking) score += 15
    if (debtRatio < 35) score += 25
    else if (debtRatio < 50) score += 10
    if (hasEmergencyFund) score += 25
    if (isInvesting) score += 25
    if (income > 0) score += 10

    if (totalPersonalAssets > income * 6) score += 10
    score = Math.min(100, score)

    // ── تحديد المرحلة ──
    let stage = 1
    if (isTracking) stage = 2
    if (isTracking && debtRatio < 50) stage = 2
    if (isTracking && debtRatio < 35) stage = 3
    if (isTracking && debtRatio < 35 && hasEmergencyFund) stage = 4
    if (isTracking && debtRatio < 35 && hasEmergencyFund && isInvesting) stage = 5

    // ── نقاط القوة ──
    const strengths: string[] = []
    if (isTracking) strengths.push(ar ? 'تتبع مصاريفك بانتظام ✅' : 'Tracking expenses regularly ✅')
    if (debtRatio < 35) strengths.push(ar ? `نسبة ديونك ${debtRatio.toFixed(0)}% — صحية ✅` : `Debt ratio ${debtRatio.toFixed(0)}% — healthy ✅`)
    if (hasEmergencyFund) strengths.push(ar ? 'لديك صندوق طوارئ ✅' : 'Emergency fund ready ✅')
    if (isInvesting) strengths.push(ar ? 'تستثمر بانتظام ✅' : 'Investing regularly ✅')

    // ── نقاط التحسين ──
    const improvements: string[] = []
    if (!isTracking) improvements.push(ar ? 'سجّل مصاريفك يومياً' : 'Track expenses daily')
    if (debtRatio >= 35) improvements.push(ar ? `نسبة ديونك ${debtRatio.toFixed(0)}% — مرتفعة` : `Debt ratio ${debtRatio.toFixed(0)}% — high`)
    if (!hasEmergencyFund) improvements.push(ar ? 'لا يوجد صندوق طوارئ' : 'No emergency fund')
    if (!isInvesting) improvements.push(ar ? 'لم تبدأ الاستثمار بعد' : 'Not investing yet')

    // ── الخطوة التالية ──
    const smallestDebt = debts.length > 0
      ? debts.sort((a, b) => Number(a.remaining_amount) - Number(b.remaining_amount))[0]
      : null

    let nextStep = ''
    let nextStepDetail = ''

    if (!isTracking) {
      nextStep = ar ? 'ابدأ بتسجيل مصاريفك' : 'Start tracking expenses'
      nextStepDetail = ar ? 'سجّل كل مصروف اليوم — 5 معاملات تكفي للبداية' : 'Log every expense today'
    } else if (debtRatio >= 35 && smallestDebt) {
      nextStep = ar ? `ركز على سداد "${smallestDebt.name}"` : `Focus on paying "${smallestDebt.name}"`
      nextStepDetail = ar
        ? `بعد سداده ستوفر ${smallestDebt.monthly_payment} JOD شهرياً للأبد`
        : `After paying it off, you'll save ${smallestDebt.monthly_payment} JOD/month forever`
    } else if (!hasEmergencyFund) {
      const needed = Math.max(0, emergencyTarget - totalSavings)
      const monthly = Math.ceil(needed / 6)
      nextStep = ar ? 'ابنِ صندوق الطوارئ' : 'Build emergency fund'
      nextStepDetail = ar
        ? `ادخر ${monthly} JOD شهرياً — ستصل للهدف في 6 أشهر`
        : `Save ${monthly} JOD/month — reach goal in 6 months`
    } else if (!isInvesting) {
      const investAmount = Math.floor((income - monthlyDebtPayment - monthlyExpenses) * 0.2)
      nextStep = ar ? 'ابدأ الاستثمار الآن' : 'Start investing now'
      nextStepDetail = ar
        ? `استثمر ${investAmount} JOD شهرياً في SPUS — حلال ومتنوع`
        : `Invest ${investAmount} JOD/month in SPUS — halal & diversified`
    } else {
      nextStep = ar ? 'زِد استثماراتك' : 'Increase investments'
      nextStepDetail = ar ? 'أنت في المسار الصحيح — زد نسبة الاستثمار 5% كل سنة' : "You're on track — increase investment by 5% yearly"
    }

    setData({
      score, stage, strengths, improvements,
      nextStep, nextStepDetail,
      debtRatio, hasEmergencyFund, isInvesting,
      monthlyIncome: income, totalDebt, monthlyDebtPayment,
      totalPersonalAssets,
      netWorth: totalPersonalAssets + totalInvested + totalSavings - totalDebt,
      smallestDebt: smallestDebt ? {
        name: smallestDebt.name,
        amount: Number(smallestDebt.remaining_amount),
        monthly: Number(smallestDebt.monthly_payment)
      } : null
    })
    setLoading(false)
  }

  if (loading) return (
    <div style={{ margin: '20px 0', background: 'var(--bg-card)', borderRadius: 20, padding: 20, border: '1px solid var(--border)' }}>
      <div style={{ height: 20, background: 'var(--bg-secondary)', borderRadius: 10, marginBottom: 12, width: '60%' }} />
      <div style={{ height: 60, background: 'var(--bg-secondary)', borderRadius: 10 }} />
    </div>
  )

  if (!data) return null

  const stageNames = ar
    ? ['', 'الوعي المالي', 'التحكم المالي', 'الاحتياطي المالي', 'بناء الثروة', 'الحرية المالية']
    : ['', 'Awareness', 'Control', 'Reserve', 'Wealth Building', 'Financial Freedom']

  const stageColors = ['', '#6B7280', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981']
  const scoreColor = data.score >= 75 ? '#10B981' : data.score >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <div style={{ margin: '20px 0', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)' }}>
            🗺️ {ar ? 'خارطة طريقك للثراء' : 'Your Wealth Roadmap'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {ar ? `المرحلة ${data.stage} من 5 — ${stageNames[data.stage]}` : `Stage ${data.stage} of 5 — ${stageNames[data.stage]}`}
          </div>
        </div>
        {/* الدرجة */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: scoreColor, fontFamily: 'monospace', lineHeight: 1 }}>
            {data.score}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>/100</div>
        </div>
      </div>

      {/* صافي الثروة */}
      {(data.netWorth !== 0 || data.totalPersonalAssets > 0) && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: data.netWorth >= 0 ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 2 }}>
              {ar ? '💎 صافي ثروتك الحقيقية' : '💎 Your True Net Worth'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {ar ? 'أصول + استثمارات + ادخار − ديون' : 'Assets + Investments + Savings − Debts'}
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: data.netWorth >= 0 ? '#10B981' : '#EF4444' }}>
            {data.netWorth >= 0 ? '+' : ''}{data.netWorth.toLocaleString()} JOD
          </div>
        </div>
      )}

      {/* شريط المراحل */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1,2,3,4,5].map(s => (
            <div key={s} style={{
              flex: 1, height: 6, borderRadius: 3,
              background: s <= data.stage ? stageColors[s] : 'var(--bg-secondary)',
              transition: 'background 0.3s'
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {[1,2,3,4,5].map(s => (
            <div key={s} style={{ fontSize: 9, color: s === data.stage ? stageColors[s] : 'var(--text-muted)', fontWeight: s === data.stage ? 800 : 400, textAlign: 'center', flex: 1 }}>
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* الخطوة التالية */}
      <div style={{ padding: '16px 20px', background: 'rgba(59,126,246,0.04)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6 }}>
          ⚡ {ar ? 'الخطوة التالية' : 'Next Step'}
        </div>
        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>
          {data.nextStep}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {data.nextStepDetail}
        </div>
      </div>

      {/* تفاصيل قابلة للطي */}
      <button onClick={() => setExpanded(!expanded)} style={{
        width: '100%', padding: '12px 20px', background: 'none',
        border: 'none', borderBottom: expanded ? '1px solid var(--border)' : 'none',
        color: 'var(--text-muted)', fontSize: 12, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit', textAlign: ar ? 'right' : 'left',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span>{ar ? 'عرض التحليل الكامل' : 'Show full analysis'}</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* نقاط القوة */}
          {data.strengths.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#10B981', marginBottom: 8 }}>
                ✅ {ar ? 'نقاط القوة' : 'Strengths'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.strengths.map((s, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* نقاط التحسين */}
          {data.improvements.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#F59E0B', marginBottom: 8 }}>
                🔶 {ar ? 'تحتاج تحسين' : 'Needs Improvement'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.improvements.map((s, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* خارطة المراحل */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 8 }}>
              🗺️ {ar ? 'مسيرتك' : 'Your Journey'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[1,2,3,4,5].map(s => (
                <div key={s} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  background: s === data.stage ? `${stageColors[s]}15` : 'var(--bg-secondary)',
                  border: `1px solid ${s === data.stage ? stageColors[s] + '40' : 'var(--border)'}`,
                  opacity: s > data.stage + 1 ? 0.5 : 1
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: s <= data.stage ? stageColors[s] : 'var(--bg-elevated)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: s <= data.stage ? 'white' : 'var(--text-muted)',
                    fontWeight: 900, flexShrink: 0
                  }}>
                    {s <= data.stage ? '✓' : s}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: s === data.stage ? 900 : 600, color: s === data.stage ? stageColors[s] : 'var(--text-secondary)' }}>
                      {stageNames[s]}
                    </div>
                  </div>
                  {s === data.stage && (
                    <div style={{ marginRight: 'auto', fontSize: 10, color: stageColors[s], fontWeight: 700 }}>
                      {ar ? 'أنت هنا' : 'You are here'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
