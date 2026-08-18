import React, { useState } from 'react';
import { BarChart3, Download, TrendingUp, DollarSign, Package, ShoppingCart, Calendar } from 'lucide-react';
import { PageHeader, Button, Tabs, Card, CardHeader, CardBody, StatCard } from '../components/ui';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('sales');

  const tabs = [
    { id: 'sales', label: 'Reporte de Ventas', icon: <BarChart3 size={16} /> },
    { id: 'inventory', label: 'Valorización de Stock', icon: <Package size={16} /> },
    { id: 'profit', label: 'Ganancia & Margen', icon: <TrendingUp size={16} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Reportes & Business Intelligence"
        subtitle="Análisis estratégico de ventas, inventario, rentabilidad y exportación de datos"
        action={
          <div className="flex gap-2">
            <Button variant="secondary">
              <Download size={16} className="mr-1.5 inline" /> Exportar a Excel
            </Button>
            <Button>
              <Download size={16} className="mr-1.5 inline" /> Reporte PDF
            </Button>
          </div>
        }
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard title="Ventas del Mes" value="S/ 48,250.00" icon={<DollarSign />} variant="primary" trend="+14.2% vs mes anterior" />
        <StatCard title="Ganancia Neta Est." value="S/ 12,480.00" icon={<TrendingUp />} variant="success" trend="Margen prom. 25.8%" />
        <StatCard title="Valorización Almacén" value="S/ 185,400.00" icon={<Package />} variant="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Top 5 Productos Más Vendidos" />
          <CardBody>
            <div className="space-y-4">
              {[
                { name: 'Monitor LG 24"', sales: 42, total: 'S/ 27,300' },
                { name: 'Mouse Logitech G203', sales: 68, total: 'S/ 6,460' },
                { name: 'Teclado Mecánico RGB', sales: 31, total: 'S/ 5,580' },
                { name: 'SSD Kingston 480GB', sales: 25, total: 'S/ 4,250' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                  <div>
                    <div className="font-semibold text-sm text-primary-900">{item.name}</div>
                    <div className="text-xs text-secondary">{item.sales} unidades vendidas</div>
                  </div>
                  <div className="font-bold text-primary-800 text-sm">{item.total}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Ventas por Medio de Pago" />
          <CardBody>
            <div className="space-y-4">
              {[
                { method: 'Tarjeta de Crédito / Débito', pct: '45%', amount: 'S/ 21,712' },
                { method: 'Efectivo en Caja', pct: '30%', amount: 'S/ 14,475' },
                { method: 'Billeteras (Yape / Plin)', pct: '15%', amount: 'S/ 7,237' },
                { method: 'Transferencia Bancaria', pct: '10%', amount: 'S/ 4,825' },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>{item.method}</span>
                    <span className="text-primary-800">{item.amount} ({item.pct})</span>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-primary-600 h-full rounded-full" style={{ width: item.pct }}></div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
