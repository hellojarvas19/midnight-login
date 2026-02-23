
-- Drop the restrictive policies
DROP POLICY IF EXISTS "Owners can manage sites" ON public.shopify_sites;
DROP POLICY IF EXISTS "Owners can insert sites" ON public.shopify_sites;
DROP POLICY IF EXISTS "Authenticated users can read sites" ON public.shopify_sites;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Authenticated users can read sites"
ON public.shopify_sites
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Owners can insert sites"
ON public.shopify_sites
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can update sites"
ON public.shopify_sites
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can delete sites"
ON public.shopify_sites
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));
