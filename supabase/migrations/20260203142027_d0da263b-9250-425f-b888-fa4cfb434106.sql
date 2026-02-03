-- Fix 1: Create helper function to check if user is approved
-- This allows RLS policies to enforce approval server-side
CREATE OR REPLACE FUNCTION public.is_user_approved(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT approved FROM public.profiles WHERE id = user_id),
        false
    )
$$;

-- Fix 2: Make avatars bucket private and add RLS policy for authenticated access
UPDATE storage.buckets SET public = false WHERE id = 'avatars';

-- Create storage policy for authenticated users to view avatars
CREATE POLICY "Authenticated users can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Fix 3: Update RLS policies to enforce approval for regular users (managers)
-- Superusers and top_managers bypass approval check as they manage the system

-- Properties: Add approval check for regular users
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
CREATE POLICY "Users can view their own properties"
ON public.properties FOR SELECT
USING (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

DROP POLICY IF EXISTS "Users can create their own properties" ON public.properties;
CREATE POLICY "Users can create their own properties"
ON public.properties FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
CREATE POLICY "Users can update their own properties"
ON public.properties FOR UPDATE
USING (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;
CREATE POLICY "Users can delete their own properties"
ON public.properties FOR DELETE
USING (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

-- Reports: Add approval check for regular users
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
CREATE POLICY "Users can view their own reports"
ON public.reports FOR SELECT
USING (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

DROP POLICY IF EXISTS "Users can create their own reports" ON public.reports;
CREATE POLICY "Users can create their own reports"
ON public.reports FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

DROP POLICY IF EXISTS "Users can update their own reports" ON public.reports;
CREATE POLICY "Users can update their own reports"
ON public.reports FOR UPDATE
USING (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

-- User notes: Add approval check
DROP POLICY IF EXISTS "Users can view their own notes" ON public.user_notes;
CREATE POLICY "Users can view their own notes"
ON public.user_notes FOR SELECT
USING (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

DROP POLICY IF EXISTS "Users can create their own notes" ON public.user_notes;
CREATE POLICY "Users can create their own notes"
ON public.user_notes FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.user_notes;
CREATE POLICY "Users can update their own notes"
ON public.user_notes FOR UPDATE
USING (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

DROP POLICY IF EXISTS "Users can delete their own notes" ON public.user_notes;
CREATE POLICY "Users can delete their own notes"
ON public.user_notes FOR DELETE
USING (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

-- User documents: Add approval check
DROP POLICY IF EXISTS "Users can view their own documents" ON public.user_documents;
CREATE POLICY "Users can view their own documents"
ON public.user_documents FOR SELECT
USING (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

DROP POLICY IF EXISTS "Users can create their own documents" ON public.user_documents;
CREATE POLICY "Users can create their own documents"
ON public.user_documents FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

DROP POLICY IF EXISTS "Users can update their own documents" ON public.user_documents;
CREATE POLICY "Users can update their own documents"
ON public.user_documents FOR UPDATE
USING (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

DROP POLICY IF EXISTS "Users can delete their own documents" ON public.user_documents;
CREATE POLICY "Users can delete their own documents"
ON public.user_documents FOR DELETE
USING (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

-- Calendar events: Add approval check
DROP POLICY IF EXISTS "Users can view their own events" ON public.calendar_events;
CREATE POLICY "Users can view their own events"
ON public.calendar_events FOR SELECT
USING (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

DROP POLICY IF EXISTS "Users can create their own events" ON public.calendar_events;
CREATE POLICY "Users can create their own events"
ON public.calendar_events FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

DROP POLICY IF EXISTS "Users can update their own events" ON public.calendar_events;
CREATE POLICY "Users can update their own events"
ON public.calendar_events FOR UPDATE
USING (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);

DROP POLICY IF EXISTS "Users can delete their own events" ON public.calendar_events;
CREATE POLICY "Users can delete their own events"
ON public.calendar_events FOR DELETE
USING (
    auth.uid() = user_id AND 
    (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
);