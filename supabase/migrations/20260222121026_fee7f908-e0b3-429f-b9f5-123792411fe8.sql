
-- Add banned columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_by uuid;

-- Owner permissions table
CREATE TABLE public.owner_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  can_approve_payments BOOLEAN NOT NULL DEFAULT false,
  can_ban_users BOOLEAN NOT NULL DEFAULT false,
  can_manage_admins BOOLEAN NOT NULL DEFAULT false,
  can_give_credits BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.owner_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view all permissions"
  ON public.owner_permissions FOR SELECT
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can manage permissions"
  ON public.owner_permissions FOR ALL
  USING (has_role(auth.uid(), 'owner'));

-- Allow owners to view all profiles
CREATE POLICY "Owners can view all profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'owner'));

-- Allow owners to update profiles (ban, credits)
CREATE POLICY "Owners can update any profile"
  ON public.profiles FOR UPDATE
  USING (has_role(auth.uid(), 'owner'));

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Function to check if user is primary owner
CREATE OR REPLACE FUNCTION public.is_primary_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND telegram_id = '7520618222'
  )
$$;

-- Function to check owner permission
CREATE OR REPLACE FUNCTION public.has_owner_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF is_primary_owner(_user_id) THEN RETURN true; END IF;
  IF NOT has_role(_user_id, 'owner') THEN RETURN false; END IF;
  RETURN (
    SELECT CASE _permission
      WHEN 'approve_payments' THEN can_approve_payments
      WHEN 'ban_users' THEN can_ban_users
      WHEN 'manage_admins' THEN can_manage_admins
      WHEN 'give_credits' THEN can_give_credits
      ELSE false
    END
    FROM owner_permissions WHERE user_id = _user_id
  );
END;
$$;

CREATE TRIGGER update_owner_permissions_updated_at
  BEFORE UPDATE ON public.owner_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
