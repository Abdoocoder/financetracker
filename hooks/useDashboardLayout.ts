'use client'
import { useState, useEffect, useCallback } from 'react'

export type CardId =
  | 'month_summary'
  | 'hero_balance'
  | 'monthly_stats'
  | 'debt_row'
  | 'quick_add'
  | 'recent_tx'
  | 'budgets'
  | 'quick_links'
  | 'net_worth'
  | 'health'
  | 'achievements'
  | 'charts'
  | 'simulator'
  | 'challenges'

export interface CardConfig {
  id: CardId
  labelAr: string
  labelEn: string
  defaultVisible: boolean
  /** Cards that cannot be hidden */
  required?: boolean
}

export const CARD_CONFIGS: CardConfig[] = [
  { id: 'month_summary',  labelAr: 'ملخص الشهر',        labelEn: 'Month Summary',      defaultVisible: true },
  { id: 'hero_balance',   labelAr: 'بطاقة الرصيد',       labelEn: 'Balance Card',       defaultVisible: true },
  { id: 'monthly_stats',  labelAr: 'إحصاء شهري',         labelEn: 'Monthly Stats',      defaultVisible: true },
  { id: 'debt_row',       labelAr: 'أقساط الديون',        labelEn: 'Debt Payments',      defaultVisible: true },
  { id: 'quick_add',      labelAr: 'إضافة سريعة',         labelEn: 'Quick Add',          defaultVisible: true, required: true },
  { id: 'recent_tx',      labelAr: 'آخر المعاملات',       labelEn: 'Recent Transactions',defaultVisible: true },
  { id: 'budgets',        labelAr: 'الميزانيات',           labelEn: 'Budgets',            defaultVisible: true },
  { id: 'quick_links',    labelAr: 'روابط سريعة',          labelEn: 'Quick Links',        defaultVisible: true },
  { id: 'net_worth',      labelAr: 'صافي الثروة',         labelEn: 'Net Worth',          defaultVisible: true },
  { id: 'health',         labelAr: 'الصحة المالية',        labelEn: 'Financial Health',   defaultVisible: false },
  { id: 'achievements',   labelAr: 'الإنجازات',            labelEn: 'Achievements',       defaultVisible: false },
  { id: 'charts',         labelAr: 'الرسوم البيانية',      labelEn: 'Charts & Analysis',  defaultVisible: false },
  { id: 'simulator',      labelAr: 'محاكي الثروة',         labelEn: 'Wealth Simulator',   defaultVisible: false },
  { id: 'challenges',     labelAr: 'التحديات',             labelEn: 'Challenges',         defaultVisible: false },
]

const STORAGE_KEY = 'dashboard_layout_v1'

function getDefaults(): Record<CardId, boolean> {
  return Object.fromEntries(
    CARD_CONFIGS.map(c => [c.id, c.defaultVisible])
  ) as Record<CardId, boolean>
}

function load(): Record<CardId, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaults()
    const parsed = JSON.parse(raw) as Partial<Record<CardId, boolean>>
    // Merge with defaults so new cards added later get their default value
    const defaults = getDefaults()
    return { ...defaults, ...parsed }
  } catch {
    return getDefaults()
  }
}

function save(visibility: Record<CardId, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility))
  } catch { /* storage full or private mode */ }
}

export function useDashboardLayout() {
  const [visibility, setVisibility] = useState<Record<CardId, boolean>>(getDefaults)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setVisibility(load())
    setHydrated(true)
  }, [])

  const toggle = useCallback((id: CardId) => {
    setVisibility(prev => {
      const card = CARD_CONFIGS.find(c => c.id === id)
      if (card?.required) return prev
      const next = { ...prev, [id]: !prev[id] }
      // Prevent hiding all non-required cards
      const visibleCount = Object.entries(next).filter(([k, v]) => {
        const cfg = CARD_CONFIGS.find(c => c.id === k)
        return v && !cfg?.required
      }).length
      if (visibleCount === 0) return prev
      save(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    const defaults = getDefaults()
    save(defaults)
    setVisibility(defaults)
  }, [])

  const show = useCallback((id: CardId) => hydrated ? visibility[id] ?? true : true, [hydrated, visibility])

  return { visibility, toggle, reset, show, hydrated }
}
