-- Zakat History Table
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
  calculated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, year)
);

ALTER TABLE public.zakat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own zakat"
  ON public.zakat_history FOR ALL
  USING (auth.uid() = user_id);
