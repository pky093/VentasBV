import React, { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle, Clock, Eye, RefreshCw, Send, FileMinus, AlertCircle, ShieldCheck, QrCode, Printer, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { PageHeader, Button, Badge, DataTable, Modal } from '../components/ui';
import { billingService, salesService, BillingInvoice } from '../lib/db-services';
import { numberToSpanishWords } from '../lib/numberToWords';

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

  const handlePrintPreview = () => {
    window.print();
  };

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
        confirmButtonColor: 'var(--primary-600, #2563eb)',
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
      inputValidator: (value) => {
        if (!value) {
          return 'Debe seleccionar un motivo de anulación SUNAT';
        }
      },
    });

    if (reason) {
      Swal.fire({
        title: 'Generando Nota de Crédito SUNAT...',
        text: 'Registrando la anulación electrónica en el servicio SUNAT',
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
          confirmButtonColor: 'var(--primary-600, #2563eb)',
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
          <span className="font-bold text-primary-900">{r.series}-{r.sequence}</span>
          <div className="text-xs text-secondary">{r.docType}</div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Receptor / Cliente',
      render: (r: BillingInvoice) => (
        <div>
          <div className="font-medium text-sm text-primary-800">{r.customerName}</div>
          <div className="text-xs text-secondary">Doc: {r.customerDoc}</div>
        </div>
      ),
    },
    { key: 'date', header: 'Fecha Emisión', render: (r: BillingInvoice) => <span className="text-xs text-secondary">{r.date}</span> },
    { key: 'total', header: 'Monto Total', render: (r: BillingInvoice) => <span className="font-bold text-primary-900">S/ {r.total.toFixed(2)}</span> },
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
        title="Facturación Electrónica"
        subtitle="Emisión de comprobantes de pago (Boletas, Facturas), notas de crédito y consulta de validez SUNAT"
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

      {/* Modal Vista Previa de Comprobante Preliminar SUNAT */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title=""
        size="lg"
        footer={
          <div className="flex flex-wrap gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => setSelectedInvoice(null)}>
              Cerrar
            </Button>
            {selectedInvoice && selectedInvoice.status !== 'NOTA_CREDITO' && (
              <>
                <Button
                  variant="primary"
                  icon={<Send size={14} />}
                  onClick={() => {
                    const inv = selectedInvoice;
                    setSelectedInvoice(null);
                    handleSendToSunat(inv);
                  }}
                >
                  {selectedInvoice.status === 'ACCEPTED' ? 'Reenviar a SUNAT' : 'Enviar a SUNAT'}
                </Button>

                <Button
                  variant="danger"
                  icon={<FileMinus size={14} />}
                  onClick={() => {
                    const inv = selectedInvoice;
                    setSelectedInvoice(null);
                    handleEmitCreditNote(inv);
                  }}
                >
                  Nota de Crédito
                </Button>
              </>
            )}
            <Button variant="success" onClick={handlePrintPreview}>
              <Printer size={16} className="mr-1.5 inline" /> Imprimir / PDF
            </Button>
          </div>
        }
      >
        {selectedInvoice && (
          <div className="space-y-4 p-1">
            {/* Header Document Banner */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 rounded-xl bg-slate-900 text-white border border-slate-800">
              <div>
                <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  VENTAS B&V S.A.C. • RUC: 20998877665
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">
                  {selectedInvoice.docType === 'FACTURA'
                    ? 'FACTURA ELECTRÓNICA'
                    : selectedInvoice.docType === 'NOTA_CREDITO'
                    ? 'NOTA DE CRÉDITO ELECTRÓNICA'
                    : 'BOLETA DE VENTA ELECTRÓNICA'}{' '}
                  <span className="text-emerald-400">{selectedInvoice.series}-{selectedInvoice.sequence}</span>
                </h2>
                <div className="text-xs text-slate-400 mt-0.5">
                  Fecha de Emisión: {selectedInvoice.date}
                </div>
              </div>

              {/* Status Badge inside header */}
              <div>
                {selectedInvoice.status === 'ACCEPTED' ? (
                  <Badge variant="success" className="px-3 py-1 text-xs">
                    <ShieldCheck size={14} className="inline mr-1.5" /> Aceptado por SUNAT
                  </Badge>
                ) : selectedInvoice.status === 'NOTA_CREDITO' ? (
                  <Badge variant="danger" className="px-3 py-1 text-xs">
                    <FileMinus size={14} className="inline mr-1.5" /> Nota de Crédito
                  </Badge>
                ) : (
                  <Badge variant="warning" className="px-3 py-1 text-xs">
                    <Clock size={14} className="inline mr-1.5" /> Pendiente SUNAT
                  </Badge>
                )}
              </div>
            </div>

            {/* SUNAT Status Highlight Card */}
            <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs ${
              selectedInvoice.status === 'ACCEPTED'
                ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : selectedInvoice.status === 'NOTA_CREDITO'
                ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            }`}>
              <div className="space-y-0.5">
                <div className="font-bold text-sm flex items-center gap-1.5">
                  {selectedInvoice.status === 'ACCEPTED' ? (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                      <span>Comprobante Aprobado y Validado por SUNAT OSE</span>
                    </>
                  ) : selectedInvoice.status === 'NOTA_CREDITO' ? (
                    <>
                      <FileMinus size={16} className="text-rose-600 dark:text-rose-400" />
                      <span>Comprobante Anulado mediante Nota de Crédito</span>
                    </>
                  ) : (
                    <>
                      <Clock size={16} className="text-amber-600 dark:text-amber-400" />
                      <span>Comprobante Pendiente de Envío a SUNAT</span>
                    </>
                  )}
                </div>
                <div className="opacity-90">
                  {selectedInvoice.status === 'ACCEPTED'
                    ? `Constancia de Recepción CDR N° 2026-0819-${selectedInvoice.sequence} | Hash: 8a9F+zX2qK9/LmQ0wE7YnRtP1uI=`
                    : selectedInvoice.status === 'NOTA_CREDITO'
                    ? `Nota de Crédito Asignada N° ${selectedInvoice.creditNoteNumber || 'BC01-00123'}`
                    : 'Aún no se ha enviado este comprobante al servidor de SUNAT para su aprobación.'}
                </div>
              </div>
            </div>

            {/* Receptor & Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface p-3.5 rounded-xl border border-color">
              <div>
                <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-0.5">
                  Cliente / Receptor
                </span>
                <div className="font-bold text-sm text-primary">{selectedInvoice.customerName}</div>
                <div className="text-xs text-secondary mt-0.5">Doc / RUC: {selectedInvoice.customerDoc}</div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-0.5">
                  Detalles de Operación
                </span>
                <div className="text-xs text-primary font-medium">Moneda: Soles (S/)</div>
                <div className="text-xs text-secondary mt-0.5">Forma de Pago: Contado / Efectivo</div>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-surface rounded-xl border border-color overflow-hidden">
              <div className="px-4 py-2 bg-app border-b border-color text-xs font-bold text-primary flex items-center justify-between">
                <span>Detalle de Productos / Servicios</span>
                <span className="text-secondary font-normal">{modalItems.length} ítem(s)</span>
              </div>

              {loadingModalItems ? (
                <div className="p-6 text-center text-xs text-secondary">Cargando ítems...</div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-surface-hover text-secondary border-b border-color">
                      <th className="p-2.5 font-semibold">Producto</th>
                      <th className="p-2.5 font-semibold text-center">Cant.</th>
                      <th className="p-2.5 font-semibold text-right">P. Unit.</th>
                      <th className="p-2.5 font-semibold text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-color">
                    {modalItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-medium text-primary">{item.productName}</td>
                        <td className="p-2.5 text-center text-secondary">{item.quantity}</td>
                        <td className="p-2.5 text-right text-secondary">S/ {item.unitPrice.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold text-primary">S/ {item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Totals Breakdown */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-surface p-3.5 rounded-xl border border-color">
              <div className="text-xs text-secondary italic uppercase">
                SON: {numberToSpanishWords(selectedInvoice.total)}
              </div>

              <div className="w-full sm:w-60 space-y-1 text-xs shrink-0">
                <div className="flex justify-between text-secondary">
                  <span>Op. Gravada:</span>
                  <span className="font-medium text-primary">S/ {(selectedInvoice.total / 1.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-secondary">
                  <span>IGV (18%):</span>
                  <span className="font-medium text-primary">S/ {(selectedInvoice.total - selectedInvoice.total / 1.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-primary border-t border-color pt-1.5 mt-1">
                  <span>Importe Total:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">S/ {selectedInvoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* SUNAT Footer representation */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-app border border-color text-[11px] text-secondary">
              <QrCode size={36} className="shrink-0 text-primary" />
              <div>
                <div className="font-bold text-primary">Representación Impresa del Comprobante de Pago Electrónico</div>
                <div>Consulta de validez y verificación de firmas electrónicas según Resolución SUNAT N° 034-005.</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
