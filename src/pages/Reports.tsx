import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

const Reports = () => {
  const { toast } = useToast();

  const reports = [
    {
      title: "Relatório Mensal Completo",
      description: "P&L, fluxo de caixa e indicadores consolidados",
      period: "Março 2025",
    },
    {
      title: "Análise por Loja",
      description: "Performance individual de cada ponto de venda",
      period: "Q1 2025",
    },
    {
      title: "Despesas Detalhadas",
      description: "Breakdown completo de custos operacionais",
      period: "Março 2025",
    },
    {
      title: "Análise EVA",
      description: "Economic Value Added e retorno sobre capital",
      period: "Q1 2025",
    },
    {
      title: "Dashboard Executivo",
      description: "Visão geral para apresentação à diretoria",
      period: "Q1 2025",
    },
  ];

  const handleDownload = (reportTitle: string) => {
    toast({
      title: "Download iniciado",
      description: `${reportTitle} será baixado em breve`,
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>
          <p className="text-muted-foreground">
            Exporte e compartilhe análises financeiras
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {reports.map((report) => (
            <Card key={report.title}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <CardTitle className="text-base">{report.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {report.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Período: {report.period}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(report.title)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(report.title)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configurações de Relatório</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Frequência de Envio</h4>
              <p className="text-sm text-muted-foreground">
                Configure o envio automático de relatórios por email
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Semanal
                </Button>
                <Button variant="outline" size="sm">
                  Mensal
                </Button>
                <Button variant="outline" size="sm">
                  Trimestral
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Destinatários</h4>
              <p className="text-sm text-muted-foreground">
                Adicione emails para receber relatórios automaticamente
              </p>
              <Button variant="outline" size="sm">
                Gerenciar Destinatários
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Reports;
