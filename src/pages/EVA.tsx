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

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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

  // Filter states
  const [selectedReport, setSelectedReport] = useState("YTD");
  const [selectedMonth, setSelectedMonth] = useState("06");
  const [selectedStore, setSelectedStore] = useState("TOTAL");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const selectedMonthNum = parseInt(selectedMonth, 10);

  // Extract filter options
  const filterOptions = useMemo(() => {
    const months = Array.from(new Set(data.map(d => d.month))).filter(Boolean).sort();
    const stores = ["TOTAL", ...Array.from(new Set(data.map(d => d.nom))).filter(Boolean).sort()];
    const categories = Array.from(new Set(data.map(d => d.macroFamilyName))).filter(Boolean).sort();
    return { months, stores, categories };
  }, [data]);

  // Initialize selected categories with all categories (except Barista by default)
  useEffect(() => {
    if (filterOptions.categories.length > 0 && selectedCategories.length === 0) {
      setSelectedCategories(filterOptions.categories.filter(c => c !== 'Barista'));
    }
  }, [filterOptions.categories]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSelectAll = () => {
    setSelectedCategories(filterOptions.categories);
  };

  const handleDeselectAll = () => {
    setSelectedCategories([]);
  };

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

  // Filter data based on selections
  const filteredData = useMemo(() => {
    return data.filter(row => {
      const storeMatch = selectedStore === "TOTAL" || row.nom === selectedStore;
      const categoryMatch = selectedCategories.includes(row.macroFamilyName);
      const monthNum = parseInt(row.month, 10);
      const periodMatch = selectedReport === "YTD" 
        ? monthNum <= selectedMonthNum 
        : row.month === selectedMonth;
      return storeMatch && categoryMatch && periodMatch;
    });
  }, [data, selectedStore, selectedCategories, selectedReport, selectedMonth, selectedMonthNum]);

  const evaData = useMemo(() => {
    if (!isDataLoaded || selectedCategories.length === 0) return null;

    const currentYear = 2025;
    const previousYear = 2024;

    const sumByYear = (year: number) => {
      const yearData = filteredData.filter(row => row.calendarYear === year);
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
  }, [filteredData, isDataLoaded, selectedCategories]);

  const macroFamilyData = useMemo(() => {
    if (!isDataLoaded || !evaData) return [];

    const familyMap = new Map();

    filteredData.forEach(row => {
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
  }, [filteredData, isDataLoaded, evaData]);

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

    result.push({
      name: '2024',
      base: 0,
      value: evaData.previous.volumeKg,
      total: evaData.previous.volumeKg,
      color: '#10b981',
      isStart: true,
    });

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

    result.push({
      name: '2024',
      base: 0,
      value: evaData.previous.revenue,
      total: evaData.previous.revenue,
      color: '#3b82f6',
      isStart: true,
    });

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

  const periodLabel = selectedReport === "YTD" 
    ? `YTD ${selectedMonth}.${monthNames[selectedMonthNum - 1]}`
    : `MTD ${selectedMonth}.${monthNames[selectedMonthNum - 1]}`;

  const storeLabel = selectedStore === "TOTAL" ? "Total" : selectedStore;

  if (!isDataLoaded) {
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
            <h2 className="text-3xl font-bold tracking-tight">Analyse de Variance - {periodLabel}</h2>
            <p className="text-muted-foreground">
              Variance Marge - {storeLabel} - {selectedCategories.length} catégorie(s) sélectionnée(s)
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
            title={`Analyse de Variance - ${periodLabel}`}
            fileName={`Analyse_Variance_${selectedReport}_${selectedMonth}`}
          />
        </div>

        {/* Filters */}
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Boutique :</label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner boutique" />
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
              <label className="text-sm font-medium">Période :</label>
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YTD">YTD (Year-to-Date)</SelectItem>
                  <SelectItem value="MTD">MTD (Month-to-Date)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mois :</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner mois" />
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

          {/* Category checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Catégories à analyser :</label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Tout sélectionner
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  Tout désélectionner
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filterOptions.categories.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cat-${category}`}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={() => handleCategoryToggle(category)}
                  />
                  <Label 
                    htmlFor={`cat-${category}`} 
                    className="text-sm cursor-pointer truncate"
                    title={category}
                  >
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {selectedCategories.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                Veuillez sélectionner au moins une catégorie pour afficher l'analyse
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-6 md:grid-cols-1 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm md:text-base">VARIAÇÃO VOLUME (Kg) BY MACRO-FAMILY</CardTitle>
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
                  <CardTitle className="text-sm md:text-base">VARIAÇÃO REVENUE BY MACRO-FAMILY</CardTitle>
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
                  Modifications des Règles Métier sur la Période
                </AlertTitle>
                <AlertDescription className="mt-2">
                  <p className="text-sm text-muted-foreground mb-2">
                    Durant la période comparée (2024-2025), les règles métier suivantes ont été modifiées, ce qui peut impacter la comparaison des données :
                  </p>
                  <ul className="space-y-1">
                    {ruleChanges.map((change) => (
                      <li key={change.id} className="text-sm flex items-start gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                          {change.change_type === 'created' ? 'Nouvelle' : 
                           change.change_type === 'updated' ? 'Mise à jour' : 
                           change.change_type === 'activated' ? 'Activée' : 
                           change.change_type === 'deactivated' ? 'Désactivée' : change.change_type}
                        </span>
                        <span className="font-medium">{change.rule_name}</span>
                        <span className="text-muted-foreground">
                          — {change.rule_text}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                          {new Date(change.changed_at).toLocaleDateString('fr-FR')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

          </div>
        )}
      </div>
    </Layout>
  );
};

export default EVA;
