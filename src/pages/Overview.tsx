import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { useData } from "@/contexts/DataContext";
import FilterBar from "@/components/FilterBar";
import KPICard from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts";
import { AlertCircle } from "lucide-react";
import { useTracking } from "@/hooks/useTracking";

const Overview = () => {
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
              <h3 className="text-lg font-semibold">Nenhum dado carregado</h3>
              <p className="text-muted-foreground">
                Por favor, faça upload da base de dados na página de Upload
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
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
          <p className="text-muted-foreground">
            Visão geral dos indicadores financeiros
          </p>
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
            title="REVENUE"
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
            title="MARGIN"
            currentValue={kpis.margin.current}
            previousValue={kpis.margin.previous}
            format="currency"
            subtitle={`${((kpis.margin.current / kpis.revenue.current) * 100).toFixed(1)}% of REV`}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>REVENUE vs. MARGIN</CardTitle>
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
                    return new Intl.NumberFormat('pt-FR', { 
                      style: 'currency', 
                      currency: 'EUR' 
                    }).format(value);
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue2024" fill="#3b82f6" name="Revenue 2024" />
                <Bar yAxisId="left" dataKey="revenue2025" fill="#10b981" name="Revenue 2025" />
                <Line yAxisId="right" type="monotone" dataKey="marginPct2024" stroke="#f59e0b" name="Margin % 2024" strokeWidth={3} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="marginPct2025" stroke="#ef4444" name="Margin % 2025" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>TOP 10 MACRO-FAMILY (2025)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={macroFamilyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip 
                  formatter={(value: number) => 
                    new Intl.NumberFormat('pt-FR', { 
                      style: 'currency', 
                      currency: 'EUR' 
                    }).format(value)
                  }
                />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                <Bar dataKey="margin" fill="#10b981" name="Margin" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Overview;
