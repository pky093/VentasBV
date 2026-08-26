import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, DollarSign, Package, ShoppingCart } from 'lucide-react';
import ExcelJS from 'exceljs';
import { PageHeader, Button, Card, CardHeader, CardBody, StatCard, Badge, SuggestionChip, DataTable } from '../components/ui';
import { reportsService, ReportSummary, settingsService } from '../lib/db-services';

export default function ReportsPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState({
    name: 'Grupo K contreras S.A.C',
    tradeName: 'Chilia',
    ruc: '22213639030',
    address: 'Retamas PRUEBA 1, Santiago de Surco - Lima',
    phone: '+51 993 275 893',
    logo_path: '',
  });

  const loadData = () => {
    setIsLoading(true);
    reportsService.getReportSummary().then((data) => {
      setSummary(data);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    settingsService.getTenantInfo().then((info) => {
      if (info && Object.keys(info).length > 0) {
        setCompanyInfo({
          name: info.legal_name || info.name || 'Grupo K contreras S.A.C',
          tradeName: info.trade_name || info.name || 'Chilia',
          ruc: info.ruc || '22213639030',
          address: info.address || 'Retamas PRUEBA 1',
          phone: info.phone || '+51 993 275 893',
          logo_path: info.logo_path || '',
        });
      }
    });
  }, []);

  const formatMoney = (amount: number) => {
    return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Export native binary .xlsx file with executive styling, pastel headers, and full table borders
  const exportToExcel = async (summaryData: ReportSummary) => {
    const dateStr = new Date().toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = companyInfo.name;
    workbook.created = new Date();

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'D1D5DB' } },
      left: { style: 'thin', color: { argb: 'D1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
      right: { style: 'thin', color: { argb: 'D1D5DB' } },
    };

    const totalBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: '1E293B' } },
      left: { style: 'thin', color: { argb: 'D1D5DB' } },
      bottom: { style: 'double', color: { argb: '1E293B' } },
      right: { style: 'thin', color: { argb: 'D1D5DB' } },
    };

    // ==========================================
    // SHEET 1: 1. Resumen Ejecutivo
    // ==========================================
    const ws1 = workbook.addWorksheet('1. Resumen Ejecutivo', { views: [{ showGridLines: true }] });

    ws1.mergeCells('A1:B1');
    const titleCell1 = ws1.getCell('A1');
    titleCell1.value = `REPORTING EJECUTIVO Y AUDITORÍA FINANCIERA - ${companyInfo.name.toUpperCase()}`;
    titleCell1.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFF' } };
    titleCell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E1B4B' } };
    titleCell1.alignment = { vertical: 'middle', horizontal: 'left' };
    ws1.getRow(1).height = 35;

    ws1.mergeCells('A2:B2');
    const subCell1 = ws1.getCell('A2');
    subCell1.value = `Generado el: ${dateStr}  |  RUC: ${companyInfo.ruc}  |  Sede Principal  |  Moneda: Nuevos Soles (S/)`;
    subCell1.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'C7D2FE' } };
    subCell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '312E81' } };
    subCell1.alignment = { vertical: 'middle', horizontal: 'left' };
    ws1.getRow(2).height = 24;

    ws1.addRow([]);

    const secRow1 = ws1.addRow(['1. AUDITORÍA FINANCIERA Y CONSOLIDADO MENSUAL', '']);
    ws1.mergeCells(`A${secRow1.number}:B${secRow1.number}`);
    secRow1.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: '1E3A8A' } };
    secRow1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0E7FF' } }; // Pastel indigo
    secRow1.getCell(1).border = thinBorder;
    secRow1.height = 26;

    const headerRow1 = ws1.addRow(['Indicador Financiero / KPI', 'Monto Total']);
    headerRow1.height = 24;
    headerRow1.eachCell((cell, colNum) => {
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C7D2FE' } };
      cell.border = thinBorder;
      cell.alignment = colNum === 2 ? { horizontal: 'right', vertical: 'middle' } : { horizontal: 'left', vertical: 'middle' };
    });

    const kpiData = [
      { label: 'Ventas Totales del Mes (Ingreso Bruto)', value: summaryData.ventasMes, bg: 'F8FAFC', fg: '0F172A' },
      { label: 'Ganancia Bruta (Ventas - Costos de Adquisición / COGS)', value: summaryData.gananciasBrutas, bg: 'DCFCE7', fg: '15803D' },
      { label: 'Ganancia Neta (Ganancia Bruta - Gastos Operativos)', value: summaryData.gananciasNetas, bg: 'ECFDF5', fg: '047857' },
      { label: 'Gastos Consolidados (Compras de Stock + Operativos)', value: summaryData.gastosMes, bg: 'FEE2E2', fg: 'B91C1C' },
      { label: 'Valorización Total de Almacén (Inventario Actual)', value: summaryData.valorizacionAlmacen, bg: 'F1F5F9', fg: '0F172A' },
    ];

    kpiData.forEach((kpi) => {
      const r = ws1.addRow([kpi.label, kpi.value]);
      r.height = 22;

      r.getCell(1).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '334155' } };
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.bg } };
      r.getCell(1).border = thinBorder;

      r.getCell(2).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: kpi.fg } };
      r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.bg } };
      r.getCell(2).numFmt = '"S/" #,##0.00';
      r.getCell(2).border = thinBorder;
      r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
    });

    ws1.getColumn(1).width = 58;
    ws1.getColumn(2).width = 24;

    // ==========================================
    // SHEET 2: 2. Ventas y Ganancias
    // ==========================================
    const ws2 = workbook.addWorksheet('2. Ventas y Ganancias', { views: [{ showGridLines: true }] });

    const secRow2_1 = ws2.addRow(['1. DETALLE REGISTRADO DE VENTAS DEL MES', '', '', '', '']);
    ws2.mergeCells(`A${secRow2_1.number}:E${secRow2_1.number}`);
    secRow2_1.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: '1E3A8A' } };
    secRow2_1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } }; // Pastel Blue
    secRow2_1.getCell(1).border = thinBorder;
    secRow2_1.height = 26;

    const headerRow2_1 = ws2.addRow(['Fecha y Hora', 'N° Comprobante', 'Cliente / Receptor', 'Medio de Pago', 'Total Facturado']);
    headerRow2_1.height = 24;
    headerRow2_1.eachCell((cell, colNum) => {
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '1E3A8A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'BFDBFE' } };
      cell.border = thinBorder;
      cell.alignment = colNum === 5 ? { horizontal: 'right', vertical: 'middle' } : { horizontal: 'left', vertical: 'middle' };
    });

    summaryData.salesList.forEach((s, idx) => {
      const r = ws2.addRow([s.date, s.docNumber, s.customer, s.method, s.total]);
      r.height = 20;
      const bg = idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF';

      r.eachCell((cell, colNum) => {
        cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: '1E293B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = thinBorder;
        if (colNum === 2) cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: '1E3A8A' } };
        if (colNum === 5) {
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: '0F172A' } };
          cell.numFmt = '"S/" #,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });
    });

    const totalSalesRow = ws2.addRow(['TOTAL INGRESOS POR VENTAS', '', '', '', summaryData.ventasMes]);
    totalSalesRow.height = 24;
    ws2.mergeCells(`A${totalSalesRow.number}:D${totalSalesRow.number}`);
    totalSalesRow.getCell(1).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '0F172A' } };
    totalSalesRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
    totalSalesRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    totalSalesRow.getCell(1).border = totalBorder;

    totalSalesRow.getCell(5).font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: '1E3A8A' } };
    totalSalesRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
    totalSalesRow.getCell(5).numFmt = '"S/" #,##0.00';
    totalSalesRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    totalSalesRow.getCell(5).border = totalBorder;

    ws2.addRow([]);

    const secRow2_2 = ws2.addRow(['2. DESGLOSE DE GANANCIA BRUTA POR ÍTEM (COSTO VS PRECIO)', '', '', '', '', '', '', '']);
    ws2.mergeCells(`A${secRow2_2.number}:H${secRow2_2.number}`);
    secRow2_2.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: '065F46' } };
    secRow2_2.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } }; // Pastel Emerald
    secRow2_2.getCell(1).border = thinBorder;
    secRow2_2.height = 26;

    const headerRow2_2 = ws2.addRow(['Comprobante', 'Producto / Descripción', 'Cant.', 'Precio Unit.', 'Subtotal Venta', 'Costo Unit.', 'Costo Total', 'Ganancia Bruta']);
    headerRow2_2.height = 24;
    headerRow2_2.eachCell((cell, colNum) => {
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '065F46' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'BBF7D0' } };
      cell.border = thinBorder;
      if (colNum === 3) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      else if (colNum >= 4) cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });

    summaryData.grossProfitList.forEach((gp, idx) => {
      const r = ws2.addRow([gp.docNumber, gp.product, gp.qty, gp.price, gp.subtotal, gp.cost, gp.totalCost, gp.profit]);
      r.height = 20;
      const bg = idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF';

      r.eachCell((cell, colNum) => {
        cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: '1E293B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = thinBorder;
        if (colNum === 2) cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: '0F172A' } };
        if (colNum === 3) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (colNum >= 4) {
          cell.numFmt = '"S/" #,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
        if (colNum === 8) {
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: '15803D' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ECFDF5' } };
        }
      });
    });

    const totalGPRow = ws2.addRow([
      'TOTALES CONSOLIDADOS',
      '',
      '',
      '',
      summaryData.ventasMes,
      '',
      summaryData.ventasMes - summaryData.gananciasBrutas,
      summaryData.gananciasBrutas,
    ]);
    totalGPRow.height = 24;
    ws2.mergeCells(`A${totalGPRow.number}:D${totalGPRow.number}`);
    totalGPRow.getCell(1).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '0F172A' } };
    totalGPRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
    totalGPRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    totalGPRow.getCell(1).border = totalBorder;

    [5, 7, 8].forEach((c) => {
      const cell = totalGPRow.getCell(c);
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: c === 8 ? { argb: '15803D' } : { argb: '0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: c === 8 ? { argb: 'DCFCE7' } : { argb: 'F1F5F9' } };
      cell.numFmt = '"S/" #,##0.00';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.border = totalBorder;
    });

    ws2.getColumn(1).width = 18;
    ws2.getColumn(2).width = 36;
    ws2.getColumn(3).width = 10;
    ws2.getColumn(4).width = 16;
    ws2.getColumn(5).width = 18;
    ws2.getColumn(6).width = 16;
    ws2.getColumn(7).width = 18;
    ws2.getColumn(8).width = 20;

    // ==========================================
    // SHEET 3: 3. Gastos y Compras
    // ==========================================
    const ws3 = workbook.addWorksheet('3. Gastos y Compras', { views: [{ showGridLines: true }] });

    const secRow3 = ws3.addRow(['DETALLE DE GASTOS Y REPOSICIÓN DE MERCADERÍA', '', '', '']);
    ws3.mergeCells(`A${secRow3.number}:D${secRow3.number}`);
    secRow3.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: '991B1B' } };
    secRow3.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } }; // Pastel Red
    secRow3.getCell(1).border = thinBorder;
    secRow3.height = 26;

    const headerRow3 = ws3.addRow(['Fecha / N° Registro', 'Descripción / Proveedor', 'Categoría / Tipo', 'Monto Total']);
    headerRow3.height = 24;
    headerRow3.eachCell((cell, colNum) => {
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '991B1B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FCA5A5' } };
      cell.border = thinBorder;
      if (colNum === 4) cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });

    const subA = ws3.addRow(['A. COMPRAS DE INVENTARIO Y MERCADERÍA', '', '', '']);
    ws3.mergeCells(`A${subA.number}:D${subA.number}`);
    subA.getCell(1).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: '1E3A8A' } };
    subA.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
    subA.getCell(1).border = thinBorder;

    summaryData.purchasesList.forEach((p, idx) => {
      const r = ws3.addRow([`${p.date} (${p.docNumber})`, p.supplier, 'Compra de Stock', p.total]);
      r.height = 20;
      const bg = idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF';
      r.eachCell((cell, colNum) => {
        cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: '1E293B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = thinBorder;
        if (colNum === 4) {
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: '991B1B' } };
          cell.numFmt = '"S/" #,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });
    });

    const subB = ws3.addRow(['B. GASTOS OPERATIVOS Y ADMINISTRATIVOS', '', '', '']);
    ws3.mergeCells(`A${subB.number}:D${subB.number}`);
    subB.getCell(1).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: '1E3A8A' } };
    subB.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
    subB.getCell(1).border = thinBorder;

    summaryData.expensesList.forEach((e, idx) => {
      const r = ws3.addRow([e.date, e.description, e.type, e.amount]);
      r.height = 20;
      const bg = idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF';
      r.eachCell((cell, colNum) => {
        cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: '1E293B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = thinBorder;
        if (colNum === 4) {
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: '991B1B' } };
          cell.numFmt = '"S/" #,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });
    });

    const totalExpRow = ws3.addRow(['TOTAL GASTOS Y COMPRAS CONSOLIDADAS', '', '', summaryData.gastosMes]);
    totalExpRow.height = 24;
    ws3.mergeCells(`A${totalExpRow.number}:C${totalExpRow.number}`);
    totalExpRow.getCell(1).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '0F172A' } };
    totalExpRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
    totalExpRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    totalExpRow.getCell(1).border = totalBorder;

    totalExpRow.getCell(4).font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'B91C1C' } };
    totalExpRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
    totalExpRow.getCell(4).numFmt = '"S/" #,##0.00';
    totalExpRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
    totalExpRow.getCell(4).border = totalBorder;

    ws3.getColumn(1).width = 26;
    ws3.getColumn(2).width = 42;
    ws3.getColumn(3).width = 28;
    ws3.getColumn(4).width = 22;

    // ==========================================
    // SHEET 4: 4. Almacén e Inventario
    // ==========================================
    const ws4 = workbook.addWorksheet('4. Almacén e Inventario', { views: [{ showGridLines: true }] });

    const secRow4 = ws4.addRow(['VALORIZACIÓN DETALLADA DE ALMACÉN (INVENTARIO FÍSICO)', '', '', '', '']);
    ws4.mergeCells(`A${secRow4.number}:E${secRow4.number}`);
    secRow4.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: '92400E' } };
    secRow4.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } }; // Pastel Amber
    secRow4.getCell(1).border = thinBorder;
    secRow4.height = 26;

    const headerRow4 = ws4.addRow(['Código SKU', 'Nombre del Producto', 'Stock Actual', 'Costo Unitario', 'Valorización Total']);
    headerRow4.height = 24;
    headerRow4.eachCell((cell, colNum) => {
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '92400E' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FDE68A' } };
      cell.border = thinBorder;
      if (colNum === 3) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (colNum >= 4) cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });

    summaryData.inventoryList.forEach((item, idx) => {
      const r = ws4.addRow([item.code, item.name, item.stock, item.cost, item.totalValue]);
      r.height = 20;
      const bg = idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF';
      r.eachCell((cell, colNum) => {
        cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: '1E293B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = thinBorder;
        if (colNum === 2) cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: '0F172A' } };
        if (colNum === 3) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (colNum >= 4) {
          cell.numFmt = '"S/" #,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
        if (colNum === 5) cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: '0F172A' } };
      });
    });

    const totalInvRow = ws4.addRow(['VALORIZACIÓN TOTAL DEL INVENTARIO', '', '', '', summaryData.valorizacionAlmacen]);
    totalInvRow.height = 24;
    ws4.mergeCells(`A${totalInvRow.number}:D${totalInvRow.number}`);
    totalInvRow.getCell(1).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '0F172A' } };
    totalInvRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
    totalInvRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    totalInvRow.getCell(1).border = totalBorder;

    totalInvRow.getCell(5).font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: '92400E' } };
    totalInvRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
    totalInvRow.getCell(5).numFmt = '"S/" #,##0.00';
    totalInvRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    totalInvRow.getCell(5).border = totalBorder;

    ws4.getColumn(1).width = 18;
    ws4.getColumn(2).width = 42;
    ws4.getColumn(3).width = 14;
    ws4.getColumn(4).width = 20;
    ws4.getColumn(5).width = 24;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Auditoria_BV_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Detailed print PDF layout
  const exportToPDF = (summaryData: ReportSummary) => {
    const printWindow = window.open('', '_blank', 'width=900,height=950');
    if (!printWindow) return;

    const dateStr = new Date().toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte Financiero Detallado - Ventas B&V</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #334155;
            margin: 40px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .header-logo {
            font-size: 24px;
            font-weight: 800;
            color: #1e3a8a;
          }
          .header-meta {
            text-align: right;
            font-size: 11px;
            color: #64748b;
          }
          .report-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
            color: #0f172a;
          }
          .section-title {
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            color: #1e3a8a;
            border-bottom: 2px solid #cbd5e1;
            padding-bottom: 5px;
            margin-top: 30px;
            margin-bottom: 12px;
            page-break-after: avoid;
          }
          .grid-summary {
            display: grid;
            grid-template-cols: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 15px;
          }
          .summary-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            background-color: #f8fafc;
          }
          .summary-card-title {
            font-size: 10px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .summary-card-value {
            font-size: 16px;
            font-weight: bold;
            color: #0f172a;
          }
          .summary-card-trend {
            font-size: 10px;
            color: #475569;
            margin-top: 3px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          th {
            background-color: #f1f5f9;
            color: #1e3a8a;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: bold;
            text-align: left;
            padding: 8px 10px;
            border-bottom: 2px solid #e2e8f0;
          }
          td {
            padding: 8px 10px;
            font-size: 11px;
            border-bottom: 1px solid #f1f5f9;
          }
          .sub-header-row {
            background-color: #f8fafc;
            font-weight: bold;
            color: #1e3a8a;
            font-size: 11px;
          }
          .text-right {
            text-align: right;
          }
          .bold {
            font-weight: bold;
          }
          .bg-success-light {
            background-color: #f0fdf4;
          }
          .bg-danger-light {
            background-color: #fef2f2;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
          }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 14px;">
            ${companyInfo.logo_path ? `<img src="${companyInfo.logo_path}" style="max-height: 48px; max-width: 140px; object-fit: contain; border-radius: 4px;" />` : ''}
            <div>
              <div class="header-logo">${companyInfo.name}</div>
              <div style="font-size: 11px; color: #475569; font-weight: 600;">${companyInfo.tradeName ? `${companyInfo.tradeName} • ` : ''}R.U.C. N° ${companyInfo.ruc}</div>
              <div style="font-size: 10px; color: #64748b;">${companyInfo.address} ${companyInfo.phone ? `• Tel: ${companyInfo.phone}` : ''}</div>
            </div>
          </div>
          <div class="header-meta">
            <div style="font-weight: 700; color: #0f172a;">Sede Principal</div>
            <div>Fecha: ${dateStr}</div>
          </div>
        </div>

        <div class="report-title">Auditoría Financiera y Libro de Control</div>
        <div style="font-size: 12px; color: #475569; margin-bottom: 20px;">Desglose y conciliación total de transacciones, costo de ventas por ítem, compras e inventario a costo.</div>

        <div class="section-title">Resumen Financiero Mensual</div>
        <div class="grid-summary">
          <div class="summary-card">
            <div class="summary-card-title">Ventas del Mes</div>
            <div class="summary-card-value">S/ ${summaryData.ventasMes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
            <div class="summary-card-trend">Ingreso bruto facturado</div>
          </div>
          <div class="summary-card" style="border-left: 3px solid #22c55e;">
            <div class="summary-card-title">Ganancia Bruta</div>
            <div class="summary-card-value">S/ ${summaryData.gananciasBrutas.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
            <div class="summary-card-trend">Margen bruto: ${summaryData.ventasMes > 0 ? ((summaryData.gananciasBrutas / summaryData.ventasMes) * 100).toFixed(1) : '0'}%</div>
          </div>
          <div class="summary-card" style="border-left: 3px solid #22c55e; background-color: #f0fdf4;">
            <div class="summary-card-title">Ganancia Neta</div>
            <div class="summary-card-value">S/ ${summaryData.gananciasNetas.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
            <div class="summary-card-trend">Margen neto: ${summaryData.ventasMes > 0 ? ((summaryData.gananciasNetas / summaryData.ventasMes) * 100).toFixed(1) : '0'}%</div>
          </div>
        </div>

        <div class="grid-summary" style="grid-template-cols: repeat(2, 1fr);">
          <div class="summary-card" style="border-left: 3px solid #ef4444;">
            <div class="summary-card-title">Gastos del Mes</div>
            <div class="summary-card-value">S/ ${summaryData.gastosMes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
            <div class="summary-card-trend">Compras de stock + Operativos</div>
          </div>
          <div class="summary-card" style="border-left: 3px solid #eab308;">
            <div class="summary-card-title">Valorización de Almacén</div>
            <div class="summary-card-value">S/ ${summaryData.valorizacionAlmacen.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
            <div class="summary-card-trend">Inversión total a costo en stock</div>
          </div>
        </div>

        <div class="section-title">Detalle de Ventas del Mes (Ingresos)</div>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Documento</th>
              <th>Cliente</th>
              <th>Medio de Pago</th>
              <th class="text-right">Monto Total</th>
            </tr>
          </thead>
          <tbody>
            ${summaryData.salesList.map(s => `
              <tr>
                <td>${s.date}</td>
                <td class="bold">${s.docNumber}</td>
                <td>${s.customer}</td>
                <td>${s.method}</td>
                <td class="text-right bold">S/ ${s.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <td colspan="4">Total Ventas Facturado</td>
              <td class="text-right">S/ ${summaryData.ventasMes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">Detalle de Ganancia Bruta (Costo de Ventas por Ítem)</div>
        <table>
          <thead>
            <tr>
              <th>Doc.</th>
              <th>Producto</th>
              <th class="text-right">Cant.</th>
              <th class="text-right">P. Unit.</th>
              <th class="text-right">Subtotal</th>
              <th class="text-right">Costo Unit.</th>
              <th class="text-right">Costo Total</th>
              <th class="text-right">Ganancia Bruta</th>
            </tr>
          </thead>
          <tbody>
            ${summaryData.grossProfitList.map(gp => `
              <tr>
                <td>${gp.docNumber}</td>
                <td class="bold">${gp.product}</td>
                <td class="text-right">${gp.qty}</td>
                <td class="text-right">S/ ${gp.price.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                <td class="text-right">S/ ${gp.subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                <td class="text-right">S/ ${gp.cost.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                <td class="text-right">S/ ${gp.totalCost.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                <td class="text-right bold bg-success-light">S/ ${gp.profit.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <td colspan="4">Total Conciliado</td>
              <td class="text-right">S/ ${summaryData.ventasMes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
              <td>-</td>
              <td class="text-right">S/ ${(summaryData.ventasMes - summaryData.gananciasBrutas).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
              <td class="text-right bg-success-light">S/ ${summaryData.gananciasBrutas.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">Detalle de Gastos del Mes (Compras + Operativos)</div>
        <table>
          <thead>
            <tr>
              <th>Fecha / Doc.</th>
              <th>Descripción / Proveedor</th>
              <th>Tipo</th>
              <th class="text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr class="sub-header-row"><td colspan="4">A. Compras y Adquisición de Inventario</td></tr>
            ${summaryData.purchasesList.map(p => `
              <tr>
                <td>${p.date} (${p.docNumber})</td>
                <td>${p.supplier}</td>
                <td>Mercadería</td>
                <td class="text-right bold">S/ ${p.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
            <tr class="sub-header-row"><td colspan="4">B. Gastos Operativos (Fijos y Variables)</td></tr>
            ${summaryData.expensesList.map(e => `
              <tr>
                <td>${e.date}</td>
                <td>${e.description}</td>
                <td>${e.type}</td>
                <td class="text-right bold">S/ ${e.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <td colspan="3">Total Egresos Consolidados</td>
              <td class="text-right bg-danger-light">S/ ${summaryData.gastosMes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">Detalle de Valorización de Almacén (Inversión en Stock)</div>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción del Producto</th>
              <th class="text-right">Stock</th>
              <th class="text-right">Costo Unit.</th>
              <th class="text-right">Total Valorizado</th>
            </tr>
          </thead>
          <tbody>
            ${summaryData.inventoryList.map(item => `
              <tr>
                <td>${item.code}</td>
                <td class="bold">${item.name}</td>
                <td class="text-right">${item.stock} u.</td>
                <td class="text-right">S/ ${item.cost.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                <td class="text-right bold">S/ ${item.totalValue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <td colspan="4">Valorización Total del Stock</td>
              <td class="text-right">S/ ${summaryData.valorizacionAlmacen.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>Este reporte contiene información comercial y de auditoría interna de la empresa ${companyInfo.name}.</p>
          <p>© 2026 ${companyInfo.name}. Todos los derechos reservados.</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div>
      <PageHeader
        title="Reportes & Business Intelligence"
        subtitle="Análisis estratégico de ventas, inventario, rentabilidad y exportación de datos"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadData} disabled={isLoading}>
              Actualizar
            </Button>
            <Button variant="outline" onClick={() => summary && exportToExcel(summary)} disabled={isLoading || !summary}>
              <Download size={16} className="mr-1.5 inline" /> Exportar a Excel
            </Button>
            <Button onClick={() => summary && exportToPDF(summary)} disabled={isLoading || !summary}>
              <Download size={16} className="mr-1.5 inline" /> Reporte PDF
            </Button>
          </div>
        }
      />

      {isLoading || !summary ? (
        <div className="p-12 text-center text-secondary text-sm">
          Cargando reportes desde la base de datos...
        </div>
      ) : (
        <>
          {/* Row 1: Ventas, Ganancia Bruta, Ganancia Neta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <StatCard 
              title="Ventas del Mes" 
              value={formatMoney(summary.ventasMes)} 
              icon={<DollarSign />} 
              variant="primary" 
              trend="Ingresos totales de este mes"
            />
            <StatCard 
              title="Ganancia Bruta" 
              value={formatMoney(summary.gananciasBrutas)} 
              icon={<TrendingUp />} 
              variant="success" 
              trend={`Margen Bruto: ${summary.ventasMes > 0 ? ((summary.gananciasBrutas / summary.ventasMes) * 100).toFixed(1) : '0'}%`}
            />
            <StatCard 
              title="Ganancia Neta" 
              value={formatMoney(summary.gananciasNetas)} 
              icon={<TrendingUp />} 
              variant="success" 
              trend={`Margen Neto: ${summary.ventasMes > 0 ? ((summary.gananciasNetas / summary.ventasMes) * 100).toFixed(1) : '0'}%`}
            />
          </div>

          {/* Row 2: Gastos del Mes, Valorización Almacén */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard 
              title="Gastos del Mes" 
              value={formatMoney(summary.gastosMes)} 
              icon={<ShoppingCart />} 
              variant="danger" 
              trend="Compras registradas en Supabase"
            />
            <StatCard 
              title="Valorización Almacén" 
              value={formatMoney(summary.valorizacionAlmacen)} 
              icon={<Package />} 
              variant="warning" 
              trend="Costo total de stock en almacén"
            />
            {/* Blank filler to maintain perfect width alignment of the two cards */}
            <div className="hidden md:block"></div>
          </div>

          {(() => {
            const topProductsData = summary.topProducts.map((p, idx) => ({
              ...p,
              rank: idx + 1,
            }));

            const topProductsColumns = [
              {
                key: 'rank',
                header: '# POSICIÓN',
                render: (r: { rank: number }) => (
                  <Badge variant={r.rank === 1 ? 'warning' : 'primary'} className="font-extrabold px-2.5 py-0.5 text-xs">
                    #{r.rank}
                  </Badge>
                ),
              },
              {
                key: 'name',
                header: 'PRODUCTO',
                render: (r: { name: string; sales: number; total: number }) => (
                  <div>
                    <span className="font-bold text-sm text-primary block leading-tight">{r.name}</span>
                    <div className="mt-1">
                      <SuggestionChip label={`${r.sales} unid. vendidas`} size="xs" />
                    </div>
                  </div>
                ),
              },
              {
                key: 'total',
                header: 'FACTURACIÓN TOTAL',
                render: (r: { name: string; sales: number; total: number }) => {
                  const maxTotal = Math.max(...(summary.topProducts.map((p) => p.total) || [1]), 1);
                  const barPct = Math.round((r.total / maxTotal) * 100);
                  return (
                    <div className="space-y-1 text-right">
                      <span className="font-bold text-sm text-primary font-mono block">
                        {formatMoney(r.total)}
                      </span>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-[11px] text-secondary font-medium">({barPct}%)</span>
                        <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden inline-block">
                          <div
                            className="bg-primary-600 h-full rounded-full"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                },
              },
            ];

            const salesByPaymentColumns = [
              {
                key: 'method',
                header: 'MEDIO DE PAGO',
                render: (r: { method: string; amount: number; pct: number }) => (
                  <SuggestionChip label={r.method} size="sm" />
                ),
              },
              {
                key: 'amount',
                header: 'MONTO FACTURADO',
                render: (r: { method: string; amount: number; pct: number }) => (
                  <span className="font-bold text-sm text-primary font-mono">
                    {formatMoney(r.amount)}
                  </span>
                ),
              },
              {
                key: 'pct',
                header: 'PARTICIPACIÓN',
                render: (r: { method: string; amount: number; pct: number }) => (
                  <div className="flex items-center justify-end gap-2">
                    <Badge variant="primary" className="font-extrabold text-xs">
                      {r.pct}%
                    </Badge>
                    <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden inline-block">
                      <div
                        className="bg-primary-600 h-full rounded-full"
                        style={{ width: `${r.pct}%` }}
                      />
                    </div>
                  </div>
                ),
              },
            ];

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Card 1: Top 5 Productos Más Vendidos */}
                <Card>
                  <CardHeader title="Top 5 Productos Más Vendidos" subtitle="Ranking de artículos con mayor volumen y facturación" />
                  <CardBody>
                    <DataTable
                      columns={topProductsColumns}
                      data={topProductsData}
                      searchable={false}
                      emptyMessage="No se registraron ventas en este periodo"
                    />
                  </CardBody>
                </Card>

                {/* Card 2: Ventas por Medio de Pago */}
                <Card>
                  <CardHeader title="Ventas por Medio de Pago" subtitle="Distribución porcentual por canal de cobro" />
                  <CardBody>
                    <DataTable
                      columns={salesByPaymentColumns}
                      data={summary.salesByPayment}
                      searchable={false}
                      emptyMessage="Sin datos de pago este periodo"
                    />
                  </CardBody>
                </Card>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
