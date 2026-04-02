# Monthly Report Automation Guide

## Overview
This guide covers the automation options for updating the monthly reports in FAJRAK.

---

## 1. Current Data Sources

### Available APIs and Functions

| Source | Type | Description |
|--------|------|-------------|
| `get_account_balances(uuid)` | SQL Function | Returns all account balances for a user |
| `get_financial_dashboard(uuid, rate)` | SQL Function | Returns comprehensive financial data |
| `monthly_summary` | View | Monthly income/expense aggregated |
| `debt_summary` | View | Debt totals and payment progress |
| `/api/weekly-report` | API Route | Weekly Push notification report |

### Data Points Available

```typescript
// From get_financial_dashboard
{
  net_worth: number,
  total_accounts_balance: number,
  investments_value_local: number,
  investments_value_usd: number,
  investment_cash_local: number,
  goals_saved: number,
  total_debt_owed: number,
  total_receivable: number
}

// From transactions table
{
  type: 'income' | 'expense' | 'transfer',
  category: string,
  amount: number,
  transaction_date: string,
  account_id: uuid
}
```

---

## 2. Auto-Update from Supabase

### Option A: Using Google Sheets + Supabase

```javascript
// Google Apps Script - Update from Supabase
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_KEY = 'your-anon-key';

function fetchMonthlyData() {
  const userId = 'user-uuid';
  
  // Fetch financial dashboard
  const dashboardUrl = `${SUPABASE_URL}/rest/v1/rpc/get_financial_dashboard`;
  const response = UrlFetchApp.fetch(dashboardUrl, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({ p_user_id: userId, p_usd_to_local_rate: 1.0 })
  });
  
  const data = JSON.parse(response.getContentText());
  // Update sheet with data
}

function onOpen() {
  const menu = SpreadsheetApp.getUi()
    .createMenu('FAJRAK Reports')
    .addItem('Update Data', 'fetchMonthlyData')
    .addItem('Generate Report', 'generateReport')
    .addToUi();
}
```

### Option B: Using Excel Power Query

```m
// Excel Power Query - Connect to Supabase via REST API
let
    Source = Json.Document(Web.Contents("https://xxxxx.supabase.co/rest/v1/rpc/get_financial_dashboard",
        [Headers=[#"apikey"="your-key", #"Authorization"="Bearer your-key"]])),
    #"Converted to Table" = Record.ToTable(Source)
in
    #"Converted to Table"
```

### Option C: Python Script for Advanced Users

```python
# monthly_report_sync.py
import supabase
import pandas as pd
from datetime import datetime

# Initialize client
client = supabase.create_client(
    "https://xxxxx.supabase.co",
    "your-anon-key"
)

def get_monthly_data(user_id: str) -> dict:
    """Fetch monthly financial data from Supabase"""
    
    # Get dashboard data
    dashboard = client.rpc('get_financial_dashboard', {
        'p_user_id': user_id,
        'p_usd_to_local_rate': 1.0
    }).execute()
    
    # Get transactions for current month
    now = datetime.now()
    first_of_month = f"{now.year}-{now.month:02d}-01"
    
    transactions = client.table('transactions').select('*').eq('user_id', user_id).gte('transaction_date', first_of_month).execute()
    
    return {
        'dashboard': dashboard.data,
        'transactions': transactions.data
    }

def export_to_excel(data: dict, output_path: str):
    """Export data to Excel with formatting"""
    
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        # Summary sheet
        pd.DataFrame([data['dashboard']]).to_excel(writer, sheet_name='Summary', index=False)
        
        # Transactions sheet
        if data['transactions']:
            df = pd.DataFrame(data['transactions'])
            df.to_excel(writer, sheet_name='Transactions', index=False)
    
    print(f"Report exported to {output_path}")

if __name__ == "__main__":
    user_id = input("Enter user ID: ")
    data = get_monthly_data(user_id)
    export_to_excel(data, f"report_{datetime.now().strftime('%Y%m')}.xlsx")
```

---

## 3. Scheduled Automation

### Cron Job for Monthly Reports

```typescript
// app/api/monthly-report/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface MonthlyReport {
  user_id: string
  month: number
  year: number
  total_income: number
  total_expenses: number
  net_income: number
  savings_rate: number
  top_expense_categories: { category: string; amount: number }[]
  goals_progress: { goal_id: string; progress: number }[]
  generated_at: string
}

async function generateMonthlyReports(): Promise<number> {
  const now = new Date()
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2,'0')}-01`
  const lastOfMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()}`
  
  // Get all users
  const { data: profiles } = await supabase.from('profiles').select('id, monthly_income')
  
  if (!profiles?.length) return 0
  
  let generated = 0
  
  for (const profile of profiles) {
    const userId = profile.id
    
    // Get transactions for month
    const { data: transactions } = await supabase
      .from('transactions')
      .select('type, amount, category')
      .eq('user_id', userId)
      .gte('transaction_date', firstOfMonth)
      .lte('transaction_date', lastOfMonth)
    
    if (!transactions?.length) continue
    
    // Calculate totals
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0)
    const net = income - expenses
    const savingsRate = income > 0 ? (net / income) * 100 : 0
    
    // Top categories
    const categories: Record<string, number> = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + Number(t.amount)
    })
    const topCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }))
    
    // Store report
    const report: MonthlyReport = {
      user_id: userId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      total_income: income,
      total_expenses: expenses,
      net_income: net,
      savings_rate: savingsRate,
      top_expense_categories: topCategories,
      goals_progress: [], // TODO: fetch from goals
      generated_at: now.toISOString()
    }
    
    // Save to database (create table if not exists)
    await supabase.from('monthly_reports').upsert(report, { onConflict: 'user_id,month,year' })
    
    generated++
  }
  
  return generated
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const generated = await generateMonthlyReports()
  return NextResponse.json({ ok: true, generated })
}
```

### Supabase Cron Setup

```sql
-- Create monthly_reports table
CREATE TABLE public.monthly_reports (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  year int NOT NULL,
  total_income numeric(15,2) NOT NULL,
  total_expenses numeric(15,2) NOT NULL,
  net_income numeric(15,2) NOT NULL,
  savings_rate numeric(5,2),
  top_expense_categories jsonb,
  goals_progress jsonb,
  generated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month, year)
);

-- Enable RLS
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own reports" ON public.monthly_reports FOR ALL USING (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_monthly_reports_user ON public.monthly_reports(user_id, year DESC, month DESC);
```

---

## 4. Push Notification Report Template

```typescript
const weeklyReportTemplate = {
  title: (name: string) => `تقرير أسبوعك يا ${name} 📊`,
  
  body: (data: {
    thisWeekTotal: number,
    lastWeekTotal: number,
    topCategory: { name: string; amount: number } | null,
    comparison: 'better' | 'worse' | 'same'
  }) => {
    const diff = Math.abs(data.thisWeekTotal - data.lastWeekTotal).toFixed(0)
    
    let message = ''
    if (data.lastWeekTotal === 0) {
      message = `أنفقت هذا الأسبوع: ${data.thisWeekTotal} JOD`
    } else if (data.comparison === 'better') {
      message = `أسبوع أفضل! وفّرت ${diff} JOD مقارنة بالأسبوع الماضي ✅`
    } else if (data.comparison === 'worse') {
      message = `أنفقت ${diff} JOD أكثر من الأسبوع الماضي — راجع مصاريفك`
    } else {
      message = `إنفاقك مستقر هذا الأسبوع: ${data.thisWeekTotal} JOD`
    }
    
    if (data.topCategory) {
      message += ` | أكثر إنفاق: ${data.topCategory.name} (${data.topCategory.amount} JOD)`
    }
    
    return message
  }
}
```

---

## 5. Future Enhancements

### Phase 2 (Q3 2026)

- [ ] Automated PDF generation
- [ ] Email delivery option
- [ ] Custom date range reports
- [ ] Export to Google Sheets live sync

### Phase 3 (Q4 2026)

- [ ] AI-powered insights
- [ ] Predictive analytics
- [ ] Comparative benchmarks
- [ ] Multi-user team reports