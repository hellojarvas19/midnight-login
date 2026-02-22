-- Add type column to payments to distinguish plan vs credits purchases
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'plan';

-- Add credits_amount column for credits purchases
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS credits_amount integer DEFAULT NULL;