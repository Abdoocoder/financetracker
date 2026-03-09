'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useCachedData } from '@/lib/use-cached-data'
import { Skeleton, StatsSkeleton, PageSkeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

// تعريف الأنواع
interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense'
  category: string
  description: string
  date: string
}

interface Debt {
  id: string
  name: string
  amount: number
  paid: number
}

interface Investment {
  id: string
  shares: number
  current_price: number
  avg_buy_price: number
}

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = createClient()

  // جلب الملخص المالي (إجمالي الدخل، المصاريف، الرصيد)
  const { data: summary, loading: summaryLoading } = useCachedData('dashboard-summary', async () => {
    if (!user) return null
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // إجمالي الدخل هذا الشهر
    const { data: incomeData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'income')
      .gte('date', startOfMonth)

    // إجمالي المصاريف هذا الشهر
    const { data: expenseData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', startOfMonth)

    // إجمالي الديون المتبقية
    const { data: debtsData } = await supabase
      .from('debts')
      .select('amount, paid')
      .eq('user_id', user.id)

    // قيمة المحفظة الاستثمارية
    const { data: investmentsData } = await supabase
      .from('investments')
      .select('shares, current_price, avg_buy_price')
      .eq('user_id', user.id)

    const totalIncome = incomeData?.reduce((acc, t) => acc + (t.amount || 0), 0) || 0
    const totalExpense = expenseData?.reduce((acc, t) => acc + (t.amount || 0), 0) || 0
    const totalDebt = debtsData?.reduce((acc, d) => acc + (d.amount - (d.paid || 0)), 0) || 0
    const totalInvestmentValue = investmentsData?.reduce((acc, i) => acc + (i.shares * i.current_price), 0) || 0
    const totalInvestmentCost = investmentsData?.reduce((acc, i) => acc + (i.shares * i.avg_buy_price), 0) || 0
    const investmentPnL = totalInvestmentValue - totalInvestmentCost

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      totalDebt,
      totalInvestmentValue,
      investmentPnL,
    }
  }, [user])

  // جلب آخر 5 معاملات
  const { data: recentTransactions, loading: transactionsLoading } = useCachedData('recent-transactions', async () => {
    if (!user) return []
    const { data } = await supabase
      .from('transactions')
      .select('id, amount, type, category, description, date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(5)
    return data as Transaction[] || []
  }, [user])

  // إذا كان التحميل جارياً أو المستخدم ليس موجوداً
  if (userLoading || summaryLoading) return <PageSkeleton />

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-20">
      {/* الترحيب */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            مرحباً، {user?.email?.split('@')[0] || 'مستخدم'} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            ملخص مالي لشهر {new Date().toLocaleString('ar-SA', { month: 'long' })}
          </p>
        </div>
        <Link href="/transactions/new" className="px-4 py-2 rounded-xl gradient-blue text-white text-sm font-black glow-blue">
          + إضافة معاملة
        </Link>
      </div>

      {/* بطاقات الملخص */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="الرصيد"
          value={summary?.balance || 0}
          prefix="$"
          color={summary?.balance && summary.balance >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <StatCard
          title="الدخل"
          value={summary?.totalIncome || 0}
          prefix="$"
          color="text-green-400"
        />
        <StatCard
          title="المصاريف"
          value={summary?.totalExpense || 0}
          prefix="$"
          color="text-red-400"
        />
        <StatCard
          title="الديون المتبقية"
          value={summary?.totalDebt || 0}
          prefix="$"
          color="text-yellow-400"
        />
      </div>

      {/* المحفظة والديون */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* بطاقة المحفظة */}
        <div className="card p-4">
          <h3 className="font-black mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>📈</span> المحفظة الاستثمارية
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>القيمة السوقية</span>
              <span className="font-mono font-bold" style={{ color: 'var(--accent-blue-light)' }}>${summary?.totalInvestmentValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>الربح/الخسارة</span>
              <span className={`font-mono font-bold ${(summary?.investmentPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(summary?.investmentPnL || 0) >= 0 ? '+' : ''}{summary?.investmentPnL.toFixed(2)} $
              </span>
            </div>
          </div>
          <Link href="/investments" className="mt-3 block text-sm text-center py-2 rounded-xl badge-blue hover:opacity-80 transition">
            عرض التفاصيل
          </Link>
        </div>

        {/* بطاقة الديون */}
        <div className="card p-4">
          <h3 className="font-black mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>💳</span> الديون
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>المتبقي</span>
              <span className="font-mono font-bold text-yellow-400">${summary?.totalDebt.toFixed(2)}</span>
            </div>
          </div>
          <Link href="/debts" className="mt-3 block text-sm text-center py-2 rounded-xl badge-green hover:opacity-80 transition">
            إدارة الديون
          </Link>
        </div>
      </div>

      {/* آخر المعاملات */}
      <div className="card p-4">
        <h3 className="font-black mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span>🔄</span> آخر المعاملات
        </h3>
        {transactionsLoading ? (
          <StatsSkeleton />
        ) : recentTransactions && recentTransactions.length > 0 ? (
          <div className="space-y-2">
            {recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                    {t.type === 'income' ? '↑' : '↓'}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{t.description || t.category}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(t.date).toLocaleDateString('ar-EG')}</p>
                  </div>
                </div>
                <span className={`font-mono font-bold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.type === 'income' ? '+' : '-'} ${t.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>لا توجد معاملات بعد</p>
        )}
        <Link href="/transactions" className="mt-3 block text-sm text-center py-2 rounded-xl badge-blue hover:opacity-80 transition">
          عرض كل المعاملات
        </Link>
      </div>
    </div>
  )
}

// مكون بطاقة إحصائية
function StatCard({ title, value, prefix, color }: { title: string; value: number; prefix: string; color: string }) {
  return (
    <div className="card p-3">
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{title}</p>
      <p className={`text-xl font-black font-mono mt-1 ${color}`}>
        {prefix}{value.toFixed(2)}
      </p>
    </div>
  )
}
