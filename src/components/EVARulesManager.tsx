import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/contexts/DataContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, 
  Save, 
  RefreshCw, 
  Calculator,
  Settings2,
  CheckCircle2,
  Info,
  TrendingUp,
  TrendingDown,
  BarChart3
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EVARule {
  id: string;
  category_name: string;
  is_included: boolean;
  vol_formula: string;
  mix_formula: string;
  revenue_formula: string;
  cogs_formula: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Default formulas for EVA calculations
const DEFAULT_FORMULAS = {
  vol: 'volumeVariation * marginPerKg2024',
  mix: 'volumeVariation * marginDifferencePerKg',
  revenue: 'volume2025 * priceDifferencePerKg',
  cogs: '-(volume2025 * costDifferencePerKg)',
};

// Formula descriptions
const FORMULA_DESCRIPTIONS = {
  vol: 'Effet Volume = (Volume 2025 - Volume 2024) × Marge par Kg 2024',
  mix: 'Effet Mix = (Volume 2025 - Volume 2024) × (Marge/Kg 2025 - Marge/Kg 2024)',
  revenue: 'Effet Revenu = Volume 2025 × (Prix/Kg 2025 - Prix/Kg 2024)',
  cogs: 'Effet COGS = -Volume 2025 × (Coût/Kg 2025 - Coût/Kg 2024)',
};

const EVARulesManager = () => {
  const { toast } = useToast();
  const { data: appData, isDataLoaded } = useData();
  
  const [rules, setRules] = useState<EVARule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Get unique categories from data
  const availableCategories = useMemo(() => {
    if (!isDataLoaded) return [];
    const categories = [...new Set(appData.map(row => row.macroFamilyName).filter(Boolean))].sort() as string[];
    return categories;
  }, [appData, isDataLoaded]);

  // Load existing rules
  const loadRules = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('eva_rules')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setRules(data || []);
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error loading EVA rules:', error);
      toast({
        title: "Erreur lors du chargement",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize rules for categories that don't have rules yet
  const initializeRules = async () => {
    if (!isDataLoaded || availableCategories.length === 0) return;
    
    const existingCategories = rules.map(r => r.category_name);
    const newCategories = availableCategories.filter(cat => !existingCategories.includes(cat));
    
    if (newCategories.length === 0) return;

    setIsSaving(true);
    try {
      const newRules = newCategories.map((category, index) => ({
        category_name: category,
        is_included: category !== 'Barista', // Barista excluded by default
        vol_formula: DEFAULT_FORMULAS.vol,
        mix_formula: DEFAULT_FORMULAS.mix,
        revenue_formula: DEFAULT_FORMULAS.revenue,
        cogs_formula: DEFAULT_FORMULAS.cogs,
        display_order: rules.length + index,
      }));

      const { error } = await supabase
        .from('eva_rules')
        .insert(newRules);

      if (error) throw error;

      toast({
        title: "Catégories initialisées",
        description: `${newCategories.length} catégorie(s) ajoutée(s) avec les règles par défaut`,
      });

      loadRules();
    } catch (error: any) {
      console.error('Error initializing rules:', error);
      toast({
        title: "Erreur lors de l'initialisation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  useEffect(() => {
    if (isDataLoaded && rules.length >= 0) {
      initializeRules();
    }
  }, [isDataLoaded, availableCategories.length]);

  // Toggle category inclusion
  const toggleCategoryInclusion = (categoryName: string) => {
    setRules(prev => prev.map(rule => 
      rule.category_name === categoryName 
        ? { ...rule, is_included: !rule.is_included }
        : rule
    ));
    setHasChanges(true);
  };

  // Update formula
  const updateFormula = (categoryName: string, formulaType: keyof typeof DEFAULT_FORMULAS, value: string) => {
    setRules(prev => prev.map(rule => 
      rule.category_name === categoryName 
        ? { ...rule, [`${formulaType}_formula`]: value }
        : rule
    ));
    setHasChanges(true);
  };

  // Reset formula to default
  const resetFormula = (categoryName: string, formulaType: keyof typeof DEFAULT_FORMULAS) => {
    updateFormula(categoryName, formulaType, DEFAULT_FORMULAS[formulaType]);
  };

  // Save all changes
  const saveChanges = async () => {
    setIsSaving(true);
    try {
      for (const rule of rules) {
        const { error } = await supabase
          .from('eva_rules')
          .update({
            is_included: rule.is_included,
            vol_formula: rule.vol_formula,
            mix_formula: rule.mix_formula,
            revenue_formula: rule.revenue_formula,
            cogs_formula: rule.cogs_formula,
          })
          .eq('id', rule.id);

        if (error) throw error;
      }

      toast({
        title: "Modifications sauvegardées",
        description: "Les règles EVA ont été mises à jour",
      });
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error saving rules:', error);
      toast({
        title: "Erreur lors de la sauvegarde",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Select/Deselect all categories
  const toggleAll = (include: boolean) => {
    setRules(prev => prev.map(rule => ({ ...rule, is_included: include })));
    setHasChanges(true);
  };

  const includedCount = rules.filter(r => r.is_included).length;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Configuration des Calculs EVA
              </CardTitle>
              <CardDescription>
                Définissez quelles catégories sont incluses dans l'analyse EVA et personnalisez les formules de calcul
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadRules} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              {hasChanges && (
                <Button size="sm" onClick={saveChanges} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Sauvegarder
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Info Card about default formulas */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" />
            Formules par Défaut
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 mt-0.5 text-orange-500" />
                <div>
                  <span className="font-medium">Vol:</span>
                  <p className="text-muted-foreground text-xs">{FORMULA_DESCRIPTIONS.vol}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Settings2 className="h-4 w-4 mt-0.5 text-blue-500" />
                <div>
                  <span className="font-medium">Mix:</span>
                  <p className="text-muted-foreground text-xs">{FORMULA_DESCRIPTIONS.mix}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 mt-0.5 text-green-500" />
                <div>
                  <span className="font-medium">Revenue:</span>
                  <p className="text-muted-foreground text-xs">{FORMULA_DESCRIPTIONS.revenue}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <TrendingDown className="h-4 w-4 mt-0.5 text-red-500" />
                <div>
                  <span className="font-medium">COGS:</span>
                  <p className="text-muted-foreground text-xs">{FORMULA_DESCRIPTIONS.cogs}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Catégories par Macro-Famille
              </CardTitle>
              <CardDescription>
                {includedCount} / {rules.length} catégorie(s) incluse(s) dans l'analyse EVA
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>
                Tout inclure
              </Button>
              <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>
                Tout exclure
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune catégorie disponible</p>
              <p className="text-sm">Chargez des données pour voir les catégories</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Catégorie</TableHead>
                    <TableHead className="w-[100px] text-center">Inclure</TableHead>
                    <TableHead>Vol</TableHead>
                    <TableHead>Mix</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>COGS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id} className={!rule.is_included ? 'opacity-50 bg-muted/30' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{rule.category_name}</span>
                          {rule.is_included && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={rule.is_included}
                          onCheckedChange={() => toggleCategoryInclusion(rule.category_name)}
                        />
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1">
                                <Badge 
                                  variant={rule.vol_formula === DEFAULT_FORMULAS.vol ? "secondary" : "outline"}
                                  className="text-xs cursor-help"
                                >
                                  {rule.vol_formula === DEFAULT_FORMULAS.vol ? 'Défaut' : 'Perso.'}
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              <code className="text-xs">{rule.vol_formula}</code>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant={rule.mix_formula === DEFAULT_FORMULAS.mix ? "secondary" : "outline"}
                                className="text-xs cursor-help"
                              >
                                {rule.mix_formula === DEFAULT_FORMULAS.mix ? 'Défaut' : 'Perso.'}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              <code className="text-xs">{rule.mix_formula}</code>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant={rule.revenue_formula === DEFAULT_FORMULAS.revenue ? "secondary" : "outline"}
                                className="text-xs cursor-help"
                              >
                                {rule.revenue_formula === DEFAULT_FORMULAS.revenue ? 'Défaut' : 'Perso.'}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              <code className="text-xs">{rule.revenue_formula}</code>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant={rule.cogs_formula === DEFAULT_FORMULAS.cogs ? "secondary" : "outline"}
                                className="text-xs cursor-help"
                              >
                                {rule.cogs_formula === DEFAULT_FORMULAS.cogs ? 'Défaut' : 'Perso.'}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              <code className="text-xs">{rule.cogs_formula}</code>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Formula Editor - Expandable section */}
      {rules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="h-5 w-5" />
              Éditeur de Formules Avancé
            </CardTitle>
            <CardDescription>
              Personnalisez les formules de calcul pour chaque catégorie (optionnel)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {rules.filter(r => r.is_included).map((rule) => (
                <div key={rule.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{rule.category_name}</h4>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        resetFormula(rule.category_name, 'vol');
                        resetFormula(rule.category_name, 'mix');
                        resetFormula(rule.category_name, 'revenue');
                        resetFormula(rule.category_name, 'cogs');
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Réinitialiser tout
                    </Button>
                  </div>
                  <Separator />
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-orange-500" />
                        Formule Volume
                      </Label>
                      <Input
                        value={rule.vol_formula}
                        onChange={(e) => updateFormula(rule.category_name, 'vol', e.target.value)}
                        className="font-mono text-xs"
                        placeholder={DEFAULT_FORMULAS.vol}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1">
                        <Settings2 className="h-3 w-3 text-blue-500" />
                        Formule Mix
                      </Label>
                      <Input
                        value={rule.mix_formula}
                        onChange={(e) => updateFormula(rule.category_name, 'mix', e.target.value)}
                        className="font-mono text-xs"
                        placeholder={DEFAULT_FORMULAS.mix}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        Formule Revenue
                      </Label>
                      <Input
                        value={rule.revenue_formula}
                        onChange={(e) => updateFormula(rule.category_name, 'revenue', e.target.value)}
                        className="font-mono text-xs"
                        placeholder={DEFAULT_FORMULAS.revenue}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1">
                        <TrendingDown className="h-3 w-3 text-red-500" />
                        Formule COGS
                      </Label>
                      <Input
                        value={rule.cogs_formula}
                        onChange={(e) => updateFormula(rule.category_name, 'cogs', e.target.value)}
                        className="font-mono text-xs"
                        placeholder={DEFAULT_FORMULAS.cogs}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EVARulesManager;
