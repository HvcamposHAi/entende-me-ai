import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt } from "lucide-react";
import Layout from "@/components/Layout";
import { useTracking } from "@/hooks/useTracking";

const Expenses = () => {
  useTracking();
  const categoryColors = [
    "#3b82f6", // blue - Pessoal
    "#10b981", // green - Aluguel
    "#f59e0b", // orange - Marketing
    "#8b5cf6", // purple - Utilidades
    "#ef4444", // red - Manutenção
    "#6366f1", // indigo - Outros
  ];

  const expensesData = [
    { category: "Pessoal", jan: "€45K", fev: "€46K", mar: "€47K", total: "€138K", percent: "44.2%", color: categoryColors[0] },
    { category: "Aluguel", jan: "€18K", fev: "€18K", mar: "€18K", total: "€54K", percent: "17.3%", color: categoryColors[1] },
    { category: "Marketing", jan: "€12K", fev: "€15K", mar: "€18K", total: "€45K", percent: "14.4%", color: categoryColors[2] },
    { category: "Utilidades", jan: "€8K", fev: "€9K", mar: "€8K", total: "€25K", percent: "8.0%", color: categoryColors[3] },
    { category: "Manutenção", jan: "€6K", fev: "€7K", mar: "€8K", total: "€21K", percent: "6.7%", color: categoryColors[4] },
    { category: "Outros", jan: "€9K", fev: "€11K", mar: "€10K", total: "€30K", percent: "9.6%", color: categoryColors[5] },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Despesas Operacionais</h2>
          <p className="text-muted-foreground">
            Análise detalhada de custos e despesas
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€313K</div>
              <p className="text-xs text-green-600">-3.2% vs período anterior</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Maior Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Pessoal</div>
              <p className="text-xs text-muted-foreground">44.2% do total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">% da Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">38.6%</div>
              <p className="text-xs text-green-600">-1.8pp vs período anterior</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Janeiro</TableHead>
                  <TableHead className="text-right">Fevereiro</TableHead>
                  <TableHead className="text-right">Março</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">% Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesData.map((row) => (
                  <TableRow key={row.category}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: row.color }}
                        />
                        {row.category}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{row.jan}</TableCell>
                    <TableCell className="text-right">{row.fev}</TableCell>
                    <TableCell className="text-right">{row.mar}</TableCell>
                    <TableCell className="text-right font-bold">{row.total}</TableCell>
                    <TableCell className="text-right">{row.percent}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expensesData.map((expense) => (
                <div key={expense.category} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: expense.color }}
                      />
                      <span className="font-medium">{expense.category}</span>
                    </div>
                    <span>{expense.percent}</span>
                  </div>
                  <div className="h-3 rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: expense.percent, backgroundColor: expense.color }}
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

export default Expenses;
