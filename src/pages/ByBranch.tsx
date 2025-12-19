import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Store } from "lucide-react";
import Layout from "@/components/Layout";
import { useTracking } from "@/hooks/useTracking";
import { ExportButtons } from "@/components/ExportButtons";

import { useData } from "@/contexts/DataContext";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ByBranch = () => {
  useTracking();
  const { data, isDataLoaded } = useData();

  const [selectedReport, setSelectedReport] = useState("YTD");
  const [selectedMonth, setSelectedMonth] = useState("06");
  const [selectedMacroFamily, setSelectedMacroFamily] = useState("TOTAL");

  const storeColors = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
    "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
  ];

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const selectedMonthNum = parseInt(selectedMonth, 10);

  // Extract filter options
  const filterOptions = useMemo(() => {
    const months = Array.from(new Set(data.map(d => d.month))).filter(Boolean).sort();
    const macroFamilies = ["TOTAL", ...Array.from(new Set(data.map(d => d.macroFamilyName))).filter(Boolean).sort()];
    return { months, macroFamilies };
  }, [data]);

  // Filter data based on period and category
  const filteredData = useMemo(() => {
    return data.filter(row => {
      const macroFamilyMatch = selectedMacroFamily === "TOTAL" || row.macroFamilyName === selectedMacroFamily;
      const monthNum = parseInt(row.month, 10);
      const periodMatch = selectedReport === "YTD" 
        ? monthNum <= selectedMonthNum 
        : row.month === selectedMonth;
      return macroFamilyMatch && periodMatch;
    });
  }, [data, selectedMacroFamily, selectedReport, selectedMonth, selectedMonthNum]);

  // Calculate store data from filtered data
  const storesData = useMemo(() => {
    if (!isDataLoaded) return [];

    const currentYear = 2025;
    const previousYear = 2024;

    const storeMap = new Map<string, { 
      revenueCurrent: number; 
      revenuePrevious: number; 
      marginCurrent: number;
      marginPrevious: number;
      cogsCurrent: number;
    }>();

    filteredData.forEach(row => {
      const storeName = row.nom;
      if (!storeName) return;

      if (!storeMap.has(storeName)) {
        storeMap.set(storeName, { 
          revenueCurrent: 0, 
          revenuePrevious: 0, 
          marginCurrent: 0,
          marginPrevious: 0,
          cogsCurrent: 0,
        });
      }

      const store = storeMap.get(storeName)!;
      if (row.calendarYear === currentYear) {
        store.revenueCurrent += row.netSales || 0;
        store.marginCurrent += row.margin || 0;
        store.cogsCurrent += row.cogs || 0;
      } else if (row.calendarYear === previousYear) {
        store.revenuePrevious += row.netSales || 0;
        store.marginPrevious += row.margin || 0;
      }
    });

    const totalRevenue = Array.from(storeMap.values()).reduce((sum, s) => sum + s.revenueCurrent, 0);

    return Array.from(storeMap.entries())
      .map(([name, stats], index) => {
        const marginPercent = stats.revenueCurrent > 0 ? (stats.marginCurrent / stats.revenueCurrent) * 100 : 0;
        const growth = stats.revenuePrevious > 0 
          ? ((stats.revenueCurrent - stats.revenuePrevious) / stats.revenuePrevious) * 100 
          : 0;
        const revenueShare = totalRevenue > 0 ? (stats.revenueCurrent / totalRevenue) * 100 : 0;

        return {
          name,
          revenue: stats.revenueCurrent,
          revenueFormatted: `€${(stats.revenueCurrent / 1000).toFixed(0)}K`,
          margin: marginPercent,
          marginFormatted: `${marginPercent.toFixed(1)}%`,
          ebitda: stats.marginCurrent - stats.cogsCurrent * 0.1, // Simplified EBITDA calculation
          ebitdaFormatted: `€${((stats.marginCurrent - stats.cogsCurrent * 0.1) / 1000).toFixed(0)}K`,
          growth,
          growthFormatted: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`,
          revenueShare,
          color: storeColors[index % storeColors.length],
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredData, isDataLoaded]);

  const periodLabel = selectedReport === "YTD" 
    ? `YTD ${selectedMonth}.${monthNames[selectedMonthNum - 1]}`
    : `MTD ${selectedMonth}.${monthNames[selectedMonthNum - 1]}`;

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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Analyse par Boutique - {periodLabel}</h2>
            <p className="text-muted-foreground">
              Performance individuelle de chaque point de vente
            </p>
          </div>
          <ExportButtons
            data={storesData.map(s => ({
              Boutique: s.name,
              CA: s.revenue,
              Marge: s.margin,
              EBITDA: s.ebitda,
              Croissance: s.growth,
            }))}
            title={`Analyse par Boutique - ${periodLabel}`}
            fileName={`Analyse_Boutique_${selectedReport}_${selectedMonth}`}
          />
        </div>

        {/* Filters */}
        <div className="bg-card border rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria:</label>
              <Select value={selectedMacroFamily} onValueChange={setSelectedMacroFamily}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.macroFamilies.map((family) => (
                    <SelectItem key={family} value={family}>
                      {family}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Período:</label>
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YTD">YTD (Year-to-Date)</SelectItem>
                  <SelectItem value="MTD">MTD (Month-to-Date)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mês:</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar mês" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.months.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month} - {monthNames[parseInt(month, 10) - 1]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {storesData.slice(0, 8).map((store) => (
            <Card key={store.name} className="border-t-4" style={{ borderTopColor: store.color }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{store.name}</CardTitle>
                <Store className="h-4 w-4" style={{ color: store.color }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{store.revenueFormatted}</div>
                <p className={`text-xs ${store.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {store.growthFormatted}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Comparatif de Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Boutique</TableHead>
                  <TableHead className="text-right">Chiffre d'Affaires</TableHead>
                  <TableHead className="text-right">Marge Brute</TableHead>
                  <TableHead className="text-right">EBITDA</TableHead>
                  <TableHead className="text-right">Croissance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storesData.map((store) => (
                  <TableRow key={store.name}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell className="text-right">{store.revenueFormatted}</TableCell>
                    <TableCell className="text-right">{store.marginFormatted}</TableCell>
                    <TableCell className="text-right">{store.ebitdaFormatted}</TableCell>
                    <TableCell className={`text-right ${store.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {store.growthFormatted}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition du Chiffre d'Affaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {storesData.map((store) => (
                <div key={store.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: store.color }}
                      />
                      <span className="font-medium">{store.name}</span>
                    </div>
                    <span>{store.revenueShare.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${store.revenueShare}%`, backgroundColor: store.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
};

export default ByBranch;
