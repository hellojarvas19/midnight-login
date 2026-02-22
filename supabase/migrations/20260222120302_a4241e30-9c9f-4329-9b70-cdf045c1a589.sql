
-- Daily usage tracking table
CREATE TABLE public.daily_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  checks_used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily usage"
  ON public.daily_usage FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own daily usage"
  ON public.daily_usage FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own daily usage"
  ON public.daily_usage FOR UPDATE
  USING (user_id = auth.uid());

-- Atomic function: deduct credits and increment daily usage in one transaction
-- Returns JSON: { success, checks_allowed, daily_used, daily_limit, credits_remaining, error }
CREATE OR REPLACE FUNCTION public.deduct_credits_atomic(
  p_user_id UUID,
  p_checks_requested INTEGER,
  p_daily_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_credits INTEGER;
  v_daily_used INTEGER;
  v_allowed INTEGER;
  v_new_credits INTEGER;
BEGIN
  -- Lock the profile row to prevent race conditions
  SELECT credits INTO v_credits
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_credits IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Get or create daily usage (upsert)
  INSERT INTO daily_usage (user_id, usage_date, checks_used)
  VALUES (p_user_id, CURRENT_DATE, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  SELECT checks_used INTO v_daily_used
  FROM daily_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE
  FOR UPDATE;

  -- Calculate how many checks we can allow
  v_allowed := LEAST(
    p_checks_requested,
    p_daily_limit - v_daily_used,  -- daily limit remaining
    v_credits                       -- credits remaining
  );

  IF v_allowed <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'checks_allowed', 0,
      'daily_used', v_daily_used,
      'daily_limit', p_daily_limit,
      'credits_remaining', v_credits,
      'error', CASE
        WHEN v_daily_used >= p_daily_limit THEN 'Daily limit reached'
        WHEN v_credits <= 0 THEN 'No credits remaining'
        ELSE 'Cannot process'
      END
    );
  END IF;

  v_new_credits := v_credits - v_allowed;

  -- Deduct credits
  UPDATE profiles SET credits = v_new_credits WHERE id = p_user_id;

  -- Increment daily usage
  UPDATE daily_usage
  SET checks_used = v_daily_used + v_allowed, updated_at = now()
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  RETURN jsonb_build_object(
    'success', true,
    'checks_allowed', v_allowed,
    'daily_used', v_daily_used + v_allowed,
    'daily_limit', p_daily_limit,
    'credits_remaining', v_new_credits
  );
END;
$$;
