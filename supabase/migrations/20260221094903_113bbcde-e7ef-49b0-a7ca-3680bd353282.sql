
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create messages table for community chat
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'text',
  image_url TEXT,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'user',
  sender_avatar_url TEXT,
  pinned BOOLEAN NOT NULL DEFAULT false,
  deleted BOOLEAN NOT NULL DEFAULT false,
  edited BOOLEAN NOT NULL DEFAULT false,
  quoted_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read messages
CREATE POLICY "Authenticated users can read messages"
ON public.messages FOR SELECT TO authenticated USING (true);

-- Users can insert their own messages
CREATE POLICY "Users can insert their own messages"
ON public.messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Users can update their own messages
CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Admins can update any message (pin/unpin)
CREATE POLICY "Admins can update any message"
ON public.messages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
ON public.messages FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Admins can delete any message
CREATE POLICY "Admins can delete any message"
ON public.messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Update timestamp trigger
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_messages_pinned ON public.messages(pinned) WHERE pinned = true;
