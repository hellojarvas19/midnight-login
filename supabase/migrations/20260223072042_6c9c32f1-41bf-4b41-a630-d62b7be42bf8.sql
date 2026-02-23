
-- Settings table for global app config (like active endpoint)
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can read settings"
  ON public.app_settings FOR SELECT TO authenticated
  USING (true);

-- Only owners can modify settings
CREATE POLICY "Owners can manage settings"
  ON public.app_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- Seed default endpoint
INSERT INTO public.app_settings (key, value) VALUES ('checker_endpoint', 'endpoint1');
