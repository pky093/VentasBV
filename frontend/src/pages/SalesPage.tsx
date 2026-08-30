import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Coins, Calendar, Wallet } from 'lucide-react';
import { PageHeader, Badge, Button, DataTable, Tabs } from '../components/ui';
import { salesService, Sale } from '../lib/db-services';
import { SaleDetailModal } from '../components/sales/SaleDetailModal';
import { useBranch } from '../context/BranchContext';

export default function SalesPage() {
  const { activeBranchId, activeBranch } = useBranch();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [conditionFilter, setConditionFilter] = useState<'ALL' | 'CONTADO' | 'CREDITO'>('ALL');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  useEffect(() => {
    setIsLoading(true);
    salesService.getSales().then((data) => {
      let filtered = data;
      if (activeBranchId !== 'ALL') {
        filtered = data.filter(
          (s) => s.branchId === activeBranchId || s.branch === activeBranch?.name
        );
      }
      setSales(filtered);
      setIsLoading(false);
    });
  }, [activeBranchId, activeBranch]);

  const handleOpenModal = (sale: Sale) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  const filteredSales = useMemo(() => {
    if (conditionFilter === 'ALL') return sales;
    return sales.filter((s) => s.paymentCondition === conditionFilter);
  }, [sales, conditionFilter]);

  const conditionTabs = useMemo(() => [
    {
      id: 'ALL',
      label: `Todas las Ventas (${sales.length})`,
      icon: <Wallet size={15} />,
    },
    {
      id: 'CONTADO',
      label: `Al Contado (${sales.filter((s) => s.paymentCondition === 'CONTADO').length})`,
      icon: <Coins size={15} className="text-emerald-600" />,
    },
    {
      id: 'CREDITO',
      label: `Al Crédito (${sales.filter((s) => s.paymentCondition === 'CREDITO').length})`,
      icon: <Calendar size={15} className="text-amber-600" />,
    },
  ], [sales]);

  const paymentLabels: Record<string, string> = {
    CASH: 'Efectivo',
    CARD: 'Tarjeta',
    YAPE: 'Yape / Plin',
    PLIN: 'Plin',
    TRANSFER: 'Transferencia',
    OTHER: 'Otro',
  };

  const columns = [
    {
      key: 'saleNumber',
      header: 'Venta N°',
      render: (r: Sale) => (
        <div>
          <span className="font-bold text-primary">{r.saleNumber}</span>
          <span className="text-[10.5px] text-secondary block font-semibold">
            {r.documentType || (r.saleNumber?.startsWith('F') ? 'FACTURA' : 'BOLETA')}
          </span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Cliente',
      render: (r: Sale) => (
        <div>
          <span className="text-sm font-semibold text-primary block">{r.customer}</span>
          <span className="text-[11px] text-secondary">
            Doc: {r.customerDoc && r.customerDoc !== '00000000' ? r.customerDoc : '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'paymentCondition',
      header: 'Condición',
      render: (r: Sale) => {
        const isCredit = r.paymentCondition === 'CREDITO' || Boolean(r.creditInfo);
        return isCredit ? (
          <Badge variant="warning">
            Al Crédito ({r.creditInfo?.installmentsCount || 1}c)
          </Badge>
        ) : (
          <Badge variant="success">
            Al Contado
          </Badge>
        );
      },
    },
    {
      key: 'paymentMethod',
      header: 'Medio de Pago',
      render: (r: Sale) => (
        <span className="text-xs font-semibold text-secondary">
          {r.paymentCondition === 'CREDITO'
            ? 'Financiamiento'
            : (paymentLabels[r.paymentMethod] || r.paymentMethod)}
        </span>
      ),
    },
    {
      key: 'branch',
      header: 'Sucursal',
      render: (r: Sale) => <span className="text-xs text-secondary font-medium">{r.branch}</span>,
    },
    {
      key: 'date',
      header: 'Fecha y Hora',
      render: (r: Sale) => <span className="text-xs text-secondary">{r.date}</span>,
    },
    {
      key: 'total',
      header: 'Monto Total',
      render: (r: Sale) => <span className="font-bold text-primary">S/ {r.total.toFixed(2)}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r: Sale) => {
        const isCreditPending = (r.paymentCondition === 'CREDITO' || Boolean(r.creditInfo)) && (r.creditInfo?.status !== 'PAID' || (r.creditInfo?.balancePending !== undefined && r.creditInfo.balancePending > 0.01));
        const isCancelled = r.status === 'CANCELLED' || (r.status as string) === 'ANULADO';

        if (isCancelled) {
          return <Badge variant="danger">Anulado</Badge>;
        }
        if (isCreditPending) {
          return <Badge variant="warning">Pendiente</Badge>;
        }
        return <Badge variant="success">Completado</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Historial de Ventas"
        subtitle="Registro completo de operaciones comerciales, ventas al contado y créditos"
      />

      {/* Navigation Tabs using the maintainer Tabs component (Image 2) */}
      <div className="mb-2">
        <Tabs
          tabs={conditionTabs}
          activeTab={conditionFilter}
          onChange={(id) => setConditionFilter(id as any)}
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredSales}
        loading={isLoading}
        searchPlaceholder="Buscar por número de venta o cliente..."
        initialSearch={initialSearch}
        actions={(row) => (
          <div className="flex gap-2 justify-end w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              icon={<FileText size={14} />}
              onClick={() => handleOpenModal(row)}
              title="Ver Comprobante y Detalle"
            >
              Ver Comprobante
            </Button>
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
