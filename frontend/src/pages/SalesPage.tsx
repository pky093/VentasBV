import React, { useState } from 'react';
import { DollarSign, Eye, FileText, CheckCircle, XCircle, CreditCard, Banknote } from 'lucide-react';
import { PageHeader, Button, Badge, DataTable } from '../components/ui';

interface SaleRecord {
  id: string;
  saleNumber: string;
  customer: string;
  branch: string;
  date: string;
  total: number;
  paymentMethod: 'CASH' | 'CARD' | 'YAPE' | 'TRANSFER';
  status: 'COMPLETED' | 'CANCELLED';
}

export default function SalesPage() {
  const [sales] = useState<SaleRecord[]>([
    { id: '1', saleNumber: 'V-000104', customer: 'Juan Carlos Pérez', branch: 'Lima Centro', date: '2026-08-16 15:40', total: 650.00, paymentMethod: 'CARD', status: 'COMPLETED' },
    { id: '2', saleNumber: 'V-000103', customer: 'Corporación Inmobiliaria ABC', branch: 'Lima Centro', date: '2026-08-16 14:10', total: 1200.00, paymentMethod: 'TRANSFER', status: 'COMPLETED' },
    { id: '3', saleNumber: 'V-000102', customer: 'Cliente Varios', branch: 'Miraflores', date: '2026-08-16 12:25', total: 95.00, paymentMethod: 'YAPE', status: 'COMPLETED' },
    { id: '4', saleNumber: 'V-000101', customer: 'María Elena Silva', branch: 'Arequipa', date: '2026-08-15 17:50', total: 180.00, paymentMethod: 'CASH', status: 'CANCELLED' },
  ]);

  const columns = [
    { key: 'saleNumber', header: 'Venta N°', render: (r: SaleRecord) => <span className="font-bold text-primary-900">{r.saleNumber}</span> },
    { key: 'customer', header: 'Cliente', render: (r: SaleRecord) => <span className="text-sm font-medium">{r.customer}</span> },
    { key: 'branch', header: 'Sucursal', render: (r: SaleRecord) => <span className="text-xs bg-neutral-100 px-2 py-0.5 rounded">{r.branch}</span> },
    { key: 'date', header: 'Fecha y Hora', render: (r: SaleRecord) => <span className="text-xs text-secondary">{r.date}</span> },
    { key: 'paymentMethod', header: 'Pago', render: (r: SaleRecord) => <Badge variant="info">{r.paymentMethod}</Badge> },
    { key: 'total', header: 'Monto Total', render: (r: SaleRecord) => <span className="font-bold text-primary-800">S/ {r.total.toFixed(2)}</span> },
    {
      key: 'status',
      header: 'Estado',
      render: (r: SaleRecord) => (
        <Badge variant={r.status === 'COMPLETED' ? 'success' : 'danger'}>
          {r.status === 'COMPLETED' ? 'Completado' : 'Anulado'}
        </Badge>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        title="Historial de Ventas"
        subtitle="Registro completo de operaciones comerciales y estados de pago"
      />

      <DataTable
        columns={columns}
        data={sales}
        searchPlaceholder="Buscar por número de venta o cliente..."
        actions={(row) => (
          <div className="flex gap-2 justify-end">
            <button className="p-1.5 text-neutral-500 hover:text-primary-600 hover:bg-neutral-100 rounded-md" title="Ver Detalle">
              <Eye size={16} />
            </button>
          </div>
        )}
      />
    </div>
  );
}
