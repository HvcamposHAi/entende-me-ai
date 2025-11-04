import { useState } from "react";
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import * as XLSX from 'xlsx';
import { useData, DengoDataRow } from "@/contexts/DataContext";
import { useNavigate } from "react-router-dom";

const Upload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { setData, isDataLoaded } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Log raw data para debug
      console.log('Primeira linha bruta do Excel:', jsonData[0]);
      
      const processedData: DengoDataRow[] = jsonData.map((row: any) => {
        const processedRow = {
          calendarYear: Number(row['Calendar Year']) || 0,
          calendarMonth: String(row['Calendar Month'] || ''),
          nom: String(row['Nom'] || ''),
          clientMacroCategory: String(row['[SL] Client macro category'] || ''),
          macroFamilyName: String(row['Macro-family Name'] || ''),
          familyName: String(row['Family Name'] || ''),
          nameSalesReport: String(row['Name sales report'] || ''),
          frItemCode: String(row['FR Item Code'] || ''),
          quantitySoldTotal: parseFloat(row['Quantity Sold Total']) || 0,
          netSales: parseFloat(row['Net Sales (exc. VAT)']) || 0,
          cogs: parseFloat(row['COGS']) || 0,
          margin: parseFloat(row['Margin']) || 0,
          volumeKg: parseFloat(row['Volume (Kg)']) || 0,
          yearMonth: String(row['Year&Month'] || ''),
          month: String(row['Month'] || ''),
          monthYear: String(row['Month&Year'] || ''),
          pl: String(row['P&L'] || ''),
        };
        return processedRow;
      });

      console.log('Dados processados:', processedData.length, 'registros');
      console.log('Amostra dos primeiros 3 registros:', processedData.slice(0, 3));

      setData(processedData);
      
      toast({
        title: "Arquivo processado com sucesso!",
        description: `${processedData.length} registros carregados`,
      });

      setTimeout(() => navigate('/overview'), 1000);
    } catch (error) {
      toast({
        title: "Erro ao processar arquivo",
        description: "Verifique se o arquivo está no formato correto",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = () => {
    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione o arquivo para upload",
        variant: "destructive",
      });
      return;
    }

    processExcelFile(file);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Upload de Dados</h2>
          <p className="text-muted-foreground">
            Carregue a base de dados Dengo para análise financeira
          </p>
        </div>

        {isDataLoaded && (
          <Card className="border-success bg-success/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Base de dados carregada com sucesso!</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Base de Dados Dengo</CardTitle>
            <CardDescription>Arquivo: Base_Dengo.xlsx</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center hover:border-primary transition-colors">
              <FileSpreadsheet className="h-16 w-16 text-muted-foreground mb-4" />
              <label htmlFor="dengo-file" className="cursor-pointer">
                <span className="text-sm font-medium text-primary hover:underline">
                  {file ? file.name : "Clique para selecionar o arquivo"}
                </span>
                <input
                  id="dengo-file"
                  type="file"
                  accept=".xlsx,.xlsb,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <p className="text-xs text-muted-foreground mt-2">
                Formatos suportados: .xlsx, .xlsb, .xls
              </p>
            </div>

            {file && (
              <div className="mt-6">
                <div className="flex items-center gap-2 p-4 bg-muted rounded-lg mb-4">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
                <Button 
                  onClick={handleUpload} 
                  className="w-full" 
                  disabled={isProcessing}
                >
                  <UploadIcon className="mr-2 h-4 w-4" />
                  {isProcessing ? "Processando..." : "Processar Arquivo"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Upload;
