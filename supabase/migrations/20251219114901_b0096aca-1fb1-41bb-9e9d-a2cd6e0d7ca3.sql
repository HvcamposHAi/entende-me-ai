-- Create table for EVA calculation rules by category
CREATE TABLE public.eva_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_name TEXT NOT NULL,
  is_included BOOLEAN NOT NULL DEFAULT true,
  vol_formula TEXT NOT NULL DEFAULT 'volumeVariation * marginPerKg2024',
  mix_formula TEXT NOT NULL DEFAULT 'volumeVariation * marginDifferencePerKg',
  revenue_formula TEXT NOT NULL DEFAULT 'volume2025 * priceDifferencePerKg',
  cogs_formula TEXT NOT NULL DEFAULT '-(volume2025 * costDifferencePerKg)',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_name)
);

-- Enable RLS
ALTER TABLE public.eva_rules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view eva rules" 
ON public.eva_rules 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can manage eva rules" 
ON public.eva_rules 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_eva_rules_updated_at
  BEFORE UPDATE ON public.eva_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();