import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Layout from "@/components/Layout";
import { useData } from "@/contexts/DataContext";
import { useMemo } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { useTracking } from "@/hooks/useTracking";
import { ExportButtons } from "@/components/ExportButtons";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";

const PL = () => {
  useTracking();
  const { data, isDataLoaded } = useData();

  const plCalculations = useMemo(() => {
    if (!isDataLoaded) return null;

    const currentYear = 2025;
    const previousYear = 2024;

    const sumByYear = (year: number, field: keyof typeof data[0]) => {
      return data
        .filter(row => row.calendarYear === year)
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
    const stPersonalCurrent = data.filter(r => r.calendarYear === currentYear && r.pl === 'ST-PERSONAL').reduce((s, r) => s + r.netSales, 0);
    const stPersonalPrevious = data.filter(r => r.calendarYear === previousYear && r.pl === 'ST-PERSONAL').reduce((s, r) => s + r.netSales, 0);
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

    const stOpexCurrent = data.filter(r => r.calendarYear === currentYear && r.pl === 'ST-OPEX').reduce((s, r) => s + r.netSales, 0);
    const stOpexPrevious = data.filter(r => r.calendarYear === previousYear && r.pl === 'ST-OPEX').reduce((s, r) => s + r.netSales, 0);
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
  }, [data, isDataLoaded]);

  const monthlyChartData = useMemo(() => {
    if (!isDataLoaded) return [];

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return months.map((month, idx) => {
      const monthNum = idx + 1;
      
      const monthKey = monthNum.toString().padStart(2, '0');
      const revenue2024 = data
        .filter(r => r.calendarYear === 2024 && r.month === monthKey)
        .reduce((sum, r) => sum + r.netSales, 0) / 1000;
      
      const revenue2025 = data
        .filter(r => r.calendarYear === 2025 && r.month === monthKey)
        .reduce((sum, r) => sum + r.netSales, 0) / 1000;

      const margin2024Data = data.filter(r => r.calendarYear === 2024 && r.month === monthKey);
      const totalRevenue2024 = margin2024Data.reduce((sum, r) => sum + r.netSales, 0);
      const totalMargin2024 = margin2024Data.reduce((sum, r) => sum + r.margin, 0);
      const marginPercent2024 = totalRevenue2024 !== 0 ? (totalMargin2024 / totalRevenue2024) * 100 : 0;

      const margin2025Data = data.filter(r => r.calendarYear === 2025 && r.month === monthKey);
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
  }, [data, isDataLoaded]);

  if (!isDataLoaded || !plCalculations) {
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">P&L YTD 06.Jun</h2>
            <p className="text-muted-foreground">
              Demonstração de Resultados Year-to-Date
            </p>
          </div>
          <ExportButtons
            data={[
              { Linha: "VOLUME original", ACT2025: plCalculations.volumeOriginal.current, ACT2024: plCalculations.volumeOriginal.previous, Variacao: plCalculations.volumeOriginal.change },
              { Linha: "VOLUME Kg", ACT2025: plCalculations.volumeKg.current, ACT2024: plCalculations.volumeKg.previous, Variacao: plCalculations.volumeKg.change },
              { Linha: "REVENUE", ACT2025: plCalculations.revenue.current, ACT2024: plCalculations.revenue.previous, Variacao: plCalculations.revenue.change },
              { Linha: "COGS", ACT2025: plCalculations.cogs.current, ACT2024: plCalculations.cogs.previous, Variacao: plCalculations.cogs.change },
              { Linha: "MARGIN", ACT2025: plCalculations.margin.current, ACT2024: plCalculations.margin.previous, Variacao: plCalculations.margin.change },
              { Linha: "MARGIN %", ACT2025: plCalculations.marginPercent.current, ACT2024: plCalculations.marginPercent.previous, Variacao: plCalculations.marginPercent.change },
            ]}
            title="P&L Statement"
            fileName="PL_Statement"
          />
        </div>

        <div className="grid gap-6 grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>P&L YTD 06.Jun</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">P&L YTD 06.Jun</TableHead>
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

        <AIAnalysisPanel
          data={data}
          context="pl"
          title="Análise IA - P&L"
        />
      </div>
    </Layout>
  );
};

export default PL;
