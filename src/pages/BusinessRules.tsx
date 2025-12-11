import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/contexts/DataContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  History,
  Code,
  FileText,
  Trash2,
  RefreshCw,
  Database,
  ChevronDown,
  ChevronRight,
  Info,
  ListOrdered
} from "lucide-react";
import { useTracking } from "@/hooks/useTracking";
import PLBuilder from "@/components/PLBuilder";

// Champs disponibles depuis Layer 1 (import Excel)
const AVAILABLE_FIELDS = [
  { name: "calendarYear", type: "number", description: "Année (ex: 2024, 2025)" },
  { name: "calendarMonth", type: "text", description: "Mois du calendrier" },
  { name: "month", type: "text", description: "Nom du mois abrégé (ex: Jan, Fév)" },
  { name: "yearMonth", type: "text", description: "Année-Mois formaté" },
  { name: "monthYear", type: "text", description: "Mois/Année formaté" },
  { name: "nom", type: "text", description: "Nom du magasin/succursale" },
  { name: "clientMacroCategory", type: "text", description: "Macro catégorie du client" },
  { name: "macroFamilyName", type: "text", description: "Famille macro du produit (ex: Barres, Truffes)" },
  { name: "familyName", type: "text", description: "Famille du produit" },
  { name: "nameSalesReport", type: "text", description: "Nom pour rapport de ventes" },
  { name: "frItemCode", type: "text", description: "Code de l'article" },
  { name: "pl", type: "text", description: "Ligne du P&L / Classification comptable" },
  { name: "quantitySoldTotal", type: "number", description: "Quantité vendue totale (unités)" },
  { name: "netSales", type: "number", description: "Chiffre d'affaires net (€)" },
  { name: "cogs", type: "number", description: "Coût des marchandises vendues - COGS (€)" },
  { name: "margin", type: "number", description: "Marge brute (€)" },
  { name: "volumeKg", type: "number", description: "Volume en kilogrammes (Kg)" },
];

interface BusinessRule {
  id: string;
  rule_name: string;
  rule_description: string | null;
  rule_text: string;
  generated_logic: any;
  rule_type: string;
  applies_to: string[] | null;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GeneratedLogic {
  operation: string;
  outputField?: string;
  formula?: string;
  jsExpression?: string;
  appliesTo?: string[];
  conditions?: Array<{ field: string; operator: string; value: string }>;
  description: string;
  validationMessage?: string | null;
}

const BusinessRules = () => {
  useTracking();
  const { toast } = useToast();
  const { data: appData } = useData();
  
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(true);
  
  // Form state
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [ruleText, setRuleText] = useState("");
  const [ruleType, setRuleType] = useState<string>("calculation");
  const [generatedLogic, setGeneratedLogic] = useState<GeneratedLogic | null>(null);

  // Insert field into rule text
  const insertField = (fieldName: string) => {
    setRuleText((prev) => {
      const suffix = prev.endsWith(" ") || prev === "" ? "" : " ";
      return prev + suffix + fieldName + " ";
    });
    toast({
      title: "Champ inséré",
      description: `"${fieldName}" ajouté à la règle`,
    });
  };

  // Load existing rules
  const loadRules = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error: any) {
      console.error('Error loading rules:', error);
      toast({
        title: "Erreur lors du chargement des règles",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  // Interpret rule with LLM
  const interpretRule = async () => {
    if (!ruleText.trim()) {
      toast({
        title: "Règle vide",
        description: "Saisissez une règle en langage naturel",
        variant: "destructive",
      });
      return;
    }

    setIsInterpreting(true);
    setGeneratedLogic(null);

    try {
      const { data, error } = await supabase.functions.invoke('interpret-rule', {
        body: {
          ruleText,
          ruleName,
          ruleType,
          sampleData: appData.slice(0, 5)
        }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Erreur lors de l'interprétation de la règle",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setGeneratedLogic(data.generatedLogic);
      toast({
        title: "Règle interprétée",
        description: "La logique a été générée avec succès. Vérifiez avant de sauvegarder.",
      });
    } catch (error: any) {
      console.error('Error interpreting rule:', error);
      toast({
        title: "Erreur lors de l'interprétation de la règle",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsInterpreting(false);
    }
  };

  // Save rule to database
  const saveRule = async () => {
    if (!ruleName.trim() || !ruleText.trim() || !generatedLogic) {
      toast({
        title: "Données incomplètes",
        description: "Remplissez le nom, la règle et interprétez avant de sauvegarder",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const insertData = {
        rule_name: ruleName,
        rule_description: ruleDescription || null,
        rule_text: ruleText,
        generated_logic: generatedLogic as any,
        rule_type: ruleType,
        applies_to: generatedLogic.appliesTo || [],
        is_active: true,
      };

      const { data: savedRule, error } = await supabase
        .from('business_rules')
        .insert([insertData])
        .select()
        .maybeSingle();

      if (error) throw error;

      // If the rule generates a new output field, add it to P&L field order
      if (generatedLogic.outputField && savedRule) {
        // Get current max display_order
        const { data: maxOrderData } = await supabase
          .from('pl_field_order')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1);
        
        const nextOrder = (maxOrderData?.[0]?.display_order || 0) + 1;

        // Insert new field with rule_id reference
        await supabase
          .from('pl_field_order')
          .insert({
            field_key: generatedLogic.outputField,
            field_label: ruleName,
            display_order: nextOrder,
            is_system_field: false,
            rule_id: savedRule.id,
            is_visible: true,
          });
      }

      toast({
        title: "Règle sauvegardée",
        description: `"${ruleName}" a été créée avec succès${generatedLogic.outputField ? ' et ajoutée au P&L' : ''}`,
      });

      // Reset form
      setRuleName("");
      setRuleDescription("");
      setRuleText("");
      setRuleType("calculation");
      setGeneratedLogic(null);

      // Reload rules
      loadRules();
    } catch (error: any) {
      console.error('Error saving rule:', error);
      toast({
        title: "Erreur lors de la sauvegarde de la règle",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle rule active status
  const toggleRuleActive = async (rule: BusinessRule) => {
    try {
      const { error } = await supabase
        .from('business_rules')
        .update({ 
          is_active: !rule.is_active,
          version: rule.version + 1
        })
        .eq('id', rule.id);

      if (error) throw error;

      toast({
        title: rule.is_active ? "Règle désactivée" : "Règle activée",
        description: `"${rule.rule_name}" a été ${rule.is_active ? 'désactivée' : 'activée'}`,
      });

      loadRules();
    } catch (error: any) {
      console.error('Error toggling rule:', error);
      toast({
        title: "Erreur lors de la mise à jour de la règle",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Delete rule
  const deleteRule = async (rule: BusinessRule) => {
    try {
      const { error } = await supabase
        .from('business_rules')
        .delete()
        .eq('id', rule.id);

      if (error) throw error;

      toast({
        title: "Règle supprimée",
        description: `"${rule.rule_name}" a été supprimée`,
      });

      loadRules();
    } catch (error: any) {
      console.error('Error deleting rule:', error);
      toast({
        title: "Erreur lors de la suppression de la règle",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const ruleTypeLabels: Record<string, string> = {
    calculation: "Calcul",
    classification: "Classification",
    filter: "Filtre",
    aggregation: "Agrégation",
  };

  const exampleRules = [
    "Marge brute = Chiffre d'affaires net - COGS",
    "Classifiez les magasins avec marge > 40% comme 'Premium'",
    "Coût par Kg = COGS / volumeKg",
    "EBITDA = Marge - ST-PERSONAL - ST-OPEX",
    "Ticket moyen = netSales / quantitySoldTotal",
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Règles Métier</h2>
          <p className="text-muted-foreground">
            Définissez des règles en langage naturel que le LLM interprétera et appliquera aux données
          </p>
        </div>

        <Tabs defaultValue="rules" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Créer des Règles
            </TabsTrigger>
            <TabsTrigger value="order" className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4" />
              Ordonner P&L
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-6 mt-6">
        {/* Main Grid: Fields + Rule Form */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Available Fields - Left Panel */}
          <Card className="lg:col-span-1">
            <Collapsible open={fieldsOpen} onOpenChange={setFieldsOpen}>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Champs Disponibles
                    </div>
                    {fieldsOpen ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </CardTitle>
                  <CardDescription className="text-left text-xs">
                    Cliquez pour insérer dans la règle
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {AVAILABLE_FIELDS.map((field) => (
                      <button
                        key={field.name}
                        type="button"
                        className="w-full p-2 border rounded-lg hover:bg-primary/10 hover:border-primary transition-colors text-left group"
                        onClick={() => insertField(field.name)}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <code className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            {field.name}
                          </code>
                          <Badge variant="outline" className="text-[10px] h-4">
                            {field.type}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{field.description}</p>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 p-2 bg-muted rounded-lg flex items-start gap-2">
                    <Info className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-muted-foreground">
                      Cliquez sur les champs ci-dessus pour les insérer automatiquement dans le texte de la règle
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Create New Rule - Right Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Nouvelle Règle Métier
              </CardTitle>
              <CardDescription>
                Sélectionnez les champs à gauche et décrivez la règle en langage naturel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ruleName">Nom de la Règle</Label>
                  <Input
                    id="ruleName"
                    placeholder="Ex: Calcul de l'EBITDA"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ruleType">Type de Règle</Label>
                  <Select value={ruleType} onValueChange={setRuleType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calculation">Calcul</SelectItem>
                      <SelectItem value="classification">Classification</SelectItem>
                      <SelectItem value="filter">Filtre</SelectItem>
                      <SelectItem value="aggregation">Agrégation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ruleDescription">Description (optionnel)</Label>
                <Input
                  id="ruleDescription"
                  placeholder="Brève description de l'objectif de la règle"
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ruleText">Règle en Langage Naturel</Label>
                <Textarea
                  id="ruleText"
                  placeholder="Ex: EBITDA = margin - stPersonal - stOpex (cliquez sur les champs à gauche pour les insérer)"
                  value={ruleText}
                  onChange={(e) => setRuleText(e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">Exemples rapides:</span>
                  {exampleRules.map((example, idx) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-accent text-xs"
                      onClick={() => setRuleText(example)}
                    >
                      {example}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button 
                onClick={interpretRule} 
                disabled={isInterpreting || !ruleText.trim()}
                className="w-full"
                size="lg"
              >
                {isInterpreting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Interprétation avec IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Interpréter la Règle avec IA
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* AI Response Section - Full Width */}
        {generatedLogic && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                Réponse de l'IA - Logique Interprétée
              </CardTitle>
              <CardDescription>
                Vérifiez l'interprétation ci-dessous avant de sauvegarder la règle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Opération Identifiée</span>
                  </div>
                  
                  <div className="p-3 bg-background rounded-lg border space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge>{generatedLogic.operation}</Badge>
                      {generatedLogic.outputField && (
                        <span className="text-sm">
                          → Nouveau champ: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-primary">{generatedLogic.outputField}</code>
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{generatedLogic.description}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Logique Générée</span>
                  </div>
                  
                  <div className="p-3 bg-background rounded-lg border space-y-2">
                    {generatedLogic.formula && (
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <span className="text-xs text-muted-foreground">Formule:</span>
                          <p className="font-mono text-sm">{generatedLogic.formula}</p>
                        </div>
                      </div>
                    )}
                    
                    {generatedLogic.jsExpression && (
                      <div className="flex items-start gap-2">
                        <Code className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <span className="text-xs text-muted-foreground">Expression JS:</span>
                          <code className="block bg-muted px-2 py-1 rounded text-xs font-mono mt-1 break-all">
                            {generatedLogic.jsExpression}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {generatedLogic.validationMessage && (
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-700 dark:text-yellow-400">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{generatedLogic.validationMessage}</span>
                </div>
              )}

              <Separator />

              <Button 
                onClick={saveRule} 
                disabled={isSaving}
                className="w-full"
                size="lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sauvegarde en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirmer et Sauvegarder la Règle
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Liste des Règles Existantes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Règles Enregistrées
                </CardTitle>
                <CardDescription>
                  {rules.length} règle(s) enregistrée(s) • {rules.filter(r => r.is_active).length} active(s)
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadRules} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune règle enregistrée</p>
                <p className="text-sm">Créez votre première règle ci-dessus</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div 
                    key={rule.id} 
                    className={`p-4 border rounded-lg ${rule.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{rule.rule_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {ruleTypeLabels[rule.rule_type] || rule.rule_type}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            v{rule.version}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{rule.rule_text}</p>
                        {rule.generated_logic?.description && (
                          <p className="text-xs text-muted-foreground italic">
                            IA: {rule.generated_logic.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`active-${rule.id}`} className="text-sm">
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Label>
                          <Switch
                            id={`active-${rule.id}`}
                            checked={rule.is_active}
                            onCheckedChange={() => toggleRuleActive(rule)}
                          />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteRule(rule)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="order" className="mt-6">
            <PLBuilder />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default BusinessRules;
