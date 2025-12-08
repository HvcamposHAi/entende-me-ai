import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Database, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportButtonsProps {
  data: any[];
  title: string;
  columns?: { key: string; label: string }[];
  fileName?: string;
}

export const ExportButtons = ({ data, title, columns, fileName = "export" }: ExportButtonsProps) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const formatCurrency = (val: number) =>
    val?.toLocaleString('pt-BR', { style: 'currency', currency: 'EUR' }) || '€0';

  const formatNumber = (val: number) =>
    val?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) || '0';

  const exportToExcel = () => {
    if (!data || data.length === 0) {
      toast({
        title: "Sem dados",
        description: "Não há dados para exportar",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
      XLSX.writeFile(wb, `${fileName}.xlsx`);

      toast({
        title: "Excel exportado",
        description: "Arquivo baixado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Ocorreu um erro ao gerar o arquivo",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = () => {
    if (!data || data.length === 0) {
      toast({
        title: "Sem dados",
        description: "Não há dados para exportar",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(16);
      doc.setTextColor(30, 64, 175);
      doc.text(title, pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 28, { align: 'center' });

      // Table
      const cols = columns || Object.keys(data[0] || {}).map(key => ({ key, label: key }));
      
      autoTable(doc, {
        startY: 35,
        head: [cols.map(c => c.label)],
        body: data.slice(0, 50).map(row => 
          cols.map(c => {
            const val = row[c.key];
            if (typeof val === 'number') {
              return c.key.toLowerCase().includes('margin') || c.key.toLowerCase().includes('percent')
                ? `${val.toFixed(1)}%`
                : formatNumber(val);
            }
            return val ?? '';
          })
        ),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 64, 175] },
      });

      doc.save(`${fileName}.pdf`);

      toast({
        title: "PDF exportado",
        description: "Arquivo baixado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Ocorreu um erro ao gerar o arquivo",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPowerBI = () => {
    if (!data || data.length === 0) {
      toast({
        title: "Sem dados",
        description: "Não há dados para exportar",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // Fact Table
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "FactData");

      // Summary KPIs
      const numericKeys = Object.keys(data[0] || {}).filter(k => typeof data[0][k] === 'number');
      const kpis = numericKeys.map(key => ({
        Metric: key,
        Total: data.reduce((s, r) => s + (r[key] || 0), 0),
        Average: data.reduce((s, r) => s + (r[key] || 0), 0) / data.length,
        Count: data.length,
      }));
      const wsKPIs = XLSX.utils.json_to_sheet(kpis);
      XLSX.utils.book_append_sheet(wb, wsKPIs, "KPIs");

      XLSX.writeFile(wb, `${fileName}_PowerBI.xlsx`);

      toast({
        title: "Power BI exportado",
        description: "Dataset estruturado baixado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Ocorreu um erro ao gerar o arquivo",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPowerBI}>
          <Database className="h-4 w-4 mr-2" />
          Power BI
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
