import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt } from "lucide-react";
import Layout from "@/components/Layout";

const Expenses = () => {
  const expensesData = [
    { category: "Pessoal", jan: "€45K", fev: "€46K", mar: "€47K", total: "€138K", percent: "44.2%" },
    { category: "Aluguel", jan: "€18K", fev: "€18K", mar: "€18K", total: "€54K", percent: "17.3%" },
    { category: "Marketing", jan: "€12K", fev: "€15K", mar: "€18K", total: "€45K", percent: "14.4%" },
    { category: "Utilidades", jan: "€8K", fev: "€9K", mar: "€8K", total: "€25K", percent: "8.0%" },
    { category: "Manutenção", jan: "€6K", fev: "€7K", mar: "€8K", total: "€21K", percent: "6.7%" },
    { category: "Outros", jan: "€9K", fev: "€11K", mar: "€10K", total: "€30K", percent: "9.6%" },
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
                    <TableCell className="font-medium">{row.category}</TableCell>
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
                    <span className="font-medium">{expense.category}</span>
                    <span>{expense.percent}</span>
                  </div>
                  <div className="h-3 rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: expense.percent }}
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
