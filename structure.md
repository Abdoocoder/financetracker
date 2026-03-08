# هيكل المشروع

financeapp/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── transactions/page.tsx
│   │   ├── debts/page.tsx
│   │   ├── investments/page.tsx
│   │   └── alerts/page.tsx
│   ├── api/
│   │   ├── alerts/route.ts
│   │   └── cron/route.ts
│   ├── layout.tsx
│   └── page.tsx (landing)
├── components/
│   ├── ui/ (shadcn)
│   ├── dashboard/
│   │   ├── StatsCards.tsx
│   │   ├── BudgetChart.tsx
│   │   ├── DebtProgress.tsx
│   │   ├── InvestmentTracker.tsx
│   │   └── AlertBanner.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       └── Header.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   └── utils.ts
├── types/
│   └── index.ts
├── supabase/
│   └── migrations/
│       └── 001_initial.sql
└── .env.local.example
