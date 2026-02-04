-- Add assigned_manager_id column for responsible manager assignment
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS assigned_manager_id uuid REFERENCES public.profiles(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_properties_assigned_manager ON public.properties(assigned_manager_id);
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);