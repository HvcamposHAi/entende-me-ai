import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Layout from "@/components/Layout";
import { useData } from "@/contexts/DataContext";
import { useMemo, useState, useEffect } from "react";
import { Package, Target, TrendingUp, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { useTracking } from "@/hooks/useTracking";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExportButtons } from "@/components/ExportButtons";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History } from "lucide-react";

// Interfaces
interface EVAData {
  margin2024: number;
  margin2025: number;
  deltaVolume: number;
  deltaMix: number;
  deltaRevenue: number;
  deltaCOGS: number;
  totalVariation: number;
}

interface EVADetailRow {
  product: string;
  deltaVolume: number;
  deltaMix: number;
  deltaRevenue: number;
  deltaCOGS: number;
  totalDelta: number;
  margin2024: number;
  margin2025: number;
}

interface RuleChange {
  id: string;
  rule_name: string;
  change_type: string;
  changed_at: string;
  rule_text: string;
}

interface GroupedData {
  margin: number;
  volumeKg: number;
  netSales: number;
  cogs: number;
}

// Utility functions
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

const groupDataBy = (
  data: any[],
  key: string
): Record<string, GroupedData> => {
  return data.reduce((acc, row) => {
    const groupKey = row[key as keyof typeof row] as string;

    if (!acc[groupKey]) {
      acc[groupKey] = {
        margin: 0,
        volumeKg: 0,
        netSales: 0,
        cogs: 0,
      };
    }

    acc[groupKey].margin += row.margin || 0;
    acc[groupKey].volumeKg += row.volumeKg || 0;
    acc[groupKey].netSales += row.netSales || 0;
    acc[groupKey].cogs += row.cogs || 0;

    return acc;
  }, {} as Record<string, GroupedData>);
};

const EVA = () => {
  useTracking();
  const { data, isDataLoaded } = useData();
  const [ruleChanges, setRuleChanges] = useState<RuleChange[]>([]);
  
  // Filter states
  const [year1, setYear1] = useState<number>(2024);
  const [year2, setYear2] = useState<number>(2025);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");

  // Fetch business rule changes for the compared period
  useEffect(() => {
    const fetchRuleChanges = async () => {
      const startDate = new Date(`${year1}-01-01`);
      const endDate = new Date();
      
      const { data: changes, error } = await supabase
        .from('business_rules_history')
        .select('id, rule_name, change_type, changed_at, rule_text')
        .gte('changed_at', startDate.toISOString())
        .lte('changed_at', endDate.toISOString())
        .order('changed_at', { ascending: false });

      if (!error && changes) {
        setRuleChanges(changes);
      }
    };

    fetchRuleChanges();
  }, [year1]);

  // Get unique stores and products for filters
  const filterOptions = useMemo(() => {
    if (!isDataLoaded) return { stores: [], products: [], years: [] };

    const stores = [...new Set(data.map((row) => row.nom))].filter(Boolean).sort();
    const products = [...new Set(data.map((row) => row.macroFamilyName))].filter(Boolean).sort();
    const years = [...new Set(data.map((row) => row.calendarYear))].sort((a, b) => a - b);

    return { stores, products, years };
  }, [data, isDataLoaded]);

  // Calculate EVA with decomposition into 4 factors
  const evaResult = useMemo(() => {
    if (!isDataLoaded) return null;

    // Filter data by year and optional filters
    const data1 = data.filter(
      (row) =>
        row.calendarYear === year1 &&
        (!selectedStore || row.nom === selectedStore) &&
        (!selectedProduct || row.macroFamilyName === selectedProduct) &&
        row.macroFamilyName !== 'Barista'
    );

    const data2 = data.filter(
      (row) =>
        row.calendarYear === year2 &&
        (!selectedStore || row.nom === selectedStore) &&
        (!selectedProduct || row.macroFamilyName === selectedProduct) &&
        row.macroFamilyName !== 'Barista'
    );

    // Group by product (macroFamilyName)
    const groups1 = groupDataBy(data1, "macroFamilyName");
    const groups2 = groupDataBy(data2, "macroFamilyName");

    // Calculate for each group
    const details: EVADetailRow[] = [];
    const allGroups = new Set([...Object.keys(groups1), ...Object.keys(groups2)]);

    allGroups.forEach((group) => {
      const g1: GroupedData = groups1[group] || { margin: 0, volumeKg: 0, netSales: 0, cogs: 0 };
      const g2: GroupedData = groups2[group] || { margin: 0, volumeKg: 0, netSales: 0, cogs: 0 };

      // Volume variance
      const volumeVar = g2.volumeKg - g1.volumeKg;
      const marginUnit_ref = g1.volumeKg > 0 ? g1.margin / g1.volumeKg : 0;

      // Δ Volume: impacto da mudança de volume mantendo margem unitária constante
      const deltaVolume = volumeVar * marginUnit_ref;

      // Δ Mix: impacto da mudança no mix de produtos
      const marginUnit_current = g2.volumeKg > 0 ? g2.margin / g2.volumeKg : 0;
      const deltaMix = volumeVar * (marginUnit_current - marginUnit_ref);

      // Δ Revenue: impacto da variação de preço de venda
      const nsUnit1 = g1.volumeKg > 0 ? g1.netSales / g1.volumeKg : 0;
      const nsUnit2 = g2.volumeKg > 0 ? g2.netSales / g2.volumeKg : 0;
      const deltaRevenue = g2.volumeKg * (nsUnit2 - nsUnit1);

      // Δ COGS: impacto da variação de custo unitário
      const cogsUnit1 = g1.volumeKg > 0 ? g1.cogs / g1.volumeKg : 0;
      const cogsUnit2 = g2.volumeKg > 0 ? g2.cogs / g2.volumeKg : 0;
      const deltaCOGS = -1 * g2.volumeKg * (cogsUnit2 - cogsUnit1); // Negative because higher costs reduce margin

      details.push({
        product: group,
        deltaVolume,
        deltaMix,
        deltaRevenue,
        deltaCOGS,
        totalDelta: g2.margin - g1.margin,
        margin2024: g1.margin,
        margin2025: g2.margin,
      });
    });

    // Sort by absolute total delta
    details.sort((a, b) => Math.abs(b.totalDelta) - Math.abs(a.totalDelta));

    // Summary totals
    const summary: EVAData = {
      margin2024: sum(details.map((d) => d.margin2024)),
      margin2025: sum(details.map((d) => d.margin2025)),
      deltaVolume: sum(details.map((d) => d.deltaVolume)),
      deltaMix: sum(details.map((d) => d.deltaMix)),
      deltaRevenue: sum(details.map((d) => d.deltaRevenue)),
      deltaCOGS: sum(details.map((d) => d.deltaCOGS)),
      totalVariation: sum(details.map((d) => d.totalDelta)),
    };

    return { summary, details };
  }, [data, isDataLoaded, year1, year2, selectedStore, selectedProduct]);

  // Prepare waterfall chart data
  const waterfallData = useMemo(() => {
    if (!evaResult) return [];

    const { summary } = evaResult;
    let cumulative = summary.margin2024;

    return [
      {
        name: String(year1),
        value: summary.margin2024,
        start: 0,
        end: summary.margin2024,
        fill: "#16a34a", // Green for base
        isBase: true,
        displayValue: summary.margin2024,
      },
      {
        name: "Vol",
        value: Math.abs(summary.deltaVolume),
        start: cumulative,
        end: (cumulative += summary.deltaVolume),
        fill: summary.deltaVolume >= 0 ? "#0891b2" : "#ea580c",
        isBase: false,
        displayValue: summary.deltaVolume,
      },
      {
        name: "Mix",
        value: Math.abs(summary.deltaMix),
        start: cumulative,
        end: (cumulative += summary.deltaMix),
        fill: summary.deltaMix >= 0 ? "#0891b2" : "#ea580c",
        isBase: false,
        displayValue: summary.deltaMix,
      },
      {
        name: "Rev",
        value: Math.abs(summary.deltaRevenue),
        start: cumulative,
        end: (cumulative += summary.deltaRevenue),
        fill: summary.deltaRevenue >= 0 ? "#0891b2" : "#ea580c",
        isBase: false,
        displayValue: summary.deltaRevenue,
      },
      {
        name: "COGS",
        value: Math.abs(summary.deltaCOGS),
        start: cumulative,
        end: (cumulative += summary.deltaCOGS),
        fill: summary.deltaCOGS >= 0 ? "#0891b2" : "#ea580c",
        isBase: false,
        displayValue: summary.deltaCOGS,
      },
      {
        name: String(year2),
        value: summary.margin2025,
        start: 0,
        end: summary.margin2025,
        fill: "#16a34a", // Green for base
        isBase: true,
        displayValue: summary.margin2025,
      },
    ];
  }, [evaResult, year1, year2]);

  if (!isDataLoaded || !evaResult) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Carregue os dados na página Upload primeiro</p>
        </div>
      </Layout>
    );
  }

  const formatNumber = (num: number, decimals = 0) => {
    return num.toLocaleString("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatDelta = (num: number, decimals = 0) => {
    const prefix = num >= 0 ? "+" : "";
    return prefix + formatNumber(num, decimals);
  };

  const { summary, details } = evaResult;

  // KPI data
  const kpis = [
    {
      title: "Δ Volume",
      value: summary.deltaVolume,
      icon: Package,
      description: "Impacto da variação de volume",
    },
    {
      title: "Δ Mix",
      value: summary.deltaMix,
      icon: Target,
      description: "Impacto do mix de produtos",
    },
    {
      title: "Δ Revenue",
      value: summary.deltaRevenue,
      icon: TrendingUp,
      description: "Impacto da variação de preços",
    },
    {
      title: "Δ COGS",
      value: summary.deltaCOGS,
      icon: BarChart3,
      description: "Impacto da variação de custos",
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Análise EVA - Economic Value Added</h2>
            <p className="text-muted-foreground">
              Decomposição da variação de margem entre {year1} e {year2}
            </p>
          </div>
          <ExportButtons
            data={details.map((d) => ({
              Produto: d.product,
              [`Margem ${year1}`]: d.margin2024,
              "Δ Volume": d.deltaVolume,
              "Δ Mix": d.deltaMix,
              "Δ Revenue": d.deltaRevenue,
              "Δ COGS": d.deltaCOGS,
              [`Margem ${year2}`]: d.margin2025,
              "Variação Total": d.totalDelta,
            }))}
            title="Análise EVA"
            fileName={`EVA_${year1}_vs_${year2}`}
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ano Base</label>
                <Select value={String(year1)} onValueChange={(v) => setYear1(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ano Comparação</label>
                <Select value={String(year2)} onValueChange={(v) => setYear2(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Loja</label>
                <Select value={selectedStore || "all"} onValueChange={(v) => setSelectedStore(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {filterOptions.stores.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Produto</label>
                <Select value={selectedProduct || "all"} onValueChange={(v) => setSelectedProduct(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {filterOptions.products.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <kpi.icon className="h-6 w-6 text-muted-foreground" />
                  <span
                    className={`text-2xl font-bold ${
                      kpi.value >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatDelta(kpi.value)}
                  </span>
                </div>
                <h4 className="font-semibold">{kpi.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Waterfall Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              EVA MARGIN - {selectedProduct || "TOTAL"} - {selectedStore || "Todas Lojas"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[400px]">
              <ChartContainer
                config={{
                  value: { label: "Margin", color: "hsl(var(--chart-1))" },
                }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={waterfallData}
                    margin={{ top: 30, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => {
                        const displayVal = props.payload.displayValue;
                        return [formatNumber(displayVal), props.payload.isBase ? "Margem" : "Variação"];
                      }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    {/* Invisible base bar for waterfall effect */}
                    <Bar dataKey="start" stackId="a" fill="transparent" />
                    {/* Visible value bar */}
                    <Bar dataKey="value" stackId="a" radius={[4, 4, 0, 0]}>
                      {waterfallData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                      <LabelList
                        dataKey="displayValue"
                        position="top"
                        formatter={(val: number) => formatDelta(val)}
                        style={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Detail Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento por Produto</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">Produto</TableHead>
                  <TableHead className="text-right font-bold">Margem {year1}</TableHead>
                  <TableHead className="text-right font-bold">Δ Volume</TableHead>
                  <TableHead className="text-right font-bold">Δ Mix</TableHead>
                  <TableHead className="text-right font-bold">Δ Revenue</TableHead>
                  <TableHead className="text-right font-bold">Δ COGS</TableHead>
                  <TableHead className="text-right font-bold">Margem {year2}</TableHead>
                  <TableHead className="text-right font-bold">Variação Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.map((row) => (
                  <TableRow key={row.product} className="text-sm">
                    <TableCell className="font-medium">{row.product}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.margin2024)}</TableCell>
                    <TableCell
                      className={`text-right ${row.deltaVolume >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatDelta(row.deltaVolume)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${row.deltaMix >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatDelta(row.deltaMix)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${row.deltaRevenue >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatDelta(row.deltaRevenue)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${row.deltaCOGS >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatDelta(row.deltaCOGS)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatNumber(row.margin2025)}</TableCell>
                    <TableCell
                      className={`text-right font-semibold ${row.totalDelta >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatDelta(row.totalDelta)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="bg-muted/30 font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">{formatNumber(summary.margin2024)}</TableCell>
                  <TableCell
                    className={`text-right ${summary.deltaVolume >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatDelta(summary.deltaVolume)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${summary.deltaMix >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatDelta(summary.deltaMix)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${summary.deltaRevenue >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatDelta(summary.deltaRevenue)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${summary.deltaCOGS >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatDelta(summary.deltaCOGS)}
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(summary.margin2025)}</TableCell>
                  <TableCell
                    className={`text-right ${summary.totalVariation >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatDelta(summary.totalVariation)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Business Rules Changes Alert */}
        {ruleChanges.length > 0 && (
          <Alert>
            <History className="h-4 w-4" />
            <AlertTitle>Alterações em Regras de Negócio</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                As seguintes regras foram alteradas durante o período de análise ({year1} - {year2}):
              </p>
              <ul className="list-disc ml-4 space-y-1">
                {ruleChanges.slice(0, 3).map((change) => (
                  <li key={change.id} className="text-sm">
                    <strong>{change.rule_name}</strong> ({change.change_type}) em{" "}
                    {new Date(change.changed_at).toLocaleDateString("pt-BR")}
                  </li>
                ))}
              </ul>
              {ruleChanges.length > 3 && (
                <p className="text-sm mt-2 text-muted-foreground">
                  ... e mais {ruleChanges.length - 3} alteração(ões)
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* AI Analysis Panel */}
        <AIAnalysisPanel
          data={[
            {
              type: "summary",
              margin2024: summary.margin2024,
              margin2025: summary.margin2025,
              deltaVolume: summary.deltaVolume,
              deltaMix: summary.deltaMix,
              deltaRevenue: summary.deltaRevenue,
              deltaCOGS: summary.deltaCOGS,
              totalVariation: summary.totalVariation,
            },
            ...details.slice(0, 10).map(d => ({ type: "detail", ...d })),
          ]}
          context="eva"
          filters={{
            store: selectedStore || undefined,
            product: selectedProduct || undefined,
            year: year2,
          }}
        />
      </div>
    </Layout>
  );
};

export default EVA;
