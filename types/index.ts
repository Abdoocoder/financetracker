export type Plan = 'free' | 'pro'
export type TransactionType = 'income' | 'expense'
export type InvestmentType = 'stock' | 'etf' | 'crypto' | 'other'
export type AlertType = 'warning' | 'motivation' | 'reminder' | 'achievement'
export type AlertFrequency = 'daily' | 'weekly' | 'monthly' | 'once'

export interface Profile {
  id: string
  full_name: string | null
  currency: string
  monthly_income: number
  timezone: string
  plan: Plan
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  category: string
  amount: number
  description: string | null
  transaction_date: string
  is_recurring: boolean
  recurring_day: number | null
  created_at: string
}

export interface Debt {
  id: string
  user_id: string
  name: string
  original_amount: number
  remaining_amount: number
  monthly_payment: number
  due_date: string | null
  priority: number
  notes: string | null
  is_paid: boolean
  created_at: string
  updated_at: string
}

export interface DebtPayment {
  id: string
  debt_id: string
  user_id: string
  amount: number
  payment_date: string
  notes: string | null
  created_at: string
}

export interface Investment {
  id: string
  user_id: string
  symbol: string
  name: string
  type: InvestmentType
  shares: number
  avg_buy_price: number
  current_price: number
  currency: string
  is_halal: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InvestmentTransaction {
  id: string
  investment_id: string
  user_id: string
  type: 'buy' | 'sell'
  shares: number
  price: number
  commission: number
  transaction_date: string
  notes: string | null
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  category: string
  monthly_limit: number
  month: number
  year: number
  created_at: string
}

export interface Alert {
  id: string
  user_id: string
  type: AlertType
  frequency: AlertFrequency
  title: string
  message: string
  is_read: boolean
  is_active: boolean
  trigger_condition: Record<string, unknown> | null
  scheduled_for: string | null
  created_at: string
}

export interface SavingsGoal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  icon: string
  color: string
  created_at: string
  updated_at: string
}

export interface MonthlySummary {
  user_id: string
  year: number
  month: number
  total_income: number
  total_expenses: number
  net_balance: number
}

export interface DebtSummary {
  user_id: string
  total_debts: number
  total_original: number
  total_remaining: number
  total_paid: number
  paid_percentage: number
}

// expense categories
export const EXPENSE_CATEGORIES = [
  'إيجار / قسط',
  'مواصلات',
  'طعام وشراب',
  'فواتير',
  'صحة',
  'تعليم',
  'ترفيه',
  'صلة رحم',
  'ملابس',
  'أخرى',
] as const

export const INCOME_CATEGORIES = [
  'راتب',
  'عمل حر',
  'استثمار',
  'مكافأة',
  'أخرى',
] as const
