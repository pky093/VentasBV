import React, { useState, useEffect } from 'react';
import { RefreshCw, Eye, Send, FileMinus, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { PageHeader, Button, Badge, DataTable } from '../components/ui';
import { SunatReceiptModal } from '../components/billing/SunatReceiptModal';
import { billingService, salesService, BillingInvoice } from '../lib/db-services';

export default function BillingPage() {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null);
  const [modalItems, setModalItems] = useState<{ productId: string; productName: string; quantity: number; unitPrice: number; subtotal: number }[]>([]);
  const [loadingModalItems, setLoadingModalItems] = useState(false);

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

  useEffect(() => {
    if (selectedInvoice) {
      setLoadingModalItems(true);
      salesService.getSaleItems(selectedInvoice.id).then((items) => {
        if (items && items.length > 0) {
          setModalItems(items);
        } else {
          setModalItems([
            {
              productId: 'prod-1',
              productName: 'Venta de Productos / Operación Comercial',
              quantity: 1,
              unitPrice: selectedInvoice.total,
              subtotal: selectedInvoice.total,
            },
          ]);
        }
        setLoadingModalItems(false);
      });
    }
  }, [selectedInvoice]);

  const handleSendToSunat = async (invoice: BillingInvoice) => {
    Swal.fire({
      title: 'Enviando a SUNAT...',
      text: `Validando comprobante ${invoice.series}-${invoice.sequence} con OSE / SUNAT`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    const result = await salesService.sendToSunat(invoice.id);

    if (result.success) {
      await loadInvoices();
      Swal.fire({
        icon: 'success',
        title: '¡Comprobante Aprobado por SUNAT!',
        text: result.message,
        confirmButtonColor: '#f59e0b',
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error de Envío SUNAT',
        text: result.message,
      });
    }
  };

  const handleEmitCreditNote = async (invoice: BillingInvoice) => {
    const { value: reason } = await Swal.fire({
      title: `Emitir Nota de Crédito para ${invoice.series}-${invoice.sequence}`,
      input: 'select',
      inputOptions: {
        '01 - Anulación de la operación': '01 - Anulación de la operación',
        '02 - Anulación por error en el RUC/DNI': '02 - Anulación por error en el RUC/DNI',
        '06 - Devolución total del producto': '06 - Devolución total del producto',
        '07 - Devolución por ítem': '07 - Devolución por ítem',
      },
      inputPlaceholder: 'Seleccione motivo SUNAT',
      showCancelButton: true,
      confirmButtonText: 'Emitir Nota de Crédito',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });

    if (reason) {
      Swal.fire({
        title: 'Emitiendo Nota de Crédito...',
        text: 'Generando XML UBL 2.1 y enviando a SUNAT...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const res = await salesService.createCreditNote(invoice.id, reason);

      if (res.success) {
        await loadInvoices();
        Swal.fire({
          icon: 'success',
          title: '¡Nota de Crédito Emitida!',
          html: `<p>${res.message}</p>`,
          confirmButtonColor: '#f59e0b',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error en Emisión',
          text: res.message,
        });
      }
    }
  };

  const columns = [
    {
      key: 'document',
      header: 'Comprobante',
      render: (r: BillingInvoice) => (
        <div>
          <span className="font-bold text-primary">{r.series}-{r.sequence}</span>
          <div className="text-xs text-secondary">{r.docType}</div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Receptor / Cliente',
      render: (r: BillingInvoice) => (
        <div>
          <div className="font-medium text-sm text-primary">{r.customerName}</div>
          <div className="text-xs text-secondary font-mono">Doc: {r.customerDoc}</div>
        </div>
      ),
    },
    { key: 'date', header: 'Fecha Emisión', render: (r: BillingInvoice) => <span className="text-xs text-secondary font-mono">{r.date}</span> },
    { key: 'total', header: 'Monto Total', render: (r: BillingInvoice) => <span className="font-bold text-primary">S/ {r.total.toFixed(2)}</span> },
    {
      key: 'status',
      header: 'Estado SUNAT',
      render: (r: BillingInvoice) => {
        if (r.status === 'ACCEPTED') {
          return <Badge variant="success"><CheckCircle size={12} className="inline mr-1" /> Aceptado SUNAT</Badge>;
        }
        if (r.status === 'NOTA_CREDITO') {
          return <Badge variant="danger"><FileMinus size={12} className="inline mr-1" /> Nota de Crédito</Badge>;
        }
        if (r.status === 'REJECTED') {
          return <Badge variant="danger"><AlertCircle size={12} className="inline mr-1" /> Rechazado</Badge>;
        }
        return <Badge variant="warning"><Clock size={12} className="inline mr-1" /> Pendiente</Badge>;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Comprobantes de Pago Electrónicos"
        title="Facturación Electrónica SUNAT"
        description="Gestión y emisión legal de Boletas (B001), Facturas (F001) y Notas de Crédito con UBL 2.1, firma digital y CDR."
        actions={
          <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={loadInvoices}>
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
            <div className="flex flex-wrap gap-2 justify-end items-center w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                icon={<Eye size={14} />}
                onClick={() => setSelectedInvoice(row)}
                title="Vista Previa Comprobante"
              >
                Vista Previa
              </Button>

              {row.status !== 'NOTA_CREDITO' && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Send size={14} />}
                    onClick={() => handleSendToSunat(row)}
                    title="Enviar / Reenviar comprobante a SUNAT OSE"
                  >
                    {row.status === 'ACCEPTED' ? 'Reenviar SUNAT' : 'Enviar a SUNAT'}
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    icon={<FileMinus size={14} />}
                    onClick={() => handleEmitCreditNote(row)}
                    title="Emitir Nota de Crédito SUNAT"
                  >
                    Nota de Crédito
                  </Button>
                </>
              )}
            </div>
          )}
        />
      )}

      {/* Modal Vista Previa de Comprobante Oficial SUNAT */}
      <SunatReceiptModal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        items={modalItems}
        loadingItems={loadingModalItems}
        onSendToSunat={handleSendToSunat}
        onEmitCreditNote={handleEmitCreditNote}
      />
    </div>
  );
}
