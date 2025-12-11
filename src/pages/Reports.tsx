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
        title: "Aucune donnée",
        description: "Veuillez d'abord charger les données sur la page Téléchargement",
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
        const key = row.nom || "Non Identifié";
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
        const key = row.macroFamilyName || "Non Identifié";
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
          { Description: "RAPPORT COMPTABLE MENSUEL", Valeur: "" },
          { Description: `Période : ${periodLabel}`, Valeur: "" },
          { Description: `Généré le : ${new Date().toLocaleDateString('fr-FR')}`, Valeur: "" },
          { Description: "", Valeur: "" },
          { Description: "RÉSUMÉ CONSOLIDÉ", Valeur: "" },
          { Description: "Chiffre d'Affaires Brut", Valeur: totals.grossRevenue.toFixed(2) },
          { Description: "Déductions (Est.)", Valeur: (totals.grossRevenue - totals.netSales).toFixed(2) },
          { Description: "Chiffre d'Affaires Net", Valeur: totals.netSales.toFixed(2) },
          { Description: "COGS", Valeur: totals.cogs.toFixed(2) },
          { Description: "Marge Brute", Valeur: totals.grossMargin.toFixed(2) },
          { Description: "% Marge", Valeur: ((totals.grossMargin / totals.netSales) * 100).toFixed(1) + "%" },
        ];
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Résumé");

        const storeSheetData = storeData.map((s: any) => ({
          Boutique: s.store,
          "CA Brut": s.grossRevenue.toFixed(2),
          "CA Net": s.netSales.toFixed(2),
          COGS: s.cogs.toFixed(2),
          "Marge Brute": s.grossMargin.toFixed(2),
          "% Marge": s.netSales ? ((s.grossMargin / s.netSales) * 100).toFixed(1) + "%" : "0%",
          "Volume (Kg)": s.volumeKg.toFixed(0),
          Quantité: s.quantity,
        }));
        const wsStore = XLSX.utils.json_to_sheet(storeSheetData);
        XLSX.utils.book_append_sheet(wb, wsStore, "Par Boutique");

        const catSheetData = categoryData.map((c: any) => ({
          Catégorie: c.category,
          "CA Net": c.netSales.toFixed(2),
          COGS: c.cogs.toFixed(2),
          "Marge Brute": c.grossMargin.toFixed(2),
          "% Marge": c.marginPercent.toFixed(1) + "%",
        }));
        const wsCat = XLSX.utils.json_to_sheet(catSheetData);
        XLSX.utils.book_append_sheet(wb, wsCat, "Par Catégorie");

        XLSX.writeFile(wb, `Rapport_Comptable_${periodLabel.replace('/', '_')}.xlsx`);
      } else {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFontSize(18);
        doc.setTextColor(30, 64, 175);
        doc.text("RAPPORT COMPTABLE MENSUEL", pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Période : ${periodLabel}`, pageWidth / 2, 28, { align: 'center' });
        doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 34, { align: 'center' });

        doc.setFillColor(241, 245, 249);
        doc.rect(10, 42, pageWidth - 20, 45, 'F');
        
        doc.setFontSize(11);
        doc.setTextColor(30, 64, 175);
        doc.text("COMPTE DE RÉSULTAT CONSOLIDÉ", 15, 50);
        
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        
        const formatCurrency = (val: number) => 
          val.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

        doc.text(`Chiffre d'Affaires Brut :`, 15, 58);
        doc.text(formatCurrency(totals.grossRevenue), 80, 58);
        
        doc.text(`(-) Déductions :`, 15, 64);
        doc.text(formatCurrency(totals.grossRevenue - totals.netSales), 80, 64);
        
        doc.text(`Chiffre d'Affaires Net :`, 15, 70);
        doc.setFont("helvetica", "bold");
        doc.text(formatCurrency(totals.netSales), 80, 70);
        doc.setFont("helvetica", "normal");
        
        doc.text(`(-) COGS :`, 15, 76);
        doc.text(formatCurrency(totals.cogs), 80, 76);
        
        doc.text(`Marge Brute :`, 15, 82);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 163, 74);
        doc.text(`${formatCurrency(totals.grossMargin)} (${((totals.grossMargin / totals.netSales) * 100).toFixed(1)}%)`, 80, 82);

        doc.setTextColor(30, 64, 175);
        doc.setFontSize(11);
        doc.text("CONSOLIDATION PAR BOUTIQUE", 15, 95);

        autoTable(doc, {
          startY: 100,
          head: [['Boutique', 'CA Net', 'COGS', 'Marge Brute', '% Marge']],
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
        doc.text("CONSOLIDATION PAR CATÉGORIE", 15, 20);

        autoTable(doc, {
          startY: 25,
          head: [['Catégorie', 'CA Net', 'COGS', 'Marge Brute', '% Marge']],
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

        doc.save(`Rapport_Comptable_${periodLabel.replace('/', '_')}.pdf`);
      }

      toast({
        title: "Rapport comptable généré",
        description: `Fichier ${format.toUpperCase()} téléchargé avec succès`,
      });
    } catch (error) {
      console.error("Error generating accounting report:", error);
      toast({
        title: "Erreur lors de la génération du rapport",
        description: "Une erreur s'est produite lors de la génération du fichier",
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
          <p className="text-muted-foreground">Chargez les données sur la page Téléchargement d'abord</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Rapports</h2>
          <p className="text-muted-foreground">
            Rapport Comptable Mensuel
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Rapport Comptable Mensuel
            </CardTitle>
            <CardDescription>
              Consolidation par boutique et catégorie avec compte de résultat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Année</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les années</SelectItem>
                    {filterOptions.years.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mois</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les mois</SelectItem>
                    {filterOptions.months.map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Boutique</Label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les boutiques</SelectItem>
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
                Exporter PDF
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
                Exporter Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Reports;
