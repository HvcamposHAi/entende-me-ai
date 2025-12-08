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
  Info
} from "lucide-react";
import { useTracking } from "@/hooks/useTracking";

// Available fields from Layer 1 (Excel import)
const AVAILABLE_FIELDS = [
  { name: "calendarYear", type: "number", description: "Ano (ex: 2024, 2025)" },
  { name: "calendarMonth", type: "text", description: "Mês do calendário" },
  { name: "month", type: "text", description: "Nome do mês abreviado (ex: Jan, Feb)" },
  { name: "yearMonth", type: "text", description: "Ano-Mês formatado" },
  { name: "monthYear", type: "text", description: "Mês/Ano formatado" },
  { name: "nom", type: "text", description: "Nome da loja/filial" },
  { name: "clientMacroCategory", type: "text", description: "Macro categoria do cliente" },
  { name: "macroFamilyName", type: "text", description: "Família macro do produto (ex: Barras, Trufas)" },
  { name: "familyName", type: "text", description: "Família do produto" },
  { name: "nameSalesReport", type: "text", description: "Nome para relatório de vendas" },
  { name: "frItemCode", type: "text", description: "Código do item" },
  { name: "pl", type: "text", description: "Linha do P&L / Classificação contábil" },
  { name: "quantitySoldTotal", type: "number", description: "Quantidade vendida total (unidades)" },
  { name: "netSales", type: "number", description: "Receita líquida (R$)" },
  { name: "cogs", type: "number", description: "Custo dos produtos vendidos - COGS (R$)" },
  { name: "margin", type: "number", description: "Margem bruta (R$)" },
  { name: "volumeKg", type: "number", description: "Volume em quilogramas (Kg)" },
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
  
  // Form state
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [ruleText, setRuleText] = useState("");
  const [ruleType, setRuleType] = useState<string>("calculation");
  const [generatedLogic, setGeneratedLogic] = useState<GeneratedLogic | null>(null);

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
        title: "Erro ao carregar regras",
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
        title: "Regra vazia",
        description: "Digite uma regra em linguagem natural",
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
          title: "Erro ao interpretar regra",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setGeneratedLogic(data.generatedLogic);
      toast({
        title: "Regra interpretada",
        description: "A lógica foi gerada com sucesso. Revise antes de salvar.",
      });
    } catch (error: any) {
      console.error('Error interpreting rule:', error);
      toast({
        title: "Erro ao interpretar regra",
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
        title: "Dados incompletos",
        description: "Preencha o nome, regra e interprete antes de salvar",
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

      const { data, error } = await supabase
        .from('business_rules')
        .insert([insertData])
        .select()
        .maybeSingle();

      if (error) throw error;

      toast({
        title: "Regra salva",
        description: `"${ruleName}" foi criada com sucesso`,
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
        title: "Erro ao salvar regra",
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
        title: rule.is_active ? "Regra desativada" : "Regra ativada",
        description: `"${rule.rule_name}" foi ${rule.is_active ? 'desativada' : 'ativada'}`,
      });

      loadRules();
    } catch (error: any) {
      console.error('Error toggling rule:', error);
      toast({
        title: "Erro ao atualizar regra",
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
        title: "Regra excluída",
        description: `"${rule.rule_name}" foi removida`,
      });

      loadRules();
    } catch (error: any) {
      console.error('Error deleting rule:', error);
      toast({
        title: "Erro ao excluir regra",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const ruleTypeLabels: Record<string, string> = {
    calculation: "Cálculo",
    classification: "Classificação",
    filter: "Filtro",
    aggregation: "Agregação",
  };

  const exampleRules = [
    "Margem bruta = Receita Líquida - COGS",
    "Classifique lojas com margem > 40% como 'Premium'",
    "Custo por Kg = COGS / volumeKg",
    "EBITDA = Margem - ST-PERSONAL - ST-OPEX",
    "Ticket médio = netSales / quantitySoldTotal",
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Regras de Negócio</h2>
          <p className="text-muted-foreground">
            Defina regras em linguagem natural que o LLM interpretará e aplicará aos dados
          </p>
        </div>

        {/* Available Fields Reference */}
        <Collapsible>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Campos Disponíveis da Base de Dados
                  </div>
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </CardTitle>
                <CardDescription className="text-left">
                  Referência dos campos que podem ser usados nas regras
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {AVAILABLE_FIELDS.map((field) => (
                    <div 
                      key={field.name}
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        navigator.clipboard.writeText(field.name);
                        toast({
                          title: "Campo copiado",
                          description: `"${field.name}" copiado para a área de transferência`,
                        });
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          {field.name}
                        </code>
                        <Badge variant="outline" className="text-xs">
                          {field.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-muted rounded-lg flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Clique em qualquer campo para copiar o nome. Use esses campos nas suas regras em linguagem natural.
                    Exemplo: "Ticket médio = netSales / quantitySoldTotal"
                  </p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Create New Rule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nova Regra de Negócio
            </CardTitle>
            <CardDescription>
              Descreva a regra em linguagem natural e o sistema irá gerar a lógica automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ruleName">Nome da Regra</Label>
                <Input
                  id="ruleName"
                  placeholder="Ex: Cálculo de EBITDA"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ruleType">Tipo de Regra</Label>
                <Select value={ruleType} onValueChange={setRuleType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calculation">Cálculo</SelectItem>
                    <SelectItem value="classification">Classificação</SelectItem>
                    <SelectItem value="filter">Filtro</SelectItem>
                    <SelectItem value="aggregation">Agregação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ruleDescription">Descrição (opcional)</Label>
              <Input
                id="ruleDescription"
                placeholder="Breve descrição do objetivo da regra"
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ruleText">Regra em Linguagem Natural</Label>
              <Textarea
                id="ruleText"
                placeholder="Ex: EBITDA deve ser calculado como Margem menos ST-PERSONAL menos ST-OPEX"
                value={ruleText}
                onChange={(e) => setRuleText(e.target.value)}
                rows={3}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs text-muted-foreground">Exemplos:</span>
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

            <div className="flex gap-2">
              <Button 
                onClick={interpretRule} 
                disabled={isInterpreting || !ruleText.trim()}
                className="flex-1"
              >
                {isInterpreting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Interpretando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Interpretar com IA
                  </>
                )}
              </Button>
            </div>

            {/* Generated Logic Preview */}
            {generatedLogic && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Lógica Gerada</span>
                </div>
                
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{generatedLogic.operation}</Badge>
                    {generatedLogic.outputField && (
                      <span>→ <code className="bg-background px-1 rounded">{generatedLogic.outputField}</code></span>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground">{generatedLogic.description}</p>
                  
                  {generatedLogic.formula && (
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5" />
                      <span><strong>Fórmula:</strong> {generatedLogic.formula}</span>
                    </div>
                  )}
                  
                  {generatedLogic.jsExpression && (
                    <div className="flex items-start gap-2">
                      <Code className="h-4 w-4 mt-0.5" />
                      <code className="bg-background px-2 py-1 rounded text-xs break-all">
                        {generatedLogic.jsExpression}
                      </code>
                    </div>
                  )}
                  
                  {generatedLogic.validationMessage && (
                    <div className="flex items-center gap-2 text-yellow-600">
                      <XCircle className="h-4 w-4" />
                      <span>{generatedLogic.validationMessage}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <Button 
                  onClick={saveRule} 
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Salvar Regra
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing Rules List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Regras Cadastradas
                </CardTitle>
                <CardDescription>
                  {rules.length} regra(s) cadastrada(s) • {rules.filter(r => r.is_active).length} ativa(s)
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadRules} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
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
                <p>Nenhuma regra cadastrada ainda</p>
                <p className="text-sm">Crie sua primeira regra acima</p>
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
                            {rule.is_active ? 'Ativa' : 'Inativa'}
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
      </div>
    </Layout>
  );
};

export default BusinessRules;
