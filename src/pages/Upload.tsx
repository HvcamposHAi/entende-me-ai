import { useState } from "react";
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import * as XLSX from 'xlsx';
import { useData, DengoDataRow } from "@/contexts/DataContext";
import { useNavigate } from "react-router-dom";
import { useTracking } from "@/hooks/useTracking";

const Upload = () => {
  useTracking();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { setData, isDataLoaded } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Helper para normalizar valores numéricos vindos do Excel (moedas, separadores, parênteses)
  const parseNumber = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isFinite(val) ? val : 0;
    const s = String(val)
      .replace(/[\u00A0\s]/g, '') // espaços e nbsp
      .replace(/[€R$\$]/g, '') // símbolos de moeda
      .replace(/\((.*)\)/, '-$1'); // negativos entre parênteses

    if (s.includes(',') && s.includes('.')) {
      // Assume ponto como milhar e vírgula como decimal
      return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
    }
    const normalized = s.replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Helpers para normalização de cabeçalhos e leitura segura
  const normalizeKey = (k: any) => String(k)
    .toLowerCase()
    .replace(/\u00A0/g, ' ')
    .replace(/[^\w]+/g, '') // remove espaços e pontuação
    .trim();

  const toMap = (obj: any) => {
    const m = new Map<string, any>();
    Object.entries(obj).forEach(([k, v]) => m.set(normalizeKey(k), v));
    return m;
  };

  const get = (map: Map<string, any>, ...candidates: string[]) => {
    for (const c of candidates) {
      const v = map.get(normalizeKey(c));
      if (v !== undefined) return v;
    }
    return undefined;
  };

  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { cellNF: true, cellText: true });
      const sheetName = workbook.SheetNames.includes('New_DB') ? 'New_DB' : workbook.SheetNames[0];
      console.log('Feuilles trouvées:', workbook.SheetNames, ' | Utilisation:', sheetName);
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });

      // Log raw data para debug
      console.log('Première ligne brute Excel:', jsonData[0]);
      
      const processedData: DengoDataRow[] = jsonData.map((row: any, idx: number) => {
        const m = toMap(row);
        if (idx === 0) {
          console.log('En-têtes normalisés (échantillon):', Array.from(m.keys()));
        }

        const processedRow: DengoDataRow = {
          calendarYear: parseInt(String(get(m, 'Calendar Year') ?? '0')) || 0,
          calendarMonth: String(get(m, 'Calendar Month') ?? ''),
          nom: String(get(m, 'Nom') ?? ''),
          clientMacroCategory: String(get(m, '[SL] Client macro category', 'SL Client macro category') ?? ''),
          macroFamilyName: String(get(m, 'Macro-family Name', 'Macro Family Name') ?? ''),
          familyName: String(get(m, 'Family Name') ?? ''),
          nameSalesReport: String(get(m, 'Name sales report', 'Name Sales Report') ?? ''),
          frItemCode: String(get(m, 'FR Item Code', 'Item Code') ?? ''),
          quantitySoldTotal: parseNumber(get(m, 'Quantity Sold Total') ?? 0),
          netSales: parseNumber(get(m, 'Net Sales (exc. VAT)', 'Net Sales exc. VAT', 'Net Sales') ?? 0),
          cogs: parseNumber(get(m, 'COGS') ?? 0),
          margin: parseNumber(get(m, 'Margin') ?? 0),
          volumeKg: parseNumber(get(m, 'Volume (Kg)', 'Volume Kg') ?? 0),
          yearMonth: String(get(m, 'Year&Month', 'Year Month', 'YearMonth') ?? ''),
          month: String(get(m, 'Month') ?? ''),
          monthYear: String(get(m, 'Month&Year', 'Month Year', 'MonthYear') ?? ''),
          pl: String(get(m, 'P&L', 'PL') ?? ''),
        };
        return processedRow;
      });

      console.log('Données traitées:', processedData.length, 'enregistrements');
      console.log('Échantillon des 3 premiers enregistrements:', processedData.slice(0, 3));

      setData(processedData);
      
      toast({
        title: "Fichier traité avec succès !",
        description: `${processedData.length} enregistrements chargés`,
      });

      setTimeout(() => navigate('/overview'), 1000);
    } catch (error) {
      toast({
        title: "Erreur lors du traitement du fichier",
        description: "Vérifiez que le fichier est au bon format",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = () => {
    if (!file) {
      toast({
        title: "Aucun fichier sélectionné",
        description: "Veuillez sélectionner un fichier à télécharger",
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
          <h2 className="text-3xl font-bold tracking-tight">Téléchargement des Données</h2>
          <p className="text-muted-foreground">
            Chargez la base de données Dengo pour l'analyse financière
          </p>
        </div>

        {isDataLoaded && (
          <Card className="border-success bg-success/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Base de données chargée avec succès !</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Base de Données Dengo</CardTitle>
            <CardDescription>Fichier : Base_Dengo.xlsx</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center hover:border-primary transition-colors">
              <FileSpreadsheet className="h-16 w-16 text-muted-foreground mb-4" />
              <label htmlFor="dengo-file" className="cursor-pointer">
                <span className="text-sm font-medium text-primary hover:underline">
                  {file ? file.name : "Cliquez pour sélectionner le fichier"}
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
                Formats supportés : .xlsx, .xlsb, .xls
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
                  {isProcessing ? "Traitement en cours..." : "Traiter le Fichier"}
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
