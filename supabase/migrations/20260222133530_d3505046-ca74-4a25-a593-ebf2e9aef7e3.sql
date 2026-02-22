
-- Table for owner-managed Shopify sites
CREATE TABLE public.shopify_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Only owners can manage sites
ALTER TABLE public.shopify_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage sites"
  ON public.shopify_sites
  FOR ALL
  USING (has_role(auth.uid(), 'owner'::app_role));

-- All authenticated users can read sites (needed for checker)
CREATE POLICY "Authenticated users can read sites"
  ON public.shopify_sites
  FOR SELECT
  USING (true);
