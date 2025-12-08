import { useState, RefObject } from "react";
import { Button } from "@/components/ui/button";
import {
  // Export dropdown menu
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

type ColumnDef = { key: string; label: string };

interface ExportButtonsProps {
  data: Record<string, unknown>[];
  title: string;
  columns?: ColumnDef[];
  fileName?: string;
  chartRef?: RefObject<HTMLDivElement>;
}

export const ExportButtons = ({ data, title, columns, fileName = "export", chartRef }: ExportButtonsProps) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const formatNumber = (val: number) =>
    val?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) || '0';

  const captureChart = async (): Promise<string | null> => {
    if (!chartRef?.current) return null;
    
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error capturing chart:', error);
      return null;
    }
  };

  const exportToExcel = async () => {
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
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Dashboard';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet(title.slice(0, 31));

      // Capture chart if available
      const chartImage = await captureChart();
      
      let startRow = 1;
      
      if (chartImage) {
        // Add chart image
        const imageId = workbook.addImage({
          base64: chartImage.split(',')[1],
          extension: 'png',
        });

        worksheet.addImage(imageId, {
          tl: { col: 0, row: 0 },
          ext: { width: 600, height: 350 },
        });

        // Add spacing after image
        startRow = 22;
      }

      // Add title
      worksheet.getCell(`A${startRow}`).value = title;
      worksheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };
      worksheet.getCell(`A${startRow + 1}`).value = `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`;
      
      startRow += 3;

      // Add headers
      const cols = columns || Object.keys(data[0] || {}).map(key => ({ key, label: key }));
      cols.forEach((col, index) => {
        const cell = worksheet.getCell(startRow, index + 1);
        cell.value = col.label;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E40AF' },
        };
        cell.alignment = { horizontal: 'center' };
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        cols.forEach((col, colIndex) => {
          const val = row[col.key];
          const cell = worksheet.getCell(startRow + 1 + rowIndex, colIndex + 1);
          
          if (typeof val === 'number') {
            if (col.key.toLowerCase().includes('margin') || col.key.toLowerCase().includes('percent')) {
              cell.value = val / 100;
              cell.numFmt = '0.0%';
            } else {
              cell.value = val;
              cell.numFmt = '#,##0.00';
            }
          } else {
            cell.value = val != null ? String(val) : '';
          }

          // Alternate row colors
          if (rowIndex % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF3F4F6' },
            };
          }
        });
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 15;
      });

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Excel exportado",
        description: chartImage ? "Arquivo com gráfico baixado com sucesso" : "Arquivo baixado com sucesso",
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        title: "Erro ao exportar",
        description: "Ocorreu um erro ao gerar o arquivo",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
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

      let startY = 35;

      // Capture and add chart if available
      const chartImage = await captureChart();
      if (chartImage) {
        const imgWidth = 180;
        const imgHeight = 100;
        doc.addImage(chartImage, 'PNG', (pageWidth - imgWidth) / 2, startY, imgWidth, imgHeight);
        startY += imgHeight + 15;
      }

      // Table
      const cols = columns || Object.keys(data[0] || {}).map(key => ({ key, label: key }));
      
      autoTable(doc, {
        startY: startY,
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
        description: chartImage ? "Arquivo com gráfico baixado com sucesso" : "Arquivo baixado com sucesso",
      });
    } catch (error) {
      console.error('PDF export error:', error);
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
