import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  Send,
  FileMinus,
  Clock,
  ShieldCheck,
  FileText,
  Receipt,
  X,
} from 'lucide-react';
import { Modal, Badge, Button } from '../ui';
import type { BillingInvoice } from '../../lib/db-services';
import { settingsService } from '../../lib/db-services';
import { numberToSpanishWords } from '../../lib/numberToWords';

export interface SunatReceiptModalProps {
  invoice: BillingInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  items: { productId: string; productName: string; quantity: number; unitPrice: number; subtotal: number }[];
  loadingItems?: boolean;
  onSendToSunat?: (invoice: BillingInvoice) => void;
  onEmitCreditNote?: (invoice: BillingInvoice) => void;
}

export const SunatReceiptModal: React.FC<SunatReceiptModalProps> = ({
  invoice,
  isOpen,
  onClose,
  items,
  loadingItems = false,
  onSendToSunat,
  onEmitCreditNote,
}) => {
  const [printFormat, setPrintFormat] = useState<'TICKET' | 'A4'>('TICKET');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [companyInfo, setCompanyInfo] = useState({
    name: 'VENTAS B&V S.A.C.',
    tradeName: 'B&V Ventas',
    ruc: '20998877665',
    address: 'Av. Los Próceres 1240, Surco, Lima',
    phone: '01 445 6789',
    establishmentCode: '0000',
    department: 'LIMA',
    province: 'LIMA',
    district: 'SANTIAGO DE SURCO',
    logo_path: '',
  });

  useEffect(() => {
    if (isOpen) {
      settingsService.getTenantInfo().then((info) => {
        if (info && Object.keys(info).length > 0) {
          setCompanyInfo({
            name: info.legal_name || info.name || 'VENTAS B&V S.A.C.',
            tradeName: info.trade_name || info.name || 'B&V Ventas',
            ruc: info.ruc || '20998877665',
            address: info.address || 'Av. Los Próceres 1240, Surco, Lima',
            phone: info.phone || '01 445 6789',
            establishmentCode: info.establishment_code || '0000',
            department: info.department || 'LIMA',
            province: info.province || 'LIMA',
            district: info.district || 'SANTIAGO DE SURCO',
            logo_path: info.logo_path || '',
          });
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (invoice && isOpen) {
      const docTypeCode =
        invoice.docType === 'FACTURA' ? '01' : invoice.docType === 'NOTA_CREDITO' ? '07' : '03';
      const seqStr = String(invoice.sequence).padStart(8, '0');
      const igv = (invoice.total - invoice.total / 1.18).toFixed(2);
      const totalStr = invoice.total.toFixed(2);
      const dateStr = invoice.date ? invoice.date.split(',')[0].trim() : '2026-08-23';
      const custDocType = invoice.customerDoc && invoice.customerDoc.length === 11 ? '6' : '1';
      const custDocNum = invoice.customerDoc || '00000000';
      const hash = '8a9F+zX2qK9/LmQ0wE7YnRtP1uI=';

      // SUNAT standard QR string format:
      // RUC|TIPO_DOC|SERIE|NUMERO|IGV|TOTAL|FECHA|TIPO_DOC_CLIENTE|NUM_DOC_CLIENTE|HASH|
      const ruc = companyInfo.ruc || '20998877665';
      const sunatQrPayload = `${ruc}|${docTypeCode}|${invoice.series}|${seqStr}|${igv}|${totalStr}|${dateStr}|${custDocType}|${custDocNum}|${hash}|`;

      QRCode.toDataURL(sunatQrPayload, {
        width: 140,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR:', err));
    }
  }, [invoice?.id, isOpen, companyInfo.ruc]);

  if (!invoice || !isOpen) return null;

  const isFactura = invoice.docType === 'FACTURA' || invoice.series?.startsWith('F');
  const isNotaCredito = invoice.docType === 'NOTA_CREDITO' || invoice.status === 'NOTA_CREDITO';
  const docTitle = isNotaCredito
    ? 'NOTA DE CRÉDITO ELECTRÓNICA'
    : isFactura
    ? 'FACTURA ELECTRÓNICA'
    : 'BOLETA DE VENTA ELECTRÓNICA';

  const fullCorrelative = `${invoice.series}-${String(invoice.sequence).padStart(8, '0')}`;
  const opGravada = invoice.total / 1.18;
  const igv = invoice.total - opGravada;
  const totalInWords = numberToSpanishWords(invoice.total);

  const handlePrint = () => {
    const printElement = document.getElementById(
      printFormat === 'TICKET' ? 'receipt-ticket-content' : 'receipt-a4-content'
    );
    if (!printElement) return;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${docTitle} ${fullCorrelative}</title>
            <meta charset="utf-8" />
            <style>
              @page {
                size: ${printFormat === 'TICKET' ? '80mm auto' : 'A4 portrait'};
                margin: ${printFormat === 'TICKET' ? '0mm' : '10mm'};
              }
              body {
                margin: 0;
                padding: ${printFormat === 'TICKET' ? '4mm 2mm' : '15mm'};
                font-family: 'IBM Plex Mono', 'Courier New', monospace;
                color: #000000;
                background: #ffffff;
                font-size: ${printFormat === 'TICKET' ? '11px' : '12px'};
                line-height: 1.35;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              * {
                box-sizing: border-box;
              }
              .ticket-container {
                width: 100%;
                max-width: ${printFormat === 'TICKET' ? '320px' : '750px'};
                margin: 0 auto;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .text-left { text-align: left; }
              .font-bold { font-weight: bold; }
              .dashed-line { border-bottom: 1px dashed #000; margin: 6px 0; }
              .solid-line { border-bottom: 1px solid #000; margin: 6px 0; }
              .double-line { border-bottom: 2px solid #000; margin: 6px 0; }
              table { width: 100%; border-collapse: collapse; margin: 6px 0; }
              th, td { padding: 3px 1px; }
              .qr-img { width: 125px; height: 125px; margin: 6px auto; display: block; }
              img.logo { max-height: 48px; max-width: 150px; margin: 0 auto 6px; display: block; object-fit: contain; }
            </style>
          </head>
          <body>
            <div class="ticket-container">
              ${printElement.innerHTML}
            </div>
            <script>
              window.onload = function() {
                window.focus();
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          {/* Format Switcher (80mm vs A4) */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setPrintFormat('TICKET')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                printFormat === 'TICKET'
                  ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Receipt size={14} /> Ticket POS 80mm
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat('A4')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                printFormat === 'A4'
                  ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <FileText size={14} /> Hoja Formato A4
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>

            {onSendToSunat && invoice.status !== 'NOTA_CREDITO' && (
              <Button
                variant="primary"
                icon={<Send size={14} />}
                onClick={() => {
                  onClose();
                  onSendToSunat(invoice);
                }}
              >
                {invoice.status === 'ACCEPTED' ? 'Reenviar a SUNAT' : 'Enviar a SUNAT'}
              </Button>
            )}

            {onEmitCreditNote && invoice.status !== 'NOTA_CREDITO' && (
              <Button
                variant="danger"
                icon={<FileMinus size={14} />}
                onClick={() => {
                  onClose();
                  onEmitCreditNote(invoice);
                }}
              >
                Nota de Crédito
              </Button>
            )}

            <Button variant="success" onClick={handlePrint}>
              <Printer size={16} className="mr-1.5 inline" /> Imprimir / PDF
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Status Header Banner */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs ${
            invoice.status === 'ACCEPTED'
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
              : invoice.status === 'NOTA_CREDITO'
              ? 'bg-rose-50/90 border-rose-200 text-rose-950 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
              : 'bg-amber-50/90 border-amber-200 text-amber-950 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {invoice.status === 'ACCEPTED' ? (
              <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
            ) : invoice.status === 'NOTA_CREDITO' ? (
              <FileMinus size={20} className="text-rose-600 shrink-0" />
            ) : (
              <Clock size={20} className="text-amber-600 shrink-0" />
            )}

            <div>
              <div className="font-bold text-sm">
                {invoice.status === 'ACCEPTED'
                  ? 'Comprobante Aceptado por SUNAT (Validez Legal)'
                  : invoice.status === 'NOTA_CREDITO'
                  ? 'Comprobante Anulado mediante Nota de Crédito'
                  : 'Comprobante Pendiente de Envío / Ambiente BETA'}
              </div>
              <div className="text-[11px] opacity-85 mt-0.5">
                {invoice.status === 'ACCEPTED'
                  ? `CDR Aceptado con código 0 | DigestValue: 8a9F+zX2qK9/LmQ0wE7YnRtP1uI=`
                  : invoice.status === 'NOTA_CREDITO'
                  ? `Nota de Crédito vinculada: ${invoice.creditNoteNumber || 'BC01-00000001'}`
                  : 'Listo para transmisión electrónica al Web Service SUNAT UBL 2.1.'}
              </div>
            </div>
          </div>

          <Badge variant={invoice.status === 'ACCEPTED' ? 'success' : invoice.status === 'NOTA_CREDITO' ? 'danger' : 'warning'}>
            {invoice.status === 'ACCEPTED' ? 'SUNAT: Aceptado' : invoice.status === 'NOTA_CREDITO' ? 'Anulado' : 'SUNAT: Pendiente'}
          </Badge>
        </div>

        {/* Scrollable Receipt Preview Container - Clean Soft Canvas */}
        <div className="bg-slate-50 dark:bg-slate-900/30 p-4 sm:p-6 rounded-2xl max-h-[62vh] overflow-y-auto flex justify-center">
          {/* 1. TICKET POS 80MM VIEW */}
          {printFormat === 'TICKET' && (
            <div
              id="receipt-ticket-content"
              style={{
                width: '100%',
                maxWidth: '340px',
                background: '#ffffff',
                color: '#000000',
                padding: '22px 18px',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                fontSize: '11px',
                lineHeight: '1.4',
                border: '1px solid #e2e8f0',
              }}
            >
              {/* Header: Company Logo & Info */}
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                {companyInfo.logo_path && (
                  <div style={{ marginBottom: '8px' }}>
                    <img
                      src={companyInfo.logo_path}
                      alt="Logo Empresa"
                      className="logo"
                      style={{ maxHeight: '46px', maxWidth: '140px', margin: '0 auto', display: 'block', objectFit: 'contain', borderRadius: '4px' }}
                    />
                  </div>
                )}
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#000000', letterSpacing: '-0.01em' }}>
                  {companyInfo.name}
                </div>
                {companyInfo.tradeName && (
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>
                    {companyInfo.tradeName}
                  </div>
                )}
                <div style={{ fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>
                  R.U.C. N° {companyInfo.ruc}
                </div>
                <div style={{ fontSize: '10px', color: '#475569' }}>
                  {companyInfo.address}
                </div>
                <div style={{ fontSize: '10px', color: '#475569' }}>
                  {companyInfo.district} - {companyInfo.province} - {companyInfo.department}
                </div>
                {companyInfo.phone && (
                  <div style={{ fontSize: '10px', color: '#475569' }}>
                    Tel. {companyInfo.phone}
                  </div>
                )}
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#334155' }}>
                  Cód. Establecimiento SUNAT: {companyInfo.establishmentCode}
                </div>
              </div>

              {/* Dashed Line */}
              <div className="dashed-line" style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

              {/* Document Title & Number */}
              <div style={{ textAlign: 'center', margin: '6px 0' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.02em' }}>{docTitle}</div>
                <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em', marginTop: '2px' }}>{fullCorrelative}</div>
              </div>

              {/* Dashed Line */}
              <div className="dashed-line" style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

              {/* Emission Details */}
              <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Fecha Emisión:</span>
                  <span style={{ fontWeight: 700 }}>{invoice.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Moneda:</span>
                  <span style={{ fontWeight: 700 }}>SOLES (PEN)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Forma de Pago:</span>
                  <span style={{ fontWeight: 700 }}>Contado</span>
                </div>
                <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                  <div>Cliente: <strong style={{ textTransform: 'uppercase' }}>{invoice.customerName || 'PÚBLICO GENERAL'}</strong></div>
                  <div>
                    {invoice.customerDoc?.length === 11 ? 'RUC: ' : 'DNI/Doc: '}
                    <strong>{invoice.customerDoc || '00000000'}</strong>
                  </div>
                </div>
              </div>

              {/* Dashed Line */}
              <div className="dashed-line" style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

              {/* Items Table */}
              <div style={{ margin: '6px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '10px', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '4px' }}>
                  <span style={{ width: '48%' }}>DESCRIPCIÓN</span>
                  <span style={{ width: '14%', textAlign: 'center' }}>CANT</span>
                  <span style={{ width: '18%', textAlign: 'right' }}>P.U</span>
                  <span style={{ width: '20%', textAlign: 'right' }}>TOTAL</span>
                </div>

                {loadingItems ? (
                  <div style={{ padding: '8px 0', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>Cargando productos...</div>
                ) : (
                  <div>
                    {items.map((item, idx) => (
                      <div key={idx} style={{ marginBottom: '4px' }}>
                        <div style={{ fontWeight: 600 }}>{item.productName}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '2px' }}>
                          <span style={{ width: '48%' }}></span>
                          <span style={{ width: '14%', textAlign: 'center' }}>{item.quantity} und.</span>
                          <span style={{ width: '18%', textAlign: 'right' }}>{item.unitPrice.toFixed(2)}</span>
                          <span style={{ width: '20%', textAlign: 'right', fontWeight: 700 }}>{item.subtotal.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dashed Line */}
              <div className="dashed-line" style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

              {/* Totals Breakdown */}
              <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>OP. GRAVADA:</span>
                  <span>S/ {opGravada.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>OP. EXONERADA:</span>
                  <span>S/ 0.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>OP. INAFECTA:</span>
                  <span>S/ 0.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>I.G.V. 18.00%:</span>
                  <span>S/ {igv.toFixed(2)}</span>
                </div>
                <div className="solid-line" style={{ borderTop: '1px solid #000', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800 }}>
                  <span>TOTAL A PAGAR:</span>
                  <span>S/ {invoice.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Amount in Spanish Words */}
              <div style={{ fontSize: '9.5px', textTransform: 'uppercase', fontWeight: 700, margin: '8px 0', textAlign: 'center' }}>
                SON: {totalInWords}
              </div>

              {/* Dashed Line */}
              <div className="dashed-line" style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

              {/* QR and SUNAT Footer */}
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                {qrDataUrl && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                    <img
                      src={qrDataUrl}
                      alt="Código QR SUNAT"
                      className="qr-img"
                      style={{ width: '120px', height: '120px', margin: '0 auto', border: '1px solid #e2e8f0', padding: '2px', background: '#ffffff' }}
                    />
                  </div>
                )}

                <div style={{ fontSize: '9px', color: '#334155', lineHeight: '1.3' }}>
                  <div style={{ fontWeight: 700 }}>Hash: 8a9F+zX2qK9/LmQ0wE7YnRtP1uI=</div>
                  <div>Representación Impresa de la {docTitle}</div>
                  <div>Autorizado mediante Res. SUNAT N° 034-005</div>
                  <div>Consulte su validez en: https://e-consulta.sunat.gob.pe</div>
                </div>

                <div style={{ fontSize: '10px', fontWeight: 800, marginTop: '8px' }}>
                  ¡Gracias por su compra!
                </div>
              </div>
            </div>
          )}

          {/* 2. HOJA FORMATO A4 VIEW */}
          {printFormat === 'A4' && (
            <div
              id="receipt-a4-content"
              style={{
                width: '100%',
                maxWidth: '720px',
                background: '#ffffff',
                color: '#000000',
                padding: '32px',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                lineHeight: '1.4',
              }}
            >
              {/* Top Header: Company on Left, Box RUC on Right */}
              <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '20px', alignItems: 'start', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {companyInfo.logo_path && (
                    <div style={{ marginBottom: '6px' }}>
                      <img
                        src={companyInfo.logo_path}
                        alt="Logo Empresa"
                        className="logo"
                        style={{ maxHeight: '50px', maxWidth: '160px', objectFit: 'contain' }}
                      />
                    </div>
                  )}
                  <h1 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a' }}>{companyInfo.name}</h1>
                  {companyInfo.tradeName && (
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6' }}>{companyInfo.tradeName}</div>
                  )}
                  <div style={{ fontSize: '11px', color: '#475569' }}>{companyInfo.address}</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>
                    {companyInfo.district} - {companyInfo.province} - {companyInfo.department}
                  </div>
                  {companyInfo.phone && (
                    <div style={{ fontSize: '11px', color: '#475569' }}>Teléfono: {companyInfo.phone}</div>
                  )}
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>
                    Establecimiento Anexo: {companyInfo.establishmentCode}
                  </div>
                </div>

                <div style={{ border: '2px solid #000000', borderRadius: '8px', padding: '14px', textAlign: 'center', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 800, fontSize: '13px', letterSpacing: '0.05em' }}>R.U.C. N° {companyInfo.ruc}</div>
                  <div style={{ fontWeight: 800, fontSize: '14px', margin: '6px 0', padding: '6px 0', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                    {docTitle}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '16px', letterSpacing: '0.1em' }}>
                    {fullCorrelative}
                  </div>
                </div>
              </div>

              {/* Client & Operation Data Box */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '12px 16px', margin: '16px 0', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11.5px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Señor(es):</span>{' '}
                    <strong style={{ textTransform: 'uppercase' }}>{invoice.customerName || 'PÚBLICO GENERAL'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>
                      {invoice.customerDoc?.length === 11 ? 'RUC:' : 'DNI/Doc:'}
                    </span>{' '}
                    <strong style={{ fontFamily: 'monospace' }}>{invoice.customerDoc || '00000000'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Dirección:</span>{' '}
                    <span>{companyInfo.address}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Fecha de Emisión:</span>{' '}
                    <strong>{invoice.date}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Moneda:</span> <strong>SOLES (PEN)</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Forma de Pago:</span>{' '}
                    <strong>Contado (Efectivo / POS)</strong>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '11.5px', margin: '16px 0' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontWeight: 800 }}>
                    <th style={{ padding: '8px', textAlign: 'center', width: '50px' }}>Cant.</th>
                    <th style={{ padding: '8px', textAlign: 'center', width: '50px' }}>Und.</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Descripción</th>
                    <th style={{ padding: '8px', textAlign: 'right', width: '90px' }}>Valor Unit.</th>
                    <th style={{ padding: '8px', textAlign: 'right', width: '90px' }}>P. Unit.</th>
                    <th style={{ padding: '8px', textAlign: 'right', width: '100px' }}>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const unitVal = item.unitPrice / 1.18;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                        <td style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>NIU</td>
                        <td style={{ padding: '8px', fontWeight: 600 }}>{item.productName}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#475569' }}>S/ {unitVal.toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#475569' }}>S/ {item.unitPrice.toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>S/ {item.subtotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Bottom: Left QR + In Words / Right Totals */}
              <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '20px', alignItems: 'start', paddingTop: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>
                    SON: {totalInWords}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '6px' }}>
                    {qrDataUrl && (
                      <img src={qrDataUrl} alt="QR SUNAT" className="qr-img" style={{ width: '95px', height: '95px', border: '1px solid #cbd5e1', padding: '2px', background: '#ffffff', flexShrink: 0 }} />
                    )}
                    <div style={{ fontSize: '10px', color: '#475569', lineHeight: '1.35' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>Hash: 8a9F+zX2qK9/LmQ0wE7YnRtP1uI=</div>
                      <div>Representación Impresa de la {docTitle}</div>
                      <div>Autorizado mediante Res. SUNAT N° 034-005</div>
                      <div>Consulte validez en https://e-consulta.sunat.gob.pe</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Op. Gravada:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>S/ {opGravada.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Op. Exonerada:</span>
                    <span>S/ 0.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Op. Inafecta:</span>
                    <span>S/ 0.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>I.G.V. (18.00%):</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>S/ {igv.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, paddingTop: '8px', borderTop: '1px solid #cbd5e1', color: '#0f172a' }}>
                    <span>IMPORTE TOTAL:</span>
                    <span style={{ color: '#059669' }}>S/ {invoice.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SunatReceiptModal;