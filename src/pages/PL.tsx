import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Layout from "@/components/Layout";
import { useData } from "@/contexts/DataContext";
import { useMemo, useRef, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { useTracking } from "@/hooks/useTracking";
import { ExportButtons } from "@/components/ExportButtons";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PL = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  useTracking();
  const { data, isDataLoaded } = useData();

  const [selectedStore, setSelectedStore] = useState("TOTAL");
  const [selectedReport, setSelectedReport] = useState("YTD");
  const [selectedMonth, setSelectedMonth] = useState("06");
  const [selectedMacroFamily, setSelectedMacroFamily] = useState("TOTAL");

  // Extract filter options
  const filterOptions = useMemo(() => {
    const stores = ["TOTAL", ...Array.from(new Set(data.map(d => d.nom))).filter(Boolean).sort()];
    const months = Array.from(new Set(data.map(d => d.month))).filter(Boolean).sort();
    const macroFamilies = ["TOTAL", ...Array.from(new Set(data.map(d => d.macroFamilyName))).filter(Boolean).sort()];
    return { stores, months, macroFamilies };
  }, [data]);

  // Filter data based on store and category selection
  const filteredData = useMemo(() => {
    return data.filter(row => {
      const storeMatch = selectedStore === "TOTAL" || row.nom === selectedStore;
      const macroFamilyMatch = selectedMacroFamily === "TOTAL" || row.macroFamilyName === selectedMacroFamily;
      return storeMatch && macroFamilyMatch;
    });
  }, [data, selectedStore, selectedMacroFamily]);

  // Get month number for YTD filtering
  const selectedMonthNum = parseInt(selectedMonth, 10);

  const plCalculations = useMemo(() => {
    if (!isDataLoaded) return null;

    const currentYear = 2025;
    const previousYear = 2024;

    // Apply period filter (YTD or MTD)
    const getFilteredByPeriod = (baseData: typeof filteredData, year: number) => {
      if (selectedReport === "YTD") {
        return baseData.filter(row => row.calendarYear === year && parseInt(row.month, 10) <= selectedMonthNum);
      } else {
        // MTD - only selected month
        return baseData.filter(row => row.calendarYear === year && row.month === selectedMonth);
      }
    };

    const sumByYear = (year: number, field: keyof typeof filteredData[0]) => {
      return getFilteredByPeriod(filteredData, year)
        .reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
    };

    const current = {
      volumeOriginal: sumByYear(currentYear, 'quantitySoldTotal'),
      volumeKg: sumByYear(currentYear, 'volumeKg'),
      revenue: sumByYear(currentYear, 'netSales'),
      cogs: sumByYear(currentYear, 'cogs'),
      margin: sumByYear(currentYear, 'margin'),
    };

    const previous = {
      volumeOriginal: sumByYear(previousYear, 'quantitySoldTotal'),
      volumeKg: sumByYear(previousYear, 'volumeKg'),
      revenue: sumByYear(previousYear, 'netSales'),
      cogs: sumByYear(previousYear, 'cogs'),
      margin: sumByYear(previousYear, 'margin'),
    };

    const calc = (metric: keyof typeof current) => {
      const curr = current[metric];
      const prev = previous[metric];
      const change = prev !== 0 ? ((curr - prev) / prev) * 100 : 0;
      return { current: curr, previous: prev, change };
    };

    // Calculate percentages
    const cogsPercentCurrent = current.revenue !== 0 ? (current.cogs / current.revenue) * 100 : 0;
    const cogsPercentPrevious = previous.revenue !== 0 ? (previous.cogs / previous.revenue) * 100 : 0;
    const cogsPercent = {
      current: cogsPercentCurrent,
      previous: cogsPercentPrevious,
      change: cogsPercentPrevious - cogsPercentCurrent,
    };

    const marginPercentCurrent = current.revenue !== 0 ? (current.margin / current.revenue) * 100 : 0;
    const marginPercentPrevious = previous.revenue !== 0 ? (previous.margin / previous.revenue) * 100 : 0;
    const marginPercent = {
      current: marginPercentCurrent,
      previous: marginPercentPrevious,
      change: marginPercentCurrent - marginPercentPrevious,
    };

    // Get ST-PERSONAL and ST-OPEX from PL field
    const getFilteredByPeriodPL = (year: number, plValue: string) => {
      if (selectedReport === "YTD") {
        return filteredData.filter(r => r.calendarYear === year && r.pl === plValue && parseInt(r.month, 10) <= selectedMonthNum);
      } else {
        return filteredData.filter(r => r.calendarYear === year && r.pl === plValue && r.month === selectedMonth);
      }
    };

    const stPersonalCurrent = getFilteredByPeriodPL(currentYear, 'ST-PERSONAL').reduce((s, r) => s + r.netSales, 0);
    const stPersonalPrevious = getFilteredByPeriodPL(previousYear, 'ST-PERSONAL').reduce((s, r) => s + r.netSales, 0);
    const stPersonal = {
      current: stPersonalCurrent,
      previous: stPersonalPrevious,
      change: stPersonalPrevious !== 0 ? ((stPersonalCurrent - stPersonalPrevious) / stPersonalPrevious) * 100 : 0,
    };
    
    const stPersonalPercentCurrent = current.revenue !== 0 ? (stPersonal.current / current.revenue) * 100 : 0;
    const stPersonalPercentPrevious = previous.revenue !== 0 ? (stPersonal.previous / previous.revenue) * 100 : 0;
    const stPersonalPercent = {
      current: stPersonalPercentCurrent,
      previous: stPersonalPercentPrevious,
      change: stPersonalPercentCurrent - stPersonalPercentPrevious,
    };

    const stOpexCurrent = getFilteredByPeriodPL(currentYear, 'ST-OPEX').reduce((s, r) => s + r.netSales, 0);
    const stOpexPrevious = getFilteredByPeriodPL(previousYear, 'ST-OPEX').reduce((s, r) => s + r.netSales, 0);
    const stOpex = {
      current: stOpexCurrent,
      previous: stOpexPrevious,
      change: stOpexPrevious !== 0 ? ((stOpexCurrent - stOpexPrevious) / stOpexPrevious) * 100 : 0,
    };

    const stOpexPercentCurrent = current.revenue !== 0 ? (stOpex.current / current.revenue) * 100 : 0;
    const stOpexPercentPrevious = previous.revenue !== 0 ? (stOpex.previous / previous.revenue) * 100 : 0;
    const stOpexPercent = {
      current: stOpexPercentCurrent,
      previous: stOpexPercentPrevious,
      change: stOpexPercentCurrent - stOpexPercentPrevious,
    };

    const commercialMarginCurrent = current.margin - stPersonal.current - stOpex.current;
    const commercialMarginPrevious = previous.margin - stPersonal.previous - stOpex.previous;
    const commercialMargin = {
      current: commercialMarginCurrent,
      previous: commercialMarginPrevious,
      change: commercialMarginPrevious !== 0 ? ((commercialMarginCurrent - commercialMarginPrevious) / commercialMarginPrevious) * 100 : 0,
    };

    const commercialMarginPercentCurrent = current.revenue !== 0 ? (commercialMargin.current / current.revenue) * 100 : 0;
    const commercialMarginPercentPrevious = previous.revenue !== 0 ? (commercialMargin.previous / previous.revenue) * 100 : 0;
    const commercialMarginPercent = {
      current: commercialMarginPercentCurrent,
      previous: commercialMarginPercentPrevious,
      change: commercialMarginPercentCurrent - commercialMarginPercentPrevious,
    };

    return {
      volumeOriginal: calc('volumeOriginal'),
      volumeKg: calc('volumeKg'),
      revenue: calc('revenue'),
      cogs: calc('cogs'),
      cogsPercent,
      margin: calc('margin'),
      marginPercent,
      stPersonal,
      stPersonalPercent,
      stOpex,
      stOpexPercent,
      commercialMargin,
      commercialMarginPercent,
    };
  }, [filteredData, isDataLoaded, selectedReport, selectedMonth, selectedMonthNum]);

  const monthlyChartData = useMemo(() => {
    if (!isDataLoaded) return [];

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const maxMonth = selectedReport === "YTD" ? selectedMonthNum : 12;
    
    return months.slice(0, maxMonth).map((month, idx) => {
      const monthNum = idx + 1;
      
      const monthKey = monthNum.toString().padStart(2, '0');
      const revenue2024 = filteredData
        .filter(r => r.calendarYear === 2024 && r.month === monthKey)
        .reduce((sum, r) => sum + r.netSales, 0) / 1000;
      
      const revenue2025 = filteredData
        .filter(r => r.calendarYear === 2025 && r.month === monthKey)
        .reduce((sum, r) => sum + r.netSales, 0) / 1000;

      const margin2024Data = filteredData.filter(r => r.calendarYear === 2024 && r.month === monthKey);
      const totalRevenue2024 = margin2024Data.reduce((sum, r) => sum + r.netSales, 0);
      const totalMargin2024 = margin2024Data.reduce((sum, r) => sum + r.margin, 0);
      const marginPercent2024 = totalRevenue2024 !== 0 ? (totalMargin2024 / totalRevenue2024) * 100 : 0;

      const margin2025Data = filteredData.filter(r => r.calendarYear === 2025 && r.month === monthKey);
      const totalRevenue2025 = margin2025Data.reduce((sum, r) => sum + r.netSales, 0);
      const totalMargin2025 = margin2025Data.reduce((sum, r) => sum + r.margin, 0);
      const marginPercent2025 = totalRevenue2025 !== 0 ? (totalMargin2025 / totalRevenue2025) * 100 : 0;

      return {
        month,
        revenue2024,
        revenue2025,
        margin2024: marginPercent2024,
        margin2025: marginPercent2025,
      };
    });
  }, [filteredData, isDataLoaded, selectedReport, selectedMonthNum]);

  if (!isDataLoaded || !plCalculations) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Chargez les données sur la page Téléchargement d'abord</p>
        </div>
      </Layout>
    );
  }

  const formatNumber = (num: number, decimals = 0) => {
    return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const formatPercent = (num: number, decimals = 1) => {
    return num.toFixed(decimals) + '%';
  };

  const ChangeIndicator = ({ value }: { value: number }) => {
    const isPositive = value > 0;
    return (
      <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        <span>{formatPercent(Math.abs(value))}</span>
      </div>
    );
  };

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const periodLabel = selectedReport === "YTD" 
    ? `YTD ${selectedMonth}.${monthNames[selectedMonthNum - 1]}`
    : `MTD ${selectedMonth}.${monthNames[selectedMonthNum - 1]}`;
  const storeLabel = selectedStore === "TOTAL" ? "" : ` - ${selectedStore}`;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">P&L {periodLabel}{storeLabel}</h2>
            <p className="text-muted-foreground">
              Compte de Résultat {selectedReport === "YTD" ? "Year-to-Date" : "Month-to-Date"}
            </p>
          </div>
          <ExportButtons
            data={[
              { Linha: "VOLUME original", ACT2025: plCalculations.volumeOriginal.current, ACT2024: plCalculations.volumeOriginal.previous, Variacao: plCalculations.volumeOriginal.change },
              { Linha: "VOLUME Kg", ACT2025: plCalculations.volumeKg.current, ACT2024: plCalculations.volumeKg.previous, Variacao: plCalculations.volumeKg.change },
              { Linha: "REVENUE", ACT2025: plCalculations.revenue.current, ACT2024: plCalculations.revenue.previous, Variacao: plCalculations.revenue.change },
              { Linha: "COGS", ACT2025: plCalculations.cogs.current, ACT2024: plCalculations.cogs.previous, Variacao: plCalculations.cogs.change },
              { Linha: "COGS % of REV", ACT2025: plCalculations.cogsPercent.current, ACT2024: plCalculations.cogsPercent.previous, Variacao: plCalculations.cogsPercent.change },
              { Linha: "MARGIN", ACT2025: plCalculations.margin.current, ACT2024: plCalculations.margin.previous, Variacao: plCalculations.margin.change },
              { Linha: "MARGIN %", ACT2025: plCalculations.marginPercent.current, ACT2024: plCalculations.marginPercent.previous, Variacao: plCalculations.marginPercent.change },
              { Linha: "ST-PERSONAL", ACT2025: plCalculations.stPersonal.current, ACT2024: plCalculations.stPersonal.previous, Variacao: plCalculations.stPersonal.change },
              { Linha: "ST-PERSONAL %", ACT2025: plCalculations.stPersonalPercent.current, ACT2024: plCalculations.stPersonalPercent.previous, Variacao: plCalculations.stPersonalPercent.change },
              { Linha: "ST-OPEX", ACT2025: plCalculations.stOpex.current, ACT2024: plCalculations.stOpex.previous, Variacao: plCalculations.stOpex.change },
              { Linha: "ST-OPEX %", ACT2025: plCalculations.stOpexPercent.current, ACT2024: plCalculations.stOpexPercent.previous, Variacao: plCalculations.stOpexPercent.change },
              { Linha: "COMMERCIAL MARGIN", ACT2025: plCalculations.commercialMargin.current, ACT2024: plCalculations.commercialMargin.previous, Variacao: plCalculations.commercialMargin.change },
              { Linha: "COMMERCIAL MARGIN %", ACT2025: plCalculations.commercialMarginPercent.current, ACT2024: plCalculations.commercialMarginPercent.previous, Variacao: plCalculations.commercialMarginPercent.change },
            ]}
            columns={[
              { key: 'Linha', label: `P&L ${periodLabel}` },
              { key: 'ACT2025', label: 'ACT 2025' },
              { key: 'ACT2024', label: 'ACT 2024' },
              { key: 'Variacao', label: '% vs LY' },
            ]}
            title={`P&L ${periodLabel}${storeLabel}`}
            fileName={`PL_${selectedReport}_${selectedMonth}`}
            chartRef={chartRef}
            chartConfigs={[
              {
                type: 'column',
                title: 'REVENUE vs. MARGIN',
                categoryKey: 'month',
                data: monthlyChartData.map(d => ({
                  label: d.month,
                  month: d.month,
                  revenue2024: d.revenue2024,
                  revenue2025: d.revenue2025,
                  margin2024: d.margin2024,
                  margin2025: d.margin2025,
                })),
                series: [
                  { key: 'revenue2024', name: 'Revenue 2024' },
                  { key: 'revenue2025', name: 'Revenue 2025' },
                  { key: 'margin2024', name: 'Margin % 2024' },
                  { key: 'margin2025', name: 'Margin % 2025' },
                ]
              }
            ]}
          />
        </div>

        {/* Filters */}
        <div className="bg-card border rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Loja:</label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar loja" />
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

        <div className="grid gap-6 grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>P&L {periodLabel}{storeLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">P&L {periodLabel}</TableHead>
                    <TableHead className="text-right font-bold">ACT 2025</TableHead>
                    <TableHead className="text-right font-bold">ACT 2024</TableHead>
                    <TableHead className="text-right font-bold">% vs LY</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">VOLUME original</TableCell>
                    <TableCell className="text-right">{formatNumber(plCalculations.volumeOriginal.current)}</TableCell>
                    <TableCell className="text-right">{formatNumber(plCalculations.volumeOriginal.previous)}</TableCell>
                    <TableCell className="text-right"><ChangeIndicator value={plCalculations.volumeOriginal.change} /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">VOLUME Kg</TableCell>
                    <TableCell className="text-right">{formatNumber(plCalculations.volumeKg.current)}</TableCell>
                    <TableCell className="text-right">{formatNumber(plCalculations.volumeKg.previous)}</TableCell>
                    <TableCell className="text-right"><ChangeIndicator value={plCalculations.volumeKg.change} /></TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/5">
                    <TableCell className="font-bold">REVENUE</TableCell>
                    <TableCell className="text-right font-bold">{formatNumber(plCalculations.revenue.current)}</TableCell>
                    <TableCell className="text-right font-bold">{formatNumber(plCalculations.revenue.previous)}</TableCell>
                    <TableCell className="text-right"><ChangeIndicator value={plCalculations.revenue.change} /></TableCell>
                  </TableRow>
                  <TableRow className="text-muted-foreground text-sm">
                    <TableCell>RPU</TableCell>
                    <TableCell className="text-right">{formatNumber(plCalculations.revenue.current / plCalculations.volumeOriginal.current, 1)}</TableCell>
                    <TableCell className="text-right">{formatNumber(plCalculations.revenue.previous / plCalculations.volumeOriginal.previous, 1)}</TableCell>
                    <TableCell className="text-right"></TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/5">
                    <TableCell className="font-bold">COGS</TableCell>
                    <TableCell className="text-right font-bold">{formatNumber(plCalculations.cogs.current)}</TableCell>
                    <TableCell className="text-right font-bold">{formatNumber(plCalculations.cogs.previous)}</TableCell>
                    <TableCell className="text-right"><ChangeIndicator value={plCalculations.cogs.change} /></TableCell>
                  </TableRow>
                  <TableRow className="text-muted-foreground text-sm">
                    <TableCell>RPU</TableCell>
                    <TableCell className="text-right">{formatNumber(plCalculations.cogs.current / plCalculations.volumeOriginal.current, 1)}</TableCell>
                    <TableCell className="text-right">{formatNumber(plCalculations.cogs.previous / plCalculations.volumeOriginal.previous, 1)}</TableCell>
                    <TableCell className="text-right"></TableCell>
                  </TableRow>
                  <TableRow className="text-muted-foreground text-sm">
                    <TableCell>% of REV</TableCell>
                    <TableCell className="text-right">{formatPercent(plCalculations.cogsPercent.current)}</TableCell>
                    <TableCell className="text-right">{formatPercent(plCalculations.cogsPercent.previous)}</TableCell>
                    <TableCell className="text-right"><ChangeIndicator value={plCalculations.cogsPercent.change} /></TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/5">
                    <TableCell className="font-bold">MARGIN</TableCell>
                    <TableCell className="text-right font-bold">{formatNumber(plCalculations.margin.current)}</TableCell>
                    <TableCell className="text-right font-bold">{formatNumber(plCalculations.margin.previous)}</TableCell>
                    <TableCell className="text-right"><ChangeIndicator value={plCalculations.margin.change} /></TableCell>
                  </TableRow>
                  <TableRow className="text-muted-foreground text-sm">
                    <TableCell>RPU</TableCell>
                    <TableCell className="text-right">{formatNumber(plCalculations.margin.current / plCalculations.volumeOriginal.current, 1)}</TableCell>
                    <TableCell className="text-right">{formatNumber(plCalculations.margin.previous / plCalculations.volumeOriginal.previous, 1)}</TableCell>
                    <TableCell className="text-right"></TableCell>
                  </TableRow>
                  <TableRow className="text-muted-foreground text-sm">
                    <TableCell>% of REV</TableCell>
                    <TableCell className="text-right">{formatPercent(plCalculations.marginPercent.current)}</TableCell>
                    <TableCell className="text-right">{formatPercent(plCalculations.marginPercent.previous)}</TableCell>
                    <TableCell className="text-right"><ChangeIndicator value={plCalculations.marginPercent.change} /></TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/5">
                    <TableCell className="font-bold">ST-PERSONAL</TableCell>
                    <TableCell className="text-right font-bold">{formatNumber(plCalculations.stPersonal.current)}</TableCell>
                    <TableCell className="text-right font-bold">{formatNumber(plCalculations.stPersonal.previous)}</TableCell>
                    <TableCell className="text-right"><ChangeIndicator value={plCalculations.stPersonal.change} /></TableCell>
                  </TableRow>
                  <TableRow className="text-muted-foreground text-sm">
                    <TableCell>% of REV</TableCell>
                    <TableCell className="text-right">{formatPercent(plCalculations.stPersonalPercent.current)}</TableCell>
                    <TableCell className="text-right">{formatPercent(plCalculations.stPersonalPercent.previous)}</TableCell>
                    <TableCell className="text-right"></TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/5">
                    <TableCell className="font-bold">ST-OPEX</TableCell>
                    <TableCell className="text-right font-bold">{formatNumber(plCalculations.stOpex.current)}</TableCell>
                    <TableCell className="text-right font-bold">{formatNumber(plCalculations.stOpex.previous)}</TableCell>
                    <TableCell className="text-right"><ChangeIndicator value={plCalculations.stOpex.change} /></TableCell>
                  </TableRow>
                  <TableRow className="text-muted-foreground text-sm">
                    <TableCell>% of REV</TableCell>
                    <TableCell className="text-right">{formatPercent(plCalculations.stOpexPercent.current)}</TableCell>
                    <TableCell className="text-right">{formatPercent(plCalculations.stOpexPercent.previous)}</TableCell>
                    <TableCell className="text-right"></TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/5">
                    <TableCell className="font-bold">COMMERCIAL MARGIN</TableCell>
                    <TableCell className="text-right font-bold">{formatNumber(plCalculations.commercialMargin.current)}</TableCell>
                    <TableCell className="text-right font-bold">{formatNumber(plCalculations.commercialMargin.previous)}</TableCell>
                    <TableCell className="text-right"><ChangeIndicator value={plCalculations.commercialMargin.change} /></TableCell>
                  </TableRow>
                  <TableRow className="text-muted-foreground text-sm">
                    <TableCell>RPU</TableCell>
                    <TableCell className="text-right">{formatNumber(plCalculations.commercialMargin.current / plCalculations.volumeOriginal.current, 1)}</TableCell>
                    <TableCell className="text-right">{formatNumber(plCalculations.commercialMargin.previous / plCalculations.volumeOriginal.previous, 1)}</TableCell>
                    <TableCell className="text-right"></TableCell>
                  </TableRow>
                  <TableRow className="text-muted-foreground text-sm">
                    <TableCell>% of REV</TableCell>
                    <TableCell className="text-right">{formatPercent(plCalculations.commercialMarginPercent.current)}</TableCell>
                    <TableCell className="text-right">{formatPercent(plCalculations.commercialMarginPercent.previous)}</TableCell>
                    <TableCell className="text-right"></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div ref={chartRef}>
          <Card>
            <CardHeader>
              <CardTitle>REVENUE vs. MARGIN</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  revenue2024: { label: "Revenue 2024", color: "hsl(200, 70%, 45%)" },
                  revenue2025: { label: "Revenue 2025", color: "hsl(25, 90%, 65%)" },
                  margin2024: { label: "Margin % 2024", color: "hsl(150, 60%, 45%)" },
                  margin2025: { label: "Margin % 2025", color: "hsl(190, 80%, 50%)" },
                }}
                className="h-[500px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyChartData} margin={{ top: 40, right: 30, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" label={{ value: '', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${Math.round(v)}%`} domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        if (name.includes('Revenue')) {
                          return [`${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`, name];
                        }
                        return [`${Number(value).toFixed(1)}%`, name];
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="center" 
                      wrapperStyle={{ paddingBottom: '20px' }}
                    />
                    <Bar yAxisId="left" dataKey="revenue2024" fill="hsl(200, 70%, 45%)" name="Revenue 2024">
                      <LabelList 
                        dataKey="revenue2024" 
                        position="top" 
                        formatter={(value: number) => value > 0 ? Math.round(value) : ''}
                        style={{ fontSize: '11px', fontWeight: 'bold' }}
                      />
                    </Bar>
                    <Bar yAxisId="left" dataKey="revenue2025" fill="hsl(25, 90%, 65%)" name="Revenue 2025">
                      <LabelList 
                        dataKey="revenue2025" 
                        position="top" 
                        formatter={(value: number) => value > 0 ? Math.round(value) : ''}
                        style={{ fontSize: '11px', fontWeight: 'bold' }}
                      />
                    </Bar>
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="margin2024" 
                      stroke="hsl(150, 60%, 45%)" 
                      name="Margin % 2024" 
                      strokeWidth={3} 
                      dot={{ fill: 'hsl(150, 60%, 45%)', r: 4 }}
                    >
                      <LabelList 
                        dataKey="margin2024" 
                        position="top"
                        formatter={(value: number) => value > 0 ? `${value.toFixed(1)}%` : ''}
                        style={{ 
                          fontSize: '10px', 
                          fontWeight: 'bold',
                          fill: 'hsl(150, 60%, 35%)'
                        }}
                        content={(props: any) => {
                          const { x, y, value } = props;
                          if (!value || value === 0) return null;
                          return (
                            <g>
                              <rect 
                                x={x - 18} 
                                y={y - 18} 
                                width={36} 
                                height={16} 
                                fill="hsl(150, 60%, 85%)" 
                                stroke="hsl(150, 60%, 45%)"
                                strokeWidth={1}
                                rx={3}
                              />
                              <text 
                                x={x} 
                                y={y - 6} 
                                textAnchor="middle" 
                                fill="hsl(150, 60%, 25%)"
                                fontSize="10"
                                fontWeight="bold"
                              >
                                {`${value.toFixed(1)}%`}
                              </text>
                            </g>
                          );
                        }}
                      />
                    </Line>
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="margin2025" 
                      stroke="hsl(190, 80%, 50%)" 
                      name="Margin % 2025" 
                      strokeWidth={3} 
                      dot={{ fill: 'hsl(190, 80%, 50%)', r: 4 }}
                    >
                      <LabelList 
                        dataKey="margin2025"
                        position="top"
                        content={(props: any) => {
                          const { x, y, value } = props;
                          if (!value || value === 0) return null;
                          return (
                            <g>
                              <rect 
                                x={x - 18} 
                                y={y - 36} 
                                width={36} 
                                height={16} 
                                fill="hsl(190, 80%, 85%)" 
                                stroke="hsl(190, 80%, 50%)"
                                strokeWidth={1}
                                rx={3}
                              />
                              <text 
                                x={x} 
                                y={y - 24} 
                                textAnchor="middle" 
                                fill="hsl(190, 80%, 25%)"
                                fontSize="10"
                                fontWeight="bold"
                              >
                                {`${value.toFixed(1)}%`}
                              </text>
                            </g>
                          );
                        }}
                      />
                    </Line>
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default PL;
