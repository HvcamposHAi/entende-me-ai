import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
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
  Sparkles
} from "lucide-react";

interface PLField {
  id: string;
  field_key: string;
  field_label: string;
  display_order: number;
  is_visible: boolean;
  is_system_field: boolean;
  rule_id: string | null;
}

const PLFieldOrderManager = () => {
  const { toast } = useToast();
  const [fields, setFields] = useState<PLField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadFields = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pl_field_order')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFields(data || []);
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error loading fields:', error);
      toast({
        title: "Erro ao carregar campos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, []);

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newFields.length) return;

    // Swap positions
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    
    // Update display_order values
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

  const saveOrder = async () => {
    setIsSaving(true);
    try {
      // Update each field's order and visibility
      for (const field of fields) {
        const { error } = await supabase
          .from('pl_field_order')
          .update({ 
            display_order: field.display_order,
            is_visible: field.is_visible 
          })
          .eq('id', field.id);

        if (error) throw error;
      }

      toast({
        title: "Ordem salva",
        description: "A ordem dos campos do P&L foi atualizada",
      });
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error saving order:', error);
      toast({
        title: "Erro ao salvar ordem",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GripVertical className="h-5 w-5" />
              Ordenação de Campos do P&L
            </CardTitle>
            <CardDescription>
              Arraste ou use as setas para reordenar os campos exibidos no P&L
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadFields}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button 
              size="sm" 
              onClick={saveOrder}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Ordem
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                field.is_visible 
                  ? 'bg-background hover:bg-muted/50' 
                  : 'bg-muted/30 opacity-60'
              }`}
            >
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveField(index, 'up')}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveField(index, 'down')}
                  disabled={index === fields.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <GripVertical className="h-4 w-4" />
                <span className="text-sm font-mono w-6 text-center">{field.display_order}</span>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{field.field_label}</span>
                  {field.is_system_field ? (
                    <Badge variant="secondary" className="text-xs">Sistema</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      LLM
                    </Badge>
                  )}
                </div>
                <code className="text-xs text-muted-foreground">{field.field_key}</code>
              </div>

              <div className="flex items-center gap-2">
                {field.is_visible ? (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Switch
                  checked={field.is_visible}
                  onCheckedChange={() => toggleVisibility(index)}
                />
              </div>
            </div>
          ))}
        </div>

        {fields.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum campo configurado
          </div>
        )}

        {hasChanges && (
          <div className="mt-4 p-3 bg-primary/10 rounded-lg text-sm text-primary flex items-center justify-between">
            <span>Você tem alterações não salvas</span>
            <Button size="sm" onClick={saveOrder} disabled={isSaving}>
              Salvar Agora
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PLFieldOrderManager;
