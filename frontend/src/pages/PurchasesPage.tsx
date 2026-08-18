import React, { useState } from 'react';
import { Plus, ShoppingCart, CheckCircle, Clock, FileText, Eye } from 'lucide-react';
import { PageHeader, Button, Badge, DataTable, Modal } from '../components/ui';

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  branch: string;
  date: string;
  total: number;
  status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED';
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const columns = [
    { key: 'orderNumber', header: 'Orden N°', render: (r: PurchaseOrder) => <span className="font-bold text-primary-900">{r.orderNumber}</span> },
    { key: 'supplier', header: 'Proveedor', render: (r: PurchaseOrder) => <span className="text-sm">{r.supplier}</span> },
    { key: 'branch', header: 'Sucursal Destino', render: (r: PurchaseOrder) => <span className="text-xs bg-neutral-100 px-2 py-1 rounded">{r.branch}</span> },
    { key: 'date', header: 'Fecha', render: (r: PurchaseOrder) => <span className="text-xs text-secondary">{r.date}</span> },
    { key: 'total', header: 'Total (PEN)', render: (r: PurchaseOrder) => <span className="font-bold text-primary-800">S/ {r.total.toFixed(2)}</span> },
    {
      key: 'status',
      header: 'Estado',
      render: (r: PurchaseOrder) => {
        if (r.status === 'RECEIVED') return <Badge variant="success"><CheckCircle size={12} className="inline mr-1" /> Recibido</Badge>;
        if (r.status === 'SENT') return <Badge variant="info"><Clock size={12} className="inline mr-1" /> Enviado</Badge>;
        if (r.status === 'DRAFT') return <Badge variant="warning">Borrador</Badge>;
        return <Badge variant="secondary">Cancelado</Badge>;
      }
    }
  ];

  return (
    <div>
      <PageHeader
        title="Órdenes de Compra & Mercadería"
        subtitle="Gestión de compras a proveedores, cotizaciones y abastecimiento de almacén"
        action={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={18} className="mr-1.5 inline" /> Nueva Órden de Compra
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={purchases}
        searchPlaceholder="Buscar orden o proveedor..."
        actions={(row) => (
          <div className="flex gap-2 justify-end">
            <button className="p-1.5 text-neutral-500 hover:text-primary-600 hover:bg-neutral-100 rounded-md" title="Ver Detalle">
              <Eye size={16} />
            </button>
          </div>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Órden de Compra"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsModalOpen(false)}>Generar Órden</Button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label className="form-label">Proveedor</label>
            <select className="form-control">
              <option>Distribuidora Tech Perú S.A.C.</option>
              <option>Importaciones Cómputo Global E.I.R.L.</option>
              <option>Logitech Latinoamerica S.A.</option>
            </select>
          </div>
          <div>
            <label className="form-label">Sucursal de Destino</label>
            <select className="form-control">
              <option>Sucursal Principal - Lima Centro</option>
              <option>Sucursal Miraflores</option>
              <option>Sucursal Arequipa</option>
            </select>
          </div>
          <div>
            <label className="form-label">Notas u Observaciones</label>
            <textarea className="form-control" rows={3} placeholder="Instrucciones de despacho..."></textarea>
          </div>
        </form>
      </Modal>
    </div>
  );
}
