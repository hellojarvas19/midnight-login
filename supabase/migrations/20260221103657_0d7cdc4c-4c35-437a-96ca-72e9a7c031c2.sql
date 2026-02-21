
-- Add plan expiration tracking
ALTER TABLE public.profiles ADD COLUMN plan_expires_at timestamp with time zone;

-- Create payments table
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plan text NOT NULL,
  amount_usd numeric(10,2) NOT NULL,
  crypto_currency text NOT NULL,
  tx_hash text,
  wallet_address text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_at timestamp with time zone,
  approved_by uuid
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own payments
CREATE POLICY "Users can insert own payments"
  ON public.payments FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update payments (approve/reject)
CREATE POLICY "Admins can update payments"
  ON public.payments FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
