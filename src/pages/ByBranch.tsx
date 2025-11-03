import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Store } from "lucide-react";
import Layout from "@/components/Layout";

const ByBranch = () => {
  const storesData = [
    {
      name: "Paris Centre",
      revenue: "€185K",
      margin: "64.2%",
      ebitda: "€62K",
      growth: "+15.3%",
    },
    {
      name: "Lyon",
      revenue: "€132K",
      margin: "61.8%",
      ebitda: "€45K",
      growth: "+8.7%",
    },
    {
      name: "Marseille",
      revenue: "€98K",
      margin: "59.5%",
      ebitda: "€31K",
      growth: "+12.1%",
    },
    {
      name: "Bordeaux",
      revenue: "€76K",
      margin: "62.1%",
      ebitda: "€24K",
      growth: "+6.4%",
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Análise por Loja</h2>
          <p className="text-muted-foreground">
            Performance individual de cada ponto de venda
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {storesData.map((store) => (
            <Card key={store.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{store.name}</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle>Comparativo de Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Margem Bruta</TableHead>
                  <TableHead className="text-right">EBITDA</TableHead>
                  <TableHead className="text-right">Crescimento</TableHead>
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
            <CardTitle>Distribuição de Receita</CardTitle>
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
                      <span className="font-medium">{store.name}</span>
                      <span>{percentage}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ByBranch;
