
-- Check jobs table for backend processing
CREATE TABLE public.check_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, stopped
  gateway text NOT NULL DEFAULT 'shopify',
  total_cards integer NOT NULL DEFAULT 0,
  processed integer NOT NULL DEFAULT 0,
  charged integer NOT NULL DEFAULT 0,
  approved integer NOT NULL DEFAULT 0,
  declined integer NOT NULL DEFAULT 0,
  sites text[] NOT NULL DEFAULT '{}',
  proxies text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

ALTER TABLE public.check_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON public.check_jobs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own jobs" ON public.check_jobs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own jobs" ON public.check_jobs FOR UPDATE USING (user_id = auth.uid());

-- Check results table for individual card results
CREATE TABLE public.check_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.check_jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  card_number text NOT NULL,
  expiry text NOT NULL,
  cvv text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, checking, charged, approved, declined
  response_code text,
  response_message text,
  site_used text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.check_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own results" ON public.check_results FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own results" ON public.check_results FOR INSERT WITH CHECK (user_id = auth.uid());

-- Service role needs to update results from edge function
CREATE POLICY "Service can update results" ON public.check_results FOR UPDATE USING (true);
CREATE POLICY "Service can update jobs" ON public.check_jobs FOR UPDATE USING (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_results;

-- Trigger for updated_at on check_jobs
CREATE TRIGGER update_check_jobs_updated_at
  BEFORE UPDATE ON public.check_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
