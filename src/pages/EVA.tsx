import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, TrendingUp } from "lucide-react";
import Layout from "@/components/Layout";

const EVA = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Análise EVA</h2>
          <p className="text-muted-foreground">
            Economic Value Added - Valor Econômico Agregado
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">NOPAT</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€142.5K</div>
              <p className="text-xs text-muted-foreground">
                Net Operating Profit After Taxes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Capital Investido</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€850K</div>
              <p className="text-xs text-muted-foreground">Total de capital alocado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">WACC</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8.5%</div>
              <p className="text-xs text-muted-foreground">
                Custo Médio Ponderado de Capital
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cálculo do EVA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center p-4 bg-secondary/20 rounded-lg">
                <span className="font-medium">NOPAT</span>
                <span className="text-lg font-bold">€142,500</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-secondary/20 rounded-lg">
                <span className="font-medium">Capital Investido × WACC</span>
                <span className="text-lg font-bold">€72,250</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                <span className="font-bold text-lg">EVA</span>
                <span className="text-2xl font-bold text-green-600">€70,250</span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-accent/10 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Interpretação:</strong> Um EVA positivo de €70,250 indica que
                a empresa está gerando valor econômico acima do custo de capital,
                demonstrando eficiência na alocação de recursos e criação de valor
                para os stakeholders.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>EVA por Loja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Paris Centre", eva: "€32.1K", color: "bg-green-600" },
                { name: "Lyon", eva: "€21.8K", color: "bg-green-500" },
                { name: "Marseille", eva: "€12.4K", color: "bg-green-400" },
                { name: "Bordeaux", eva: "€4.0K", color: "bg-green-300" },
              ].map((store) => (
                <div key={store.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{store.name}</span>
                    <span className="font-bold text-green-600">{store.eva}</span>
                  </div>
                  <div className="h-3 rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full ${store.color}`}
                      style={{
                        width: `${
                          (parseFloat(store.eva.replace(/[€K]/g, "")) / 32.1) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default EVA;
