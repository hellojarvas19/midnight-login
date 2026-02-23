
-- Add explicit INSERT policy for owners on shopify_sites
CREATE POLICY "Owners can insert sites"
ON public.shopify_sites
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
