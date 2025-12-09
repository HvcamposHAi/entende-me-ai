import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { useData } from "@/contexts/DataContext";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { useTracking } from "@/hooks/useTracking";
import { ExportButtons } from "@/components/ExportButtons";

const EVAReport = () => {
  useTracking();
  const { data, isDataLoaded } = useData();

  const currentYear = 2025;
  const previousYear = 2024;

  // Calculate macro-family data
  const macroFamilyData = useMemo(() => {
    if (!isDataLoaded) return [];

    const familyMap = new Map();

    data.forEach(row => {
      const family = row.macroFamilyName;
      if (!familyMap.has(family)) {
        familyMap.set(family, {
          family,
          volumeKg: 0,
          revenue: 0,
          cogs: 0,
          margin: 0,
          volumeKgPrev: 0,
          revenuePrev: 0,
          cogsPrev: 0,
          marginPrev: 0,
        });
      }
      
      const entry = familyMap.get(family);
      if (row.calendarYear === currentYear) {
        entry.volumeKg += row.volumeKg || 0;
        entry.revenue += row.netSales || 0;
        entry.cogs += row.cogs || 0;
        entry.margin += row.margin || 0;
      } else if (row.calendarYear === previousYear) {
        entry.volumeKgPrev += row.volumeKg || 0;
        entry.revenuePrev += row.netSales || 0;
        entry.cogsPrev += row.cogs || 0;
        entry.marginPrev += row.margin || 0;
      }
    });

    return Array.from(familyMap.values());
  }, [data, isDataLoaded]);

  const evaMarginData = useMemo(() => {
    if (!isDataLoaded) return null;

    // Calculate totals for each year (excluding Barista)
    const calculateYearTotals = (year: number) => {
      const yearData = data.filter(row => 
        row.calendarYear === year && 
        row.macroFamilyName !== 'Barista'
      );
      return {
        volumeKg: yearData.reduce((sum, r) => sum + (r.volumeKg || 0), 0),
        revenue: yearData.reduce((sum, r) => sum + (r.netSales || 0), 0),
        cogs: yearData.reduce((sum, r) => sum + (r.cogs || 0), 0),
        margin: yearData.reduce((sum, r) => sum + (r.margin || 0), 0),
      };
    };

    const current = calculateYearTotals(currentYear);
    const previous = calculateYearTotals(previousYear);

    // Calculate average prices (revenue/volume)
    const prevPrice = previous.volumeKg > 0 ? previous.revenue / previous.volumeKg : 0;
    const currPrice = current.volumeKg > 0 ? current.revenue / current.volumeKg : 0;

    // Calculate average COGS per unit
    const prevCogsPerUnit = previous.volumeKg > 0 ? previous.cogs / previous.volumeKg : 0;
    const currCogsPerUnit = current.volumeKg > 0 ? current.cogs / current.volumeKg : 0;

    // EVA decomposition
    const prevMarginPerUnit = previous.volumeKg > 0 ? previous.margin / previous.volumeKg : 0;
    const volEffect = (current.volumeKg - previous.volumeKg) * prevMarginPerUnit;
    const priceEffect = current.volumeKg * (currPrice - prevPrice);
    const cogsEffect = -current.volumeKg * (currCogsPerUnit - prevCogsPerUnit);
    const totalMarginChange = current.margin - previous.margin;
    const mixEffect = totalMarginChange - volEffect - priceEffect - cogsEffect;

    return {
      previousMargin: previous.margin,
      currentMargin: current.margin,
      previousVolume: previous.volumeKg,
      currentVolume: current.volumeKg,
      previousRevenue: previous.revenue,
      currentRevenue: current.revenue,
      volEffect,
      mixEffect,
      priceEffect,
      cogsEffect,
    };
  }, [data, isDataLoaded]);

  // Volume Waterfall by Macro-Family (excluding Barista)
  const volumeWaterfallData = useMemo(() => {
    if (!evaMarginData || macroFamilyData.length === 0) return [];

    const familiesWithoutBarista = macroFamilyData.filter(f => f.family !== 'Barista');
    
    const contributions = familiesWithoutBarista.map(f => ({
      name: f.family,
      change: f.volumeKg - f.volumeKgPrev,
    })).filter(f => Math.abs(f.change) > 0)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    const result = [];
    let cumulative = evaMarginData.previousVolume;

    // Starting bar (2024)
    result.push({
      name: '2024',
      base: 0,
      value: evaMarginData.previousVolume,
      total: evaMarginData.previousVolume,
      color: '#4a7c59',
      isEndpoint: true,
      displayValue: evaMarginData.previousVolume,
    });

    // Intermediate changes by macro-family
    contributions.forEach((item) => {
      const isPositive = item.change >= 0;
      const base = isPositive ? cumulative : cumulative + item.change;
      result.push({
        name: item.name,
        base: base,
        value: Math.abs(item.change),
        total: cumulative + item.change,
        color: isPositive ? '#1e4a5f' : '#d97706',
        isPositive,
        isEndpoint: false,
        displayValue: item.change,
      });
      cumulative += item.change;
    });

    // Ending bar (2025)
    result.push({
      name: '2025',
      base: 0,
      value: evaMarginData.currentVolume,
      total: evaMarginData.currentVolume,
      color: '#22c55e',
      isEndpoint: true,
      displayValue: evaMarginData.currentVolume,
    });

    return result;
  }, [evaMarginData, macroFamilyData]);

  // Revenue Waterfall by Macro-Family
  const revenueWaterfallData = useMemo(() => {
    if (!evaMarginData || macroFamilyData.length === 0) return [];

    const contributions = macroFamilyData.map(f => ({
      name: f.family,
      change: f.revenue - f.revenuePrev,
    })).filter(f => Math.abs(f.change) > 0)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    const result = [];
    let cumulative = evaMarginData.previousRevenue;

    // Starting bar (2024)
    result.push({
      name: '2024',
      base: 0,
      value: evaMarginData.previousRevenue,
      total: evaMarginData.previousRevenue,
      color: '#4a7c59',
      isEndpoint: true,
      displayValue: evaMarginData.previousRevenue,
    });

    // Intermediate changes by macro-family
    contributions.forEach((item) => {
      const isPositive = item.change >= 0;
      const base = isPositive ? cumulative : cumulative + item.change;
      result.push({
        name: item.name,
        base: base,
        value: Math.abs(item.change),
        total: cumulative + item.change,
        color: isPositive ? '#1e4a5f' : '#d97706',
        isPositive,
        isEndpoint: false,
        displayValue: item.change,
      });
      cumulative += item.change;
    });

    // Ending bar (2025)
    result.push({
      name: '2025',
      base: 0,
      value: evaMarginData.currentRevenue,
      total: evaMarginData.currentRevenue,
      color: '#22c55e',
      isEndpoint: true,
      displayValue: evaMarginData.currentRevenue,
    });

    return result;
  }, [evaMarginData, macroFamilyData]);

  // Margin Waterfall (Vol, Mix, Rev, COGS)
  const marginWaterfallData = useMemo(() => {
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
        color: evaMarginData.volEffect >= 0 ? '#d97706' : '#d97706',
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

  if (!isDataLoaded || !evaMarginData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Carregue os dados na página Upload primeiro</p>
        </div>
      </Layout>
    );
  }

  const formatNumber = (num: number, decimals = 0) => {
    const absNum = Math.abs(num);
    const formatted = absNum.toLocaleString('pt-BR', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
    return num < 0 ? `(${formatted})` : formatted;
  };

  const formatNumberThousands = (num: number, decimals = 3) => {
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
        fontSize={10}
        fontWeight="bold"
        fill="#374151"
      >
        {formattedValue}
      </text>
    );
  };

  const CustomLabelThousands = (props: any) => {
    const { x, y, width, payload } = props;
    if (!payload) return null;
    
    const displayValue = payload.displayValue;
    const formattedValue = formatNumberThousands(displayValue);
    
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

  const exportData = [
    ...marginWaterfallData.map(item => ({
      Gráfico: 'EVA Margin',
      Categoria: item.name,
      Valor: item.displayValue,
    })),
    ...volumeWaterfallData.map(item => ({
      Gráfico: 'EVA Volume',
      Categoria: item.name,
      Valor: item.displayValue,
    })),
    ...revenueWaterfallData.map(item => ({
      Gráfico: 'EVA Revenue',
      Categoria: item.name,
      Valor: item.displayValue,
    })),
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Relatório EVA</h2>
            <p className="text-muted-foreground">
              EVA Margin - Total - YTD 06.Jun
            </p>
          </div>
          <ExportButtons
            data={exportData}
            title="EVA Report"
            fileName="EVA_Report"
          />
        </div>

        {/* EVA Margin Chart */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-center text-lg font-bold" style={{ color: '#4a7c59' }}>
              EVA MARGIN - TOTAL - YTD 06.Jun
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="w-full h-[350px] md:h-[400px]">
              <ChartContainer
                config={{
                  value: { label: "Margin", color: "hsl(var(--chart-1))" },
                }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={marginWaterfallData} 
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
                                Valor: {formatNumberThousands(data.displayValue)}
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
                      label={<CustomLabelThousands />}
                    >
                      {marginWaterfallData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Volume and Revenue Charts Side by Side */}
        <div className="grid gap-6 md:grid-cols-1 xl:grid-cols-2">
          {/* EVA Volume Chart */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-center text-sm md:text-base font-bold" style={{ color: '#4a7c59' }}>
                EVA VOLUME (Kg) BY MACRO-FAMILY (w/o Barista)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="w-full h-[300px] md:h-[350px]">
                <ChartContainer
                  config={{
                    value: { label: "Volume Kg", color: "hsl(var(--chart-1))" },
                  }}
                  className="h-full w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={volumeWaterfallData} 
                      margin={{ top: 30, right: 10, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: '#374151' }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        axisLine={{ stroke: '#9ca3af' }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        axisLine={{ stroke: '#9ca3af' }}
                        tickLine={false}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border border-border p-2 rounded shadow-lg">
                                <p className="font-semibold">{data.name}</p>
                                <p className="text-sm">Valor: {formatNumber(data.displayValue)}</p>
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
                        {volumeWaterfallData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* EVA Revenue Chart */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-center text-sm md:text-base font-bold" style={{ color: '#4a7c59' }}>
                EVA REVENUE BY MACRO-FAMILY
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="w-full h-[300px] md:h-[350px]">
                <ChartContainer
                  config={{
                    value: { label: "Revenue", color: "hsl(var(--chart-1))" },
                  }}
                  className="h-full w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={revenueWaterfallData} 
                      margin={{ top: 30, right: 10, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: '#374151' }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        axisLine={{ stroke: '#9ca3af' }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        axisLine={{ stroke: '#9ca3af' }}
                        tickLine={false}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border border-border p-2 rounded shadow-lg">
                                <p className="font-semibold">{data.name}</p>
                                <p className="text-sm">Valor: {formatNumber(data.displayValue)}</p>
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
                        {revenueWaterfallData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>Decomposição da Margem EVA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {marginWaterfallData.map((item) => (
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
                    {formatNumberThousands(item.displayValue)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default EVAReport;
