import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Store } from "lucide-react";
import Layout from "@/components/Layout";
import { useTracking } from "@/hooks/useTracking";
import { ExportButtons } from "@/components/ExportButtons";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";

const ByBranch = () => {
  useTracking();
  const storeColors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // orange
    "#ef4444", // red
  ];

  const storesData = [
    {
      name: "Paris Centre",
      revenue: "€185K",
      margin: "64.2%",
      ebitda: "€62K",
      growth: "+15.3%",
      color: storeColors[0],
    },
    {
      name: "Lyon",
      revenue: "€132K",
      margin: "61.8%",
      ebitda: "€45K",
      growth: "+8.7%",
      color: storeColors[1],
    },
    {
      name: "Marseille",
      revenue: "€98K",
      margin: "59.5%",
      ebitda: "€31K",
      growth: "+12.1%",
      color: storeColors[2],
    },
    {
      name: "Bordeaux",
      revenue: "€76K",
      margin: "62.1%",
      ebitda: "€24K",
      growth: "+6.4%",
      color: storeColors[3],
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Analyse par Boutique</h2>
            <p className="text-muted-foreground">
              Performance individuelle de chaque point de vente
            </p>
          </div>
          <ExportButtons
            data={storesData.map(s => ({
              Boutique: s.name,
              CA: s.revenue,
              Marge: s.margin,
              EBITDA: s.ebitda,
              Croissance: s.growth,
            }))}
            title="Analyse par Boutique"
            fileName="Analyse_Boutique"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {storesData.map((store) => (
            <Card key={store.name} className="border-t-4" style={{ borderTopColor: store.color }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{store.name}</CardTitle>
                <Store className="h-4 w-4" style={{ color: store.color }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{store.revenue}</div>
                <p className="text-xs text-green-600">{store.growth}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Comparatif de Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Boutique</TableHead>
                  <TableHead className="text-right">Chiffre d'Affaires</TableHead>
                  <TableHead className="text-right">Marge Brute</TableHead>
                  <TableHead className="text-right">EBITDA</TableHead>
                  <TableHead className="text-right">Croissance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storesData.map((store) => (
                  <TableRow key={store.name}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell className="text-right">{store.revenue}</TableCell>
                    <TableCell className="text-right">{store.margin}</TableCell>
                    <TableCell className="text-right">{store.ebitda}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {store.growth}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition du Chiffre d'Affaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {storesData.map((store, index) => {
                const totalRevenue = 491000;
                const percentage = (
                  (parseFloat(store.revenue.replace(/[€K]/g, "")) * 1000) /
                  totalRevenue *
                  100
                ).toFixed(1);

                return (
                  <div key={store.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: store.color }}
                        />
                        <span className="font-medium">{store.name}</span>
                      </div>
                      <span>{percentage}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percentage}%`, backgroundColor: store.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <AIAnalysisPanel
          data={storesData.map(s => ({
            nom: s.name,
            netSales: parseFloat(s.revenue.replace(/[€K]/g, "")) * 1000,
            margin: parseFloat(s.margin.replace('%', '')),
            growth: parseFloat(s.growth.replace(/[+%]/g, '')),
          }))}
          context="branch"
          title="Analyse IA - Par Boutique"
        />
      </div>
    </Layout>
  );
};

export default ByBranch;
