-- Create table for P&L field ordering
CREATE TABLE public.pl_field_order (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_key TEXT NOT NULL UNIQUE,
  field_label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_system_field BOOLEAN NOT NULL DEFAULT true,
  rule_id UUID REFERENCES public.business_rules(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pl_field_order ENABLE ROW LEVEL SECURITY;

-- Allow public read access (since app has no auth)
CREATE POLICY "Anyone can view field order" 
ON public.pl_field_order 
FOR SELECT 
USING (true);

-- Allow public write access (since app has no auth)
CREATE POLICY "Anyone can manage field order" 
ON public.pl_field_order 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates (using existing handle_updated_at function)
CREATE TRIGGER update_pl_field_order_updated_at
BEFORE UPDATE ON public.pl_field_order
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert default P&L fields in standard order
INSERT INTO public.pl_field_order (field_key, field_label, display_order, is_system_field) VALUES
('volumeOriginal', 'VOLUME original', 1, true),
('volumeKg', 'VOLUME Kg', 2, true),
('revenue', 'REVENUE', 3, true),
('revenueRpu', 'RPU (Revenue)', 4, true),
('cogs', 'COGS', 5, true),
('cogsRpu', 'RPU (COGS)', 6, true),
('cogsPercent', '% of REV (COGS)', 7, true),
('margin', 'MARGIN', 8, true),
('marginRpu', 'RPU (Margin)', 9, true),
('marginPercent', '% of REV (Margin)', 10, true),
('stPersonal', 'ST-PERSONAL', 11, true),
('stPersonalPercent', '% of REV (ST-PERSONAL)', 12, true),
('stOpex', 'ST-OPEX', 13, true),
('stOpexPercent', '% of REV (ST-OPEX)', 14, true),
('commercialMargin', 'COMMERCIAL MARGIN', 15, true),
('commercialMarginPercent', '% of REV (COMM. MARGIN)', 16, true);