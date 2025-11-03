import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Layout from "@/components/Layout";

const PL = () => {
  const plData = [
    { item: "Receita Bruta", jan: "€125K", fev: "€132K", mar: "€145K", total: "€402K" },
    { item: "(-) Deduções", jan: "€12K", fev: "€13K", mar: "€14K", total: "€39K" },
    { item: "Receita Líquida", jan: "€113K", fev: "€119K", mar: "€131K", total: "€363K" },
    { item: "(-) CMV", jan: "€42K", fev: "€44K", mar: "€49K", total: "€135K" },
    { item: "Lucro Bruto", jan: "€71K", fev: "€75K", mar: "€82K", total: "€228K" },
    { item: "(-) Despesas Operacionais", jan: "€35K", fev: "€36K", mar: "€38K", total: "€109K" },
    { item: "EBITDA", jan: "€36K", fev: "€39K", mar: "€44K", total: "€119K" },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Demonstração de Resultados (P&L)</h2>
          <p className="text-muted-foreground">
            Análise detalhada da performance financeira
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>P&L Consolidado - Q1 2025</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Item</TableHead>
                  <TableHead className="text-right">Janeiro</TableHead>
                  <TableHead className="text-right">Fevereiro</TableHead>
                  <TableHead className="text-right">Março</TableHead>
                  <TableHead className="text-right font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plData.map((row) => (
                  <TableRow key={row.item}>
                    <TableCell className="font-medium">{row.item}</TableCell>
                    <TableCell className="text-right">{row.jan}</TableCell>
                    <TableCell className="text-right">{row.fev}</TableCell>
                    <TableCell className="text-right">{row.mar}</TableCell>
                    <TableCell className="text-right font-bold">{row.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Margem Bruta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">62.8%</div>
              <p className="text-xs text-green-600">+1.2% vs período anterior</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Margem EBITDA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">32.8%</div>
              <p className="text-xs text-green-600">+2.5% vs período anterior</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ticket Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€28.50</div>
              <p className="text-xs text-green-600">+5.8% vs período anterior</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default PL;
