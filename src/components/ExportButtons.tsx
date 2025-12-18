import { useState, RefObject } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2, Presentation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import pptxgen from 'pptxgenjs';

type ColumnDef = { key: string; label: string };

interface ChartDataPoint {
  label: string;
  [key: string]: string | number;
}

interface ChartConfig {
  type: 'bar' | 'line' | 'column';
  title: string;
  data: ChartDataPoint[];
  series: { key: string; name: string; color?: string }[];
  categoryKey: string;
}

interface ExportButtonsProps {
  data: Record<string, unknown>[];
  title: string;
  columns?: ColumnDef[];
  fileName?: string;
  chartRef?: RefObject<HTMLDivElement>;
  chartConfigs?: ChartConfig[];
}

export const ExportButtons = ({ 
  data, 
  title, 
  columns, 
  fileName = "export", 
  chartRef,
  chartConfigs = []
}: ExportButtonsProps) => {
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

  const addNativeExcelChart = (
    workbook: ExcelJS.Workbook,
    worksheet: ExcelJS.Worksheet,
    config: ChartConfig,
    startRow: number
  ): number => {
    const { data: chartData, series, categoryKey, title: chartTitle, type } = config;
    
    // Write chart data to worksheet
    const dataStartRow = startRow;
    const dataStartCol = 1;
    
    // Header row
    worksheet.getCell(dataStartRow, dataStartCol).value = categoryKey;
    worksheet.getCell(dataStartRow, dataStartCol).font = { bold: true };
    series.forEach((s, idx) => {
      const cell = worksheet.getCell(dataStartRow, dataStartCol + 1 + idx);
      cell.value = s.name;
      cell.font = { bold: true };
    });
    
    // Data rows
    chartData.forEach((row, rowIdx) => {
      worksheet.getCell(dataStartRow + 1 + rowIdx, dataStartCol).value = String(row[categoryKey]);
      series.forEach((s, colIdx) => {
        const val = row[s.key];
        worksheet.getCell(dataStartRow + 1 + rowIdx, dataStartCol + 1 + colIdx).value = 
          typeof val === 'number' ? val : 0;
      });
    });

    // Calculate data range
    const dataEndRow = dataStartRow + chartData.length;
    const dataEndCol = dataStartCol + series.length;

    // Add chart title
    const chartTitleRow = dataEndRow + 2;
    worksheet.getCell(chartTitleRow, 1).value = chartTitle;
    worksheet.getCell(chartTitleRow, 1).font = { bold: true, size: 12 };

    // Note: ExcelJS doesn't fully support native chart creation in the browser
    // We'll add the data formatted for easy chart creation by the user
    const instructionRow = chartTitleRow + 1;
    worksheet.getCell(instructionRow, 1).value = 
      '→ Selecione os dados acima e insira um gráfico (Inserir > Gráfico)';
    worksheet.getCell(instructionRow, 1).font = { italic: true, color: { argb: 'FF666666' } };

    // Style the data range
    for (let r = dataStartRow; r <= dataEndRow; r++) {
      for (let c = dataStartCol; c <= dataEndCol; c++) {
        const cell = worksheet.getCell(r, c);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        if (r === dataStartRow) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF3B82F6' }
          };
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        }
      }
    }

    // Return the next available row
    return instructionRow + 3;
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

      let startRow = 1;

      // Add title
      worksheet.getCell(`A${startRow}`).value = title;
      worksheet.getCell(`A${startRow}`).font = { bold: true, size: 16 };
      worksheet.getCell(`A${startRow + 1}`).value = `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`;
      worksheet.getCell(`A${startRow + 1}`).font = { color: { argb: 'FF666666' } };
      
      startRow += 3;

      // Add native chart data sections
      if (chartConfigs.length > 0) {
        for (const config of chartConfigs) {
          startRow = addNativeExcelChart(workbook, worksheet, config, startRow);
        }
        startRow += 2;
      }

      // Add main data table section header
      worksheet.getCell(`A${startRow}`).value = 'DADOS DETALHADOS';
      worksheet.getCell(`A${startRow}`).font = { bold: true, size: 12 };
      startRow += 2;

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
        column.width = 18;
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
        description: chartConfigs.length > 0 
          ? "Arquivo com dados de gráfico baixado. Selecione os dados e insira um gráfico no Excel."
          : "Arquivo baixado com sucesso",
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

  const exportToPPTX = async () => {
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
      const pptx = new pptxgen();
      pptx.author = 'Dashboard';
      pptx.title = title;
      pptx.subject = title;

      // Title slide
      const titleSlide = pptx.addSlide();
      titleSlide.addText(title, {
        x: 0.5,
        y: 2,
        w: '90%',
        h: 1.5,
        fontSize: 36,
        bold: true,
        color: '1E40AF',
        align: 'center',
      });
      titleSlide.addText(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, {
        x: 0.5,
        y: 3.5,
        w: '90%',
        h: 0.5,
        fontSize: 14,
        color: '666666',
        align: 'center',
      });

      // Chart slide (if chart is available)
      const chartImage = await captureChart();
      if (chartImage) {
        const chartSlide = pptx.addSlide();
        chartSlide.addText(title, {
          x: 0.5,
          y: 0.3,
          w: '90%',
          h: 0.5,
          fontSize: 24,
          bold: true,
          color: '1E40AF',
        });
        chartSlide.addImage({
          data: chartImage,
          x: 0.5,
          y: 1,
          w: 9,
          h: 4.5,
        });
      }

      // Data table slide(s)
      const cols = columns || Object.keys(data[0] || {}).map(key => ({ key, label: key }));
      const maxRowsPerSlide = 12;
      const dataChunks: Record<string, unknown>[][] = [];
      
      for (let i = 0; i < Math.min(data.length, 60); i += maxRowsPerSlide) {
        dataChunks.push(data.slice(i, i + maxRowsPerSlide));
      }

      dataChunks.forEach((chunk, chunkIndex) => {
        const tableSlide = pptx.addSlide();
        tableSlide.addText(`${title} - Dados ${dataChunks.length > 1 ? `(${chunkIndex + 1}/${dataChunks.length})` : ''}`, {
          x: 0.5,
          y: 0.3,
          w: '90%',
          h: 0.5,
          fontSize: 18,
          bold: true,
          color: '1E40AF',
        });

        const tableData: pptxgen.TableRow[] = [
          cols.map(c => ({
            text: c.label,
            options: {
              bold: true,
              fill: { color: '1E40AF' },
              color: 'FFFFFF',
              align: 'center' as const,
            },
          })),
          ...chunk.map((row, rowIndex) =>
            cols.map(c => {
              const val = row[c.key];
              let displayVal = '';
              if (typeof val === 'number') {
                displayVal = c.key.toLowerCase().includes('margin') || c.key.toLowerCase().includes('percent')
                  ? `${val.toFixed(1)}%`
                  : val.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
              } else {
                displayVal = val != null ? String(val) : '';
              }
              return {
                text: displayVal,
                options: {
                  fill: { color: rowIndex % 2 === 0 ? 'F3F4F6' : 'FFFFFF' },
                  align: 'center' as const,
                },
              };
            })
          ),
        ];

        tableSlide.addTable(tableData, {
          x: 0.5,
          y: 1,
          w: 9,
          fontSize: 10,
          border: { type: 'solid', pt: 0.5, color: 'CCCCCC' },
        });
      });

      await pptx.writeFile({ fileName: `${fileName}.pptx` });

      toast({
        title: "PowerPoint exportado",
        description: chartImage ? "Apresentação com gráfico baixada com sucesso" : "Apresentação baixada com sucesso",
      });
    } catch (error) {
      console.error('PPTX export error:', error);
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
        <DropdownMenuItem onClick={exportToPPTX}>
          <Presentation className="h-4 w-4 mr-2" />
          PowerPoint
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
