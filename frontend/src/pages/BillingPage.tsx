import React, { useState, useEffect } from 'react';
import { RefreshCw, Eye, Send, FileMinus, CheckCircle, Clock, AlertCircle, Ban } from 'lucide-react';
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

  const handleAnnulInvoice = async (invoice: BillingInvoice) => {
    const { value: reason } = await Swal.fire({
      title: `Anular Comprobante ${invoice.series}-${invoice.sequence}`,
      text: 'Ingrese el motivo para generar la Comunicación de Baja ante SUNAT:',
      input: 'text',
      inputPlaceholder: 'Ej. Error en digitación / Operación no concretada',
      showCancelButton: true,
      confirmButtonText: 'Sí, Anular Comprobante',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      background: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      customClass: {
        popup: 'rounded-2xl border border-color shadow-xl',
        confirmButton: 'btn btn-danger font-semibold px-4 py-2 text-sm',
        cancelButton: 'btn btn-secondary font-semibold px-4 py-2 text-sm',
      },
      inputValidator: (value) => {
        if (!value) {
          return 'Debes ingresar un motivo para anular el comprobante.';
        }
      },
    });

    if (reason) {
      Swal.fire({
        title: 'Procesando Anulación...',
        text: 'Enviando Comunicación de Baja a SUNAT y reincorporando inventario...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const res = await salesService.annulInvoice(invoice.id, reason);

      if (res.success) {
        await loadInvoices();
        Swal.fire({
          icon: 'success',
          title: '¡Comprobante Anulado!',
          text: res.message,
          confirmButtonColor: '#f59e0b',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al Anular',
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
        if (r.status === 'CANCELLED') {
          return <Badge variant="danger"><Ban size={12} className="inline mr-1" /> Anulado</Badge>;
        }
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
            <div className="grid grid-cols-2 gap-1.5 min-w-[280px]">
              <Button
                variant="outline"
                size="sm"
                icon={<Eye size={13} />}
                onClick={() => setSelectedInvoice(row)}
                title="Vista Previa Comprobante"
                className="w-full justify-center text-xs py-1"
              >
                Vista Previa
              </Button>

              {row.status !== 'NOTA_CREDITO' && row.status !== 'CANCELLED' ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Send size={13} />}
                  onClick={() => handleSendToSunat(row)}
                  title="Enviar / Reenviar comprobante a SUNAT OSE"
                  className="w-full justify-center text-xs py-1"
                >
                  {row.status === 'ACCEPTED' ? 'Reenviar SUNAT' : 'Enviar a SUNAT'}
                </Button>
              ) : (
                <div />
              )}

              {row.status !== 'NOTA_CREDITO' && row.status !== 'CANCELLED' && (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<FileMinus size={13} />}
                    onClick={() => handleEmitCreditNote(row)}
                    title="Emitir Nota de Crédito SUNAT"
                    className="w-full justify-center text-xs py-1"
                  >
                    Nota de Crédito
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Ban size={13} className="text-danger-500" />}
                    onClick={() => handleAnnulInvoice(row)}
                    title="Anular Comprobante / Comunicación de Baja SUNAT"
                    className="w-full justify-center text-xs py-1 border-danger-200 text-danger-600 hover:bg-danger-50 dark:border-danger-800 dark:hover:bg-danger-950/40 font-semibold"
                  >
                    Anular Comprobante
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
