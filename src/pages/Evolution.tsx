import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import Layout from "@/components/Layout";
import { useTracking } from "@/hooks/useTracking";
import { ExportButtons } from "@/components/ExportButtons";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";

const Evolution = () => {
  useTracking();
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun"];
  const revenueData = [112, 125, 132, 145, 138, 152];
  const maxRevenue = Math.max(...revenueData);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Évolution Temporelle</h2>
            <p className="text-muted-foreground">
              Analyse des tendances et de la croissance dans le temps
            </p>
          </div>
          <ExportButtons
            data={months.map((month, idx) => ({
              Mois: month,
              CA: revenueData[idx],
              Croissance: idx > 0 ? (((revenueData[idx] - revenueData[idx - 1]) / revenueData[idx - 1]) * 100).toFixed(1) + "%" : "N/A",
            }))}
            title="Évolution Temporelle"
            fileName="Evolution"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Croissance Cumulée</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+35.7%</div>
              <p className="text-xs text-muted-foreground">vs même période année précédente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Croissance Moyenne Mensuelle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+5.2%</div>
              <p className="text-xs text-muted-foreground">Moyenne des 6 derniers mois</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Meilleur Mois</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Juin</div>
              <p className="text-xs text-muted-foreground">€152K de chiffre d'affaires</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Évolution du CA (€K)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-[300px] flex items-end justify-around gap-2">
                {months.map((month, index) => (
                  <div key={month} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-primary rounded-t-lg transition-all hover:bg-primary/80"
                      style={{
                        height: `${(revenueData[index] / maxRevenue) * 100}%`,
                        minHeight: "40px",
                      }}
                    />
                    <span className="text-sm font-medium">{month}</span>
                    <span className="text-xs text-muted-foreground">
                      {revenueData[index]}K
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Taux de Croissance Mensuel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {months.slice(1).map((month, index) => {
                  const growth = (
                    ((revenueData[index + 1] - revenueData[index]) /
                      revenueData[index]) *
                    100
                  ).toFixed(1);
                  const isPositive = parseFloat(growth) > 0;

                  return (
                    <div
                      key={month}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/20"
                    >
                      <span className="font-medium">{month}</span>
                      <span
                        className={`font-bold ${
                          isPositive ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {growth}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Projection Linéaire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">
                    Mois Prochain (Juillet)
                  </div>
                  <div className="text-2xl font-bold">€158K</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Basé sur la tendance linéaire
                  </p>
                </div>
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">
                    Fin d'Année (Projection)
                  </div>
                  <div className="text-2xl font-bold">€1.95M</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Chiffre d'affaires annuel estimé
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <AIAnalysisPanel
          data={months.map((month, idx) => ({
            month,
            revenue: revenueData[idx] * 1000,
            growth: idx > 0 ? ((revenueData[idx] - revenueData[idx - 1]) / revenueData[idx - 1]) * 100 : 0,
          }))}
          context="evolution"
          title="Analyse IA - Évolution"
        />
      </div>
    </Layout>
  );
};

export default Evolution;
