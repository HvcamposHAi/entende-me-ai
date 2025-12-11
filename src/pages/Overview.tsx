import { useState, useMemo, useRef } from "react";
import Layout from "@/components/Layout";
import { useData } from "@/contexts/DataContext";
import FilterBar from "@/components/FilterBar";
import KPICard from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts";
import { AlertCircle } from "lucide-react";
import { useTracking } from "@/hooks/useTracking";
import { ExportButtons } from "@/components/ExportButtons";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";

const Overview = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  useTracking();
  const { data, isDataLoaded } = useData();
  
  console.log('Overview - Data loaded:', isDataLoaded, 'Total registros:', data.length);
  if (data.length > 0) {
    console.log('Overview - Amostra dos primeiros 3 registros:', data.slice(0, 3));
  }
  
  const [selectedStore, setSelectedStore] = useState("TOTAL");
  const [selectedReport, setSelectedReport] = useState("YTD");
  const [selectedMonth, setSelectedMonth] = useState("06.Jun");
  const [selectedMacroFamily, setSelectedMacroFamily] = useState("TOTAL");

  // Extract filter options
  const filterOptions = useMemo(() => {
    const stores = ["TOTAL", ...Array.from(new Set(data.map(d => d.nom)))];
    const reports = ["YTD", "MTD"];
    const months = Array.from(new Set(data.map(d => d.calendarMonth))).sort();
    const macroFamilies = ["TOTAL", ...Array.from(new Set(data.map(d => d.macroFamilyName)))];
    
    return { stores, reports, months, macroFamilies };
  }, [data]);

  // Filter data based on selections
  const filteredData = useMemo(() => {
    return data.filter(row => {
      const storeMatch = selectedStore === "TOTAL" || row.nom === selectedStore;
      const macroFamilyMatch = selectedMacroFamily === "TOTAL" || row.macroFamilyName === selectedMacroFamily;
      return storeMatch && macroFamilyMatch;
    });
  }, [data, selectedStore, selectedMacroFamily]);

  // Years and KPIs
  const years = useMemo(() => Array.from(new Set(filteredData.map(d => d.calendarYear))).filter(Boolean) as number[], [filteredData]);
  const currentYear = useMemo(() => years.length ? Math.max(...years) : new Date().getFullYear(), [years]);
  const previousYear = useMemo(() => currentYear - 1, [currentYear]);

  const kpis = useMemo(() => {
    const currentData = filteredData.filter(d => d.calendarYear === currentYear);
    const previousData = filteredData.filter(d => d.calendarYear === previousYear);
    
    const sumField = (data: typeof filteredData, field: keyof typeof data[0]) => 
      data.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
    
    return {
      volumeKg: {
        current: sumField(currentData, 'volumeKg'),
        previous: sumField(previousData, 'volumeKg')
      },
      revenue: {
        current: sumField(currentData, 'netSales'),
        previous: sumField(previousData, 'netSales')
      },
      cogs: {
        current: sumField(currentData, 'cogs'),
        previous: sumField(previousData, 'cogs')
      },
      margin: {
        current: sumField(currentData, 'margin'),
        previous: sumField(previousData, 'margin')
      }
    };
  }, [filteredData, currentYear, previousYear]);

  // Prepare monthly chart data
  const monthlyChartData = useMemo(() => {
    const monthlyData = new Map<string, any>();
    
    filteredData.forEach(row => {
      const key = row.calendarMonth;
      if (!monthlyData.has(key)) {
        monthlyData.set(key, {
          month: key,
          revenue2024: 0,
          revenue2025: 0,
          margin2024: 0,
          margin2025: 0,
          marginPct2024: 0,
          marginPct2025: 0
        });
      }
      
      const entry = monthlyData.get(key);
      if (row.calendarYear === 2024) {
        entry.revenue2024 += row.netSales;
        entry.margin2024 += row.margin;
      } else if (row.calendarYear === 2025) {
        entry.revenue2025 += row.netSales;
        entry.margin2025 += row.margin;
      }
    });
    
    return Array.from(monthlyData.values()).map(entry => ({
      ...entry,
      marginPct2024: entry.revenue2024 > 0 ? (entry.margin2024 / entry.revenue2024) * 100 : 0,
      marginPct2025: entry.revenue2025 > 0 ? (entry.margin2025 / entry.revenue2025) * 100 : 0
    })).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredData]);

  // Prepare macro-family breakdown
  const macroFamilyData = useMemo(() => {
    const familyMap = new Map<string, any>();
    
    filteredData.filter(d => d.calendarYear === currentYear).forEach(row => {
      const key = row.macroFamilyName;
      if (!familyMap.has(key)) {
        familyMap.set(key, {
          name: key,
          volumeKg: 0,
          revenue: 0,
          cogs: 0,
          margin: 0
        });
      }
      
      const entry = familyMap.get(key);
      entry.volumeKg += row.volumeKg;
      entry.revenue += row.netSales;
      entry.cogs += row.cogs;
      entry.margin += row.margin;
    });
    
    return Array.from(familyMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredData, currentYear]);

  if (!isDataLoaded) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Aucune donnée chargée</h3>
              <p className="text-muted-foreground">
                Veuillez télécharger la base de données sur la page Téléchargement
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Vue d'ensemble</h2>
            <p className="text-muted-foreground">
              Aperçu général des indicateurs financiers
            </p>
          </div>
          <ExportButtons
            data={filteredData.map(d => ({
              Boutique: d.nom,
              Année: d.calendarYear,
              Mois: d.month,
              MacroFamille: d.macroFamilyName,
              ChiffreAffaires: d.netSales,
              COGS: d.cogs,
              Marge: d.margin,
              VolumeKg: d.volumeKg,
            }))}
            title="Vue d'ensemble"
            fileName="Vue_Ensemble_Export"
            chartRef={chartRef}
            chartConfigs={[
              {
                type: 'column',
                title: 'CA vs. MARGE',
                categoryKey: 'month',
                data: monthlyChartData.map(d => ({
                  label: d.month,
                  month: d.month,
                  revenue2024: d.revenue2024,
                  revenue2025: d.revenue2025,
                  marginPct2024: d.marginPct2024,
                  marginPct2025: d.marginPct2025,
                })),
                series: [
                  { key: 'revenue2024', name: 'CA 2024' },
                  { key: 'revenue2025', name: 'CA 2025' },
                  { key: 'marginPct2024', name: 'Marge % 2024' },
                  { key: 'marginPct2025', name: 'Marge % 2025' },
                ]
              },
              {
                type: 'bar',
                title: 'TOP 10 MACRO-FAMILLE (2025)',
                categoryKey: 'name',
                data: macroFamilyData.map(d => ({
                  label: d.name,
                  name: d.name,
                  revenue: d.revenue,
                  margin: d.margin,
                })),
                series: [
                  { key: 'revenue', name: 'CA' },
                  { key: 'margin', name: 'Marge' },
                ]
              }
            ]}
          />
        </div>

        <FilterBar
          stores={filterOptions.stores}
          reports={filterOptions.reports}
          months={filterOptions.months}
          macroFamilies={filterOptions.macroFamilies}
          selectedStore={selectedStore}
          selectedReport={selectedReport}
          selectedMonth={selectedMonth}
          selectedMacroFamily={selectedMacroFamily}
          onStoreChange={setSelectedStore}
          onReportChange={setSelectedReport}
          onMonthChange={setSelectedMonth}
          onMacroFamilyChange={setSelectedMacroFamily}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="VOLUME (Kg)"
            currentValue={kpis.volumeKg.current}
            previousValue={kpis.volumeKg.previous}
            format="number"
          />
          <KPICard
            title="CHIFFRE D'AFFAIRES"
            currentValue={kpis.revenue.current}
            previousValue={kpis.revenue.previous}
            format="currency"
          />
          <KPICard
            title="COGS"
            currentValue={kpis.cogs.current}
            previousValue={kpis.cogs.previous}
            format="currency"
          />
          <KPICard
            title="MARGE"
            currentValue={kpis.margin.current}
            previousValue={kpis.margin.previous}
            format="currency"
            subtitle={`${((kpis.margin.current / kpis.revenue.current) * 100).toFixed(1)}% du CA`}
          />
        </div>

        <div ref={chartRef} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CA vs. MARGE</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name.includes('Pct')) {
                        return `${value.toFixed(1)}%`;
                      }
                      return new Intl.NumberFormat('fr-FR', { 
                        style: 'currency', 
                        currency: 'EUR' 
                      }).format(value);
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue2024" fill="#3b82f6" name="CA 2024" />
                  <Bar yAxisId="left" dataKey="revenue2025" fill="#10b981" name="CA 2025" />
                  <Line yAxisId="right" type="monotone" dataKey="marginPct2024" stroke="#f59e0b" name="Marge % 2024" strokeWidth={3} dot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="marginPct2025" stroke="#ef4444" name="Marge % 2025" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
          <CardHeader>
            <CardTitle>TOP 10 MACRO-FAMILLE (2025)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={macroFamilyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip 
                  formatter={(value: number) => 
                    new Intl.NumberFormat('fr-FR', { 
                      style: 'currency', 
                      currency: 'EUR' 
                    }).format(value)
                  }
                />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="CA" />
                <Bar dataKey="margin" fill="#10b981" name="Marge" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          </Card>
        </div>

        <AIAnalysisPanel
          data={filteredData}
          context="overview"
          title="Analyse IA - Vue d'ensemble"
          filters={{ store: selectedStore, product: selectedMacroFamily }}
        />
      </div>
    </Layout>
  );
};

export default Overview;
