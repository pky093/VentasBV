import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  FileText,
  Printer,
  X,
  CreditCard,
  Building2,
  User,
  ShoppingBag,
  CheckCircle2,
  Receipt,
  QrCode
} from 'lucide-react';
import { Modal, Badge, Button } from '../ui';
import { Sale, salesService, settingsService } from '../../lib/db-services';
import { numberToSpanishWords } from '../../lib/numberToWords';

interface SaleDetailModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({ sale, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'ticket'>('details');
  const [items, setItems] = useState<{ productId: string; productName: string; quantity: number; unitPrice: number; subtotal: number }[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [tenantInfo, setTenantInfo] = useState<{ name: string; tradeName: string; ruc: string; address: string; phone: string; logo_path?: string }>({
    name: 'VENTAS B&V S.A.C.',
    tradeName: 'Motors S.A.C',
    ruc: '20998877665',
    address: 'Av. Principal 123, Lima',
    phone: '+51 987654321',
    logo_path: '',
  });

  useEffect(() => {
    if (sale && isOpen) {
      setLoadingItems(true);
      settingsService.getTenantInfo().then((info) => {
        if (info) {
          setTenantInfo({
            name: info.legal_name || info.name || 'VENTAS B&V S.A.C.',
            tradeName: info.trade_name || info.name || 'Motors S.A.C',
            ruc: info.ruc || '20998877665',
            address: info.address || 'Av. Principal 123, Lima',
            phone: info.phone || '+51 987654321',
            logo_path: info.logo_path || '',
          });
        }
      });

      salesService.getSaleItems(sale.id).then((fetchedItems) => {
        if (fetchedItems && fetchedItems.length > 0) {
          setItems(fetchedItems);
        } else if (sale.items && sale.items.length > 0) {
          setItems(sale.items);
        } else {
          setItems([
            {
              productId: 'prod-1',
              productName: 'Producto de Venta General',
              quantity: 1,
              unitPrice: sale.total,
              subtotal: sale.total,
            },
          ]);
        }
        setLoadingItems(false);
      });

      const docTypeCode = isFactura ? '01' : '03';
      const seqParts = (sale.saleNumber || 'B001-0001').split('-');
      const series = seqParts[0] || 'B001';
      const seqStr = String(seqParts[1] || '00000001').padStart(8, '0');
      const opGravada = (sale.total / 1.18).toFixed(2);
      const igv = (sale.total - sale.total / 1.18).toFixed(2);
      const totalStr = sale.total.toFixed(2);
      const dateStr = sale.date ? sale.date.split(',')[0].trim() : '2026-08-23';
      const custDocType = sale.customerDoc && sale.customerDoc.length === 11 ? '6' : '1';
      const custDocNum = sale.customerDoc || '00000000';
      const hash = '8a9F+zX2qK9/LmQ0wE7YnRtP1uI=';

      const currentRuc = tenantInfo.ruc || '20998877665';
      const sunatQrPayload = `${currentRuc}|${docTypeCode}|${series}|${seqStr}|${igv}|${totalStr}|${dateStr}|${custDocType}|${custDocNum}|${hash}|`;

      QRCode.toDataURL(sunatQrPayload, {
        width: 120,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR:', err));
    }
  }, [sale?.id, isOpen]);

  if (!sale || !isOpen) return null;

  const isFactura = sale.documentType === 'FACTURA' || sale.saleNumber?.startsWith('F');
  const docTitle = isFactura ? 'FACTURA DE VENTA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA';
  const totalInWords = numberToSpanishWords(sale.total);

  // Split date and time for emission
  let emissionDate = sale.date;
  let emissionTime = '8:34:24 p.m.';
  if (sale.rawDate) {
    const d = new Date(sale.rawDate);
    emissionDate = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    emissionTime = d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  }

  const handlePrint = () => {
    const printContent = document.getElementById('sale-ticket-preview');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=450,height=750');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Comprobante ${sale.saleNumber}</title>
            <style>
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                font-family: 'Courier New', Courier, monospace;
                font-size: 11px;
                line-height: 1.4;
                color: #000;
                margin: 0;
                padding: 10px;
                background: #fff;
              }
              * {
                box-sizing: border-box;
              }
              .ticket-container {
                width: 100%;
                max-width: 320px;
                margin: 0 auto;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .dashed-line {
                border-bottom: 1px dashed #000;
                margin: 6px 0;
              }
              .double-line {
                border-bottom: 2px solid #000;
                margin: 6px 0;
              }
              .flex-row {
                display: flex;
                justify-content: space-between;
              }
              @media print {
                body { padding: 4px; }
              }
            </style>
          </head>
          <body>
            <div class="ticket-container">
              ${printContent.innerHTML}
            </div>
            <script>
              window.onload = function() {
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
    >
      <div style={{ margin: '-1rem -1.5rem -1.5rem -1.5rem', background: 'var(--bg-app)', minHeight: '520px' }}>
        {/* Modal Header Banner */}
        <div style={{
          padding: '20px 24px',
          background: 'var(--bg-sidebar)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div className="flex items-center gap-3">
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-500, #60a5fa)'
            }}>
              <Receipt size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  {sale.saleNumber}
                </h2>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: isFactura ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                  color: isFactura ? '#c084fc' : '#93c5fd',
                  border: `1px solid ${isFactura ? 'rgba(168, 85, 247, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                }}>
                  {isFactura ? 'FACTURA' : 'BOLETA'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-sidebar, #94a3b8)', margin: '2px 0 0 0' }}>
                Registrado el {sale.date} • Sucursal {sale.branch}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '20px',
              background: sale.status === 'CANCELLED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              color: sale.status === 'CANCELLED' ? '#fca5a5' : '#86efac',
              border: `1px solid ${sale.status === 'CANCELLED' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
            }}>
              <CheckCircle2 size={14} />
              {sale.status === 'CANCELLED' ? 'Anulado' : 'Completado'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          padding: '12px 24px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('details')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.2s',
                background: activeTab === 'details' ? 'var(--primary-600)' : 'transparent',
                color: activeTab === 'details' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              <FileText size={16} />
              Detalle de Operación
            </button>
            <button
              onClick={() => setActiveTab('ticket')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.2s',
                background: activeTab === 'ticket' ? 'var(--primary-600)' : 'transparent',
                color: activeTab === 'ticket' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              <Printer size={16} />
              Comprobante Emitido (PDF / Ticket)
            </button>
          </div>

          {activeTab === 'ticket' && (
            <Button
              variant="primary"
              size="sm"
              icon={<Printer size={14} />}
              onClick={handlePrint}
            >
              Imprimir / Descargar PDF
            </Button>
          )}
        </div>

        {/* Modal Content */}
        <div style={{ padding: '24px' }}>
          {activeTab === 'details' ? (
            <div className="space-y-6">
              {/* Info Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                    <User size={14} className="text-blue-500" />
                    Cliente
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {sale.customer}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Doc: {sale.customerDoc || '00000000'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                    <User size={14} className="text-purple-500" />
                    Vendedor
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {sale.sellerName || 'Admin Principal'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Cajero Registrado
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                    <Building2 size={14} className="text-indigo-500" />
                    Sucursal & Emisión
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {sale.branch}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {sale.date}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                    <CreditCard size={14} className="text-emerald-500" />
                    Método de Pago
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="info">
                      {sale.paymentMethod}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Operación confirmada
                  </div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', background: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                  <ShoppingBag size={16} className="text-primary-500" />
                  Productos Vendidos ({items.length})
                </div>

                {loadingItems ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    Cargando items de la venta...
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-app)', color: 'var(--text-secondary)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '10px 18px', fontWeight: 600 }}>Producto</th>
                        <th style={{ padding: '10px 18px', fontWeight: 600, textAlign: 'center' }}>Cantidad</th>
                        <th style={{ padding: '10px 18px', fontWeight: 600, textAlign: 'right' }}>Precio Unit.</th>
                        <th style={{ padding: '10px 18px', fontWeight: 600, textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: idx < items.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                          <td style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.productName}
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            {item.quantity}
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            S/ {item.unitPrice.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                            S/ {item.subtotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Financial Totals */}
              <div className="flex justify-end">
                <div style={{ width: '100%', maxWidth: '320px', background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }} className="space-y-2">
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span>Op. Gravada:</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>S/ {sale.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span>IGV (18%):</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>S/ {sale.tax.toFixed(2)}</span>
                  </div>
                  <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '8px', marginTop: '8px' }} className="flex justify-between text-base font-bold">
                    <span style={{ color: 'var(--text-primary)' }}>Monto Total:</span>
                    <span style={{ color: 'var(--primary-600)' }}>S/ {sale.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Ticket Thermal View - Exact Match to SUNAT Ticket Design */
            <div className="flex justify-center">
              <div
                id="sale-ticket-preview"
                style={{
                  width: '320px',
                  padding: '24px 18px',
                  background: '#ffffff',
                  color: '#000000',
                  fontFamily: "'Courier New', Courier, monospace",
                  fontSize: '11px',
                  lineHeight: 1.35,
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                }}
              >
                {/* 1. Header: Company Logo (if configured) & Info */}
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                  {tenantInfo.logo_path && (
                    <div style={{ marginBottom: '8px' }}>
                      <img
                        src={tenantInfo.logo_path}
                        alt="Logo Empresa"
                        style={{ maxHeight: '42px', maxWidth: '140px', margin: '0 auto', display: 'block', objectFit: 'contain', borderRadius: '6px' }}
                      />
                    </div>
                  )}
                  <div style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.02em', marginBottom: '2px', color: '#000' }}>
                    {tenantInfo.name}
                  </div>
                  {tenantInfo.tradeName && (
                    <div style={{ fontSize: '11px', color: '#1e293b' }}>
                      {tenantInfo.tradeName}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#1e293b' }}>
                    {tenantInfo.address}
                  </div>
                  {tenantInfo.phone && (
                    <div style={{ fontSize: '11px', color: '#1e293b' }}>
                      Tel. {tenantInfo.phone}
                    </div>
                  )}
                </div>

                {/* Dashed Line */}
                <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

                {/* RUC & Document Title */}
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700 }}>R.U.C. N° {tenantInfo.ruc}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, margin: '2px 0' }}>{docTitle}</div>
                  <div style={{ fontSize: '14px', fontWeight: 800 }}>{sale.saleNumber}</div>
                </div>

                {/* Dashed Line */}
                <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

                {/* Emission Details */}
                <div style={{ marginBottom: '8px' }}>
                  <div>Fecha Emisión: {emissionDate}</div>
                  <div>Hora Emisión: {emissionTime}</div>
                  <div>Cliente: {sale.customer}</div>
                  <div>Doc. Cliente: {sale.customerDoc || '00000000'}</div>
                  <div>Vendedor: {sale.sellerName || 'Admin Principal'}</div>
                  <div>Forma de Pago: {sale.paymentMethod || 'Efectivo'}</div>
                  <div>Moneda: SOLES</div>
                </div>

                {/* Dashed Line */}
                <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

                {/* Items Table */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '4px' }}>
                    <span style={{ width: '45%' }}>DESCRIPCIÓN</span>
                    <span style={{ width: '15%', textAlign: 'center' }}>CANT</span>
                    <span style={{ width: '20%', textAlign: 'right' }}>P.U</span>
                    <span style={{ width: '20%', textAlign: 'right' }}>TOTAL</span>
                  </div>

                  {items.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: '4px' }}>
                      <div style={{ fontWeight: 600 }}>{item.productName}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px' }}>
                        <span style={{ width: '45%' }}></span>
                        <span style={{ width: '15%', textAlign: 'center' }}>{item.quantity} und.</span>
                        <span style={{ width: '20%', textAlign: 'right' }}>{item.unitPrice.toFixed(2)}</span>
                        <span style={{ width: '20%', textAlign: 'right', fontWeight: 700 }}>{item.subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Dashed Line */}
                <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

                {/* Totals Breakdown */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>OP. GRAVADA:</span>
                    <span>S/ {sale.subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>I.G.V. 18.00%:</span>
                    <span>S/ {sale.tax.toFixed(2)}</span>
                  </div>
                  <div style={{ borderTop: '1px solid #000', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800 }}>
                    <span>TOTAL A PAGAR:</span>
                    <span>S/ {sale.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Amount in Spanish Words */}
                <div style={{ fontSize: '10px', fontStyle: 'italic', marginBottom: '10px', textTransform: 'uppercase' }}>
                  SON: {totalInWords}
                </div>

                {/* Dashed Line */}
                <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

                {/* SUNAT Footer & Real QR Code */}
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Código QR SUNAT"
                        style={{ width: '100px', height: '100px', border: '1px solid #000', padding: '2px', background: '#fff' }}
                      />
                    ) : (
                      <div style={{ border: '1px solid #000', padding: '4px', background: '#fff', borderRadius: '4px' }}>
                        <QrCode size={64} style={{ color: '#000' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 700 }}>
                    Representación Impresa de la {docTitle}
                  </div>
                  <div style={{ fontSize: '9px', color: '#334155', marginTop: '2px' }}>
                    Autorizado mediante Resolución de Superintendencia N° 034-005-0005315/SUNAT
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 600, marginTop: '2px' }}>
                    Hash: 8a9F+zX2qK9/LmQ0wE7YnRtP1uI=
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
