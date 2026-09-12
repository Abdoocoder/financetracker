"use client"

import { useState } from "react"
import { useI18n } from "@/lib/i18n"

export function WealthSimulator({ currency }: { currency: string }) {
  const { t, lang } = useI18n()
  const ar = lang === 'ar'
  const [monthly, setMonthly] = useState(50)
  const [years, setYears] = useState(10)
  const [rate, setRate] = useState(7)
  const [showDetails, setShowDetails] = useState(false)

  // حساب القيمة المستقبلية مع الفائدة المركبة
  function calc(m: number, y: number, r: number) {
    const monthlyRate = r / 100 / 12
    const months = y * 12
    if (monthlyRate === 0) return m * months
    return m * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
  }

  const future = calc(monthly, years, rate)
  const invested = monthly * years * 12
  const profit = future - invested
  const multiplier = future / invested

  // جدول تفصيلي
  const milestones = [1, 3, 5, 10, 15, 20].filter(y => y <= years + 5)

  return (
    <div className="my-5 bg-[var(--bg-card)] rounded-[20px] p-5 border border-[rgba(59,126,246,0.2)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <div className="text-[15px] font-black text-[var(--text-primary)]">
            📈 {t('inv_sim_title')}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {t('inv_sim_subtitle')}
          </div>
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-gradient-to-br from-[var(--accent-blue-dim)] to-[rgba(16,185,129,0.1)] border border-[rgba(59,126,246,0.2)] text-[11px] font-extrabold text-[var(--accent-blue-light)]">
          {t('inv_sim_return').replace('{}', multiplier.toFixed(1))}
        </div>
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-4 mb-5">

        {/* الاستثمار الشهري */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs text-[var(--text-muted)] font-bold">
              {t('inv_sim_monthly')}
            </span>
            <span className="text-sm font-black text-[var(--accent-blue-light)] font-mono">
              {monthly} {currency}
            </span>
          </div>
          <input type="range" min={10} max={1000} step={10} value={monthly}
            aria-label={t('inv_sim_monthly')}
            onChange={e => setMonthly(Number(e.target.value))}
            className="w-full accent-[var(--accent-blue)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-0.5">
            <span>10 {currency}</span><span>1,000 {currency}</span>
          </div>
        </div>

        {/* عدد السنوات */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs text-[var(--text-muted)] font-bold">
              {t('inv_sim_duration')}
            </span>
            <span className="text-sm font-black text-[var(--accent-blue-light)] font-mono">
              {years} {t('inv_sim_years')}
            </span>
          </div>
          <input type="range" min={1} max={30} step={1} value={years}
            aria-label={t('inv_sim_duration')}
            onChange={e => setYears(Number(e.target.value))}
            className="w-full accent-[var(--accent-blue)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-0.5">
            <span>1 {t('inv_sim_years')}</span><span>30 {t('inv_sim_years')}</span>
          </div>
        </div>

        {/* معدل العائد */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs text-[var(--text-muted)] font-bold">
              {t('inv_sim_rate')}
            </span>
            <span className="text-sm font-black text-[var(--accent-green-light)] font-mono">
              {rate}%
            </span>
          </div>
          <input type="range" min={1} max={20} step={0.5} value={rate}
            aria-label={t('inv_sim_rate')}
            onChange={e => setRate(Number(e.target.value))}
            className="w-full accent-[var(--accent-green)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-0.5">
            <span>1%</span>
            <span className="text-[#F59E0B]">7% S&P500</span>
            <span>20%</span>
          </div>
        </div>
      </div>

      {/* النتيجة الرئيسية */}
      <div className="bg-gradient-to-br from-[rgba(59,126,246,0.1)] to-[rgba(16,185,129,0.08)] border border-[rgba(59,126,246,0.2)] rounded-2xl p-5 mb-4 text-center">
        <div className="text-xs text-[var(--text-muted)] mb-1.5">
          {t('inv_sim_after_years').replace('{}', years.toString())}
        </div>
        <div className="text-[36px] font-black font-mono bg-gradient-to-br from-[var(--accent-blue-light)] to-[var(--accent-green-light)] bg-clip-text text-transparent">
          {future >= 1000000
            ? (future / 1000000).toFixed(2) + 'M'
            : future >= 1000
            ? (future / 1000).toFixed(1) + 'K'
            : future.toFixed(0)
          } {currency}
        </div>
        <div className="flex justify-center gap-5 mt-3">
          <div className="text-center">
            <div className="text-[11px] text-[var(--text-muted)]">{t('inv_sim_invested')}</div>
            <div className="text-[13px] font-extrabold text-[var(--text-secondary)] font-mono">
              {(invested/1000).toFixed(1)}K {currency}
            </div>
          </div>
          <div className="w-px bg-[var(--border)]" />
          <div className="text-center">
            <div className="text-[11px] text-[var(--text-muted)]">{t('inv_sim_profit')}</div>
            <div className="text-[13px] font-extrabold text-[var(--accent-green-light)] font-mono">
              +{profit >= 1000 ? (profit/1000).toFixed(1) + 'K' : profit.toFixed(0)} {currency}
            </div>
          </div>
          <div className="w-px bg-[var(--border)]" />
          <div className="text-center">
            <div className="text-[11px] text-[var(--text-muted)]">{t('inv_sim_multiplier')}</div>
            <div className="text-[13px] font-extrabold text-[var(--accent-blue-light)] font-mono">
              {multiplier.toFixed(1)}x
            </div>
          </div>
        </div>
      </div>

      {/* جدول المعالم */}
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className="w-full p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] text-xs font-bold cursor-pointer font-[inherit]"
      >
        {showDetails ? t('inv_sim_hide') : t('inv_sim_show')}
      </button>

      {showDetails && (
        <div className="mt-3 flex flex-col gap-1.5">
          {milestones.map(y => {
            const val = calc(monthly, y, rate)
            const inv = monthly * y * 12
            const pct = ((val - inv) / inv * 100)
            return (
              <div key={y} className={`flex justify-between items-center px-3.5 py-2.5 rounded-[10px] border ${y === years ? 'bg-[var(--accent-blue-dim)] border-[rgba(59,126,246,0.2)]' : 'bg-[var(--bg-secondary)] border-[var(--border)]'}`}>
                <span className={`text-xs font-bold ${y === years ? 'text-[var(--accent-blue-light)]' : 'text-[var(--text-muted)]'}`}>
                  {t('inv_sim_after_y').replace('{}', y.toString())}
                </span>
                <div className={`text-${lang === 'ar' ? 'right' : 'left'}`}>
                  <div className={`text-[13px] font-black font-mono ${y === years ? 'text-[var(--accent-blue-light)]' : 'text-[var(--text-primary)]'}`}>
                    {val >= 1000 ? (val/1000).toFixed(1) + 'K' : val.toFixed(0)} {currency}
                  </div>
                  <div className="text-[10px] text-[var(--accent-green-light)]">+{pct.toFixed(0)}%</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* تلميح */}
      <div className="mt-3 text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
        💡 {t('inv_sim_disclaimer')}
      </div>
    </div>
  )
}
