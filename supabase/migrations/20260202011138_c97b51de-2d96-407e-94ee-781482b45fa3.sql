-- Add new columns to profiles for approval system and profile settings
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS phone text;

-- Create user_notes table for personal notes
CREATE TABLE public.user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on user_notes
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_notes - users can only access their own notes
CREATE POLICY "Users can view their own notes"
ON public.user_notes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
ON public.user_notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
ON public.user_notes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
ON public.user_notes FOR DELETE
USING (auth.uid() = user_id);

-- Create calendar_events table for personal calendar
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'meeting', -- meeting, call, viewing, other
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  client_name text,
  client_phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on calendar_events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for calendar_events
CREATE POLICY "Users can view their own events"
ON public.calendar_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events"
ON public.calendar_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
ON public.calendar_events FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
ON public.calendar_events FOR DELETE
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_user_notes_updated_at
BEFORE UPDATE ON public.user_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update handle_new_user function to set approved=true for first user (superuser)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_count INTEGER;
    new_role app_role;
    secret TEXT;
    is_approved BOOLEAN;
BEGIN
    -- Count existing users
    SELECT COUNT(*) INTO user_count FROM public.profiles;
    
    -- First user becomes superuser (auto-approved), others become managers (need approval)
    IF user_count = 0 THEN
        new_role := 'superuser';
        secret := NULL;
        is_approved := true;
    ELSE
        new_role := 'manager';
        secret := generate_secret_key();
        is_approved := false;
    END IF;
    
    -- Create profile
    INSERT INTO public.profiles (id, full_name, secret_key, approved)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        secret,
        is_approved
    );
    
    -- Assign role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, new_role);
    
    RETURN NEW;
END;
$$;