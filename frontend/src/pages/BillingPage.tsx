import React, { useState } from 'react';
import { FileText, Download, CheckCircle, Clock, AlertTriangle, Eye } from 'lucide-react';
import { PageHeader, Button, Badge, DataTable, Modal } from '../components/ui';

interface Invoice {
  id: string;
  docType: 'BOLETA' | 'FACTURA' | 'NOTA_CREDITO';
  series: string;
  sequence: string;
  customerName: string;
  customerDoc: string;
  total: number;
  status: 'ISSUED' | 'ACCEPTED' | 'PENDING' | 'REJECTED';
  date: string;
}

export default function BillingPage() {
  const [invoices] = useState<Invoice[]>([
    { id: '1', docType: 'FACTURA', series: 'F001', sequence: '00000089', customerName: 'Corporación Inmobiliaria ABC S.A.C.', customerDoc: '20123456789', total: 1416.00, status: 'ACCEPTED', date: '2026-08-16 14:10' },
    { id: '2', docType: 'BOLETA', series: 'B001', sequence: '00000124', customerName: 'Juan Carlos Pérez Ramos', customerDoc: '45890123', total: 767.00, status: 'ACCEPTED', date: '2026-08-16 15:40' },
    { id: '3', docType: 'BOLETA', series: 'B001', sequence: '00000125', customerName: 'Cliente Varios', customerDoc: '00000000', total: 112.10, status: 'ISSUED', date: '2026-08-16 16:05' },
  ]);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const columns = [
    {
      key: 'document',
      header: 'Comprobante',
      render: (r: Invoice) => (
        <div>
          <span className="font-bold text-primary-900">{r.series}-{r.sequence}</span>
          <div className="text-xs text-secondary">{r.docType}</div>
        </div>
      )
    },
    {
      key: 'customer',
      header: 'Receptor / Cliente',
      render: (r: Invoice) => (
        <div>
          <div className="font-medium text-sm text-primary-800">{r.customerName}</div>
          <div className="text-xs text-secondary">Doc: {r.customerDoc}</div>
        </div>
      )
    },
    { key: 'date', header: 'Fecha Emisión', render: (r: Invoice) => <span className="text-xs text-secondary">{r.date}</span> },
    { key: 'total', header: 'Monto Total', render: (r: Invoice) => <span className="font-bold text-primary-900">S/ {r.total.toFixed(2)}</span> },
    {
      key: 'status',
      header: 'Estado SUNAT',
      render: (r: Invoice) => {
        if (r.status === 'ACCEPTED') return <Badge variant="success"><CheckCircle size={12} className="inline mr-1" /> Aceptado</Badge>;
        if (r.status === 'ISSUED') return <Badge variant="info"><Clock size={12} className="inline mr-1" /> Emitido</Badge>;
        return <Badge variant="warning">Pendiente</Badge>;
      }
    }
  ];

  return (
    <div>
      <PageHeader
        title="Facturación Electrónica"
        subtitle="Emisión de comprobantes de pago (Boletas, Facturas) y consulta de validez SUNAT"
      />

      <DataTable
        columns={columns}
        data={invoices}
        searchPlaceholder="Buscar por número o cliente..."
        actions={(row) => (
          <div className="flex gap-2 justify-end">
            <button className="p-1.5 text-neutral-500 hover:text-primary-600 hover:bg-neutral-100 rounded-md" onClick={() => setSelectedInvoice(row)} title="Vista Previa">
              <Eye size={16} />
            </button>
            <button className="p-1.5 text-neutral-500 hover:text-primary-600 hover:bg-neutral-100 rounded-md" title="Descargar PDF">
              <Download size={16} />
            </button>
          </div>
        )}
      />

      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={`Comprobante ${selectedInvoice?.series}-${selectedInvoice?.sequence}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedInvoice(null)}>Cerrar</Button>
            <Button><Download size={16} className="mr-1.5 inline" /> Descargar PDF</Button>
          </>
        }
      >
        {selectedInvoice && (
          <div className="p-4 border rounded-xl bg-neutral-50 text-sm space-y-3 font-mono">
            <div className="text-center font-bold text-base border-b pb-2">
              VENTAS B&V S.A.C.<br />
              <span className="text-xs font-normal">RUC: 20998877665</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>{selectedInvoice.docType}: {selectedInvoice.series}-{selectedInvoice.sequence}</span>
              <span>Fecha: {selectedInvoice.date}</span>
            </div>
            <div className="border-t border-b py-2 text-xs">
              Cliente: {selectedInvoice.customerName}<br />
              Doc: {selectedInvoice.customerDoc}
            </div>
            <div className="flex justify-between font-bold pt-2 border-t text-base">
              <span>TOTAL IMPORTE:</span>
              <span>S/ {selectedInvoice.total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
