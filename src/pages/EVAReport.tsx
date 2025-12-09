import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { useData } from "@/contexts/DataContext";
import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { useTracking } from "@/hooks/useTracking";
import { ExportButtons } from "@/components/ExportButtons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const EVAReport = () => {
  useTracking();
  const { data, isDataLoaded } = useData();

  // Filter states
  const [selectedStore, setSelectedStore] = useState<string>("TOTAL");
  const [selectedReport, setSelectedReport] = useState<string>("YTD");
  const [selectedMonth, setSelectedMonth] = useState<string>("06");
  const [selectedMacroFamily, setSelectedMacroFamily] = useState<string>("TOTAL");

  // Get unique values for filters
  const filterOptions = useMemo(() => {
    if (!isDataLoaded) return { stores: [] as string[], macroFamilies: [] as string[], months: [] as number[] };

    const stores = [...new Set(data.map(row => row.nom).filter(Boolean))].sort() as string[];
    const macroFamilies = [...new Set(data.map(row => row.macroFamilyName).filter(Boolean))].sort() as string[];
    const monthsSet = new Set<number>();
    data.forEach(row => {
      if (row.month != null) monthsSet.add(Number(row.month));
    });
    const months = [...monthsSet].sort((a, b) => a - b);

    return { stores, macroFamilies, months };
  }, [data, isDataLoaded]);

  const monthNames: { [key: number]: string } = {
    1: '01.Jan', 2: '02.Feb', 3: '03.Mar', 4: '04.Apr',
    5: '05.May', 6: '06.Jun', 7: '07.Jul', 8: '08.Aug',
    9: '09.Sep', 10: '10.Oct', 11: '11.Nov', 12: '12.Dec'
  };

  const evaMarginData = useMemo(() => {
    if (!isDataLoaded) return null;

    const currentYear = 2025;
    const previousYear = 2024;

    // Calculate totals for each year with filters applied
    const calculateYearTotals = (year: number) => {
      let yearData = data.filter(row => 
        row.calendarYear === year && 
        row.macroFamilyName !== 'Barista'
      );

      // Apply store filter
      if (selectedStore !== "TOTAL") {
        yearData = yearData.filter(row => row.nom === selectedStore);
      }

      // Apply macro-family filter
      if (selectedMacroFamily !== "TOTAL") {
        yearData = yearData.filter(row => row.macroFamilyName === selectedMacroFamily);
      }

      // Apply report type filter (YTD or Month)
      if (selectedReport === "YTD") {
        const maxMonth = parseInt(selectedMonth);
        yearData = yearData.filter(row => Number(row.month) <= maxMonth);
      } else if (selectedReport === "Month") {
        yearData = yearData.filter(row => Number(row.month) === parseInt(selectedMonth));
      }

      return {
        volumeKg: yearData.reduce((sum, r) => sum + (r.volumeKg || 0), 0),
        netSales: yearData.reduce((sum, r) => sum + (r.netSales || 0), 0),
        cogs: yearData.reduce((sum, r) => sum + (r.cogs || 0), 0),
        margin: yearData.reduce((sum, r) => sum + (r.margin || 0), 0),
      };
    };

    const yr2024 = calculateYearTotals(previousYear);
    const yr2025 = calculateYearTotals(currentYear);

    // Avoid division by zero
    if (yr2024.volumeKg === 0 || yr2025.volumeKg === 0) {
      return null;
    }

    // 1. vs. Vol (Variação por Volume)
    const marginPorKg2024 = yr2024.margin / yr2024.volumeKg;
    const variacaoVolume = yr2025.volumeKg - yr2024.volumeKg;
    const vsVol = variacaoVolume * marginPorKg2024;

    // 2. Mix (Efeito Mix de Produtos)
    const marginPorKg2025 = yr2025.margin / yr2025.volumeKg;
    const diferencaMargemUnitaria = marginPorKg2025 - marginPorKg2024;
    const mix = variacaoVolume * diferencaMargemUnitaria;

    // 3. vs. Net Revenue (Variação por Preço)
    const precoPorKg2024 = yr2024.netSales / yr2024.volumeKg;
    const precoPorKg2025 = yr2025.netSales / yr2025.volumeKg;
    const diferencaPreco = precoPorKg2025 - precoPorKg2024;
    const vsRevenue = yr2025.volumeKg * diferencaPreco;

    // 4. vs. COGS (Variação por Custo)
    const custoPorKg2024 = yr2024.cogs / yr2024.volumeKg;
    const custoPorKg2025 = yr2025.cogs / yr2025.volumeKg;
    const diferencaCusto = custoPorKg2025 - custoPorKg2024;
    const vsCOGS = -(yr2025.volumeKg * diferencaCusto);

    return {
      previousMargin: yr2024.margin,
      currentMargin: yr2025.margin,
      volEffect: vsVol,
      mixEffect: mix,
      priceEffect: vsRevenue,
      cogsEffect: vsCOGS,
      currentYear,
      previousYear,
    };
  }, [data, isDataLoaded, selectedStore, selectedReport, selectedMonth, selectedMacroFamily]);

  const waterfallData = useMemo(() => {
    if (!evaMarginData) return [];

    const formatValue = (val: number) => val / 1000;

    return [
      {
        name: '2024',
        value: formatValue(evaMarginData.previousMargin),
        base: 0,
        total: formatValue(evaMarginData.previousMargin),
        color: '#4a7c59',
        isEndpoint: true,
        displayValue: formatValue(evaMarginData.previousMargin),
      },
      {
        name: 'Vol',
        value: formatValue(Math.abs(evaMarginData.volEffect)),
        base: evaMarginData.volEffect >= 0 
          ? formatValue(evaMarginData.previousMargin)
          : formatValue(evaMarginData.previousMargin + evaMarginData.volEffect),
        total: formatValue(evaMarginData.previousMargin + evaMarginData.volEffect),
        color: '#d97706',
        isPositive: evaMarginData.volEffect >= 0,
        isEndpoint: false,
        displayValue: formatValue(evaMarginData.volEffect),
      },
      {
        name: 'Mix',
        value: formatValue(Math.abs(evaMarginData.mixEffect)),
        base: (() => {
          const cumulative = evaMarginData.previousMargin + evaMarginData.volEffect;
          return evaMarginData.mixEffect >= 0 
            ? formatValue(cumulative)
            : formatValue(cumulative + evaMarginData.mixEffect);
        })(),
        total: formatValue(evaMarginData.previousMargin + evaMarginData.volEffect + evaMarginData.mixEffect),
        color: '#1e4a5f',
        isPositive: evaMarginData.mixEffect >= 0,
        isEndpoint: false,
        displayValue: formatValue(evaMarginData.mixEffect),
      },
      {
        name: 'Rev',
        value: formatValue(Math.abs(evaMarginData.priceEffect)),
        base: (() => {
          const cumulative = evaMarginData.previousMargin + evaMarginData.volEffect + evaMarginData.mixEffect;
          return evaMarginData.priceEffect >= 0 
            ? formatValue(cumulative)
            : formatValue(cumulative + evaMarginData.priceEffect);
        })(),
        total: formatValue(evaMarginData.previousMargin + evaMarginData.volEffect + evaMarginData.mixEffect + evaMarginData.priceEffect),
        color: '#1e4a5f',
        isPositive: evaMarginData.priceEffect >= 0,
        isEndpoint: false,
        displayValue: formatValue(evaMarginData.priceEffect),
      },
      {
        name: 'COGS',
        value: formatValue(Math.abs(evaMarginData.cogsEffect)),
        base: (() => {
          const cumulative = evaMarginData.previousMargin + evaMarginData.volEffect + evaMarginData.mixEffect + evaMarginData.priceEffect;
          return evaMarginData.cogsEffect >= 0 
            ? formatValue(cumulative)
            : formatValue(cumulative + evaMarginData.cogsEffect);
        })(),
        total: formatValue(evaMarginData.previousMargin + evaMarginData.volEffect + evaMarginData.mixEffect + evaMarginData.priceEffect + evaMarginData.cogsEffect),
        color: '#d97706',
        isPositive: evaMarginData.cogsEffect >= 0,
        isEndpoint: false,
        displayValue: formatValue(evaMarginData.cogsEffect),
      },
      {
        name: '2025',
        value: formatValue(evaMarginData.currentMargin),
        base: 0,
        total: formatValue(evaMarginData.currentMargin),
        color: '#22c55e',
        isEndpoint: true,
        displayValue: formatValue(evaMarginData.currentMargin),
      },
    ];
  }, [evaMarginData]);

  const formatNumber = (num: number, decimals = 3) => {
    const absNum = Math.abs(num);
    const formatted = absNum.toLocaleString('pt-BR', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
    return num < 0 ? `(${formatted})` : formatted;
  };

  const CustomLabel = (props: any) => {
    const { x, y, width, payload } = props;
    if (!payload) return null;
    
    const displayValue = payload.displayValue;
    const formattedValue = formatNumber(displayValue);
    
    return (
      <text 
        x={x + width / 2} 
        y={y - 8} 
        textAnchor="middle" 
        fontSize={12}
        fontWeight="bold"
        fill="#374151"
      >
        {formattedValue}
      </text>
    );
  };

  const getReportTitle = () => {
    const storeLabel = selectedStore === "TOTAL" ? "Total" : selectedStore;
    const macroLabel = selectedMacroFamily === "TOTAL" ? "TOTAL" : selectedMacroFamily;
    const monthLabel = monthNames[parseInt(selectedMonth)] || selectedMonth;
    const reportLabel = selectedReport === "YTD" ? `YTD ${monthLabel}` : monthLabel;
    
    return `EVA MARGIN - ${storeLabel} - ${macroLabel} - ${reportLabel}`;
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

  const exportData = waterfallData.map(item => ({
    Categoria: item.name,
    Valor: item.displayValue,
    Tipo: item.isEndpoint ? 'Total' : (item.isPositive ? 'Positivo' : 'Negativo'),
  }));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Relatório EVA</h2>
            <p className="text-muted-foreground">{getReportTitle()}</p>
          </div>
          <ExportButtons
            data={exportData}
            title="EVA Margin Report"
            fileName="EVA_Margin_Report"
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store-filter" className="text-sm font-medium">Store:</Label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger id="store-filter">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOTAL">TOTAL</SelectItem>
                    {filterOptions.stores.map(store => (
                      <SelectItem key={store} value={store}>{store}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-filter" className="text-sm font-medium">Report:</Label>
                <Select value={selectedReport} onValueChange={setSelectedReport}>
                  <SelectTrigger id="report-filter">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YTD">YTD</SelectItem>
                    <SelectItem value="Month">Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="month-filter" className="text-sm font-medium">Month:</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger id="month-filter">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.months.map(month => (
                      <SelectItem key={month} value={String(month)}>
                        {monthNames[month] || `${month}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="macrofamily-filter" className="text-sm font-medium">Macro-Family:</Label>
                <Select value={selectedMacroFamily} onValueChange={setSelectedMacroFamily}>
                  <SelectTrigger id="macrofamily-filter">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOTAL">TOTAL</SelectItem>
                    {filterOptions.macroFamilies
                      .filter(mf => mf !== 'Barista')
                      .map(macroFamily => (
                        <SelectItem key={macroFamily} value={macroFamily}>{macroFamily}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {!evaMarginData ? (
          <Card className="border-2">
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                Sem dados disponíveis para os filtros selecionados
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-2">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-center text-lg font-bold" style={{ color: '#4a7c59' }}>
                  {getReportTitle()}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="w-full h-[400px] md:h-[500px]">
                  <ChartContainer
                    config={{
                      value: { label: "Margin", color: "hsl(var(--chart-1))" },
                    }}
                    className="h-full w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={waterfallData} 
                        margin={{ top: 40, right: 30, left: 30, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 14, fontWeight: 'bold', fill: '#374151' }}
                          axisLine={{ stroke: '#9ca3af' }}
                          tickLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          axisLine={{ stroke: '#9ca3af' }}
                          tickLine={false}
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
                                  <p className="font-bold text-foreground">{data.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Valor: {formatNumber(data.displayValue)}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="base" stackId="a" fill="transparent" />
                        <Bar 
                          dataKey="value" 
                          stackId="a"
                          label={<CustomLabel />}
                        >
                          {waterfallData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Decomposição da Margem EVA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {waterfallData.map((item) => (
                    <div 
                      key={item.name}
                      className="p-4 rounded-lg text-center"
                      style={{ 
                        backgroundColor: `${item.color}15`,
                        borderLeft: `4px solid ${item.color}`
                      }}
                    >
                      <p className="text-sm text-muted-foreground font-medium">{item.name}</p>
                      <p 
                        className="text-xl font-bold"
                        style={{ color: item.displayValue < 0 ? '#dc2626' : '#374151' }}
                      >
                        {formatNumber(item.displayValue)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default EVAReport;