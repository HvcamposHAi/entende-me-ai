import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/contexts/DataContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  GripVertical, 
  Loader2, 
  Save, 
  RefreshCw,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Plus,
  Trash2,
  Settings2,
  LayoutTemplate,
  ArrowUpDown
} from "lucide-react";

interface PLField {
  id: string;
  field_key: string;
  field_label: string;
  display_order: number;
  is_visible: boolean;
  is_system_field: boolean;
  rule_id: string | null;
  field_style: string;
  is_calculated: boolean;
  calculation_formula: string | null;
  indent_level: number;
  show_rpu: boolean;
  show_percent_of_revenue: boolean;
}

interface BusinessRule {
  id: string;
  rule_name: string;
  generated_logic: any;
  is_active: boolean;
}

const STYLE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'header', label: 'Destaque (Negrito)' },
  { value: 'subitem', label: 'Sub-item' },
  { value: 'total', label: 'Total' },
  { value: 'subtotal', label: 'Subtotal' },
];

const PLBuilder = () => {
  const { toast } = useToast();
  const { data: appData, isDataLoaded } = useData();
  const [fields, setFields] = useState<PLField[]>([]);
  const [availableRules, setAvailableRules] = useState<BusinessRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingField, setEditingField] = useState<PLField | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldKey, setNewFieldKey] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fieldsRes, rulesRes] = await Promise.all([
        supabase
          .from('pl_field_order')
          .select('*')
          .order('display_order', { ascending: true }),
        supabase
          .from('business_rules')
          .select('id, rule_name, generated_logic, is_active')
          .eq('is_active', true)
      ]);

      if (fieldsRes.error) throw fieldsRes.error;
      if (rulesRes.error) throw rulesRes.error;

      setFields(fieldsRes.data || []);
      setAvailableRules(rulesRes.data || []);
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newFields.length) return;

    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    
    newFields.forEach((field, idx) => {
      field.display_order = idx + 1;
    });

    setFields(newFields);
    setHasChanges(true);
  };

  const toggleVisibility = (index: number) => {
    const newFields = [...fields];
    newFields[index].is_visible = !newFields[index].is_visible;
    setFields(newFields);
    setHasChanges(true);
  };

  const updateFieldStyle = (index: number, style: string) => {
    const newFields = [...fields];
    newFields[index].field_style = style;
    setFields(newFields);
    setHasChanges(true);
  };

  const updateFieldIndent = (index: number, indent: number) => {
    const newFields = [...fields];
    newFields[index].indent_level = Math.max(0, Math.min(3, indent));
    setFields(newFields);
    setHasChanges(true);
  };

  const toggleRpu = (index: number) => {
    const newFields = [...fields];
    newFields[index].show_rpu = !newFields[index].show_rpu;
    setFields(newFields);
    setHasChanges(true);
  };

  const togglePercentOfRevenue = (index: number) => {
    const newFields = [...fields];
    newFields[index].show_percent_of_revenue = !newFields[index].show_percent_of_revenue;
    setFields(newFields);
    setHasChanges(true);
  };

  const addCustomField = async () => {
    if (!newFieldLabel.trim() || !newFieldKey.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e a chave do campo",
        variant: "destructive",
      });
      return;
    }

    try {
      const maxOrder = fields.length > 0 ? Math.max(...fields.map(f => f.display_order)) : 0;
      
      const { data, error } = await supabase
        .from('pl_field_order')
        .insert({
          field_key: newFieldKey.toLowerCase().replace(/\s+/g, '_'),
          field_label: newFieldLabel,
          display_order: maxOrder + 1,
          is_visible: true,
          is_system_field: false,
          field_style: 'normal',
          indent_level: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setFields([...fields, data]);
      setNewFieldLabel("");
      setNewFieldKey("");
      
      toast({
        title: "Campo adicionado",
        description: `"${newFieldLabel}" foi adicionado ao P&L`,
      });
    } catch (error: any) {
      console.error('Error adding field:', error);
      toast({
        title: "Erro ao adicionar campo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteField = async (field: PLField) => {
    if (field.is_system_field) {
      toast({
        title: "Não permitido",
        description: "Campos do sistema não podem ser excluídos",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('pl_field_order')
        .delete()
        .eq('id', field.id);

      if (error) throw error;

      setFields(fields.filter(f => f.id !== field.id));
      
      toast({
        title: "Campo removido",
        description: `"${field.field_label}" foi removido`,
      });
    } catch (error: any) {
      console.error('Error deleting field:', error);
      toast({
        title: "Erro ao remover campo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const saveAllChanges = async () => {
    setIsSaving(true);
    try {
      for (const field of fields) {
        const { error } = await supabase
          .from('pl_field_order')
          .update({ 
            display_order: field.display_order,
            is_visible: field.is_visible,
            field_style: field.field_style,
            indent_level: field.indent_level,
            show_rpu: field.show_rpu,
            show_percent_of_revenue: field.show_percent_of_revenue,
          })
          .eq('id', field.id);

        if (error) throw error;
      }

      toast({
        title: "Alterações salvas",
        description: "A estrutura do P&L foi atualizada",
      });
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error saving:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Preview calculation with real data
  const previewData = useMemo(() => {
    if (!isDataLoaded || fields.length === 0) return [];

    const currentYear = 2025;
    const previousYear = 2024;

    const sumByYear = (year: number, fieldName: string) => {
      return appData
        .filter(row => row.calendarYear === year)
        .reduce((sum, row) => {
          const value = (row as any)[fieldName];
          return sum + (Number(value) || 0);
        }, 0);
    };

    const getValue = (fieldKey: string, year: number) => {
      switch (fieldKey) {
        case 'volumeOriginal':
          return sumByYear(year, 'quantitySoldTotal');
        case 'volumeKg':
          return sumByYear(year, 'volumeKg');
        case 'revenue':
          return sumByYear(year, 'netSales');
        case 'cogs':
          return sumByYear(year, 'cogs');
        case 'margin':
          return sumByYear(year, 'margin');
        case 'stPersonal':
          return appData.filter(r => r.calendarYear === year && r.pl === 'ST-PERSONAL').reduce((s, r) => s + r.netSales, 0);
        case 'stOpex':
          return appData.filter(r => r.calendarYear === year && r.pl === 'ST-OPEX').reduce((s, r) => s + r.netSales, 0);
        case 'commercialMargin':
          const margin = sumByYear(year, 'margin');
          const stPersonal = appData.filter(r => r.calendarYear === year && r.pl === 'ST-PERSONAL').reduce((s, r) => s + r.netSales, 0);
          const stOpex = appData.filter(r => r.calendarYear === year && r.pl === 'ST-OPEX').reduce((s, r) => s + r.netSales, 0);
          return margin - stPersonal - stOpex;
        default:
          return 0;
      }
    };

    return fields.filter(f => f.is_visible).map(field => {
      const current = getValue(field.field_key, currentYear);
      const previous = getValue(field.field_key, previousYear);
      const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0;

      return {
        ...field,
        current,
        previous,
        change,
      };
    });
  }, [fields, appData, isDataLoaded]);

  const formatNumber = (num: number) => {
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left Panel - Field Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5" />
                Construtor de P&L
              </CardTitle>
              <CardDescription>
                Configure a estrutura e ordem dos campos do seu P&L
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadData}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                onClick={saveAllChanges}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="ml-2">Salvar</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Field */}
          <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Plus className="h-4 w-4" />
              Adicionar Campo Personalizado
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Nome do campo"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
              />
              <Input
                placeholder="Chave (ex: ebitda)"
                value={newFieldKey}
                onChange={(e) => setNewFieldKey(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={addCustomField} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar ao P&L
            </Button>
          </div>

          <Separator />

          {/* Field List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className={`p-3 rounded-lg border transition-colors ${
                  field.is_visible 
                    ? 'bg-background' 
                    : 'bg-muted/30 opacity-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {/* Move Buttons */}
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => moveField(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => moveField(index, 'down')}
                      disabled={index === fields.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <GripVertical className="h-4 w-4 text-muted-foreground" />

                  {/* Field Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span 
                        className="font-medium truncate"
                        style={{ paddingLeft: `${field.indent_level * 12}px` }}
                      >
                        {field.field_label}
                      </span>
                      {field.is_system_field ? (
                        <Badge variant="secondary" className="text-[10px] shrink-0">Sistema</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          <Sparkles className="h-2 w-2 mr-1" />
                          Custom
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Style Select */}
                  <Select 
                    value={field.field_style} 
                    onValueChange={(v) => updateFieldStyle(index, v)}
                  >
                    <SelectTrigger className="w-28 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Visibility Toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => toggleVisibility(index)}
                  >
                    {field.is_visible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>

                  {/* Delete Button (only for non-system fields) */}
                  {!field.is_system_field && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteField(field)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Additional Options */}
                <div className="flex items-center gap-4 mt-2 pl-10 text-xs text-muted-foreground">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Switch
                      checked={field.show_rpu}
                      onCheckedChange={() => toggleRpu(index)}
                      className="scale-75"
                    />
                    <span>RPU</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Switch
                      checked={field.show_percent_of_revenue}
                      onCheckedChange={() => togglePercentOfRevenue(index)}
                      className="scale-75"
                    />
                    <span>% of REV</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <span>Indent:</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => updateFieldIndent(index, field.indent_level - 1)}
                    >
                      -
                    </Button>
                    <span className="w-4 text-center">{field.indent_level}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => updateFieldIndent(index, field.indent_level + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasChanges && (
            <div className="p-3 bg-primary/10 rounded-lg text-sm text-primary flex items-center justify-between">
              <span>Alterações não salvas</span>
              <Button size="sm" onClick={saveAllChanges} disabled={isSaving}>
                Salvar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right Panel - Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview do P&L
          </CardTitle>
          <CardDescription>
            Visualização em tempo real da estrutura configurada
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isDataLoaded ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregue os dados na página Upload para visualizar o preview
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">P&L</TableHead>
                    <TableHead className="text-right font-bold">ACT 2025</TableHead>
                    <TableHead className="text-right font-bold">ACT 2024</TableHead>
                    <TableHead className="text-right font-bold">% vs LY</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row) => (
                    <TableRow 
                      key={row.id}
                      className={
                        row.field_style === 'header' || row.field_style === 'total' 
                          ? 'bg-primary/5 font-bold' 
                          : row.field_style === 'subtotal'
                          ? 'bg-muted/50 font-semibold'
                          : row.field_style === 'subitem'
                          ? 'text-muted-foreground text-sm'
                          : ''
                      }
                    >
                      <TableCell 
                        className={row.field_style === 'header' ? 'font-bold' : ''}
                        style={{ paddingLeft: `${16 + row.indent_level * 16}px` }}
                      >
                        {row.field_label}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(row.current)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(row.previous)}
                      </TableCell>
                      <TableCell className={`text-right ${row.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {row.change > 0 ? '+' : ''}{row.change.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Available Business Rules */}
          {availableRules.length > 0 && (
            <div className="mt-4 p-3 border rounded-lg">
              <Label className="text-sm font-medium mb-2 block">
                Regras de Negócio Disponíveis
              </Label>
              <div className="space-y-1">
                {availableRules.map(rule => (
                  <div key={rule.id} className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span>{rule.rule_name}</span>
                    {rule.generated_logic?.outputField && (
                      <Badge variant="outline" className="text-xs">
                        → {rule.generated_logic.outputField}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PLBuilder;