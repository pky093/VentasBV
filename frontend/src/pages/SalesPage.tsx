import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Eye } from 'lucide-react';
import { PageHeader, Badge, DataTable } from '../components/ui';
import { salesService, Sale } from '../lib/db-services';
import { SaleDetailModal } from '../components/sales/SaleDetailModal';

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  useEffect(() => {
    salesService.getSales().then((data) => {
      setSales(data);
      setIsLoading(false);
    });
  }, []);

  const handleOpenModal = (sale: Sale) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  const columns = [
    { key: 'saleNumber', header: 'Venta N°', render: (r: Sale) => <span className="font-bold text-primary-900">{r.saleNumber}</span> },
    { key: 'customer', header: 'Cliente', render: (r: Sale) => <span className="text-sm font-medium">{r.customer}</span> },
    { key: 'branch', header: 'Sucursal', render: (r: Sale) => <span className="text-xs bg-neutral-100 px-2 py-0.5 rounded">{r.branch}</span> },
    { key: 'date', header: 'Fecha y Hora', render: (r: Sale) => <span className="text-xs text-secondary">{r.date}</span> },
    { key: 'paymentMethod', header: 'Pago', render: (r: Sale) => <Badge variant="info">{r.paymentMethod}</Badge> },
    { key: 'total', header: 'Monto Total', render: (r: Sale) => <span className="font-bold text-primary-800">S/ {r.total.toFixed(2)}</span> },
    {
      key: 'status',
      header: 'Estado',
      render: (r: Sale) => (
        <Badge variant={r.status === 'COMPLETED' || r.status === 'PAID' ? 'success' : 'danger'}>
          {r.status === 'COMPLETED' || r.status === 'PAID' ? 'Completado' : 'Anulado'}
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
        loading={isLoading}
        searchPlaceholder="Buscar por número de venta o cliente..."
        initialSearch={initialSearch}
        actions={(row) => (
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => handleOpenModal(row)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                background: 'var(--primary-50, #ecfdf5)',
                color: 'var(--primary-700, #047857)',
                border: '1px solid var(--primary-200, #a7f3d0)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--primary-100, #d1fae5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--primary-50, #ecfdf5)';
              }}
              title="Ver Comprobante y Detalle"
            >
              <FileText size={14} />
              <span>Ver Comprobante</span>
            </button>
          </div>
        )}
      />

      {/* Sale Detail & Ticket Modal */}
      <SaleDetailModal
        sale={selectedSale}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
