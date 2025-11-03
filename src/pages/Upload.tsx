import { useState } from "react";
import { Upload as UploadIcon, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

const Upload = () => {
  const [files, setFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = () => {
    if (files.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione os arquivos para upload",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Upload iniciado",
      description: `${files.length} arquivo(s) sendo processado(s)`,
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Upload de Dados</h2>
          <p className="text-muted-foreground">
            Carregue os arquivos Excel para análise financeira
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard P&L</CardTitle>
              <CardDescription>Arquivo: 2025_P_L.xlsb</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center hover:border-primary transition-colors">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
                <label htmlFor="pl-file" className="cursor-pointer">
                  <span className="text-sm font-medium">Clique para selecionar</span>
                  <input
                    id="pl-file"
                    type="file"
                    accept=".xlsx,.xlsb,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales by Branch</CardTitle>
              <CardDescription>Arquivo: Dashboard_Dengo_Sales_by_Branch.xlsx</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center hover:border-primary transition-colors">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
                <label htmlFor="sales-file" className="cursor-pointer">
                  <span className="text-sm font-medium">Clique para selecionar</span>
                  <input
                    id="sales-file"
                    type="file"
                    accept=".xlsx,.xlsb,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dashboard OVH</CardTitle>
              <CardDescription>Arquivo: Dashboard_OVH.xlsx</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center hover:border-primary transition-colors">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
                <label htmlFor="ovh-file" className="cursor-pointer">
                  <span className="text-sm font-medium">Clique para selecionar</span>
                  <input
                    id="ovh-file"
                    type="file"
                    accept=".xlsx,.xlsb,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {files.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Arquivos Selecionados</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="text-sm">{file.name}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={handleUpload} className="mt-4 w-full">
                <UploadIcon className="mr-2 h-4 w-4" />
                Fazer Upload
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Upload;
