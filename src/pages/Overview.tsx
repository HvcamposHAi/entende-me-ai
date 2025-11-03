import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Package } from "lucide-react";
import Layout from "@/components/Layout";

const Overview = () => {
  const metrics = [
    {
      title: "Receita Total",
      value: "€845.2K",
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
    },
    {
      title: "Margem Bruta",
      value: "62.3%",
      change: "+2.1%",
      trend: "up",
      icon: TrendingUp,
    },
    {
      title: "Despesas Operacionais",
      value: "€312.8K",
      change: "-5.2%",
      trend: "down",
      icon: Package,
    },
    {
      title: "EBITDA",
      value: "€214.5K",
      change: "+18.3%",
      trend: "up",
      icon: TrendingUp,
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
          <p className="text-muted-foreground">
            Visão geral dos indicadores financeiros
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p
                  className={`text-xs ${
                    metric.trend === "up" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {metric.change} vs mês anterior
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Receita por Loja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Paris Centre", value: 45 },
                  { name: "Lyon", value: 32 },
                  { name: "Marseille", value: 23 },
                ].map((store) => (
                  <div key={store.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{store.name}</span>
                      <span className="font-medium">{store.value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${store.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evolução Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Gráfico de evolução será implementado
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Overview;
