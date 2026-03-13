'use client'

interface BarData { month: string; income: number; expense: number }

export function MiniBarChart({ data, lang }: { data: BarData[]; lang: string }) {
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1)
  const W = 300, H = 80, barW = 18
  const gap = (W - data.length * barW * 2) / (data.length + 1)
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>{lang === 'en' ? 'Income & Expenses' : 'الإيرادات والمصروفات'}</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 10, color: 'var(--accent-green-light)', fontWeight: 700 }}>■ {lang === 'en' ? 'Income' : 'دخل'}</span>
          <span style={{ fontSize: 10, color: 'var(--accent-red-light)', fontWeight: 700 }}>■ {lang === 'en' ? 'Expense' : 'مصروف'}</span>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 20}`} style={{ overflow: 'visible' }}>
        {data.map((d, i) => {
          const x = gap + i * (barW * 2 + gap)
          const ih = (d.income / maxVal) * H
          const eh = (d.expense / maxVal) * H
          return (
            <g key={i}>
              <rect x={x} y={H - ih} width={barW} height={ih} rx={3} fill="#10B981" opacity="0.8" />
              <rect x={x + barW + 2} y={H - eh} width={barW} height={eh} rx={3} fill="#EF4444" opacity="0.8" />
              <text x={x + barW} y={H + 14} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--text-muted)' }}>{d.month}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

const COLORS = ['#3B7EF6','#8B5CF6','#F59E0B','#10B981','#EF4444']
const CAT_TRANS: Record<string, string> = {
  'طعام':'Food','مواصلات':'Transport','فواتير':'Bills','صحة':'Health',
  'ملابس':'Clothes','ترفيه':'Entertainment','تعليم':'Education',
  'أخرى':'Other','راتب':'Salary','ديون':'Debts','استثمار':'Investment',
  'هدية':'Gift','عمل حر':'Freelance',
}

export function CategoryBars({ categories, lang }: { categories: [string, number][]; lang: string }) {
  if (!categories.length) return null
  const max = categories[0][1]
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
      <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)', display: 'block', marginBottom: 14 }}>{lang === 'en' ? 'Expense Breakdown' : 'توزيع المصاريف'}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map(([cat, amt], i) => (
          <div key={cat}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{lang === 'en' ? (CAT_TRANS[cat] ?? cat) : cat}</span>
              <span style={{ fontSize: 12, fontWeight: 900, color: COLORS[i], fontFamily: 'monospace' }}>{Number(amt).toFixed(0)} JOD</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(amt / max) * 100}%`, borderRadius: 3, background: COLORS[i], transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
