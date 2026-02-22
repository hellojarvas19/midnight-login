
-- Replace overly permissive update policies with service-role only access
-- Drop the old policies
DROP POLICY IF EXISTS "Service can update results" ON public.check_results;
DROP POLICY IF EXISTS "Service can update jobs" ON public.check_jobs;

-- The edge function uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS entirely,
-- so we don't need permissive update policies at all. Users can only update their own jobs.
