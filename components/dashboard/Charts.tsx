'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'

// ── Types ────────────────────────────────────────────────────────
interface BarData { month: string; income: number; expense: number }

// ── Custom Tooltip ───────────────────────────────────────────────
function CustomTooltip({ active, payload, label, lang }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 700, fontFamily: 'monospace' }}>
          {p.dataKey === 'income' ? (lang === 'en' ? 'Income' : 'دخل') : (lang === 'en' ? 'Expense' : 'مصروف')}: {Number(p.value).toFixed(0)}
        </div>
      ))}
    </div>
  )
}

// ── MiniBarChart ─────────────────────────────────────────────────
export function MiniBarChart({ data, lang }: { data: BarData[]; lang: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>
          {lang === 'en' ? 'Income & Expenses' : 'الإيرادات والمصروفات'}
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 10, color: '#34D399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#34D399', display: 'inline-block' }} />
            {lang === 'en' ? 'Income' : 'دخل'}
          </span>
          <span style={{ fontSize: 10, color: '#F87171', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#F87171', display: 'inline-block' }} />
            {lang === 'en' ? 'Expense' : 'مصروف'}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} barCategoryGap="25%" barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'inherit' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip lang={lang} />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }} />
          <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={20} />
          <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={20} opacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── CategoryBars (unchanged) ─────────────────────────────────────
const COLORS = ['#3B7EF6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444']
const CAT_TRANS: Record<string, string> = {
  'طعام': 'Food', 'مواصلات': 'Transport', 'فواتير': 'Bills', 'صحة': 'Health',
  'ملابس': 'Clothes', 'ترفيه': 'Entertainment', 'تعليم': 'Education',
  'أخرى': 'Other', 'راتب': 'Salary', 'ديون': 'Debts', 'استثمار': 'Investment',
  'هدية': 'Gift', 'عمل حر': 'Freelance',
}

export function CategoryBars({ categories, lang }: { categories: [string, number][]; lang: string }) {
  if (!categories.length) return null
  const max = categories[0][1]
  const total = categories.reduce((a, [, v]) => a + v, 0)

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>
          {lang === 'en' ? 'Expense Breakdown' : 'توزيع المصاريف'}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          {total.toFixed(0)} JOD
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map(([cat, amt], i) => {
          const pct = (amt / max) * 100
          const totalPct = total > 0 ? ((amt / total) * 100).toFixed(0) : '0'
          return (
            <div key={cat}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {lang === 'en' ? (CAT_TRANS[cat] ?? cat) : cat}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{totalPct}%</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: COLORS[i], fontFamily: 'monospace' }}>
                    {Number(amt).toFixed(0)}
                  </span>
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`, borderRadius: 3,
                  background: `linear-gradient(90deg, ${COLORS[i]}, ${COLORS[i]}99)`,
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
