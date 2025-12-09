import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { useData } from "@/contexts/DataContext";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { useTracking } from "@/hooks/useTracking";
import { ExportButtons } from "@/components/ExportButtons";

const EVAReport = () => {
  useTracking();
  const { data, isDataLoaded } = useData();

  const evaMarginData = useMemo(() => {
    if (!isDataLoaded) return null;

    const currentYear = 2025;
    const previousYear = 2024;

    // Calculate totals for each year (excluding Barista)
    const calculateYearTotals = (year: number) => {
      const yearData = data.filter(row => 
        row.calendarYear === year && 
        row.macroFamilyName !== 'Barista'
      );
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
    // Quanto a margem mudou APENAS porque vendemos mais ou menos kg
    const marginPorKg2024 = yr2024.margin / yr2024.volumeKg;
    const variacaoVolume = yr2025.volumeKg - yr2024.volumeKg;
    const vsVol = variacaoVolume * marginPorKg2024;

    // 2. Mix (Efeito Mix de Produtos)
    // Quanto a margem mudou porque a margem por kg ficou diferente
    const marginPorKg2025 = yr2025.margin / yr2025.volumeKg;
    const diferencaMargemUnitaria = marginPorKg2025 - marginPorKg2024;
    const mix = variacaoVolume * diferencaMargemUnitaria;

    // 3. vs. Net Revenue (Variação por Preço)
    // Quanto a margem mudou porque o preço de venda mudou
    const precoPorKg2024 = yr2024.netSales / yr2024.volumeKg;
    const precoPorKg2025 = yr2025.netSales / yr2025.volumeKg;
    const diferencaPreco = precoPorKg2025 - precoPorKg2024;
    const vsRevenue = yr2025.volumeKg * diferencaPreco;

    // 4. vs. COGS (Variação por Custo)
    // Quanto a margem mudou porque o custo mudou
    // IMPORTANTE: vs. COGS positivo = custo aumentou = margem diminuiu (ruim!)
    // Por isso invertemos o sinal para o gráfico (valor positivo de custo reduz margem)
    const custoPorKg2024 = yr2024.cogs / yr2024.volumeKg;
    const custoPorKg2025 = yr2025.cogs / yr2025.volumeKg;
    const diferencaCusto = custoPorKg2025 - custoPorKg2024;
    const vsCOGS = -(yr2025.volumeKg * diferencaCusto); // Negativo porque aumento de custo reduz margem

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
  }, [data, isDataLoaded]);

  const waterfallData = useMemo(() => {
    if (!evaMarginData) return [];

    const formatValue = (val: number) => val / 1000; // Convert to thousands

    return [
      {
        name: '2024',
        value: formatValue(evaMarginData.previousMargin),
        base: 0,
        total: formatValue(evaMarginData.previousMargin),
        color: '#4a7c59', // Dark green for start
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
        color: '#d97706', // Orange
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
        color: '#1e4a5f', // Dark blue
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
        color: '#1e4a5f', // Dark blue
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
        color: '#d97706', // Orange for COGS (often negative impact)
        isPositive: evaMarginData.cogsEffect >= 0,
        isEndpoint: false,
        displayValue: formatValue(evaMarginData.cogsEffect),
      },
      {
        name: '2025',
        value: formatValue(evaMarginData.currentMargin),
        base: 0,
        total: formatValue(evaMarginData.currentMargin),
        color: '#22c55e', // Bright green for end
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

  const formatNumber = (num: number, decimals = 3) => {
    const absNum = Math.abs(num);
    const formatted = absNum.toLocaleString('pt-BR', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
    // Show negative values in parentheses
    return num < 0 ? `(${formatted})` : formatted;
  };

  const CustomLabel = (props: any) => {
    const { x, y, width, value, payload } = props;
    if (!payload) return null;
    
    const displayValue = payload.displayValue;
    const isNegative = displayValue < 0;
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
            <p className="text-muted-foreground">
              EVA Margin - Total - YTD 06.Jun
            </p>
          </div>
          <ExportButtons
            data={exportData}
            title="EVA Margin Report"
            fileName="EVA_Margin_Report"
          />
        </div>

        <Card className="border-2">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-center text-lg font-bold" style={{ color: '#4a7c59' }}>
              EVA MARGIN - TOTAL - YTD 06.Jun
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
                    {/* Base bar (transparent) for waterfall effect */}
                    <Bar dataKey="base" stackId="a" fill="transparent" />
                    {/* Value bar with custom colors */}
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

        {/* Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>Decomposição da Margem EVA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {waterfallData.map((item, index) => (
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
      </div>
    </Layout>
  );
};

export default EVAReport;
