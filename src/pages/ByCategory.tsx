import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package } from "lucide-react";
import Layout from "@/components/Layout";
import { useTracking } from "@/hooks/useTracking";
import { ExportButtons } from "@/components/ExportButtons";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";
import { useData } from "@/contexts/DataContext";
import { useMemo, useState, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const ByCategory = () => {
  useTracking();
  const chartRef = useRef<HTMLDivElement>(null);
  const { data, isDataLoaded } = useData();

  const [selectedReport, setSelectedReport] = useState("YTD");
  const [selectedMonth, setSelectedMonth] = useState("06");
  const [selectedStore, setSelectedStore] = useState("TOTAL");

  const categoryColors = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
    "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
    "#14b8a6", "#f43f5e", "#a855f7", "#22c55e", "#eab308"
  ];

  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const selectedMonthNum = parseInt(selectedMonth, 10);

  // Extract filter options
  const filterOptions = useMemo(() => {
    const months = Array.from(new Set(data.map(d => d.month))).filter(Boolean).sort();
    const stores = ["TOTAL", ...Array.from(new Set(data.map(d => d.nom))).filter(Boolean).sort()];
    return { months, stores };
  }, [data]);

  // Filter data based on period and store
  const filteredData = useMemo(() => {
    return data.filter(row => {
      const storeMatch = selectedStore === "TOTAL" || row.nom === selectedStore;
      const monthNum = parseInt(row.month, 10);
      const periodMatch = selectedReport === "YTD" 
        ? monthNum <= selectedMonthNum 
        : row.month === selectedMonth;
      return storeMatch && periodMatch;
    });
  }, [data, selectedStore, selectedReport, selectedMonth, selectedMonthNum]);

  // Calculate category data from filtered data
  const categoriesData = useMemo(() => {
    if (!isDataLoaded) return [];

    const currentYear = 2025;
    const previousYear = 2024;

    const categoryMap = new Map<string, { 
      revenueCurrent: number; 
      revenuePrevious: number; 
      marginCurrent: number;
      marginPrevious: number;
      volumeCurrent: number;
      volumePrevious: number;
    }>();

    filteredData.forEach(row => {
      const categoryName = row.macroFamilyName;
      if (!categoryName) return;

      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, { 
          revenueCurrent: 0, 
          revenuePrevious: 0, 
          marginCurrent: 0,
          marginPrevious: 0,
          volumeCurrent: 0,
          volumePrevious: 0,
        });
      }

      const category = categoryMap.get(categoryName)!;
      if (row.calendarYear === currentYear) {
        category.revenueCurrent += row.netSales || 0;
        category.marginCurrent += row.margin || 0;
        category.volumeCurrent += row.volumeKg || 0;
      } else if (row.calendarYear === previousYear) {
        category.revenuePrevious += row.netSales || 0;
        category.marginPrevious += row.margin || 0;
        category.volumePrevious += row.volumeKg || 0;
      }
    });

    const totalRevenue = Array.from(categoryMap.values()).reduce((sum, s) => sum + s.revenueCurrent, 0);

    return Array.from(categoryMap.entries())
      .map(([name, stats], index) => {
        const marginPercent = stats.revenueCurrent > 0 ? (stats.marginCurrent / stats.revenueCurrent) * 100 : 0;
        const marginPercentPrev = stats.revenuePrevious > 0 ? (stats.marginPrevious / stats.revenuePrevious) * 100 : 0;
        const growth = stats.revenuePrevious > 0 
          ? ((stats.revenueCurrent - stats.revenuePrevious) / stats.revenuePrevious) * 100 
          : 0;
        const revenueShare = totalRevenue > 0 ? (stats.revenueCurrent / totalRevenue) * 100 : 0;
        const volumeGrowth = stats.volumePrevious > 0
          ? ((stats.volumeCurrent - stats.volumePrevious) / stats.volumePrevious) * 100
          : 0;

        return {
          name,
          revenue: stats.revenueCurrent,
          revenuePrevious: stats.revenuePrevious,
          revenueFormatted: `€${(stats.revenueCurrent / 1000).toFixed(0)}K`,
          margin: marginPercent,
          marginPrevious: marginPercentPrev,
          marginFormatted: `${marginPercent.toFixed(1)}%`,
          volume: stats.volumeCurrent,
          volumeFormatted: `${(stats.volumeCurrent / 1000).toFixed(1)}T`,
          growth,
          growthFormatted: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`,
          volumeGrowth,
          volumeGrowthFormatted: `${volumeGrowth >= 0 ? '+' : ''}${volumeGrowth.toFixed(1)}%`,
          revenueShare,
          color: categoryColors[index % categoryColors.length],
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredData, isDataLoaded]);

  // Chart data for top categories
  const chartData = useMemo(() => {
    return categoriesData.slice(0, 10).map(cat => ({
      name: cat.name.length > 15 ? cat.name.substring(0, 15) + '...' : cat.name,
      fullName: cat.name,
      CA2025: cat.revenue / 1000,
      CA2024: cat.revenuePrevious / 1000,
      Marge2025: cat.margin,
      Marge2024: cat.marginPrevious,
    }));
  }, [categoriesData]);

  const periodLabel = selectedReport === "YTD" 
    ? `YTD ${selectedMonth}.${monthNames[selectedMonthNum - 1]}`
    : `MTD ${selectedMonth}.${monthNames[selectedMonthNum - 1]}`;

  const storeLabel = selectedStore === "TOTAL" ? "" : ` - ${selectedStore}`;

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
            <h2 className="text-3xl font-bold tracking-tight">Analyse par Catégorie - {periodLabel}{storeLabel}</h2>
            <p className="text-muted-foreground">
              Performance individuelle de chaque macro-famille de produits
            </p>
          </div>
          <ExportButtons
            data={categoriesData.map(c => ({
              Catégorie: c.name,
              CA: c.revenue,
              Marge: c.margin,
              Volume: c.volume,
              Croissance: c.growth,
            }))}
            title={`Analyse par Catégorie - ${periodLabel}`}
            fileName={`Analyse_Categorie_${selectedReport}_${selectedMonth}`}
            chartRef={chartRef}
            chartConfigs={[
              {
                type: 'bar',
                title: 'TOP 10 Catégories - CA',
                categoryKey: 'name',
                data: chartData.map(d => ({
                  label: d.name,
                  name: d.name,
                  CA2025: d.CA2025,
                  CA2024: d.CA2024,
                })),
                series: [
                  { key: 'CA2025', name: 'CA 2025 (K€)' },
                  { key: 'CA2024', name: 'CA 2024 (K€)' },
                ]
              }
            ]}
          />
        </div>

        {/* Filters */}
        <div className="bg-card border rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Boutique :</label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner boutique" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.stores.map((store) => (
                    <SelectItem key={store} value={store}>
                      {store}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Période :</label>
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YTD">YTD (Year-to-Date)</SelectItem>
                  <SelectItem value="MTD">MTD (Month-to-Date)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mois :</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner mois" />
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

        {/* KPI Cards - Top 8 Categories */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {categoriesData.slice(0, 8).map((category) => (
            <Card key={category.name} className="border-t-4" style={{ borderTopColor: category.color }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium truncate" title={category.name}>
                  {category.name}
                </CardTitle>
                <Package className="h-4 w-4" style={{ color: category.color }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{category.revenueFormatted}</div>
                <div className="flex justify-between text-xs">
                  <span className={category.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {category.growthFormatted}
                  </span>
                  <span className="text-muted-foreground">Marge: {category.marginFormatted}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart */}
        <div ref={chartRef}>
          <Card>
            <CardHeader>
              <CardTitle>Comparatif CA par Catégorie (Top 10)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${v}K€`} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [`${value.toFixed(0)}K€`, name]}
                    labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
                  />
                  <Legend />
                  <Bar dataKey="CA2025" fill="#3b82f6" name="CA 2025" />
                  <Bar dataKey="CA2024" fill="#94a3b8" name="CA 2024" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Comparatif de Performance par Catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Chiffre d'Affaires</TableHead>
                  <TableHead className="text-right">Marge Brute</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Croissance CA</TableHead>
                  <TableHead className="text-right">Croissance Vol.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoriesData.map((category) => (
                  <TableRow key={category.name}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-right">{category.revenueFormatted}</TableCell>
                    <TableCell className="text-right">{category.marginFormatted}</TableCell>
                    <TableCell className="text-right">{category.volumeFormatted}</TableCell>
                    <TableCell className={`text-right ${category.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {category.growthFormatted}
                    </TableCell>
                    <TableCell className={`text-right ${category.volumeGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {category.volumeGrowthFormatted}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Revenue Share */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition du Chiffre d'Affaires par Catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoriesData.slice(0, 10).map((category) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium truncate max-w-[200px]" title={category.name}>
                        {category.name}
                      </span>
                    </div>
                    <span>{category.revenueShare.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${category.revenueShare}%`, backgroundColor: category.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <AIAnalysisPanel
          data={categoriesData.map(c => ({
            nom: c.name,
            netSales: c.revenue,
            margin: c.margin,
            growth: c.growth,
          }))}
          context="category"
          title="Analyse IA - Par Catégorie"
          filters={{ store: selectedStore }}
        />
      </div>
    </Layout>
  );
};

export default ByCategory;
