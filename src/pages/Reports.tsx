import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Database, BarChart3, Building2, Calculator, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { useData } from "@/contexts/DataContext";
import { useTracking } from "@/hooks/useTracking";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
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
  useTracking();
  const { toast } = useToast();
  const { data, isDataLoaded } = useData();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("2025");
  const [selectedStore, setSelectedStore] = useState<string>("all");

  // Get unique values for filters
  const filterOptions = useMemo(() => {
    if (!isDataLoaded) return { months: [], years: [], stores: [] };
    
    const months = [...new Set(data.map(r => r.month))].filter(Boolean);
    const years = [...new Set(data.map(r => r.calendarYear))].filter(Boolean).map(String);
    const stores = [...new Set(data.map(r => r.nom))].filter(Boolean);
    
    return { months, years, stores };
  }, [data, isDataLoaded]);

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

  // ============ POWER BI EXPORT ============
  const generatePowerBIExport = () => {
    if (!isDataLoaded || data.length === 0) {
      toast({
        title: "Sem dados",
        description: "Por favor, carregue os dados primeiro na página Upload",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Fact Table (transactional data)
      const factData = data.map(row => ({
        Date: `${row.calendarYear}-${row.month}-01`,
        Year: row.calendarYear,
        Month: row.month,
        YearMonth: row.yearMonth,
        StoreID: row.nom,
        ProductCode: row.frItemCode,
        ProductName: row.nameSalesReport,
        MacroFamily: row.macroFamilyName,
        Family: row.familyName,
        Category: row.clientMacroCategory,
        QuantitySold: row.quantitySoldTotal,
        NetSales: row.netSales,
        COGS: row.cogs,
        GrossMargin: row.margin,
        VolumeKg: row.volumeKg,
        MarginPercent: row.netSales ? (row.margin / row.netSales) * 100 : 0,
      }));
      const wsFact = XLSX.utils.json_to_sheet(factData);
      XLSX.utils.book_append_sheet(wb, wsFact, "FactSales");

      // Sheet 2: Dim Stores
      const stores = [...new Set(data.map(r => r.nom))].filter(Boolean);
      const dimStores = stores.map((store, idx) => ({
        StoreID: store,
        StoreName: store,
        StoreIndex: idx + 1,
      }));
      const wsStores = XLSX.utils.json_to_sheet(dimStores);
      XLSX.utils.book_append_sheet(wb, wsStores, "DimStores");

      // Sheet 3: Dim Products
      const productMap = new Map();
      data.forEach(row => {
        if (!productMap.has(row.frItemCode)) {
          productMap.set(row.frItemCode, {
            ProductCode: row.frItemCode,
            ProductName: row.nameSalesReport,
            MacroFamily: row.macroFamilyName,
            Family: row.familyName,
            Category: row.clientMacroCategory,
          });
        }
      });
      const dimProducts = Array.from(productMap.values());
      const wsProducts = XLSX.utils.json_to_sheet(dimProducts);
      XLSX.utils.book_append_sheet(wb, wsProducts, "DimProducts");

      // Sheet 4: Dim Calendar
      const dateSet = new Set<string>();
      data.forEach(row => {
        dateSet.add(`${row.calendarYear}-${row.month}`);
      });
      const dimCalendar = Array.from(dateSet).map(d => {
        const [year, month] = d.split('-');
        return {
          DateKey: `${year}-${month}-01`,
          Year: parseInt(year),
          Month: month,
          MonthNumber: new Date(`${month} 1, 2000`).getMonth() + 1,
          Quarter: `Q${Math.ceil((new Date(`${month} 1, 2000`).getMonth() + 1) / 3)}`,
          YearMonth: `${year}-${month}`,
        };
      });
      const wsCalendar = XLSX.utils.json_to_sheet(dimCalendar);
      XLSX.utils.book_append_sheet(wb, wsCalendar, "DimCalendar");

      // Sheet 5: Summary KPIs
      const kpis = [
        { KPI: "Total Net Sales", Value: data.reduce((s, r) => s + r.netSales, 0) },
        { KPI: "Total COGS", Value: data.reduce((s, r) => s + r.cogs, 0) },
        { KPI: "Total Gross Margin", Value: data.reduce((s, r) => s + r.margin, 0) },
        { KPI: "Total Volume (Kg)", Value: data.reduce((s, r) => s + r.volumeKg, 0) },
        { KPI: "Total Quantity Sold", Value: data.reduce((s, r) => s + r.quantitySoldTotal, 0) },
        { KPI: "Number of Stores", Value: stores.length },
        { KPI: "Number of Products", Value: productMap.size },
        { KPI: "Average Margin %", Value: (data.reduce((s, r) => s + r.margin, 0) / data.reduce((s, r) => s + r.netSales, 0)) * 100 },
      ];
      const wsKPIs = XLSX.utils.json_to_sheet(kpis);
      XLSX.utils.book_append_sheet(wb, wsKPIs, "KPIs");

      XLSX.writeFile(wb, "Dataset_PowerBI.xlsx");

      toast({
        title: "Export Power BI concluído",
        description: "Arquivo com tabelas estruturadas (Fact + Dims) pronto para importar no Power BI",
      });
    } catch (error) {
      console.error("Error generating Power BI export:", error);
      toast({
        title: "Erro ao gerar export",
        description: "Ocorreu um erro ao gerar o arquivo",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // ============ ACCOUNTING REPORT ============
  const generateAccountingReport = async (format: 'pdf' | 'excel') => {
    if (!isDataLoaded || data.length === 0) {
      toast({
        title: "Sem dados",
        description: "Por favor, carregue os dados primeiro na página Upload",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Filter data based on selections
      let filteredData = data;
      if (selectedYear !== "all") {
        filteredData = filteredData.filter(r => String(r.calendarYear) === selectedYear);
      }
      if (selectedMonth !== "all") {
        filteredData = filteredData.filter(r => r.month === selectedMonth);
      }
      if (selectedStore !== "all") {
        filteredData = filteredData.filter(r => r.nom === selectedStore);
      }

      // Consolidation by Store
      const byStore: Record<string, any> = {};
      filteredData.forEach(row => {
        const key = row.nom || "Não Identificado";
        if (!byStore[key]) {
          byStore[key] = {
            store: key,
            grossRevenue: 0,
            netSales: 0,
            cogs: 0,
            grossMargin: 0,
            volumeKg: 0,
            quantity: 0,
          };
        }
        byStore[key].netSales += row.netSales || 0;
        byStore[key].grossRevenue += (row.netSales || 0) * 1.15; // Assuming 15% deductions
        byStore[key].cogs += row.cogs || 0;
        byStore[key].grossMargin += row.margin || 0;
        byStore[key].volumeKg += row.volumeKg || 0;
        byStore[key].quantity += row.quantitySoldTotal || 0;
      });

      // Consolidation by Category
      const byCategory: Record<string, any> = {};
      filteredData.forEach(row => {
        const key = row.macroFamilyName || "Não Identificado";
        if (!byCategory[key]) {
          byCategory[key] = {
            category: key,
            netSales: 0,
            cogs: 0,
            grossMargin: 0,
            marginPercent: 0,
          };
        }
        byCategory[key].netSales += row.netSales || 0;
        byCategory[key].cogs += row.cogs || 0;
        byCategory[key].grossMargin += row.margin || 0;
      });

      // Calculate margin percentages
      Object.values(byCategory).forEach((cat: any) => {
        cat.marginPercent = cat.netSales ? (cat.grossMargin / cat.netSales) * 100 : 0;
      });

      const storeData = Object.values(byStore).sort((a: any, b: any) => b.netSales - a.netSales);
      const categoryData = Object.values(byCategory).sort((a: any, b: any) => b.netSales - a.netSales);

      // Calculate totals
      const totals = {
        grossRevenue: storeData.reduce((s: number, r: any) => s + r.grossRevenue, 0),
        netSales: storeData.reduce((s: number, r: any) => s + r.netSales, 0),
        cogs: storeData.reduce((s: number, r: any) => s + r.cogs, 0),
        grossMargin: storeData.reduce((s: number, r: any) => s + r.grossMargin, 0),
      };

      const periodLabel = selectedMonth !== "all" ? `${selectedMonth}/${selectedYear}` : selectedYear;

      if (format === 'excel') {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Summary
        const summaryData = [
          { Descrição: "RELATÓRIO CONTÁBIL MENSAL", Valor: "" },
          { Descrição: `Período: ${periodLabel}`, Valor: "" },
          { Descrição: `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, Valor: "" },
          { Descrição: "", Valor: "" },
          { Descrição: "RESUMO CONSOLIDADO", Valor: "" },
          { Descrição: "Receita Bruta", Valor: totals.grossRevenue.toFixed(2) },
          { Descrição: "Deduções (Est.)", Valor: (totals.grossRevenue - totals.netSales).toFixed(2) },
          { Descrição: "Receita Líquida", Valor: totals.netSales.toFixed(2) },
          { Descrição: "COGS", Valor: totals.cogs.toFixed(2) },
          { Descrição: "Margem Bruta", Valor: totals.grossMargin.toFixed(2) },
          { Descrição: "% Margem", Valor: ((totals.grossMargin / totals.netSales) * 100).toFixed(1) + "%" },
        ];
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");

        // Sheet 2: By Store
        const storeSheetData = storeData.map((s: any) => ({
          Loja: s.store,
          "Receita Bruta": s.grossRevenue.toFixed(2),
          "Receita Líquida": s.netSales.toFixed(2),
          COGS: s.cogs.toFixed(2),
          "Margem Bruta": s.grossMargin.toFixed(2),
          "% Margem": s.netSales ? ((s.grossMargin / s.netSales) * 100).toFixed(1) + "%" : "0%",
          "Volume (Kg)": s.volumeKg.toFixed(0),
          Quantidade: s.quantity,
        }));
        const wsStore = XLSX.utils.json_to_sheet(storeSheetData);
        XLSX.utils.book_append_sheet(wb, wsStore, "Por Loja");

        // Sheet 3: By Category
        const catSheetData = categoryData.map((c: any) => ({
          Categoria: c.category,
          "Receita Líquida": c.netSales.toFixed(2),
          COGS: c.cogs.toFixed(2),
          "Margem Bruta": c.grossMargin.toFixed(2),
          "% Margem": c.marginPercent.toFixed(1) + "%",
        }));
        const wsCat = XLSX.utils.json_to_sheet(catSheetData);
        XLSX.utils.book_append_sheet(wb, wsCat, "Por Categoria");

        XLSX.writeFile(wb, `Relatorio_Contabil_${periodLabel.replace('/', '_')}.xlsx`);
      } else {
        // PDF Generation
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFontSize(18);
        doc.setTextColor(30, 64, 175);
        doc.text("RELATÓRIO CONTÁBIL MENSAL", pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Período: ${periodLabel}`, pageWidth / 2, 28, { align: 'center' });
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 34, { align: 'center' });

        // Summary Box
        doc.setFillColor(241, 245, 249);
        doc.rect(10, 42, pageWidth - 20, 45, 'F');
        
        doc.setFontSize(11);
        doc.setTextColor(30, 64, 175);
        doc.text("DEMONSTRAÇÃO DE RESULTADO CONSOLIDADA", 15, 50);
        
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        
        const formatCurrency = (val: number) => 
          val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        doc.text(`Receita Bruta:`, 15, 58);
        doc.text(formatCurrency(totals.grossRevenue), 80, 58);
        
        doc.text(`(-) Deduções:`, 15, 64);
        doc.text(formatCurrency(totals.grossRevenue - totals.netSales), 80, 64);
        
        doc.text(`Receita Líquida:`, 15, 70);
        doc.setFont("helvetica", "bold");
        doc.text(formatCurrency(totals.netSales), 80, 70);
        doc.setFont("helvetica", "normal");
        
        doc.text(`(-) COGS:`, 15, 76);
        doc.text(formatCurrency(totals.cogs), 80, 76);
        
        doc.text(`Margem Bruta:`, 15, 82);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 163, 74);
        doc.text(`${formatCurrency(totals.grossMargin)} (${((totals.grossMargin / totals.netSales) * 100).toFixed(1)}%)`, 80, 82);

        // Table: By Store
        doc.setTextColor(30, 64, 175);
        doc.setFontSize(11);
        doc.text("CONSOLIDAÇÃO POR LOJA", 15, 95);

        autoTable(doc, {
          startY: 100,
          head: [['Loja', 'Receita Líquida', 'COGS', 'Margem Bruta', '% Margem']],
          body: storeData.slice(0, 15).map((s: any) => [
            s.store,
            formatCurrency(s.netSales),
            formatCurrency(s.cogs),
            formatCurrency(s.grossMargin),
            s.netSales ? ((s.grossMargin / s.netSales) * 100).toFixed(1) + "%" : "0%",
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [30, 64, 175] },
        });

        // New page for categories
        doc.addPage();
        
        doc.setFontSize(11);
        doc.setTextColor(30, 64, 175);
        doc.text("CONSOLIDAÇÃO POR CATEGORIA", 15, 20);

        autoTable(doc, {
          startY: 25,
          head: [['Categoria', 'Receita Líquida', 'COGS', 'Margem Bruta', '% Margem']],
          body: categoryData.map((c: any) => [
            c.category,
            formatCurrency(c.netSales),
            formatCurrency(c.cogs),
            formatCurrency(c.grossMargin),
            c.marginPercent.toFixed(1) + "%",
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [30, 64, 175] },
        });

        doc.save(`Relatorio_Contabil_${periodLabel.replace('/', '_')}.pdf`);
      }

      toast({
        title: "Relatório contábil gerado",
        description: `Arquivo ${format.toUpperCase()} baixado com sucesso`,
      });
    } catch (error) {
      console.error("Error generating accounting report:", error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro ao gerar o arquivo",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // ============ STANDARD REPORTS ============
  const standardReports = [
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

    setIsGenerating(true);
    toast({
      title: "Gerando relatório",
      description: "Processando dados e criando gráficos...",
    });

    try {
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
            row.nameSalesReport?.substring(0, 30) || '',
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
        headStyles: { fillColor: [30, 64, 175] },
      });

      doc.save(`${reportTitle.replace(/\s+/g, '_')}.pdf`);

      toast({
        title: "Download concluído",
        description: `${reportTitle} PDF foi baixado com sucesso`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o arquivo",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>
          <p className="text-muted-foreground">
            Exporte datasets estruturados e relatórios financeiros
          </p>
        </div>

        <Tabs defaultValue="exports" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="exports" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Exportações
            </TabsTrigger>
            <TabsTrigger value="accounting" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Contábil
            </TabsTrigger>
            <TabsTrigger value="standard" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Padrão
            </TabsTrigger>
          </TabsList>

          {/* Tab: Exports (Power BI, etc.) */}
          <TabsContent value="exports" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Export Power BI</CardTitle>
                      <CardDescription>
                        Dataset estruturado com tabelas Fact e Dim
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• FactSales: Dados transacionais</p>
                    <p>• DimStores: Dimensão de lojas</p>
                    <p>• DimProducts: Dimensão de produtos</p>
                    <p>• DimCalendar: Dimensão de tempo</p>
                    <p>• KPIs: Indicadores consolidados</p>
                  </div>
                  <Button 
                    onClick={generatePowerBIExport} 
                    disabled={!isDataLoaded || isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Exportar para Power BI (.xlsx)
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle>Dataset Completo</CardTitle>
                      <CardDescription>
                        Todos os dados em formato Excel
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>Exporta todos os registros carregados com todas as colunas disponíveis.</p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => generateExcelReport("Relatório Mensal Completo")} 
                    disabled={!isDataLoaded}
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Dataset (.xlsx)
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Accounting Report */}
          <TabsContent value="accounting" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Relatório Contábil Mensal</CardTitle>
                    <CardDescription>
                      Consolidação por loja e categoria com demonstração de resultado
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Ano</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o ano" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os anos</SelectItem>
                        {filterOptions.years.map(year => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Mês</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o mês" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os meses</SelectItem>
                        {filterOptions.months.map(month => (
                          <SelectItem key={month} value={month}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Loja</Label>
                    <Select value={selectedStore} onValueChange={setSelectedStore}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a loja" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as lojas</SelectItem>
                        {filterOptions.stores.map(store => (
                          <SelectItem key={store} value={store}>{store}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">O relatório contábil inclui:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Demonstração de Resultado consolidada (Receita Bruta, Deduções, Receita Líquida, COGS, Margem)</li>
                    <li>• Consolidação por Loja com indicadores de performance</li>
                    <li>• Consolidação por Categoria/Macro-família</li>
                    <li>• Percentuais de margem por segmento</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => generateAccountingReport('pdf')} 
                    disabled={!isDataLoaded || isGenerating}
                    className="flex-1"
                  >
                    {isGenerating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Gerar PDF
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => generateAccountingReport('excel')} 
                    disabled={!isDataLoaded || isGenerating}
                    className="flex-1"
                  >
                    {isGenerating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Gerar Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Standard Reports */}
          <TabsContent value="standard" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {standardReports.map((report) => (
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
                        disabled={!isDataLoaded || isGenerating}
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
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Reports;
