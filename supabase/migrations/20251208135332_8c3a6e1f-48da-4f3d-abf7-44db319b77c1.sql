-- Create business_rules table for storing LLM-interpreted rules
CREATE TABLE public.business_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  rule_text TEXT NOT NULL, -- Natural language rule input by user
  generated_logic JSONB, -- LLM-generated calculation logic
  rule_type TEXT NOT NULL DEFAULT 'calculation', -- 'calculation', 'classification', 'filter', 'aggregation'
  applies_to TEXT[], -- Which fields/columns this rule applies to
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create version history table for audit trail
CREATE TABLE public.business_rules_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.business_rules(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_text TEXT NOT NULL,
  generated_logic JSONB,
  version INTEGER NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_type TEXT NOT NULL -- 'created', 'updated', 'activated', 'deactivated'
);

-- Enable RLS on business_rules
ALTER TABLE public.business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_rules_history ENABLE ROW LEVEL SECURITY;

-- Policies for business_rules - admins can manage all, users can view active rules
CREATE POLICY "Admins can manage all rules" 
ON public.business_rules 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active rules" 
ON public.business_rules 
FOR SELECT 
USING (is_active = true);

-- Policies for history - admins can view all
CREATE POLICY "Admins can view all history" 
ON public.business_rules_history 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view history of active rules" 
ON public.business_rules_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.business_rules br 
    WHERE br.id = rule_id AND br.is_active = true
  )
);

-- Trigger to update updated_at
CREATE TRIGGER update_business_rules_updated_at
BEFORE UPDATE ON public.business_rules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function to log rule changes to history
CREATE OR REPLACE FUNCTION public.log_rule_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.business_rules_history (
    rule_id,
    rule_name,
    rule_text,
    generated_logic,
    version,
    changed_by,
    change_type
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.rule_name, OLD.rule_name),
    COALESCE(NEW.rule_text, OLD.rule_text),
    COALESCE(NEW.generated_logic, OLD.generated_logic),
    COALESCE(NEW.version, OLD.version),
    auth.uid(),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active THEN 
        CASE WHEN NEW.is_active THEN 'activated' ELSE 'deactivated' END
      ELSE 'updated'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to log changes
CREATE TRIGGER log_business_rule_changes
AFTER INSERT OR UPDATE ON public.business_rules
FOR EACH ROW
EXECUTE FUNCTION public.log_rule_change();