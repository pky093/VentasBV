import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  DollarSign,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Printer,
  Share2,
  User,
  RefreshCw,
  Loader2,
  Wallet,
  Coins,
  Check,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { PageHeader, Button, Badge, DataTable, Modal, Tabs, StatCard } from '../components/ui';
import { creditsService, Credit, CreditInstallment } from '../lib/db-services';
import { useBranch } from '../context/BranchContext';
import { numberToSpanishWords } from '../lib/numberToWords';

export default function CreditsPage() {
  const { activeBranchId } = useBranch();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PARTIAL' | 'OVERDUE' | 'PAID'>('ALL');

  // Schedule / Installment Modal
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Payment / Abono Modal
  const [selectedInstallment, setSelectedInstallment] = useState<CreditInstallment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('EFECTIVO');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Receipt Modal
  const [paymentReceipt, setPaymentReceipt] = useState<{
    receiptNumber: string;
    customerName: string;
    customerDoc: string;
    installmentNumber?: number;
    amountPaid: number;
    remainingBalance: number;
    paymentMethod: string;
    date: string;
  } | null>(null);

  const loadCredits = async () => {
    setIsLoading(true);
    try {
      const data = await creditsService.getCredits(activeBranchId);
      setCredits(data);
    } catch (err) {
      console.error('Error loading credits:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCredits();
  }, [activeBranchId]);

  // Filtered Credits by Status Tab
  const filteredCredits = useMemo(() => {
    if (statusFilter === 'ALL') return credits;
    if (statusFilter === 'OVERDUE') return credits.filter((c) => c.status === 'OVERDUE');
    return credits.filter((c) => c.status === statusFilter);
  }, [credits, statusFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalFinanced = credits.reduce((sum, c) => sum + c.totalCredit, 0);
    const totalPaid = credits.reduce((sum, c) => sum + c.amountPaid, 0);
    const totalPending = credits.reduce((sum, c) => sum + c.balancePending, 0);
    const overdueCount = credits.filter((c) => c.status === 'OVERDUE').length;

    return { totalFinanced, totalPaid, totalPending, overdueCount };
  }, [credits]);

  const filterTabs = useMemo(() => [
    {
      id: 'ALL',
      label: `Todos (${credits.length})`,
      icon: <Wallet size={15} />,
    },
    {
      id: 'PENDING',
      label: `Pendientes (${credits.filter((c) => c.status === 'PENDING').length})`,
      icon: <Clock size={15} className="text-amber-500" />,
    },
    {
      id: 'PARTIAL',
      label: `Con Abonos (${credits.filter((c) => c.status === 'PARTIAL').length})`,
      icon: <Coins size={15} className="text-blue-500" />,
    },
    {
      id: 'OVERDUE',
      label: `En Mora (${credits.filter((c) => c.status === 'OVERDUE').length})`,
      icon: <AlertCircle size={15} className="text-rose-500" />,
    },
    {
      id: 'PAID',
      label: `Pagados (${credits.filter((c) => c.status === 'PAID').length})`,
      icon: <CheckCircle2 size={15} className="text-emerald-500" />,
    },
  ], [credits]);

  const handleOpenDetail = (credit: Credit) => {
    setSelectedCredit(credit);
    setIsDetailModalOpen(true);
    setSelectedInstallment(null);
  };

  const handleOpenPayInstallment = (installment: CreditInstallment) => {
    setSelectedInstallment(installment);
    const pendingAmount = Math.max(0, installment.totalAmount - installment.paidAmount);
    setPaymentAmount(pendingAmount > 0 ? pendingAmount.toFixed(2) : '');
    setPaymentMethod('EFECTIVO');
    setPaymentNotes('');
  };

  const handleOpenPayFullBalance = () => {
    if (!selectedCredit) return;
    const installmentsList = selectedCredit.installments || [];
    const firstPending = installmentsList.find((i) => i.status !== 'PAID');
    setSelectedInstallment(firstPending || installmentsList[0] || null);
    setPaymentAmount(selectedCredit.balancePending.toFixed(2));
    setPaymentMethod('EFECTIVO');
    setPaymentNotes('Cancelación total de saldo');
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCredit) return;

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Swal.fire({ title: 'Monto inválido', text: 'Ingrese un monto válido a pagar.', icon: 'warning' });
      return;
    }

    if (amountNum > selectedCredit.balancePending + 0.05) {
      Swal.fire({
        title: 'Monto excesivo',
        text: `El monto no puede superar el saldo pendiente total (S/ ${selectedCredit.balancePending.toFixed(2)}).`,
        icon: 'warning',
      });
      return;
    }

    setIsProcessingPayment(true);
    try {
      const res = await creditsService.payInstallment({
        creditId: selectedCredit.id,
        installmentId: selectedInstallment?.id,
        amount: amountNum,
        paymentMethod: paymentMethod,
        notes: paymentNotes,
      });

      if (res.success) {
        await loadCredits();

        // Refresh selected credit in modal
        const updatedCredits = await creditsService.getCredits(activeBranchId);
        const updated = updatedCredits.find((c) => c.id === selectedCredit.id);
        if (updated) setSelectedCredit(updated);

        // Show receipt
        setPaymentReceipt({
          receiptNumber: res.receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
          customerName: selectedCredit.customerName,
          customerDoc: selectedCredit.customerDoc,
          installmentNumber: selectedInstallment?.installmentNumber,
          amountPaid: amountNum,
          remainingBalance: updated ? updated.balancePending : Math.max(0, selectedCredit.balancePending - amountNum),
          paymentMethod,
          date: new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }),
        });

        setSelectedInstallment(null);
      } else {
        Swal.fire({ title: 'Error', text: res.message, icon: 'error' });
      }
    } catch (err) {
      console.error('Error processing installment payment:', err);
      Swal.fire({ title: 'Error', text: 'No se pudo registrar el abono.', icon: 'error' });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Print Receipt
  const handlePrintReceipt = (size: '80mm' | '58mm' = '80mm') => {
    const el = document.getElementById('receipt-print-box');
    if (!el || !paymentReceipt) return;

    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo de Cobranza ${paymentReceipt.receiptNumber}</title>
          <style>
            @page { size: ${size} auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: ${size === '58mm' ? '9.5px' : '11px'};
              color: #000;
              margin: 0;
              padding: 8px;
              line-height: 1.35;
            }
            .ticket { width: 100%; max-width: ${size === '58mm' ? '220px' : '320px'}; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 8px; }
            .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
            .double-divider { border-bottom: 2px solid #000; margin: 6px 0; }
          </style>
        </head>
        <body>
          <div class="ticket">
            ${el.innerHTML}
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
    win.document.close();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cuentas por Cobrar & Créditos"
        subtitle="Gestión integral de ventas financiadas, cronogramas de pago por cuotas y registro de abonos"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={loadCredits}
            disabled={isLoading}
            icon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
          >
            Actualizar
          </Button>
        }
      />

      {/* Summary Stats Grid (StatCards matching Image 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          title="TOTAL FINANCIADO"
          value={`S/ ${metrics.totalFinanced.toFixed(2)}`}
          icon={<CreditCard size={20} />}
          variant="success"
          trend={`${credits.length} créditos registrados`}
        />
        <StatCard
          title="TOTAL COBRADO (AMORTIZADO)"
          value={`S/ ${metrics.totalPaid.toFixed(2)}`}
          icon={<DollarSign size={20} />}
          variant="primary"
          trend="Abonos recibidos"
        />
        <StatCard
          title="SALDO PENDIENTE"
          value={`S/ ${metrics.totalPending.toFixed(2)}`}
          icon={<Clock size={20} />}
          variant="warning"
          trend="Por cobrar a clientes"
        />
        <StatCard
          title="CRÉDITOS CON MORA"
          value={metrics.overdueCount}
          icon={<AlertCircle size={20} />}
          variant={metrics.overdueCount > 0 ? 'danger' : 'primary'}
          trend="Cuotas vencidas"
        />
      </div>

      {/* Tabs Filter Bar */}
      <div className="mb-2">
        <Tabs
          tabs={filterTabs}
          activeTab={statusFilter}
          onChange={(id) => setStatusFilter(id as any)}
        />
      </div>

      {/* Main Ledger Table */}
      <DataTable<Credit>
        data={filteredCredits}
        loading={isLoading}
        searchPlaceholder="Buscar por cliente, DNI/RUC o N° comprobante..."
        columns={[
          {
            key: 'customer',
            header: 'Cliente & Receptor',
            render: (r: Credit) => (
              <div>
                <div className="font-bold text-primary text-xs">{r.customerName}</div>
                <div className="text-[11px] font-mono text-secondary">
                  {r.customerDoc && r.customerDoc !== '00000000' ? `Doc: ${r.customerDoc}` : 'Sin Documento'}
                </div>
              </div>
            ),
          },
          {
            key: 'saleNumber',
            header: 'Comprobante',
            render: (r: Credit) => (
              <span className="font-mono font-bold text-xs text-primary-600">
                {r.saleNumber || `VENTA-${r.id.slice(0, 6).toUpperCase()}`}
              </span>
            ),
          },
          {
            key: 'finance',
            header: 'Financiamiento',
            render: (r: Credit) => (
              <div className="text-xs">
                <div>
                  <span className="text-secondary font-medium">Total:</span> <strong>S/ {r.totalAmount.toFixed(2)}</strong>
                </div>
                <div className="text-[11px] text-secondary">
                  Inicial: <span className="text-emerald-600 font-bold">S/ {r.initialPayment.toFixed(2)}</span>
                  {r.interestRate > 0 && <span className="text-amber-600 ml-1">({r.interestRate}% int.)</span>}
                </div>
              </div>
            ),
          },
          {
            key: 'installments',
            header: 'Cuotas',
            render: (r: Credit) => {
              const paidCount = (r.installments || []).filter((i: CreditInstallment) => i.status === 'PAID').length;
              return (
                <div className="text-xs">
                  <span className="font-bold text-primary">
                    {paidCount} de {r.installmentsCount} pagadas
                  </span>
                  <div className="text-[10.5px] text-secondary font-semibold uppercase">
                    {r.installmentFrequency}
                  </div>
                </div>
              );
            },
          },
          {
            key: 'balance',
            header: 'Saldo Pendiente',
            render: (r: Credit) => (
              <div>
                <div className="font-extrabold text-sm text-primary font-mono">
                  S/ {r.balancePending.toFixed(2)}
                </div>
                <div className="text-[10.5px] text-emerald-600 font-semibold font-mono">
                  Pagado: S/ {r.amountPaid.toFixed(2)}
                </div>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Estado',
            render: (r: Credit) => {
              if (r.status === 'PAID') return <Badge variant="success">PAGADO</Badge>;
              if (r.status === 'OVERDUE') return <Badge variant="danger">EN MORA</Badge>;
              if (r.status === 'PARTIAL') return <Badge variant="warning">CON ABONOS</Badge>;
              return <Badge variant="neutral">PENDIENTE</Badge>;
            },
          },
        ]}
        actions={(r: Credit) => (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              icon={<Calendar size={13} />}
              onClick={() => handleOpenDetail(r)}
            >
              Cronograma / Abonar
            </Button>
          </div>
        )}
      />

      {/* Credit Detail & Installment Schedule Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCredit(null);
          setSelectedInstallment(null);
        }}
        title={`Cronograma de Crédito — ${selectedCredit?.customerName || 'Cliente'}`}
        size="lg"
      >
        {selectedCredit && (
          <div className="space-y-4">
            {/* Unified maintainer card container */}
            <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              {/* Header banner */}
              <div style={{ padding: '12px 16px', background: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="flex items-center gap-2 font-bold text-xs text-primary">
                  <CreditCard size={15} className="text-primary-600" />
                  Plan de Financiamiento ({selectedCredit.installmentsCount} cuotas • {selectedCredit.installmentFrequency})
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary">Estado:</span>
                  <Badge variant={selectedCredit.status === 'PAID' ? 'success' : selectedCredit.status === 'PARTIAL' ? 'warning' : 'neutral'}>
                    {selectedCredit.status === 'PAID' ? 'Completado' : selectedCredit.status === 'PARTIAL' ? 'Con Abonos' : 'Pendiente'}
                  </Badge>
                </div>
              </div>

              {/* 4 Summary Tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', padding: '14px 16px', background: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-surface)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Comprobante</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', marginTop: '2px' }}>{selectedCredit.saleNumber || 'Venta'}</div>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-surface)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Total Financiado</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', marginTop: '2px' }}>S/ {selectedCredit.totalCredit.toFixed(2)}</div>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-surface)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Total Amortizado</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--emerald-600, #16a34a)', fontFamily: 'monospace', marginTop: '2px' }}>S/ {selectedCredit.amountPaid.toFixed(2)}</div>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-surface)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Saldo Restante</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: selectedCredit.balancePending > 0 ? 'var(--primary-600, #2563eb)' : 'var(--emerald-600, #16a34a)', fontFamily: 'monospace', marginTop: '2px' }}>S/ {selectedCredit.balancePending.toFixed(2)}</div>
                </div>
              </div>

              {/* Quick Action: Pay Full Balance if still pending */}
              {selectedCredit.balancePending > 0 && (
                <div style={{ padding: '12px 16px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    ¿Deseas amortizar o cancelar la totalidad de la deuda restante?
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Coins size={14} />}
                    onClick={handleOpenPayFullBalance}
                  >
                    Abonar Saldo Total (S/ {selectedCredit.balancePending.toFixed(2)})
                  </Button>
                </div>
              )}

              {/* Installments Table matching Image 2 Maintainer Layout */}
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-app)', color: 'var(--text-secondary)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '8px 14px', fontWeight: 600 }}>N° Cuota</th>
                      <th style={{ padding: '8px 14px', fontWeight: 600 }}>Fecha Vencimiento</th>
                      <th style={{ padding: '8px 14px', fontWeight: 600, textAlign: 'right' }}>Capital</th>
                      <th style={{ padding: '8px 14px', fontWeight: 600, textAlign: 'right' }}>Interés</th>
                      <th style={{ padding: '8px 14px', fontWeight: 600, textAlign: 'right' }}>Monto Cuota</th>
                      <th style={{ padding: '8px 14px', fontWeight: 600, textAlign: 'right' }}>Pagado</th>
                      <th style={{ padding: '8px 14px', fontWeight: 600, textAlign: 'center' }}>Estado</th>
                      <th style={{ padding: '8px 14px', fontWeight: 600, textAlign: 'right' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedCredit.installments || []).map((ins, idx) => {
                      const isPending = ins.status !== 'PAID';
                      return (
                        <tr key={ins.id} style={{ borderBottom: idx < (selectedCredit.installments?.length || 0) - 1 ? '1px solid var(--border-color)' : 'none' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Cuota {ins.installmentNumber}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                            {ins.dueDate}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace' }}>
                            S/ {ins.capitalAmount.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--primary-600)' }}>
                            + S/ {ins.interestAmount.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                            S/ {ins.totalAmount.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--emerald-600, #16a34a)', fontWeight: 600 }}>
                            S/ {ins.paidAmount.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {ins.status === 'PAID' ? (
                              <Badge variant="success">Pagado</Badge>
                            ) : ins.status === 'OVERDUE' ? (
                              <Badge variant="danger">Vencida</Badge>
                            ) : ins.status === 'PARTIAL' ? (
                              <Badge variant="warning">Parcial</Badge>
                            ) : (
                              <Badge variant="neutral">Pendiente</Badge>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            {isPending ? (
                              <Button
                                size="sm"
                                variant="primary"
                                icon={<DollarSign size={12} />}
                                onClick={() => handleOpenPayInstallment(ins)}
                              >
                                Abonar
                              </Button>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-bold inline-flex items-center gap-1">
                                <Check size={13} /> {ins.receiptNumber || 'Cancelado'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Installment Payment Form with full decimal support and quick presets */}
            {selectedInstallment && (
              <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--primary-500)', overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', background: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="flex items-center gap-2 font-bold text-xs text-primary">
                    <DollarSign size={15} className="text-primary-600" />
                    Registrar Abono a Cuota N° {selectedInstallment.installmentNumber}
                  </div>
                  <button
                    type="button"
                    className="text-xs text-secondary hover:text-danger-600 font-bold"
                    onClick={() => setSelectedInstallment(null)}
                  >
                    ✕ Cancelar
                  </button>
                </div>

                <form onSubmit={handleConfirmPayment} className="p-4 space-y-3">
                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-secondary">Montos Rápidos:</span>
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(Math.max(0, selectedInstallment.totalAmount - selectedInstallment.paidAmount).toFixed(2))}
                      style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      Cuota N° {selectedInstallment.installmentNumber} (S/ {Math.max(0, selectedInstallment.totalAmount - selectedInstallment.paidAmount).toFixed(2)})
                    </button>
                    {selectedCredit.balancePending > (selectedInstallment.totalAmount - selectedInstallment.paidAmount) && (
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(selectedCredit.balancePending.toFixed(2))}
                        style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.3)', color: 'var(--primary-600, #2563eb)' }}
                      >
                        Saldo Total Deuda (S/ {selectedCredit.balancePending.toFixed(2)})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10.5px] font-bold text-secondary block mb-1">
                        Monto del Abono (S/):
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        max={selectedCredit.balancePending}
                        className="form-control text-sm font-bold"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="text-[10.5px] font-bold text-secondary block mb-1">
                        Método de Pago:
                      </label>
                      <select
                        className="form-control text-xs font-bold"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TARJETA">Tarjeta Débito/Crédito</option>
                        <option value="YAPE">Yape / Plin</option>
                        <option value="TRANSFER">Transferencia Bancaria</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10.5px] font-bold text-secondary block mb-1">
                        Observación / N° Operación:
                      </label>
                      <input
                        type="text"
                        className="form-control text-xs"
                        placeholder="Ej. Op. 482910"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedInstallment(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isProcessingPayment}
                      icon={isProcessingPayment ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    >
                      {isProcessingPayment ? 'Registrando...' : 'Confirmar & Emitir Recibo'}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Payment Receipt Modal */}
      <Modal
        isOpen={!!paymentReceipt}
        onClose={() => setPaymentReceipt(null)}
        title="Recibo de Cobranza & Abono"
        size="sm"
      >
        {paymentReceipt && (
          <div className="space-y-4">
            <div
              id="receipt-print-box"
              style={{
                background: '#fff',
                color: '#000',
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '11px',
                lineHeight: 1.4,
                padding: '16px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>B&V VENTAS</div>
                <div style={{ fontSize: '11px' }}>RECIBO DE COBRANZA</div>
                <div style={{ fontWeight: 700, fontSize: '12px' }}>{paymentReceipt.receiptNumber}</div>
                <div style={{ fontSize: '10px', color: '#475569' }}>{paymentReceipt.date}</div>
              </div>

              <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

              <div style={{ margin: '6px 0' }}>
                <div><strong>Cliente:</strong> {paymentReceipt.customerName}</div>
                <div><strong>Documento:</strong> {paymentReceipt.customerDoc || '-'}</div>
                <div><strong>Concepto:</strong> Abono Cuota N° {paymentReceipt.installmentNumber}</div>
                <div><strong>Forma Pago:</strong> {paymentReceipt.paymentMethod}</div>
              </div>

              <div style={{ borderBottom: '2px solid #000', margin: '6px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, margin: '6px 0' }}>
                <span>MONTO ABONADO:</span>
                <span>S/ {paymentReceipt.amountPaid.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#334155' }}>
                <span>Saldo Pendiente:</span>
                <span>S/ {paymentReceipt.remainingBalance.toFixed(2)}</span>
              </div>

              <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

              <div style={{ fontSize: '9px', textAlign: 'center', marginTop: '10px' }}>
                SON: {numberToSpanishWords(paymentReceipt.amountPaid)}<br/>
                ¡Gracias por su puntual pago!
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center items-center pt-2">
              <Button
                variant="primary"
                size="sm"
                icon={<Printer size={14} />}
                onClick={() => handlePrintReceipt('80mm')}
              >
                Ticket 80mm
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Printer size={14} />}
                onClick={() => handlePrintReceipt('58mm')}
              >
                Ticket 58mm
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Share2 size={14} />}
                onClick={() => {
                  const text = encodeURIComponent(
                    `Hola ${paymentReceipt.customerName},\nSe ha registrado su abono de S/ ${paymentReceipt.amountPaid.toFixed(2)} para la Cuota N° ${paymentReceipt.installmentNumber}.\nRecibo: ${paymentReceipt.receiptNumber}\nSaldo pendiente: S/ ${paymentReceipt.remainingBalance.toFixed(2)}.\n¡Gracias!`
                  );
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }}
              >
                WhatsApp
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPaymentReceipt(null)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
