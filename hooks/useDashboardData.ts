import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/user-context';
import { fetchExchangeRate } from '@/lib/currency';
import type { Transaction } from '@/types';

export interface DashboardData {
  income: number;
  expenses: number;
  debtPayments: number;
  months6: Array<{ month: string; income: number; expense: number }>;
  categories: [string, number][];
  net: number;
  monthlyDebtCommitments: number;
  prevIncome: number;
  prevExpenses: number;
  totalDebt: number;
  totalReceivable: number;
  netWorth: number;
  invValue: number;
  goalsSaved: number;
  goalsTarget: number;
  unreadAlerts: number;
  healthScore: number;
  txCount: number;
  name: string;
  lastUpdated?: string;
  recentTx: Transaction[];
}

export function useDashboardData() {
  const { user } = useUser();
  const supabase = useMemo(() => createClient(), []);

  return useQuery({
    queryKey: ['dashboard', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<DashboardData> => {
      if (!user) throw new Error('User not authenticated');

      const now = new Date();
      const chartFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0];
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      // Step 1: profile + transactions بالتوازي (alerts/goals/debts أصبحت داخل RPC)
      const [profileRes, txRes] = await Promise.all([
        supabase.from('profiles').select('monthly_income, full_name, currency').eq('id', user.id).single(),
        supabase.from('transactions').select('*').eq('user_id', user.id).gte('transaction_date', chartFrom).order('transaction_date', { ascending: false }),
      ]);

      const profileData = profileRes.data;
      const userCurrency = (profileData?.currency ?? 'JOD').toUpperCase();

      // Step 2: سعر الصرف + RPC بالتوازي
      const [usdToLocal, { data: dash }] = await Promise.all([
        userCurrency !== 'USD' ? fetchExchangeRate('USD', userCurrency).then(r => r ?? 1) : Promise.resolve(1),
        supabase.rpc('get_financial_dashboard', { p_user_id: user.id, p_usd_to_local_rate: 1 }),
      ]);

      // إعادة استدعاء RPC بسعر الصرف الصحيح إذا اختلف
      const dashData = usdToLocal !== 1
        ? (await supabase.rpc('get_financial_dashboard', { p_user_id: user.id, p_usd_to_local_rate: usdToLocal })).data
        : dash;

      const txs = txRes.data ?? [];
      const currentMonthTxs = txs.filter(t => t.transaction_date >= firstDay);

      const DEBT_CATEGORIES = ['ديون', 'debts_title', 'Debts'];

      const income = currentMonthTxs.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0) || Number(profileData?.monthly_income ?? 0);
      const expenses = currentMonthTxs.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0);
      const debtPayments = currentMonthTxs.filter(t => t.type === 'expense' && DEBT_CATEGORIES.includes(t.category ?? '')).reduce((a, t) => a + Number(t.amount), 0);

      const catMap: Record<string, number> = {};
      currentMonthTxs.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category] ?? 0) + Number(t.amount); });
      const categories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

      const months6 = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('ar-EG', { month: 'short' });
        const mt = txs.filter(t => t.transaction_date?.startsWith(key));
        return {
          month: label,
          income: mt.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0),
          expense: mt.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
        };
      });

      const prevMonth = months6[4] ?? { income: 0, expense: 0 };
      const recentTx = txs.slice(0, 5);

      return {
        income,
        expenses,
        debtPayments,
        months6,
        categories,
        net: income - expenses,
        monthlyDebtCommitments: Number(dashData?.monthly_debt_commitments ?? 0),
        prevIncome: prevMonth.income,
        prevExpenses: prevMonth.expense,
        totalDebt: Number(dashData?.total_debt_owed ?? 0),
        totalReceivable: Number(dashData?.total_receivable ?? 0),
        netWorth: Number(dashData?.net_worth ?? 0),
        invValue: Number(dashData?.investments_value_local ?? 0),
        goalsSaved: Number(dashData?.goals_saved ?? 0),
        goalsTarget: Number(dashData?.goals_target ?? 0),
        unreadAlerts: Number(dashData?.unread_alerts ?? 0),
        txCount: txs.length,
        name: profileData?.full_name ?? '',
        lastUpdated: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        recentTx,
        healthScore: Number(dashData?.health_score ?? 0),
      };
    },
    staleTime: 5 * 60 * 1000, // Show cached data for 5 minutes
  });
}
