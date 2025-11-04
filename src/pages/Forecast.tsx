import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, TrendingUp, Brain } from "lucide-react";

type Algorithm = "linear" | "moving_average" | "exponential";

const Forecast = () => {
  const { data, isDataLoaded } = useData();
  const { toast } = useToast();
  const [algorithm, setAlgorithm] = useState<Algorithm>("linear");
  const [periods, setPeriods] = useState<number>(6);
  const [insights, setInsights] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");

  // Get unique stores and products
  const stores = useMemo(() => {
    if (!isDataLoaded) return [];
    const unique = [...new Set(data.map(row => row.nom))].filter(Boolean).sort();
    return unique;
  }, [data, isDataLoaded]);

  const products = useMemo(() => {
    if (!isDataLoaded) return [];
    const unique = [...new Set(data.map(row => row.macroFamilyName))].filter(Boolean).sort();
    return unique;
  }, [data, isDataLoaded]);

  // Aggregate data by month with filters - BY STORE
  const monthlyDataByStore = useMemo(() => {
    if (!isDataLoaded) return {};

    const filteredData = data.filter(row => {
      const storeMatch = selectedStore === "all" || row.nom === selectedStore;
      const productMatch = selectedProduct === "all" || row.macroFamilyName === selectedProduct;
      return storeMatch && productMatch;
    });

    const byStore: Record<string, any[]> = {};

    filteredData.forEach(row => {
      const storeName = row.nom;
      if (!byStore[storeName]) {
        byStore[storeName] = [];
      }
      
      const existingMonth = byStore[storeName].find(m => m.monthYear === row.monthYear);
      if (existingMonth) {
        existingMonth.revenue += row.netSales;
        existingMonth.volume += row.volumeKg;
        existingMonth.margin += row.margin;
      } else {
        byStore[storeName].push({
          monthYear: row.monthYear,
          revenue: row.netSales,
          volume: row.volumeKg,
          margin: row.margin,
          date: new Date(row.calendarYear, parseInt(row.month) - 1, 1),
        });
      }
    });

    // Sort each store's data by date
    Object.keys(byStore).forEach(store => {
      byStore[store].sort((a, b) => a.date - b.date);
    });

    return byStore;
  }, [data, isDataLoaded, selectedStore, selectedProduct]);

  // Linear Regression
  const linearRegression = (values: number[]) => {
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  };

  // Moving Average
  const movingAverage = (values: number[], window: number = 3) => {
    const avg = values.slice(-window).reduce((sum, val) => sum + val, 0) / window;
    return avg;
  };

  // Exponential Smoothing
  const exponentialSmoothing = (values: number[], alpha: number = 0.3) => {
    let forecast = values[0];
    for (let i = 1; i < values.length; i++) {
      forecast = alpha * values[i] + (1 - alpha) * forecast;
    }
    return forecast;
  };

  const projectionsByStore = useMemo(() => {
    const projections: Record<string, any[]> = {};

    Object.entries(monthlyDataByStore).forEach(([storeName, storeData]) => {
      if (storeData.length === 0) return;

      const revenues = storeData.map((d: any) => d.revenue);
      const volumes = storeData.map((d: any) => d.volume);
      
      const projectedData = [];
      
      for (let i = 0; i < periods; i++) {
        let projectedRevenue = 0;
        let projectedVolume = 0;

        if (algorithm === "linear") {
          const revenueModel = linearRegression(revenues);
          const volumeModel = linearRegression(volumes);
          projectedRevenue = revenueModel.slope * (revenues.length + i) + revenueModel.intercept;
          projectedVolume = volumeModel.slope * (volumes.length + i) + volumeModel.intercept;
        } else if (algorithm === "moving_average") {
          projectedRevenue = movingAverage(revenues);
          projectedVolume = movingAverage(volumes);
        } else if (algorithm === "exponential") {
          projectedRevenue = exponentialSmoothing(revenues);
          projectedVolume = exponentialSmoothing(volumes);
        }

        const lastDate = storeData[storeData.length - 1].date;
        const futureDate = new Date(lastDate);
        futureDate.setMonth(futureDate.getMonth() + i + 1);

        projectedData.push({
          monthYear: `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`,
          revenue: Math.max(0, projectedRevenue),
          volume: Math.max(0, projectedVolume),
          store: storeName,
          isProjection: true,
        });
      }

      projections[storeName] = projectedData;
    });

    return projections;
  }, [monthlyDataByStore, algorithm, periods]);

  const chartData = useMemo(() => {
    const allMonths = new Set<string>();
    const dataMap: Record<string, any> = {};

    // Collect all months from all stores
    Object.entries(monthlyDataByStore).forEach(([storeName, storeData]) => {
      storeData.forEach((d: any) => {
        allMonths.add(d.monthYear);
        if (!dataMap[d.monthYear]) {
          dataMap[d.monthYear] = { monthYear: d.monthYear };
        }
        dataMap[d.monthYear][`${storeName}_revenue`] = d.revenue;
        dataMap[d.monthYear][`${storeName}_volume`] = d.volume;
      });

      // Add projections
      if (projectionsByStore[storeName]) {
        projectionsByStore[storeName].forEach((d: any) => {
          allMonths.add(d.monthYear);
          if (!dataMap[d.monthYear]) {
            dataMap[d.monthYear] = { monthYear: d.monthYear };
          }
          dataMap[d.monthYear][`${storeName}_revenueProjection`] = d.revenue;
          dataMap[d.monthYear][`${storeName}_volumeProjection`] = d.volume;
        });

        // Add connection point
        const lastHistorical = storeData[storeData.length - 1];
        if (lastHistorical && !dataMap[lastHistorical.monthYear][`${storeName}_revenueProjection`]) {
          dataMap[lastHistorical.monthYear][`${storeName}_revenueProjection`] = lastHistorical.revenue;
          dataMap[lastHistorical.monthYear][`${storeName}_volumeProjection`] = lastHistorical.volume;
        }
      }
    });

    return Array.from(allMonths).sort().map(month => dataMap[month]);
  }, [monthlyDataByStore, projectionsByStore]);

  const getAIInsights = async () => {
    setIsLoading(true);
    try {
      const filteredData = data.filter(row => {
        const storeMatch = selectedStore === "all" || row.nom === selectedStore;
        const productMatch = selectedProduct === "all" || row.macroFamilyName === selectedProduct;
        return storeMatch && productMatch;
      });

      const { data: result, error } = await supabase.functions.invoke('ai-insights', {
        body: {
          data: filteredData.slice(0, 100),
          projections: Object.values(projectionsByStore).flat(),
          algorithm: algorithm,
          store: selectedStore,
          product: selectedProduct,
        }
      });

      if (error) throw error;

      if (result?.error) {
        toast({
          title: "Erro",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setInsights(result.insights);
      toast({
        title: "Insights Gerados",
        description: "Análise estratégica completa",
      });
    } catch (error) {
      console.error('Error getting AI insights:', error);
      toast({
        title: "Erro",
        description: "Falha ao obter insights da IA",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isDataLoaded) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Carregue os dados primeiro na página Upload</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projeção & IA</h1>
          <p className="text-muted-foreground">
            Algoritmos de Machine Learning e análise estratégica com IA
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Configuração de Projeção
            </CardTitle>
            <CardDescription>
              Selecione o algoritmo e período para projeção
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Loja</label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Lojas</SelectItem>
                    {stores.map(store => (
                      <SelectItem key={store} value={store}>{store}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Linha de Produto</label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Linhas</SelectItem>
                    {products.map(product => (
                      <SelectItem key={product} value={product}>{product}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Algoritmo</label>
                <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as Algorithm)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">Regressão Linear</SelectItem>
                    <SelectItem value="moving_average">Média Móvel</SelectItem>
                    <SelectItem value="exponential">Suavização Exponencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Períodos (meses)</label>
                <Select value={periods.toString()} onValueChange={(v) => setPeriods(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 meses</SelectItem>
                    <SelectItem value="6">6 meses</SelectItem>
                    <SelectItem value="12">12 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={getAIInsights} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Gerar Insights IA
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Projeção de Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[300px] md:h-[400px]">
                <ChartContainer
                  config={{}}
                  className="h-full w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="monthYear" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: any) => value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} />
                      <Legend />
                      {Object.keys(monthlyDataByStore).map((storeName, idx) => {
                        const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
                        const color = colors[idx % colors.length];
                        return (
                          <>
                            <Line
                              key={`${storeName}-revenue`}
                              type="monotone"
                              dataKey={`${storeName}_revenue`}
                              name={`${storeName} (Histórico)`}
                              stroke={color}
                              strokeWidth={2}
                              dot={{ r: 3, fill: color }}
                              connectNulls={false}
                            />
                            <Line
                              key={`${storeName}-revenue-proj`}
                              type="monotone"
                              dataKey={`${storeName}_revenueProjection`}
                              name={`${storeName} (Projeção)`}
                              stroke={color}
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={{ r: 3, fill: color }}
                              connectNulls={false}
                            />
                          </>
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Projeção de Volume (Kg)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[300px] md:h-[400px]">
                <ChartContainer
                  config={{}}
                  className="h-full w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="monthYear" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: any) => value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} />
                      <Legend />
                      {Object.keys(monthlyDataByStore).map((storeName, idx) => {
                        const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
                        const color = colors[idx % colors.length];
                        return (
                          <>
                            <Line
                              key={`${storeName}-volume`}
                              type="monotone"
                              dataKey={`${storeName}_volume`}
                              name={`${storeName} (Histórico)`}
                              stroke={color}
                              strokeWidth={2}
                              dot={{ r: 3, fill: color }}
                              connectNulls={false}
                            />
                            <Line
                              key={`${storeName}-volume-proj`}
                              type="monotone"
                              dataKey={`${storeName}_volumeProjection`}
                              name={`${storeName} (Projeção)`}
                              stroke={color}
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={{ r: 3, fill: color }}
                              connectNulls={false}
                            />
                          </>
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {insights && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Insights Estratégicos da IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">{insights}</pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Forecast;
