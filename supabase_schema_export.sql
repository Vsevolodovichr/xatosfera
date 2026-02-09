-- Xatosfera Supabase Schema Export
-- This file contains the complete database schema for deploying to a new Supabase project
-- Created: 2026-02-09

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- User roles for RBAC (Role-Based Access Control)
CREATE TYPE public.app_role AS ENUM ('superuser', 'top_manager', 'manager');

-- Property types
CREATE TYPE public.property_type AS ENUM ('apartment', 'house', 'commercial', 'land', 'office', 'other');

-- Deal types
CREATE TYPE public.deal_type AS ENUM ('sale', 'rent');

-- Property status
CREATE TYPE public.property_status AS ENUM ('available', 'sold', 'rented', 'not_sold', 'not_rented');

-- Report types
CREATE TYPE public.report_type AS ENUM ('weekly', 'monthly');

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- Profiles table - user profile information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    secret_key TEXT,
    approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table - manages user roles and permissions
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'manager',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Properties table - real estate properties
CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    owner_phone TEXT NOT NULL,
    description TEXT,
    property_type property_type NOT NULL DEFAULT 'apartment',
    deal_type deal_type NOT NULL DEFAULT 'sale',
    price DECIMAL(15, 2) NOT NULL,
    status property_status NOT NULL DEFAULT 'available',
    status_date_from DATE,
    status_date_to DATE,
    closing_amount DECIMAL(15, 2),
    commission DECIMAL(15, 2),
    external_link TEXT,
    photos TEXT[] DEFAULT '{}',
    area NUMERIC,
    floor INTEGER,
    heating TEXT,
    rooms INTEGER,
    condition TEXT,
    documents TEXT[] DEFAULT '{}',
    assigned_manager_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reports table - sales/rental reports
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_type report_type NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    added_properties_count INTEGER DEFAULT 0,
    closed_cases_count INTEGER DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    total_commission DECIMAL(15, 2) DEFAULT 0,
    signature TEXT,
    signed_at TIMESTAMP WITH TIME ZONE,
    sent_to UUID REFERENCES auth.users(id),
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User notes table - personal notes for users
CREATE TABLE public.user_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Calendar events table - personal calendar events
CREATE TABLE public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL DEFAULT 'meeting',
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    client_name TEXT,
    client_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User documents table - stores user documents (contracts, FOP, etc.)
CREATE TABLE public.user_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. FUNCTIONS
-- ============================================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- Function to check if user is approved
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

-- Function to generate secret key for managers
CREATE OR REPLACE FUNCTION public.generate_secret_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Trigger function for new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_notes_updated_at
    BEFORE UPDATE ON public.user_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON public.calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_documents_updated_at
    BEFORE UPDATE ON public.user_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- -------- PROFILES POLICIES --------

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Superusers can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Top managers can view manager profiles"
    ON public.profiles FOR SELECT
    USING (
        public.has_role(auth.uid(), 'top_manager')
        AND public.get_user_role(id) = 'manager'
    );

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Superusers can update all profiles"
    ON public.profiles FOR UPDATE
    USING (public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Top managers can update manager profiles"
    ON public.profiles FOR UPDATE
    USING (public.has_role(auth.uid(), 'top_manager'::app_role) AND (public.get_user_role(id) = 'manager'::app_role));

-- -------- USER_ROLES POLICIES --------

CREATE POLICY "Users can view their own role"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Superusers can view all roles"
    ON public.user_roles FOR SELECT
    USING (public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Top managers can view manager roles"
    ON public.user_roles FOR SELECT
    USING (public.has_role(auth.uid(), 'top_manager'));

CREATE POLICY "Superusers can manage all roles"
    ON public.user_roles FOR ALL
    USING (public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Top managers can manage manager roles"
    ON public.user_roles FOR UPDATE
    USING (
        public.has_role(auth.uid(), 'top_manager')
        AND role = 'manager'
    );

-- -------- PROPERTIES POLICIES --------

CREATE POLICY "Users can view their own properties"
    ON public.properties FOR SELECT
    USING (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Superusers can view all properties"
    ON public.properties FOR SELECT
    USING (public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Top managers can view all properties"
    ON public.properties FOR SELECT
    USING (public.has_role(auth.uid(), 'top_manager'));

CREATE POLICY "Users can create their own properties"
    ON public.properties FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Users can update their own properties"
    ON public.properties FOR UPDATE
    USING (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Superusers can update all properties"
    ON public.properties FOR UPDATE
    USING (public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Top managers can update all properties"
    ON public.properties FOR UPDATE
    USING (public.has_role(auth.uid(), 'top_manager'));

CREATE POLICY "Users can delete their own properties"
    ON public.properties FOR DELETE
    USING (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Superusers can delete all properties"
    ON public.properties FOR DELETE
    USING (public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Top managers can delete all properties"
    ON public.properties FOR DELETE
    USING (public.has_role(auth.uid(), 'top_manager'));

-- -------- REPORTS POLICIES --------

CREATE POLICY "Users can view their own reports"
    ON public.reports FOR SELECT
    USING (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Superusers can view all reports"
    ON public.reports FOR SELECT
    USING (public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Top managers can view all reports"
    ON public.reports FOR SELECT
    USING (public.has_role(auth.uid(), 'top_manager'));

CREATE POLICY "Users can create their own reports"
    ON public.reports FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Users can update their own reports"
    ON public.reports FOR UPDATE
    USING (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Superusers can update all reports"
    ON public.reports FOR UPDATE
    USING (public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Users can delete their own reports"
    ON public.reports FOR DELETE
    USING (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Superusers can delete all reports"
    ON public.reports FOR DELETE
    USING (public.has_role(auth.uid(), 'superuser'));

-- -------- USER_NOTES POLICIES --------

CREATE POLICY "Users can view their own notes"
    ON public.user_notes FOR SELECT
    USING (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Users can create their own notes"
    ON public.user_notes FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Users can update their own notes"
    ON public.user_notes FOR UPDATE
    USING (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Users can delete their own notes"
    ON public.user_notes FOR DELETE
    USING (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

-- -------- CALENDAR_EVENTS POLICIES --------

CREATE POLICY "Users can view their own events"
    ON public.calendar_events FOR SELECT
    USING (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Users can create their own events"
    ON public.calendar_events FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Users can update their own events"
    ON public.calendar_events FOR UPDATE
    USING (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Users can delete their own events"
    ON public.calendar_events FOR DELETE
    USING (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

-- -------- USER_DOCUMENTS POLICIES --------

CREATE POLICY "Users can view their own documents"
    ON public.user_documents FOR SELECT
    USING (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Users can create their own documents"
    ON public.user_documents FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Users can update their own documents"
    ON public.user_documents FOR UPDATE
    USING (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Users can delete their own documents"
    ON public.user_documents FOR DELETE
    USING (
        auth.uid() = user_id AND 
        (is_user_approved(auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'top_manager'::app_role))
    );

CREATE POLICY "Superusers can view all documents"
    ON public.user_documents FOR SELECT
    USING (has_role(auth.uid(), 'superuser'::app_role));

CREATE POLICY "Top managers can view manager documents"
    ON public.user_documents FOR SELECT
    USING (has_role(auth.uid(), 'top_manager'::app_role) AND (public.get_user_role(user_id) = 'manager'::app_role));

-- ============================================================================
-- 7. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_deal_type ON public.properties(deal_type);
CREATE INDEX IF NOT EXISTS idx_properties_assigned_manager ON public.properties(assigned_manager_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_period ON public.reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON public.user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);

-- ============================================================================
-- 8. STORAGE BUCKETS AND POLICIES
-- ============================================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', false),
    ('documents', 'documents', false),
    ('property-documents', 'property-documents', false)
ON CONFLICT (id) DO NOTHING;

-- -------- STORAGE POLICIES FOR AVATARS --------

CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- -------- STORAGE POLICIES FOR DOCUMENTS --------

CREATE POLICY "Users can view their own documents files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own documents"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents files"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents files"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- -------- STORAGE POLICIES FOR PROPERTY DOCUMENTS --------

CREATE POLICY "Users can view property docs"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload property docs"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update property docs"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete property docs"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
