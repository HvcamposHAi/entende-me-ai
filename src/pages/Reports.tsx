import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { useData } from "@/contexts/DataContext";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const Reports = () => {
  const { toast } = useToast();
  const { data, isDataLoaded } = useData();

  const createChartImage = async (
    type: 'bar' | 'pie' | 'line',
    labels: string[],
    datasets: any[],
    title: string
  ): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve('');
        return;
      }

      new ChartJS(ctx, {
        type,
        data: { labels, datasets },
        options: {
          responsive: false,
          plugins: {
            title: {
              display: true,
              text: title,
              font: { size: 16 },
            },
            legend: {
              display: true,
              position: 'bottom',
            },
          },
          scales: type !== 'pie' ? {
            y: {
              beginAtZero: true,
            },
          } : undefined,
        },
      });

      setTimeout(() => {
        resolve(canvas.toDataURL('image/png'));
      }, 500);
    });
  };

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

  const generatePDFReport = async (reportTitle: string) => {
    if (!isDataLoaded || data.length === 0) {
      toast({
        title: "Sem dados",
        description: "Por favor, carregue os dados primeiro na página Upload",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Gerando relatório",
      description: "Processando dados e criando gráficos...",
    });

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(18);
    doc.text(reportTitle, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 28, { align: 'center' });

    let tableData: any[] = [];
    let headers: string[] = [];
    let chartImage: string = '';
    let startY = 35;

    switch (reportTitle) {
      case "Relatório Mensal Completo": {
        const monthlyData = data.reduce((acc: any, row) => {
          const key = row.monthYear;
          if (!acc[key]) {
            acc[key] = { month: key, sales: 0, margin: 0 };
          }
          acc[key].sales += row.netSales;
          acc[key].margin += row.margin;
          return acc;
        }, {});

        const months = Object.values(monthlyData).slice(0, 12);
        chartImage = await createChartImage(
          'line',
          months.map((m: any) => m.month),
          [
            {
              label: 'Vendas',
              data: months.map((m: any) => m.sales),
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.5)',
            },
            {
              label: 'Margem',
              data: months.map((m: any) => m.margin),
              borderColor: 'rgb(34, 197, 94)',
              backgroundColor: 'rgba(34, 197, 94, 0.5)',
            },
          ],
          'Evolução Mensal - Vendas vs Margem'
        );

        headers = ['Loja', 'Produto', 'Vendas', 'COGS', 'Margem'];
        tableData = data.slice(0, 50).map(row => [
          row.nom,
          row.nameSalesReport.substring(0, 30),
          row.netSales.toFixed(2),
          row.cogs.toFixed(2),
          row.margin.toFixed(2),
        ]);
        break;
      }

      case "Análise por Loja": {
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

        const branches = Object.values(byBranch).slice(0, 10);
        chartImage = await createChartImage(
          'bar',
          branches.map((b: any) => b.Loja),
          [
            {
              label: 'Vendas',
              data: branches.map((b: any) => b.Vendas),
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
            },
            {
              label: 'Margem',
              data: branches.map((b: any) => b.Margem),
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
            },
          ],
          'Performance por Loja - Top 10'
        );

        headers = ['Loja', 'Vendas', 'COGS', 'Margem'];
        tableData = Object.values(byBranch).map((b: any) => [
          b.Loja,
          b.Vendas.toFixed(2),
          b.COGS.toFixed(2),
          b.Margem.toFixed(2),
        ]);
        break;
      }

      case "Despesas Detalhadas": {
        const expensesByCategory = data.reduce((acc: any, row) => {
          const key = row.macroFamilyName;
          if (!acc[key]) {
            acc[key] = 0;
          }
          acc[key] += row.cogs;
          return acc;
        }, {});

        const categories = Object.entries(expensesByCategory)
          .sort((a: any, b: any) => b[1] - a[1])
          .slice(0, 8);

        chartImage = await createChartImage(
          'pie',
          categories.map(([name]) => name),
          [{
            label: 'COGS',
            data: categories.map(([, value]) => value),
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(34, 197, 94, 0.8)',
              'rgba(251, 191, 36, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(168, 85, 247, 0.8)',
              'rgba(236, 72, 153, 0.8)',
              'rgba(20, 184, 166, 0.8)',
              'rgba(249, 115, 22, 0.8)',
            ],
          }],
          'Distribuição de Despesas por Categoria'
        );

        headers = ['Loja', 'Produto', 'COGS', 'Vendas', '% COGS'];
        tableData = data.slice(0, 50).map(row => [
          row.nom,
          row.nameSalesReport.substring(0, 30),
          row.cogs.toFixed(2),
          row.netSales.toFixed(2),
          row.netSales ? ((row.cogs / row.netSales) * 100).toFixed(1) + '%' : '0%',
        ]);
        break;
      }

      case "Análise EVA": {
        const evaByFamily = data.reduce((acc: any, row) => {
          const key = row.macroFamilyName;
          if (!acc[key]) {
            acc[key] = { family: key, sales: 0, margin: 0 };
          }
          acc[key].sales += row.netSales;
          acc[key].margin += row.margin;
          return acc;
        }, {});

        const families = Object.values(evaByFamily)
          .sort((a: any, b: any) => b.margin - a.margin)
          .slice(0, 10);

        chartImage = await createChartImage(
          'bar',
          families.map((f: any) => f.family.substring(0, 20)),
          [
            {
              label: 'Vendas',
              data: families.map((f: any) => f.sales),
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
            },
            {
              label: 'Margem',
              data: families.map((f: any) => f.margin),
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
            },
          ],
          'Top 10 Macro-Famílias - Vendas vs Margem'
        );

        headers = ['Macro-Família', 'Vendas', 'COGS', 'Margem', '% Margem'];
        tableData = families.map((f: any) => [
          f.family,
          f.sales.toFixed(2),
          (f.sales - f.margin).toFixed(2),
          f.margin.toFixed(2),
          f.sales ? ((f.margin / f.sales) * 100).toFixed(1) + '%' : '0%',
        ]);
        break;
      }

      case "Dashboard Executivo": {
        const summary = {
          VendasTotais: data.reduce((sum, row) => sum + row.netSales, 0),
          COGSTotais: data.reduce((sum, row) => sum + row.cogs, 0),
          MargemTotal: data.reduce((sum, row) => sum + row.margin, 0),
          NumeroLojas: new Set(data.map(row => row.nom)).size,
        };

        chartImage = await createChartImage(
          'bar',
          ['Vendas', 'COGS', 'Margem'],
          [{
            label: 'Valores Totais',
            data: [summary.VendasTotais, summary.COGSTotais, summary.MargemTotal],
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(34, 197, 94, 0.8)',
            ],
          }],
          'Resumo Executivo - Principais Indicadores'
        );

        headers = ['Métrica', 'Valor'];
        tableData = [
          ['Vendas Totais', summary.VendasTotais.toFixed(2)],
          ['COGS Totais', summary.COGSTotais.toFixed(2)],
          ['Margem Total', summary.MargemTotal.toFixed(2)],
          ['% Margem', ((summary.MargemTotal / summary.VendasTotais) * 100).toFixed(1) + '%'],
          ['Número de Lojas', summary.NumeroLojas.toString()],
        ];
        break;
      }

      default: {
        headers = ['Loja', 'Vendas', 'Margem'];
        tableData = data.slice(0, 50).map(row => [
          row.nom,
          row.netSales.toFixed(2),
          row.margin.toFixed(2),
        ]);
      }
    }

    if (chartImage) {
      doc.addImage(chartImage, 'PNG', 10, startY, pageWidth - 20, 90);
      startY += 100;
    }

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: startY,
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
