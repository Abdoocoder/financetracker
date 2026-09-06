-- Health Score History Table
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

CREATE POLICY "users manage own scores"
  ON public.health_score_history FOR ALL
  USING (auth.uid() = user_id);
