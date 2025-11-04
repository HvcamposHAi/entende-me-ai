import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Layout from "@/components/Layout";
import { useData } from "@/contexts/DataContext";
import { useMemo } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

const EVA = () => {
  const { data, isDataLoaded } = useData();

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
      value: f.volumeKg - f.volumeKgPrev,
      color: colors[idx % colors.length],
    })).filter(f => Math.abs(f.value) > 0);

    return [
      { name: '2024', value: evaData.previous.volumeKg, color: '#10b981' },
      ...contributions,
      { name: '2025', value: evaData.current.volumeKg, color: '#10b981' },
    ];
  }, [evaData, macroFamilyData]);

  const revenueWaterfallData = useMemo(() => {
    if (!evaData || macroFamilyData.length === 0) return [];

    const colors = [
      "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", 
      "#6366f1", "#ec4899", "#14b8a6", "#f97316", "#06b6d4"
    ];

    const contributions = macroFamilyData.map((f, idx) => ({
      name: f.family,
      value: f.revenue - f.revenuePrev,
      color: colors[idx % colors.length],
    })).filter(f => Math.abs(f.value) > 0);

    return [
      { name: '2024', value: evaData.previous.revenue, color: '#3b82f6' },
      ...contributions,
      { name: '2025', value: evaData.current.revenue, color: '#3b82f6' },
    ];
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
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Análise EVA</h2>
          <p className="text-muted-foreground">
            EVA Margin - Total - YTD 06.Jun
          </p>
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
                      <BarChart data={volumeWaterfallData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value) => formatNumber(Number(value))} />
                        <Bar dataKey="value">
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
                      <BarChart data={revenueWaterfallData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value) => formatNumber(Number(value))} />
                        <Bar dataKey="value">
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
        </div>
      </div>
    </Layout>
  );
};

export default EVA;
