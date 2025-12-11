import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, AlertTriangle, TrendingUp, FileDown, CheckCircle2, XCircle, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface AIAnalysisPanelProps {
  data: any[];
  context: string;
  title?: string;
  filters?: {
    store?: string;
    product?: string;
    year?: number;
  };
}

interface AnalysisResult {
  deviations: Array<{
    type: 'positive' | 'negative';
    metric: string;
    value: string;
    description: string;
  }>;
  alerts: Array<{
    level: 'high' | 'medium' | 'low';
    title: string;
    description: string;
  }>;
  actionPlan: Array<{
    priority: 'immediate' | 'short_term' | 'medium_term';
    action: string;
    expectedResult: string;
  }>;
  summary: string;
}

const AIAnalysisPanel = ({ data, context, title = "Analyse IA", filters }: AIAnalysisPanelProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [rawInsights, setRawInsights] = useState<string>("");

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('ai-insights', {
        body: {
          data: data.slice(0, 100),
          context,
          filters,
          analysisType: 'dashboard'
        }
      });

      if (error) throw error;

      if (result?.error) {
        toast({
          title: "Erreur",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setRawInsights(result.insights);
      
      // Parse structured analysis if available
      if (result.structuredAnalysis) {
        setAnalysis(result.structuredAnalysis);
      }

      toast({
        title: "Analyse Terminée",
        description: "Écarts, alertes et plan d'action générés avec succès",
      });
    } catch (error) {
      console.error('Error getting AI analysis:', error);
      toast({
        title: "Erreur",
        description: "Échec de l'obtention de l'analyse IA",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportActionPlan = () => {
    const content = rawInsights || "Aucune analyse disponible";
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan_action_${context}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Exporté",
      description: "Plan d'action exporté avec succès",
    });
  };

  const sendViaOutlook = () => {
    const content = rawInsights || "Aucune analyse disponible";
    const subject = encodeURIComponent(`${title} - ${new Date().toLocaleDateString('fr-FR')}`);
    const body = encodeURIComponent(content);
    
    // Create mailto link - opens Outlook or default email client
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    window.open(mailtoLink, '_blank');
    
    toast({
      title: "Outlook Ouvert",
      description: "Votre client email a été ouvert avec l'analyse",
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-amber-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'immediate': return 'Cette Semaine';
      case 'short_term': return 'Prochains 30 jours';
      case 'medium_term': return '60-90 jours';
      default: return priority;
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <CardTitle>{title}</CardTitle>
          </div>
          <div className="flex gap-2">
            {rawInsights && (
              <>
                <Button variant="outline" size="sm" onClick={sendViaOutlook}>
                  <Mail className="w-4 h-4 mr-2" />
                  Envoyer par Email
                </Button>
                <Button variant="outline" size="sm" onClick={exportActionPlan}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Exporter
                </Button>
              </>
            )}
            <Button onClick={runAnalysis} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Générer l'Analyse
                </>
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          Détection automatique des écarts, alertes de risque et plan d'action structuré
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!rawInsights && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Cliquez sur "Générer l'Analyse" pour obtenir des insights automatiques</p>
          </div>
        )}

        {rawInsights && (
          <div className="space-y-6">
            {/* Deviations Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">Écarts Détectés</h4>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {analysis?.deviations?.map((dev, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                    {dev.type === 'positive' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{dev.metric}: {dev.value}</p>
                      <p className="text-xs text-muted-foreground">{dev.description}</p>
                    </div>
                  </div>
                )) || (
                  <p className="text-sm text-muted-foreground col-span-2">
                    Analyse des écarts incluse dans le rapport ci-dessous.
                  </p>
                )}
              </div>
            </div>

            {/* Risk Alerts Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h4 className="font-semibold text-sm">Alertes de Risque</h4>
              </div>
              {analysis?.alerts?.length ? (
                <div className="space-y-2">
                  {analysis.alerts.map((alert, idx) => (
                    <Alert key={idx} variant={alert.level === 'high' ? 'destructive' : 'default'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="flex items-center gap-2">
                        {alert.title}
                        <Badge className={getLevelColor(alert.level)}>
                          {alert.level === 'high' ? 'Élevé' : alert.level === 'medium' ? 'Moyen' : 'Faible'}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription>{alert.description}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Alertes de risque incluses dans le rapport ci-dessous.
                </p>
              )}
            </div>

            {/* Action Plan Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <h4 className="font-semibold text-sm">Plan d'Action</h4>
              </div>
              {analysis?.actionPlan?.length ? (
                <div className="space-y-2">
                  {analysis.actionPlan.map((action, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{getPriorityLabel(action.priority)}</Badge>
                      </div>
                      <p className="font-medium text-sm">{action.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Résultat attendu : {action.expectedResult}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Plan d'action inclus dans le rapport ci-dessous.
                </p>
              )}
            </div>

            {/* Raw Insights (Markdown) */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-sm mb-3">Rapport Complet</h4>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {rawInsights}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIAnalysisPanel;
