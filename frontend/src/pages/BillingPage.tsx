import React, { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle, Clock, Eye, RefreshCw } from 'lucide-react';
import { PageHeader, Button, Badge, DataTable, Modal } from '../components/ui';
import { billingService, BillingInvoice } from '../lib/db-services';

export default function BillingPage() {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await billingService.getInvoices();
      setInvoices(data);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const columns = [
    {
      key: 'document',
      header: 'Comprobante',
      render: (r: BillingInvoice) => (
        <div>
          <span className="font-bold text-primary-900">{r.series}-{r.sequence}</span>
          <div className="text-xs text-secondary">{r.docType}</div>
        </div>
      )
    },
    {
      key: 'customer',
      header: 'Receptor / Cliente',
      render: (r: BillingInvoice) => (
        <div>
          <div className="font-medium text-sm text-primary-800">{r.customerName}</div>
          <div className="text-xs text-secondary">Doc: {r.customerDoc}</div>
        </div>
      )
    },
    { key: 'date', header: 'Fecha Emisión', render: (r: BillingInvoice) => <span className="text-xs text-secondary">{r.date}</span> },
    { key: 'total', header: 'Monto Total', render: (r: BillingInvoice) => <span className="font-bold text-primary-900">S/ {r.total.toFixed(2)}</span> },
    {
      key: 'status',
      header: 'Estado SUNAT',
      render: (r: BillingInvoice) => {
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
        action={
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={loadInvoices}>
            Actualizar
          </Button>
        }
      />

      {isLoading ? (
        <div className="p-8 text-center text-secondary">Cargando comprobantes emitidos...</div>
      ) : (
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
      )}

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
