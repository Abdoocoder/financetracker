// app/(dashboard)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import type { Alert, MonthlySummary } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  // Monthly summary
  const { data: summary } = await supabase
    .from('monthly_summary')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('year', year)
    .single() as { data: MonthlySummary | null }

  // Debt summary
  const { data: debtSummary } = await supabase
    .from('debt_summary')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Investments
  const { data: investments } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', user.id)

  const totalInvestmentValue = investments?.reduce((acc, inv) => acc + (inv.shares * inv.current_price), 0) ?? 0

  // Latest alerts
  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(5) as { data: Alert[] | null }

  // Profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const netBalance = summary?.net_balance ?? 0
  const totalIncome = summary?.total_income ?? 0
  const totalExpenses = summary?.total_expenses ?? 0
  const savingsRate = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alert Banner */}
      {alerts && alerts.filter(a => !a.is_read).length > 0 && (
        <div className="p-4 rounded-2xl border flex items-start gap-3"
          style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }}>
          <span className="text-xl">⚠️</span>
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--accent-yellow)' }}>
              {alerts.filter(a => !a.is_read)[0]?.title}
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {alerts.filter(a => !a.is_read)[0]?.message}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="صافي الشهر"
          value={`${netBalance >= 0 ? '+' : ''}${netBalance.toFixed(2)}`}
          currency={profile?.currency ?? 'JOD'}
          icon="💰"
          color={netBalance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
          glow={netBalance >= 0 ? 'card-glow-green' : 'card-glow-red'}
          sub={`معدل الادخار: ${savingsRate}%`}
        />
        <StatCard
          label="إجمالي المصاريف"
          value={totalExpenses.toFixed(2)}
          currency={profile?.currency ?? 'JOD'}
          icon="📤"
          color="var(--accent-red)"
          glow="card-glow-red"
          sub={`من ${totalIncome.toFixed(2)} ${profile?.currency ?? 'JOD'} دخل`}
        />
        <StatCard
          label="إجمالي الديون"
          value={(debtSummary?.total_remaining ?? 0).toFixed(2)}
          currency={profile?.currency ?? 'JOD'}
          icon="💳"
          color="var(--accent-yellow)"
          glow=""
          sub={`${debtSummary?.paid_percentage ?? 0}% مسدد`}
        />
        <StatCard
          label="قيمة الاستثمارات"
          value={totalInvestmentValue.toFixed(2)}
          currency="USD"
          icon="📈"
          color="var(--accent-blue)"
          glow="card-glow-blue"
          sub={`${investments?.length ?? 0} أصول`}
        />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Debt Progress */}
        <div className="p-6 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>💳</span> تقدم سداد الديون
          </h3>
          <DebtProgressBar
            label="الإجمالي المسدد"
            paid={debtSummary?.total_paid ?? 0}
            total={debtSummary?.total_original ?? 0}
            percentage={debtSummary?.paid_percentage ?? 0}
          />
        </div>

        {/* Investments */}
        <div className="p-6 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>📈</span> المحفظة الاستثمارية
          </h3>
          {investments && investments.length > 0 ? (
            <div className="space-y-3">
              {investments.map((inv) => {
                const value = inv.shares * inv.current_price
                const cost = inv.shares * inv.avg_buy_price
                const pnl = value - cost
                const pnlPct = cost > 0 ? ((pnl / cost) * 100).toFixed(1) : '0'
                return (
                  <div key={inv.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg gradient-blue flex items-center justify-center text-white text-xs font-bold">
                        {inv.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{inv.symbol}</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{inv.shares} وحدة</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>${value.toFixed(2)}</div>
                      <div className="text-xs" style={{ color: pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlPct}%)
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>لا توجد استثمارات بعد</p>
          )}
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="p-6 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span>🔔</span> آخر التنبيهات
        </h3>
        {alerts && alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const config = {
                warning: { icon: '⚠️', color: 'var(--accent-yellow)', bg: 'rgba(245,158,11,0.08)' },
                motivation: { icon: '💪', color: 'var(--accent-green)', bg: 'rgba(34,197,94,0.08)' },
                reminder: { icon: '⏰', color: 'var(--accent-blue)', bg: 'rgba(79,142,247,0.08)' },
                achievement: { icon: '🏆', color: 'var(--accent-purple)', bg: 'rgba(168,85,247,0.08)' },
              }[alert.type]
              return (
                <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: config.bg }}>
                  <span>{config.icon}</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: config.color }}>{alert.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{alert.message}</div>
                  </div>
                  {!alert.is_read && (
                    <div className="w-2 h-2 rounded-full mr-auto mt-1.5 shrink-0" style={{ background: config.color }} />
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
            لا توجد تنبيهات حالياً — أضف معاملاتك لتبدأ التنبيهات الذكية
          </p>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, currency, icon, color, glow, sub }: {
  label: string; value: string; currency: string; icon: string; color: string; glow: string; sub: string
}) {
  return (
    <div className={`p-5 rounded-2xl border ${glow}`}
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
          {currency}
        </span>
      </div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs mt-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  )
}

function DebtProgressBar({ label, paid, total, percentage }: {
  label: string; paid: number; total: number; percentage: number
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--accent-green)' }}>{percentage}%</span>
      </div>
      <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
        <div className="h-full rounded-full gradient-green transition-all duration-700"
          style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
      <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>مسدد: {paid.toFixed(2)}</span>
        <span>متبقي: {(total - paid).toFixed(2)}</span>
      </div>
    </div>
  )
}
