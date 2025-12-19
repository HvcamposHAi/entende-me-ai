import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";
import { Save, RotateCcw, Calculator } from "lucide-react";

interface EVARule {
  id: string;
  category_name: string;
  is_included: boolean;
  vol_formula: string;
  mix_formula: string;
  revenue_formula: string;
  cogs_formula: string;
  display_order: number;
}

const DEFAULT_FORMULAS = {
  vol_formula: "volumeVariation * marginPerKg2024",
  mix_formula: "volumeVariation * marginDifferencePerKg",
  revenue_formula: "volume2025 * priceDifferencePerKg",
  cogs_formula: "-(volume2025 * costDifferencePerKg)"
};

const EVARulesManager = () => {
  const { data: appData, isDataLoaded } = useData();
  const [rules, setRules] = useState<EVARule[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [currentRule, setCurrentRule] = useState<EVARule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Get unique categories from data
  const availableCategories = useMemo(() => {
    if (!isDataLoaded) return [];
    const categories = [...new Set(appData.map(row => row.macroFamilyName).filter(Boolean))].sort() as string[];
    return categories;
  }, [appData, isDataLoaded]);

  useEffect(() => {
    fetchRules();
  }, []);

  useEffect(() => {
    if (isDataLoaded && availableCategories.length > 0 && rules.length === 0) {
      initializeDefaultRules();
    }
  }, [isDataLoaded, availableCategories.length]);

  useEffect(() => {
    if (selectedCategory && rules.length > 0) {
      const rule = rules.find(r => r.category_name === selectedCategory);
      setCurrentRule(rule ? { ...rule } : null);
    } else {
      setCurrentRule(null);
    }
  }, [selectedCategory, rules]);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from("eva_rules")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error("Erreur lors du chargement des règles EVA:", error);
      toast.error("Erreur lors du chargement des règles");
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultRules = async () => {
    const existingCategories = rules.map(r => r.category_name);
    const newCategories = availableCategories.filter(cat => !existingCategories.includes(cat));
    
    if (newCategories.length === 0) return;

    const defaultRules = newCategories.map((cat, index) => ({
      category_name: cat,
      is_included: cat !== "Barista",
      display_order: rules.length + index,
      ...DEFAULT_FORMULAS
    }));

    try {
      const { data, error } = await supabase
        .from("eva_rules")
        .insert(defaultRules)
        .select();

      if (error) throw error;
      if (data) setRules(prev => [...prev, ...data]);
      toast.success(`${newCategories.length} catégorie(s) initialisée(s)`);
    } catch (error) {
      console.error("Erreur lors de l'initialisation:", error);
    }
  };

  const handleFormulaChange = (field: keyof typeof DEFAULT_FORMULAS, value: string) => {
    if (currentRule) {
      setCurrentRule({ ...currentRule, [field]: value });
    }
  };

  const handleIncludedChange = (checked: boolean) => {
    if (currentRule) {
      setCurrentRule({ ...currentRule, is_included: checked });
    }
  };

  const handleSave = async () => {
    if (!currentRule) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("eva_rules")
        .update({
          is_included: currentRule.is_included,
          vol_formula: currentRule.vol_formula,
          mix_formula: currentRule.mix_formula,
          revenue_formula: currentRule.revenue_formula,
          cogs_formula: currentRule.cogs_formula
        })
        .eq("id", currentRule.id);

      if (error) throw error;

      setRules(rules.map(r => r.id === currentRule.id ? currentRule : r));
      toast.success(`Règles pour "${currentRule.category_name}" sauvegardées`);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (currentRule) {
      setCurrentRule({
        ...currentRule,
        ...DEFAULT_FORMULAS,
        is_included: currentRule.category_name !== "Barista"
      });
    }
  };

  const categoriesForSelect = rules.length > 0 
    ? rules.map(r => r.category_name) 
    : availableCategories;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Chargement des règles EVA...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Configuration des Calculs EVA
        </CardTitle>
        <CardDescription>
          Sélectionnez une catégorie et modifiez les formules de calcul pour l'analyse de variance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Selector */}
        <div className="space-y-2">
          <Label>Catégorie</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Sélectionnez une catégorie..." />
            </SelectTrigger>
            <SelectContent>
              {categoriesForSelect.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentRule && (
          <div className="space-y-6 pt-4 border-t">
            {/* Include Toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={currentRule.is_included}
                onCheckedChange={handleIncludedChange}
              />
              <Label>Inclure cette catégorie dans l'analyse EVA</Label>
            </div>

            {/* Formula Fields */}
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label className="font-medium">Volume (vs Vol)</Label>
                <Textarea
                  value={currentRule.vol_formula}
                  onChange={(e) => handleFormulaChange("vol_formula", e.target.value)}
                  placeholder="Ex: volumeVariation * marginPerKg2024"
                  className="font-mono text-sm min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  Variables: volumeVariation, marginPerKg2024, volume2024, volume2025
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Mix</Label>
                <Textarea
                  value={currentRule.mix_formula}
                  onChange={(e) => handleFormulaChange("mix_formula", e.target.value)}
                  placeholder="Ex: volumeVariation * marginDifferencePerKg"
                  className="font-mono text-sm min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  Variables: volumeVariation, marginDifferencePerKg, marginPerKg2024, marginPerKg2025
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Revenu (vs Revenue)</Label>
                <Textarea
                  value={currentRule.revenue_formula}
                  onChange={(e) => handleFormulaChange("revenue_formula", e.target.value)}
                  placeholder="Ex: volume2025 * priceDifferencePerKg"
                  className="font-mono text-sm min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  Variables: volume2025, priceDifferencePerKg, pricePerKg2024, pricePerKg2025
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">COGS (vs COGS)</Label>
                <Textarea
                  value={currentRule.cogs_formula}
                  onChange={(e) => handleFormulaChange("cogs_formula", e.target.value)}
                  placeholder="Ex: -(volume2025 * costDifferencePerKg)"
                  className="font-mono text-sm min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  Variables: volume2025, costDifferencePerKg, costPerKg2024, costPerKg2025
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Réinitialiser par défaut
              </Button>
            </div>
          </div>
        )}

        {!selectedCategory && (
          <div className="text-center py-8 text-muted-foreground">
            <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Sélectionnez une catégorie pour modifier ses formules de calcul</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EVARulesManager;