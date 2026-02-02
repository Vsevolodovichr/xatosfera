-- Add new columns to properties table for general info
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS area numeric,
ADD COLUMN IF NOT EXISTS floor integer,
ADD COLUMN IF NOT EXISTS heating text,
ADD COLUMN IF NOT EXISTS rooms integer,
ADD COLUMN IF NOT EXISTS condition text,
ADD COLUMN IF NOT EXISTS documents text[] DEFAULT '{}';

-- Create documents table for user documents (FOP, contracts, etc.)
CREATE TABLE IF NOT EXISTS public.user_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL, -- 'fop', 'rent_contract', 'sale_contract', 'agency_contract'
  file_url text NOT NULL,
  file_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on user_documents
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_documents
CREATE POLICY "Users can view their own documents" 
ON public.user_documents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents" 
ON public.user_documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
ON public.user_documents 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
ON public.user_documents 
FOR DELETE 
USING (auth.uid() = user_id);

-- Superusers can view all documents
CREATE POLICY "Superusers can view all documents" 
ON public.user_documents 
FOR SELECT 
USING (has_role(auth.uid(), 'superuser'::app_role));

-- Top managers can view manager documents
CREATE POLICY "Top managers can view manager documents" 
ON public.user_documents 
FOR SELECT 
USING (has_role(auth.uid(), 'top_manager'::app_role) AND (get_user_role(user_id) = 'manager'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_user_documents_updated_at
BEFORE UPDATE ON public.user_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for property documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-documents', 'property-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars (public read, owner write)
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for documents (owner access only)
CREATE POLICY "Users can view their own documents files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for property documents
CREATE POLICY "Users can view property docs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload property docs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update property docs" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete property docs" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);