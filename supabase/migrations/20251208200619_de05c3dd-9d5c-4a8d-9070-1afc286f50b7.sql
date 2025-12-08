-- Add more configuration options to pl_field_order
ALTER TABLE public.pl_field_order 
ADD COLUMN field_style TEXT DEFAULT 'normal',
ADD COLUMN is_calculated BOOLEAN DEFAULT false,
ADD COLUMN calculation_formula TEXT,
ADD COLUMN indent_level INTEGER DEFAULT 0,
ADD COLUMN show_rpu BOOLEAN DEFAULT false,
ADD COLUMN show_percent_of_revenue BOOLEAN DEFAULT false;

-- Update existing rows with appropriate styles
UPDATE public.pl_field_order SET field_style = 'header', show_rpu = true, show_percent_of_revenue = false WHERE field_key IN ('revenue', 'cogs', 'margin', 'stPersonal', 'stOpex', 'commercialMargin');
UPDATE public.pl_field_order SET field_style = 'subitem', indent_level = 1 WHERE field_key IN ('revenueRpu', 'cogsRpu', 'cogsPercent', 'marginRpu', 'marginPercent', 'stPersonalPercent', 'stOpexPercent', 'commercialMarginPercent');
UPDATE public.pl_field_order SET is_calculated = true WHERE field_key IN ('margin', 'commercialMargin');