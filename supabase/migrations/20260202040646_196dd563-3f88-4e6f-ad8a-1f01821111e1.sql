-- Allow top-managers to update (approve) manager profiles
CREATE POLICY "Top managers can update manager profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'top_manager'::app_role) AND (get_user_role(id) = 'manager'::app_role));