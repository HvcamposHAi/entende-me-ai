import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { useData } from "@/contexts/DataContext";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = () => {
  const { toast } = useToast();
  const { data, isDataLoaded } = useData();

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

  const generateExcelReport = (reportTitle: string) => {
    if (!isDataLoaded || data.length === 0) {
      toast({
        title: "Sem dados",
        description: "Por favor, carregue os dados primeiro na página Upload",
        variant: "destructive",
      });
      return;
    }

    let reportData: any[] = [];
    let fileName = "";

    switch (reportTitle) {
      case "Relatório Mensal Completo":
        reportData = data.map(row => ({
          Ano: row.calendarYear,
          Mês: row.calendarMonth,
          Loja: row.nom,
          Categoria: row.clientMacroCategory,
          MacroFamília: row.macroFamilyName,
          Família: row.familyName,
          Produto: row.nameSalesReport,
          Código: row.frItemCode,
          Quantidade: row.quantitySoldTotal,
          VendasLíquidas: row.netSales,
          COGS: row.cogs,
          Margem: row.margin,
          VolumeKg: row.volumeKg,
        }));
        fileName = "Relatorio_Mensal_Completo.xlsx";
        break;

      case "Análise por Loja":
        const byBranch = data.reduce((acc: any, row) => {
          const key = row.nom;
          if (!acc[key]) {
            acc[key] = {
              Loja: row.nom,
              VendasTotais: 0,
              COGSTotais: 0,
              MargemTotal: 0,
              QuantidadeTotal: 0,
            };
          }
          acc[key].VendasTotais += row.netSales;
          acc[key].COGSTotais += row.cogs;
          acc[key].MargemTotal += row.margin;
          acc[key].QuantidadeTotal += row.quantitySoldTotal;
          return acc;
        }, {});
        reportData = Object.values(byBranch);
        fileName = "Analise_por_Loja.xlsx";
        break;

      case "Despesas Detalhadas":
        reportData = data.map(row => ({
          Loja: row.nom,
          Produto: row.nameSalesReport,
          COGS: row.cogs,
          VendasLíquidas: row.netSales,
          PercentualCOGS: row.netSales ? ((row.cogs / row.netSales) * 100).toFixed(2) : 0,
        }));
        fileName = "Despesas_Detalhadas.xlsx";
        break;

      case "Análise EVA":
        reportData = data.map(row => ({
          Loja: row.nom,
          MacroFamília: row.macroFamilyName,
          VendasLíquidas: row.netSales,
          COGS: row.cogs,
          Margem: row.margin,
          MargemPercentual: row.netSales ? ((row.margin / row.netSales) * 100).toFixed(2) : 0,
        }));
        fileName = "Analise_EVA.xlsx";
        break;

      case "Dashboard Executivo":
        const summary = {
          VendasTotais: data.reduce((sum, row) => sum + row.netSales, 0),
          COGSTotais: data.reduce((sum, row) => sum + row.cogs, 0),
          MargemTotal: data.reduce((sum, row) => sum + row.margin, 0),
          QuantidadeTotal: data.reduce((sum, row) => sum + row.quantitySoldTotal, 0),
          NumeroLojas: new Set(data.map(row => row.nom)).size,
        };
        reportData = [summary];
        fileName = "Dashboard_Executivo.xlsx";
        break;

      default:
        reportData = data;
        fileName = "Relatorio.xlsx";
    }

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Download concluído",
      description: `${reportTitle} foi baixado com sucesso`,
    });
  };

  const generatePDFReport = (reportTitle: string) => {
    if (!isDataLoaded || data.length === 0) {
      toast({
        title: "Sem dados",
        description: "Por favor, carregue os dados primeiro na página Upload",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(18);
    doc.text(reportTitle, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 28, { align: 'center' });

    let tableData: any[] = [];
    let headers: string[] = [];

    switch (reportTitle) {
      case "Relatório Mensal Completo":
        headers = ['Loja', 'Produto', 'Vendas', 'COGS', 'Margem'];
        tableData = data.slice(0, 50).map(row => [
          row.nom,
          row.nameSalesReport.substring(0, 30),
          row.netSales.toFixed(2),
          row.cogs.toFixed(2),
          row.margin.toFixed(2),
        ]);
        break;

      case "Análise por Loja":
        const byBranch = data.reduce((acc: any, row) => {
          const key = row.nom;
          if (!acc[key]) {
            acc[key] = { Loja: row.nom, Vendas: 0, COGS: 0, Margem: 0 };
          }
          acc[key].Vendas += row.netSales;
          acc[key].COGS += row.cogs;
          acc[key].Margem += row.margin;
          return acc;
        }, {});
        headers = ['Loja', 'Vendas', 'COGS', 'Margem'];
        tableData = Object.values(byBranch).map((b: any) => [
          b.Loja,
          b.Vendas.toFixed(2),
          b.COGS.toFixed(2),
          b.Margem.toFixed(2),
        ]);
        break;

      case "Dashboard Executivo":
        const summary = {
          VendasTotais: data.reduce((sum, row) => sum + row.netSales, 0),
          COGSTotais: data.reduce((sum, row) => sum + row.cogs, 0),
          MargemTotal: data.reduce((sum, row) => sum + row.margin, 0),
          NumeroLojas: new Set(data.map(row => row.nom)).size,
        };
        headers = ['Métrica', 'Valor'];
        tableData = [
          ['Vendas Totais', summary.VendasTotais.toFixed(2)],
          ['COGS Totais', summary.COGSTotais.toFixed(2)],
          ['Margem Total', summary.MargemTotal.toFixed(2)],
          ['Número de Lojas', summary.NumeroLojas.toString()],
        ];
        break;

      default:
        headers = ['Loja', 'Vendas', 'Margem'];
        tableData = data.slice(0, 50).map(row => [
          row.nom,
          row.netSales.toFixed(2),
          row.margin.toFixed(2),
        ]);
    }

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`${reportTitle.replace(/\s+/g, '_')}.pdf`);

    toast({
      title: "Download concluído",
      description: `${reportTitle} PDF foi baixado com sucesso`,
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
                    onClick={() => generatePDFReport(report.title)}
                    disabled={!isDataLoaded}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => generateExcelReport(report.title)}
                    disabled={!isDataLoaded}
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
