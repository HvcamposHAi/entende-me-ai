-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage all rules" ON public.business_rules;
DROP POLICY IF EXISTS "Users can view active rules" ON public.business_rules;

-- Create permissive policies for public access (project has no authentication)
CREATE POLICY "Anyone can view rules" 
ON public.business_rules 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can manage rules" 
ON public.business_rules 
FOR ALL 
USING (true)
WITH CHECK (true);