'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = createClient()
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    totalDebt: 0,
    totalInvestmentValue: 0,
    investmentPnL: 0
  })
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      const errorList: string[] = []
      
      try {
        console.log('Fetching data for user:', user.id)

        // 1. جلب المعاملات
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (txError) {
          errorList.push(`Transactions: ${txError.message}`)
          console.error('Transactions error:', txError)
        } else {
          console.log(`Found ${txData?.length} transactions`)
          if (txData && txData.length > 0) {
            console.log('Transaction fields:', Object.keys(txData[0]))
          }
        }

        // 2. جلب الديون - محاولة أسماء مختلفة للأعمدة
        let debtData = null
        let debtError = null

        // جرب أولاً باستخدام total_amount
        const debtAttempt1 = await supabase
          .from('debts')
          .select('*')
          .eq('user_id', user.id)

        if (!debtAttempt1.error) {
          debtData = debtAttempt1.data
          console.log('Debt fields (first attempt):', debtData?.[0] ? Object.keys(debtData[0]) : 'No debts')
          
          // تحقق من وجود amount أو total_amount أو original_amount
          if (debtData && debtData.length > 0) {
            const firstDebt = debtData[0]
            const possibleAmountFields = ['amount', 'total_amount', 'original_amount', 'remaining_amount', 'balance']
            const foundField = possibleAmountFields.find(field => field in firstDebt)
            
            if (foundField) {
              console.log(`Using amount field: ${foundField}`)
              // احسب إجمالي الديون باستخدام الحقل الموجود
              const totalDebt = debtData.reduce((acc, d) => {
                const amount = d[foundField] || 0
                const paid = d.paid || 0
                return acc + (amount - paid)
              }, 0)
              setSummary(prev => ({ ...prev, totalDebt }))
            } else {
              errorList.push('Debts: No amount field found in debt records')
            }
          }
        } else {
          errorList.push(`Debts: ${debtAttempt1.error.message}`)
        }

        // 3. جلب الاستثمارات
        const { data: invData, error: invError } = await supabase
          .from('investments')
          .select('*')
          .eq('user_id', user.id)

        if (invError) {
          errorList.push(`Investments: ${invError.message}`)
        } else {
          console.log(`Found ${invData?.length} investments`)
          if (invData && invData.length > 0) {
            console.log('Investment fields:', Object.keys(invData[0]))
            
            // حساب قيمة المحفظة
            const totalValue = invData.reduce((acc, i) => {
              const shares = i.shares || 0
              const price = i.current_price || 0
              return acc + (shares * price)
            }, 0)
            
            const totalCost = invData.reduce((acc, i) => {
              const shares = i.shares || 0
              const avgPrice = i.avg_buy_price || 0
              return acc + (shares * avgPrice)
            }, 0)
            
            setSummary(prev => ({
              ...prev,
              totalInvestmentValue: totalValue,
              investmentPnL: totalValue - totalCost
            }))
          }
        }

        // حساب الدخل والمصاريف من المعاملات
        if (txData) {
          const totalIncome = txData
            .filter(t => t.type === 'income')
            .reduce((acc, t) => acc + (t.amount || 0), 0)
          
          const totalExpense = txData
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => acc + (t.amount || 0), 0)
          
          setSummary(prev => ({
            ...prev,
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense
          }))
          
          setTransactions(txData)
        }

        setErrors(errorList)
      } catch (err: any) {
        console.error('Unexpected error:', err)
        setErrors([...errorList, `Unexpected: ${err.message}`])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  if (userLoading || loading) {
    return <div className="flex items-center justify-center h-64 text-white">جاري التحميل...</div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">
            مرحباً، {user?.email?.split('@')[0] || 'مستخدم'} 👋
          </h1>
          <p className="text-sm mt-1 text-gray-400">
            ملخص مالي (كل المعاملات)
          </p>
        </div>
        <Link href="/transactions/new" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black">
          + إضافة معاملة
        </Link>
      </div>

      {/* عرض الأخطاء إن وجدت */}
      {errors.length > 0 && (
        <div className="bg-red-900/50 border border-red-700 p-3 rounded text-sm text-red-200">
          <p className="font-bold mb-1">تم اكتشاف مشاكل:</p>
          {errors.map((err, i) => <p key={i}>• {err}</p>)}
        </div>
      )}

      {/* عدد المعاملات */}
      <div className="bg-gray-800 p-3 rounded text-sm text-gray-300">
        عدد المعاملات: {transactions.length}
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="الرصيد" value={summary.balance} prefix="$" color="text-blue-400" />
        <StatCard title="الدخل" value={summary.totalIncome} prefix="$" color="text-green-400" />
        <StatCard title="المصاريف" value={summary.totalExpense} prefix="$" color="text-red-400" />
        <StatCard title="الديون" value={summary.totalDebt} prefix="$" color="text-yellow-400" />
      </div>

      {/* المحفظة والديون */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* المحفظة */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h3 className="font-black mb-3 flex items-center gap-2 text-white">
            <span>📈</span> المحفظة الاستثمارية
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">القيمة السوقية</span>
              <span className="font-mono font-bold text-blue-400">${summary.totalInvestmentValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">الربح/الخسارة</span>
              <span className={`font-mono font-bold ${summary.investmentPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {summary.investmentPnL >= 0 ? '+' : ''}{summary.investmentPnL.toFixed(2)} $
              </span>
            </div>
          </div>
          <Link href="/investments" className="mt-3 block text-sm text-center py-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-800 hover:bg-blue-600/30">
            عرض التفاصيل
          </Link>
        </div>

        {/* الديون */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h3 className="font-black mb-3 flex items-center gap-2 text-white">
            <span>💳</span> الديون
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">المتبقي</span>
              <span className="font-mono font-bold text-yellow-400">${summary.totalDebt.toFixed(2)}</span>
            </div>
          </div>
          <Link href="/debts" className="mt-3 block text-sm text-center py-2 rounded-xl bg-yellow-600/20 text-yellow-400 border border-yellow-800 hover:bg-yellow-600/30">
            إدارة الديون
          </Link>
        </div>
      </div>

      {/* آخر المعاملات */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <h3 className="font-black mb-3 flex items-center gap-2 text-white">
          <span>🔄</span> آخر المعاملات
        </h3>
        {transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                    {t.type === 'income' ? '↑' : '↓'}
                  </div>
                  <div>
                    <p className="font-medium text-white">{t.description || t.category}</p>
                    <p className="text-xs text-gray-500">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString('ar-EG') : ''}
                    </p>
                  </div>
                </div>
                <span className={`font-mono font-bold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.type === 'income' ? '+' : '-'} ${t.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-4 text-gray-500">لا توجد معاملات بعد</p>
        )}
        <Link href="/transactions" className="mt-3 block text-sm text-center py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700">
          عرض كل المعاملات
        </Link>
      </div>
    </div>
  )
}

function StatCard({ title, value, prefix, color }: { title: string; value: number; prefix: string; color: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
      <p className="text-xs text-gray-400">{title}</p>
      <p className={`text-xl font-black font-mono mt-1 ${color}`}>
        {prefix}{value.toFixed(2)}
      </p>
    </div>
  )
}
