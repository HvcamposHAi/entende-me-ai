import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calculator, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { useData } from "@/contexts/DataContext";
import { useTracking } from "@/hooks/useTracking";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = () => {
  useTracking();
  const { toast } = useToast();
  const { data, isDataLoaded } = useData();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("2025");
  const [selectedStore, setSelectedStore] = useState<string>("all");

  const filterOptions = useMemo(() => {
    if (!isDataLoaded) return { months: [], years: [], stores: [] };
    
    const months = [...new Set(data.map(r => r.month))].filter(Boolean).sort();
    const years = [...new Set(data.map(r => r.calendarYear))].filter(Boolean).map(String).sort();
    const stores = [...new Set(data.map(r => r.nom))].filter(Boolean).sort();
    
    return { months, years, stores };
  }, [data, isDataLoaded]);

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
        byStore[key].grossRevenue += (row.netSales || 0) * 1.15;
        byStore[key].cogs += row.cogs || 0;
        byStore[key].grossMargin += row.margin || 0;
        byStore[key].volumeKg += row.volumeKg || 0;
        byStore[key].quantity += row.quantitySoldTotal || 0;
      });

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

      Object.values(byCategory).forEach((cat: any) => {
        cat.marginPercent = cat.netSales ? (cat.grossMargin / cat.netSales) * 100 : 0;
      });

      const storeData = Object.values(byStore).sort((a: any, b: any) => b.netSales - a.netSales);
      const categoryData = Object.values(byCategory).sort((a: any, b: any) => b.netSales - a.netSales);

      const totals = {
        grossRevenue: storeData.reduce((s: number, r: any) => s + r.grossRevenue, 0),
        netSales: storeData.reduce((s: number, r: any) => s + r.netSales, 0),
        cogs: storeData.reduce((s: number, r: any) => s + r.cogs, 0),
        grossMargin: storeData.reduce((s: number, r: any) => s + r.grossMargin, 0),
      };

      const periodLabel = selectedMonth !== "all" ? `${selectedMonth}/${selectedYear}` : selectedYear;

      if (format === 'excel') {
        const wb = XLSX.utils.book_new();

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
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFontSize(18);
        doc.setTextColor(30, 64, 175);
        doc.text("RELATÓRIO CONTÁBIL MENSAL", pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Período: ${periodLabel}`, pageWidth / 2, 28, { align: 'center' });
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 34, { align: 'center' });

        doc.setFillColor(241, 245, 249);
        doc.rect(10, 42, pageWidth - 20, 45, 'F');
        
        doc.setFontSize(11);
        doc.setTextColor(30, 64, 175);
        doc.text("DEMONSTRAÇÃO DE RESULTADO CONSOLIDADA", 15, 50);
        
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        
        const formatCurrency = (val: number) => 
          val.toLocaleString('pt-BR', { style: 'currency', currency: 'EUR' });

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

  if (!isDataLoaded) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Carregue os dados na página Upload primeiro</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>
          <p className="text-muted-foreground">
            Relatório Contábil Mensal
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Relatório Contábil Mensal
            </CardTitle>
            <CardDescription>
              Consolidação por loja e categoria com demonstração de resultado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
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
                    <SelectValue />
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
                    <SelectValue />
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

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => generateAccountingReport('pdf')}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Exportar PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => generateAccountingReport('excel')}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Exportar Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Reports;
