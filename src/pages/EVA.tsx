import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Layout from "@/components/Layout";
import { useData } from "@/contexts/DataContext";
import { useMemo, useState, useEffect } from "react";
import { ArrowUp, ArrowDown, History } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { useTracking } from "@/hooks/useTracking";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExportButtons } from "@/components/ExportButtons";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";

interface RuleChange {
  id: string;
  rule_name: string;
  change_type: string;
  changed_at: string;
  rule_text: string;
}

const EVA = () => {
  useTracking();
  const { data, isDataLoaded } = useData();
  const [ruleChanges, setRuleChanges] = useState<RuleChange[]>([]);

  // Fetch business rule changes for the compared period
  useEffect(() => {
    const fetchRuleChanges = async () => {
      const startDate = new Date('2024-01-01');
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
  }, []);

  const evaData = useMemo(() => {
    if (!isDataLoaded) return null;

    const currentYear = 2025;
    const previousYear = 2024;

    const sumByYear = (year: number) => {
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

    const current = sumByYear(currentYear);
    const previous = sumByYear(previousYear);

    return { current, previous, currentYear, previousYear };
  }, [data, isDataLoaded]);

  const macroFamilyData = useMemo(() => {
    if (!isDataLoaded || !evaData) return [];

    const familyMap = new Map();

    data.forEach(row => {
      if (row.macroFamilyName === 'Barista') return; // Exclude Barista
      
      if (row.calendarYear === evaData.currentYear) {
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
        entry.volumeKg += row.volumeKg || 0;
        entry.revenue += row.netSales || 0;
        entry.cogs += row.cogs || 0;
        entry.margin += row.margin || 0;
      } else if (row.calendarYear === evaData.previousYear) {
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
        entry.volumeKgPrev += row.volumeKg || 0;
        entry.revenuePrev += row.netSales || 0;
        entry.cogsPrev += row.cogs || 0;
        entry.marginPrev += row.margin || 0;
      }
    });

    return Array.from(familyMap.values())
      .map(f => ({
        ...f,
        volumeChange: f.volumeKgPrev !== 0 ? ((f.volumeKg - f.volumeKgPrev) / f.volumeKgPrev) * 100 : 0,
        revenueChange: f.revenuePrev !== 0 ? ((f.revenue - f.revenuePrev) / f.revenuePrev) * 100 : 0,
        cogsChange: f.cogsPrev !== 0 ? ((f.cogs - f.cogsPrev) / f.cogsPrev) * 100 : 0,
        marginChange: f.marginPrev !== 0 ? ((f.margin - f.marginPrev) / f.marginPrev) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [data, isDataLoaded, evaData]);

  const volumeWaterfallData = useMemo(() => {
    if (!evaData || macroFamilyData.length === 0) return [];

    const colors = [
      "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", 
      "#6366f1", "#ec4899", "#14b8a6", "#f97316", "#06b6d4"
    ];

    const contributions = macroFamilyData.map((f, idx) => ({
      name: f.family,
      change: f.volumeKg - f.volumeKgPrev,
      color: colors[idx % colors.length],
    })).filter(f => Math.abs(f.change) > 0);

    const result = [];
    let cumulative = evaData.previous.volumeKg;

    // Starting bar (2024)
    result.push({
      name: '2024',
      base: 0,
      value: evaData.previous.volumeKg,
      total: evaData.previous.volumeKg,
      color: '#10b981',
      isStart: true,
    });

    // Intermediate changes
    contributions.forEach((item) => {
      const base = item.change >= 0 ? cumulative : cumulative + item.change;
      result.push({
        name: item.name,
        base: base,
        value: Math.abs(item.change),
        total: cumulative + item.change,
        color: item.color,
        isPositive: item.change >= 0,
        isStart: false,
      });
      cumulative += item.change;
    });

    // Ending bar (2025)
    result.push({
      name: '2025',
      base: 0,
      value: evaData.current.volumeKg,
      total: evaData.current.volumeKg,
      color: '#10b981',
      isStart: true,
    });

    return result;
  }, [evaData, macroFamilyData]);

  const revenueWaterfallData = useMemo(() => {
    if (!evaData || macroFamilyData.length === 0) return [];

    const colors = [
      "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", 
      "#6366f1", "#ec4899", "#14b8a6", "#f97316", "#06b6d4"
    ];

    const contributions = macroFamilyData.map((f, idx) => ({
      name: f.family,
      change: f.revenue - f.revenuePrev,
      color: colors[idx % colors.length],
    })).filter(f => Math.abs(f.change) > 0);

    const result = [];
    let cumulative = evaData.previous.revenue;

    // Starting bar (2024)
    result.push({
      name: '2024',
      base: 0,
      value: evaData.previous.revenue,
      total: evaData.previous.revenue,
      color: '#3b82f6',
      isStart: true,
    });

    // Intermediate changes
    contributions.forEach((item) => {
      const base = item.change >= 0 ? cumulative : cumulative + item.change;
      result.push({
        name: item.name,
        base: base,
        value: Math.abs(item.change),
        total: cumulative + item.change,
        color: item.color,
        isPositive: item.change >= 0,
        isStart: false,
      });
      cumulative += item.change;
    });

    // Ending bar (2025)
    result.push({
      name: '2025',
      base: 0,
      value: evaData.current.revenue,
      total: evaData.current.revenue,
      color: '#3b82f6',
      isStart: true,
    });

    return result;
  }, [evaData, macroFamilyData]);

  if (!isDataLoaded || !evaData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Carregue os dados na página Upload primeiro</p>
        </div>
      </Layout>
    );
  }

  const formatNumber = (num: number, decimals = 0) => {
    return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const formatPercent = (num: number, decimals = 0) => {
    return num.toFixed(decimals) + '%';
  };

  const ChangeIndicator = ({ value }: { value: number }) => {
    const isPositive = value > 0;
    return (
      <div className={`flex items-center gap-1 justify-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        <span className="text-sm">{formatPercent(Math.abs(value))}</span>
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Análise EVA</h2>
            <p className="text-muted-foreground">
              EVA Margin - Total - YTD 06.Jun
            </p>
          </div>
          <ExportButtons
            data={macroFamilyData.map(f => ({
              MacroFamília: f.family,
              VolumeKg2025: f.volumeKg,
              VolumeVariacao: f.volumeChange,
              Receita2025: f.revenue,
              ReceitaVariacao: f.revenueChange,
              COGS2025: f.cogs,
              COGSVariacao: f.cogsChange,
              Margem2025: f.margin,
              MargemVariacao: f.marginChange,
            }))}
            title="Análise EVA"
            fileName="Analise_EVA"
          />
        </div>

        <div className="grid gap-6">
          <div className="grid gap-6 md:grid-cols-1 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm md:text-base">EVA VOLUME (Kg) BY MACRO-FAMILY (w/o Barista)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[300px] md:h-[400px]">
                  <ChartContainer
                    config={{
                      value: { label: "Volume Kg", color: "hsl(var(--chart-1))" },
                    }}
                    className="h-full w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={volumeWaterfallData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip 
                          formatter={(value) => formatNumber(Number(value))}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border border-border p-2 rounded shadow-lg">
                                  <p className="font-semibold">{data.name}</p>
                                  <p className="text-sm">Total: {formatNumber(data.total)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="base" stackId="a" fill="transparent" />
                        <Bar dataKey="value" stackId="a" label={{ position: 'top', fontSize: 10, formatter: (val: number) => formatNumber(val, 0) }}>
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

            <Card>
              <CardHeader>
                <CardTitle className="text-sm md:text-base">EVA REVENUE BY MACRO-FAMILY</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[300px] md:h-[400px]">
                  <ChartContainer
                    config={{
                      value: { label: "Revenue", color: "hsl(var(--chart-1))" },
                    }}
                    className="h-full w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueWaterfallData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip 
                          formatter={(value) => formatNumber(Number(value))}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border border-border p-2 rounded shadow-lg">
                                  <p className="font-semibold">{data.name}</p>
                                  <p className="text-sm">Total: {formatNumber(data.total)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="base" stackId="a" fill="transparent" />
                        <Bar dataKey="value" stackId="a" label={{ position: 'top', fontSize: 10, formatter: (val: number) => formatNumber(val, 0) }}>
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

          <Card>
            <CardHeader>
              <CardTitle>MACRO-FAMILY</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">MACRO-FAMILY</TableHead>
                    <TableHead colSpan={2} className="text-center font-bold border-l">VOLUME Kg</TableHead>
                    <TableHead colSpan={2} className="text-center font-bold border-l">REVENUE</TableHead>
                    <TableHead colSpan={2} className="text-center font-bold border-l">COGS</TableHead>
                    <TableHead colSpan={2} className="text-center font-bold border-l">MARGIN</TableHead>
                  </TableRow>
                  <TableRow className="bg-muted/30">
                    <TableHead></TableHead>
                    <TableHead className="text-right text-xs border-l">ACT 2025</TableHead>
                    <TableHead className="text-center text-xs">% vs LY</TableHead>
                    <TableHead className="text-right text-xs border-l">ACT 2025</TableHead>
                    <TableHead className="text-center text-xs">% vs LY</TableHead>
                    <TableHead className="text-right text-xs border-l">ACT 2025</TableHead>
                    <TableHead className="text-center text-xs">% vs LY</TableHead>
                    <TableHead className="text-right text-xs border-l">ACT 2025</TableHead>
                    <TableHead className="text-center text-xs">% vs LY</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {macroFamilyData.map((row) => (
                    <TableRow key={row.family} className="text-sm">
                      <TableCell className="font-medium">{row.family}</TableCell>
                      <TableCell className="text-right border-l">{formatNumber(row.volumeKg)}</TableCell>
                      <TableCell className="text-center">
                        <ChangeIndicator value={row.volumeChange} />
                      </TableCell>
                      <TableCell className="text-right border-l">{formatNumber(row.revenue)}</TableCell>
                      <TableCell className="text-center">
                        <ChangeIndicator value={row.revenueChange} />
                      </TableCell>
                      <TableCell className="text-right border-l">{formatNumber(row.cogs)}</TableCell>
                      <TableCell className="text-center">
                        <ChangeIndicator value={row.cogsChange} />
                      </TableCell>
                      <TableCell className="text-right border-l">{formatNumber(row.margin)}</TableCell>
                      <TableCell className="text-center">
                        <ChangeIndicator value={row.marginChange} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Business Rules Changes Footnote */}
          {ruleChanges.length > 0 && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <History className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-700 dark:text-amber-400">
                Alterações de Regras de Negócio no Período
              </AlertTitle>
              <AlertDescription className="mt-2">
                <p className="text-sm text-muted-foreground mb-2">
                  Durante o período comparado (2024-2025), as seguintes regras de negócio foram alteradas, o que pode impactar a comparação dos dados:
                </p>
                <ul className="space-y-1">
                  {ruleChanges.map((change) => (
                    <li key={change.id} className="text-sm flex items-start gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                        {change.change_type === 'created' ? 'Nova' : 
                         change.change_type === 'updated' ? 'Atualizada' : 
                         change.change_type === 'activated' ? 'Ativada' : 
                         change.change_type === 'deactivated' ? 'Desativada' : change.change_type}
                      </span>
                      <span className="font-medium">{change.rule_name}</span>
                      <span className="text-muted-foreground">
                        — {change.rule_text}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                        {new Date(change.changed_at).toLocaleDateString('pt-BR')}
                      </span>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <AIAnalysisPanel
            data={data.filter(r => r.macroFamilyName !== 'Barista')}
            context="eva"
            title="Análise IA - EVA"
          />
        </div>
      </div>
    </Layout>
  );
};

export default EVA;
