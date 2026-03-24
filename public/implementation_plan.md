# Implementation Plan — 4 Major Features

## Overview
Implement 4 critical missing features that align with the financial freedom vision, across both **Next.js Web** and **Flutter Android**.

---

## Feature 1: FIRE Number Calculator 🎯

**الفكرة:** المستخدم يرى رقمه الشخصي للحرية المالية وكم تبقى له.

### Web

#### [NEW] [fire/page.tsx](file:///c:/Users/skyli/Project/financetracker/app/(dashboard)/dashboard/fire/page.tsx)
- Interactive client page with 3 inputs: annual expenses, expected return %, withdrawal rate (default 4%)
- Calculate FIRE Number = annual expenses ÷ withdrawal rate
- Show current net worth (investments + savings goals) vs. target
- Projected timeline to FIRE given monthly surplus
- Two modes: Lean FIRE / Full FIRE / Fat FIRE toggles

#### [MODIFY] [layout.tsx](file:///c:/Users/skyli/Project/financetracker/app/(dashboard)/layout.tsx)
- Add FIRE nav link

### Flutter

#### [NEW] `lib/screens/more/fire_calculator_screen.dart`
- Same logic, mobile-first UI
- Sliders for annual expenses, return rate
- Animated progress ring showing % of FIRE reached

---

## Feature 2: Zakat Calculator 🕌

**الفكرة:** يحسب المستخدم زكاته السنوية بناءً على أصوله وهل حال الحول.

### Database

#### [NEW] Migration: `006_zakat_history.sql`
```sql
CREATE TABLE IF NOT EXISTS public.zakat_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year int NOT NULL,
  gold_gram numeric DEFAULT 0,
  silver_gram numeric DEFAULT 0,
  cash numeric DEFAULT 0,
  investments numeric DEFAULT 0,
  debts_owed numeric DEFAULT 0,
  total_zakatable numeric,
  zakat_due numeric,
  is_paid boolean DEFAULT false,
  calculated_at timestamptz DEFAULT now()
);
ALTER TABLE public.zakat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own zakat" ON public.zakat_history FOR ALL USING (auth.uid() = user_id);
```

### Web

#### [NEW] [zakat/page.tsx](file:///c:/Users/skyli/Project/financetracker/app/(dashboard)/dashboard/zakat/page.tsx)
- Step-by-step form: Cash + Bank accounts, Gold (grams), Silver, Investments (auto-pulled from investments table), Debts to deduct
- Nisab check (gold standard vs. silver standard)
- Show Zakat due = 2.5% of zakatable assets
- History of past years' paid zakat
- Save to `zakat_history` table

### Flutter

#### [NEW] `lib/screens/more/zakat_calculator_screen.dart`
- Mobile-friendly multi-step form
- Auto-fetch investments and savings_goals for pre-filling
- Show nisab threshold and if applicable

---

## Feature 3: Health Score History 📈

**الفكرة:** يرى المستخدم كيف تطورت نقاطه المالية عبر الزمن.

### Database

#### [NEW] Migration: `007_health_score_history.sql`
```sql
CREATE TABLE IF NOT EXISTS public.health_score_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score int NOT NULL,
  income numeric DEFAULT 0,
  expenses numeric DEFAULT 0,
  total_debt numeric DEFAULT 0,
  inv_value numeric DEFAULT 0,
  goals_saved numeric DEFAULT 0,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, recorded_at)
);
ALTER TABLE public.health_score_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own scores" ON public.health_score_history FOR ALL USING (auth.uid() = user_id);
```

### Backend

#### [NEW] [app/api/health-score-snapshot/route.ts](file:///c:/Users/skyli/Project/financetracker/app/api/health-score-snapshot/route.ts)
- CRON endpoint called daily at 23:59 (or triggered after events)
- Calculates health score for each user and upserts to `health_score_history`

#### [MODIFY] [smart-notifications/route.ts](file:///c:/Users/skyli/Project/financetracker/app/api/smart-notifications/route.ts)
- Add daily snapshot at `hour === 23`

### Web

#### [MODIFY] [dashboard/page.tsx](file:///c:/Users/skyli/Project/financetracker/app/(dashboard)/dashboard/page.tsx)
- Add Health Score chart showing last 30 days trend inside the existing Health section
- Uses Recharts LineChart with date on X axis

### Flutter

#### [MODIFY] `lib/screens/dashboard/dashboard_screen.dart`
- Add a mini line chart below the health score ring showing the last 6 months

---

## Feature 4: PDF Monthly Reports 📄

**الفكرة:** يمكن للمستخدم تحميل تقرير شهري ببياناته المالية.

### Web

#### [NEW] [app/api/pdf-report/route.ts](file:///c:/Users/skyli/Project/financetracker/app/api/pdf-report/route.ts)
- POST endpoint with user JWT
- Fetches: transactions, debts, investments, goals, health score for selected month
- Generates PDF using `@react-pdf/renderer` (server-side)
- Returns a downloadable PDF response

#### [NEW] `components/ui/pdf-report-button.tsx`
- Button in settings or transactions page
- Month picker
- Download trigger

### Flutter

#### [MODIFY] `lib/screens/more/more_screen.dart`
- "تقرير شهري PDF" button
- Calls backend API with auth token
- Uses `path_provider` + opens with system PDF viewer

#### [MODIFY] [pubspec.yaml](file:///c:/Users/skyli/Project/financetracker/mobile/fajrak_flutter/pubspec.yaml)
- Add `http` (already present) for API call
- Add `open_file` for opening the downloaded PDF

---

## Verification Plan

### Automated
- `npx tsc --noEmit` after each Web feature
- `flutter analyze` after each Flutter feature

### Manual
1. FIRE: Change investments and verify timeline updates reactively
2. Zakat: Enter 10,000 JOD cash → verify 250 JOD zakat returned
3. Health Score: Run snapshot API then verify database row and chart renders
4. PDF: Download a monthly report and verify all sections are populated
