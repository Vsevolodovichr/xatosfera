-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('superuser', 'top_manager', 'manager');

-- Create enum for property types
CREATE TYPE public.property_type AS ENUM ('apartment', 'house', 'commercial', 'land', 'office', 'other');

-- Create enum for deal types
CREATE TYPE public.deal_type AS ENUM ('sale', 'rent');

-- Create enum for property status
CREATE TYPE public.property_status AS ENUM ('available', 'sold', 'rented', 'not_sold', 'not_rented');

-- Create enum for report types
CREATE TYPE public.report_type AS ENUM ('weekly', 'monthly');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    secret_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'manager',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create properties table
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
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports table
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

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
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

-- Generate secret key for managers
CREATE OR REPLACE FUNCTION public.generate_secret_key()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Trigger to create profile and assign role on user creation
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
BEGIN
    -- Count existing users
    SELECT COUNT(*) INTO user_count FROM public.profiles;
    
    -- First user becomes superuser, others become managers
    IF user_count = 0 THEN
        new_role := 'superuser';
        secret := NULL;
    ELSE
        new_role := 'manager';
        secret := generate_secret_key();
    END IF;
    
    -- Create profile
    INSERT INTO public.profiles (id, full_name, secret_key)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        secret
    );
    
    -- Assign role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, new_role);
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create update triggers
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

-- RLS Policies for profiles
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

-- RLS Policies for user_roles
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

-- RLS Policies for properties
CREATE POLICY "Users can view their own properties"
    ON public.properties FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Superusers can view all properties"
    ON public.properties FOR SELECT
    USING (public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Top managers can view all properties"
    ON public.properties FOR SELECT
    USING (public.has_role(auth.uid(), 'top_manager'));

CREATE POLICY "Users can create their own properties"
    ON public.properties FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties"
    ON public.properties FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Superusers can update all properties"
    ON public.properties FOR UPDATE
    USING (public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Top managers can update all properties"
    ON public.properties FOR UPDATE
    USING (public.has_role(auth.uid(), 'top_manager'));

CREATE POLICY "Users can delete their own properties"
    ON public.properties FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Superusers can delete all properties"
    ON public.properties FOR DELETE
    USING (public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Top managers can delete all properties"
    ON public.properties FOR DELETE
    USING (public.has_role(auth.uid(), 'top_manager'));

-- RLS Policies for reports
CREATE POLICY "Users can view their own reports"
    ON public.reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Superusers can view all reports"
    ON public.reports FOR SELECT
    USING (public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Top managers can view all reports"
    ON public.reports FOR SELECT
    USING (public.has_role(auth.uid(), 'top_manager'));

CREATE POLICY "Users can create their own reports"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
    ON public.reports FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Superusers can update all reports"
    ON public.reports FOR UPDATE
    USING (public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Users can delete their own reports"
    ON public.reports FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Superusers can delete all reports"
    ON public.reports FOR DELETE
    USING (public.has_role(auth.uid(), 'superuser'));

-- Create indexes for better performance
CREATE INDEX idx_properties_user_id ON public.properties(user_id);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_deal_type ON public.properties(deal_type);
CREATE INDEX idx_reports_user_id ON public.reports(user_id);
CREATE INDEX idx_reports_period ON public.reports(period_start, period_end);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);