import React, { useState, useEffect } from 'react';
import { BarChart3, Download, TrendingUp, DollarSign, Package, ShoppingCart } from 'lucide-react';
import { PageHeader, Button, Tabs, Card, CardHeader, CardBody, StatCard } from '../components/ui';
import { reportsService, ReportSummary } from '../lib/db-services';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('sales');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = () => {
    setIsLoading(true);
    reportsService.getReportSummary().then((data) => {
      setSummary(data);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const tabs = [
    { id: 'sales', label: 'Reporte de Ventas', icon: <BarChart3 size={16} /> },
    { id: 'inventory', label: 'Valorización de Stock', icon: <Package size={16} /> },
    { id: 'profit', label: 'Ganancia & Margen', icon: <TrendingUp size={16} /> },
  ];

  const formatMoney = (amount: number) => {
    return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Detailed Excel spreadsheet export containing all audit trails
  const exportToExcel = (summaryData: ReportSummary) => {
    const dateStr = new Date().toLocaleDateString('es-PE');
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; margin-bottom: 25px; }
          th { background-color: #1e3a8a; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; }
          .title { font-size: 16px; font-weight: bold; color: #1e3a8a; padding: 10px 0; }
          .subtitle { font-size: 13px; font-weight: bold; color: #0f172a; padding: 5px 0; margin-top: 15px; }
          .meta { font-size: 11px; color: #64748b; padding-bottom: 15px; }
          .metric-label { font-weight: bold; background-color: #f1f5f9; }
          .metric-value { text-align: right; font-weight: bold; color: #0f172a; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .bg-success { background-color: #f0fdf4; color: #15803d; }
          .bg-danger { background-color: #fef2f2; color: #b91c1c; }
        </style>
      </head>
      <body>
        <div class="title">AUDITORÍA COMERCIAL Y FINANCIERA - VENTAS B&V</div>
        <div class="meta">Generado el: ${dateStr} | Sede Principal</div>
        
        <div class="subtitle">1. RESUMEN FINANCIERO MENSUAL</div>
        <table>
          <thead>
            <tr>
              <th colspan="2">Indicador</th>
              <th class="text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="metric-label" colspan="2">Ventas del Mes (Ingreso Bruto)</td>
              <td class="metric-value">S/ ${summaryData.ventasMes.toFixed(2)}</td>
            </tr>
            <tr>
              <td class="metric-label" colspan="2">Ganancia Bruta (Ventas - Costos de Adquisición)</td>
              <td class="metric-value bg-success">S/ ${summaryData.gananciasBrutas.toFixed(2)}</td>
            </tr>
            <tr>
              <td class="metric-label" colspan="2">Ganancia Neta (Ganancia Bruta - Gastos)</td>
              <td class="metric-value bg-success">S/ ${summaryData.gananciasNetas.toFixed(2)}</td>
            </tr>
            <tr>
              <td class="metric-label" colspan="2">Gastos Consolidados del Mes</td>
              <td class="metric-value bg-danger">S/ ${summaryData.gastosMes.toFixed(2)}</td>
            </tr>
            <tr>
              <td class="metric-label" colspan="2">Valorización Total de Almacén (Inventario a Costo)</td>
              <td class="metric-value">S/ ${summaryData.valorizacionAlmacen.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="subtitle">2. DETALLE DE VENTAS DEL MES (INGRESOS REGISTRADOS)</div>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Documento</th>
              <th>Cliente</th>
              <th>Medio de Pago</th>
              <th class="text-right">Total Facturado</th>
            </tr>
          </thead>
          <tbody>
            ${summaryData.salesList.map(s => `
              <tr>
                <td>${s.date}</td>
                <td class="bold">${s.docNumber}</td>
                <td>${s.customer}</td>
                <td>${s.method}</td>
                <td class="text-right bold">S/ ${s.total.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="metric-label">
              <td colspan="4" class="bold">TOTAL VENTAS</td>
              <td class="text-right bold">S/ ${summaryData.ventasMes.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="subtitle">3. DETALLE DE GANANCIA BRUTA (COSTO DE VENTAS / COGS POR ITEM)</div>
        <table>
          <thead>
            <tr>
              <th>Documento</th>
              <th>Producto</th>
              <th class="text-right">Cant.</th>
              <th class="text-right">P. Unitario</th>
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
                <td class="text-right">S/ ${gp.price.toFixed(2)}</td>
                <td class="text-right">S/ ${gp.subtotal.toFixed(2)}</td>
                <td class="text-right">S/ ${gp.cost.toFixed(2)}</td>
                <td class="text-right">S/ ${gp.totalCost.toFixed(2)}</td>
                <td class="text-right bold bg-success">S/ ${gp.profit.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="metric-label">
              <td colspan="4" class="bold">TOTALES</td>
              <td class="text-right bold">S/ ${summaryData.ventasMes.toFixed(2)}</td>
              <td>-</td>
              <td class="text-right bold">S/ ${(summaryData.ventasMes - summaryData.gananciasBrutas).toFixed(2)}</td>
              <td class="text-right bold bg-success">S/ ${summaryData.gananciasBrutas.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="subtitle">4. DETALLE DE GASTOS (COMPRAS COMERCIALES Y OPERATIVOS)</div>
        <table>
          <thead>
            <tr>
              <th>Fecha / Documento</th>
              <th>Descripción / Proveedor</th>
              <th>Tipo de Gasto</th>
              <th class="text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="4" style="background-color: #f8fafc; font-weight: bold; color: #1e3a8a;">A. Compras de Inventario / Mercadería</td></tr>
            ${summaryData.purchasesList.map(p => `
              <tr>
                <td>${p.date} (${p.docNumber})</td>
                <td>${p.supplier}</td>
                <td>Compra de Stock</td>
                <td class="text-right bold">S/ ${p.total.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr><td colspan="4" style="background-color: #f8fafc; font-weight: bold; color: #1e3a8a;">B. Gastos Operativos (Fijos & Variables)</td></tr>
            ${summaryData.expensesList.map(e => `
              <tr>
                <td>${e.date}</td>
                <td>${e.description}</td>
                <td>${e.type}</td>
                <td class="text-right bold">S/ ${e.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="metric-label">
              <td colspan="3" class="bold">TOTAL GASTOS CONSOLIDADOS</td>
              <td class="text-right bold bg-danger">S/ ${summaryData.gastosMes.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="subtitle">5. VALORIZACIÓN DETALLADA DE ALMACÉN (INVENTARIO FÍSICO)</div>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre del Producto</th>
              <th class="text-right">Stock Actual</th>
              <th class="text-right">Costo Unitario</th>
              <th class="text-right">Valorización Total</th>
            </tr>
          </thead>
          <tbody>
            ${summaryData.inventoryList.map(item => `
              <tr>
                <td>${item.code}</td>
                <td class="bold">${item.name}</td>
                <td class="text-right">${item.stock}</td>
                <td class="text-right">S/ ${item.cost.toFixed(2)}</td>
                <td class="text-right bold">S/ ${item.totalValue.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="metric-label">
              <td colspan="4" class="bold">TOTAL VALORIZACIÓN ALMACÉN</td>
              <td class="text-right bold">S/ ${summaryData.valorizacionAlmacen.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Auditoria_B&V_${new Date().toISOString().split('T')[0]}.xls`;
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
          <div>
            <div class="header-logo">VENTAS B&V</div>
            <div style="font-size: 11px; color: #64748b;">Enterprise POS & Business Intelligence</div>
          </div>
          <div class="header-meta">
            <div>Sede Principal</div>
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
          <p>Este reporte contiene información comercial y de auditoría interna de la empresa Ventas B&V.</p>
          <p>© 2026 Ventas B&V Enterprise POS. Todos los derechos reservados.</p>
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

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Top 5 Productos Más Vendidos" />
              <CardBody>
                <div className="space-y-4">
                  {summary.topProducts.length === 0 ? (
                    <div className="text-center py-6 text-xs text-secondary">
                      No se registraron ventas en este periodo
                    </div>
                  ) : (
                    summary.topProducts.map((item, i) => (
                      <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                        <div>
                          <div className="font-semibold text-sm text-primary-900">{item.name}</div>
                          <div className="text-xs text-secondary">{item.sales} unidades vendidas</div>
                        </div>
                        <div className="font-bold text-primary-800 text-sm">
                          {formatMoney(item.total)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Ventas por Medio de Pago" />
              <CardBody>
                <div className="space-y-4">
                  {summary.salesByPayment.length === 0 ? (
                    <div className="text-center py-6 text-xs text-secondary">
                      Sin datos de pago este periodo
                    </div>
                  ) : (
                    summary.salesByPayment.map((item, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>{item.method}</span>
                          <span className="text-primary-800">{formatMoney(item.amount)} ({item.pct}%)</span>
                        </div>
                        <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-primary-600 h-full rounded-full" style={{ width: `${item.pct}%` }}></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
