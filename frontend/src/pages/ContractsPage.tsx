import React, { useState, useEffect } from 'react';
import { Plus, FileText, Printer, Edit2, Trash2, CheckCircle2, DollarSign, Clock, Shield, Search, Filter } from 'lucide-react';
import { PageHeader, Button, Badge, Card, StatCard, DataTable, Tabs, SearchInput } from '../components/ui';
import { contractsService, VehicleContract } from '../lib/contracts-service';
import { VehicleContractModal } from '../components/contracts/VehicleContractModal';
import Swal from 'sweetalert2';

export default function ContractsPage() {
  const [contracts, setContracts] = useState<VehicleContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'CONTRATO' | 'COTIZACION'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContract, setSelectedContract] = useState<VehicleContract | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'VIEW' | 'EDIT'>('VIEW');

  const loadContracts = async () => {
    setIsLoading(true);
    try {
      const data = await contractsService.getContracts();
      setContracts(data);
    } catch (err) {
      console.error('Error loading contracts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const handleOpenNew = () => {
    const nextNum = contractsService.getNextContractNumber();
    setSelectedContract({
      id: '',
      contractNumber: nextNum,
      docType: 'CONTRATO',
      vehicleType: 'MOTOCICLETA',
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      customerDocType: 'DNI',
      customerDoc: '',
      customerAddress: '',
      customerPhone: '',
      maritalStatus: 'SOLTERO',
      brand: 'BAJAJ',
      model: '',
      color: '',
      cylinderCapacity: '',
      dua: '',
      item: '01',
      engineNumber: '',
      chassisNumber: '',
      totalPrice: 0,
      downPayment: 0,
      balance: 0,
      paymentMethodDetail: '',
      dueDate: new Date().toISOString().split('T')[0],
      balanceReason: '',
      notaryLegalization: 'SI_20',
      observations: 'En caso de desistimiento de la compra, se aplicará penalidad según contrato.',
      status: 'VIGENTE',
    });
    setModalMode('EDIT');
    setIsModalOpen(true);
  };

  const handleOpenView = (contract: VehicleContract) => {
    setSelectedContract(contract);
    setModalMode('VIEW');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contract: VehicleContract) => {
    setSelectedContract(contract);
    setModalMode('EDIT');
    setIsModalOpen(true);
  };

  const handleSaveContract = async (contractData: Partial<VehicleContract>) => {
    try {
      if (contractData.id) {
        await contractsService.updateContract(contractData.id, contractData);
        Swal.fire({
          icon: 'success',
          title: 'Contrato actualizado',
          text: `El documento N° ${contractData.contractNumber} ha sido guardado exitosamente.`,
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        await contractsService.createContract(contractData as any);
        Swal.fire({
          icon: 'success',
          title: 'Contrato registrado',
          text: `El documento N° ${contractData.contractNumber} fue generado con éxito.`,
          timer: 2000,
          showConfirmButton: false,
        });
      }
      await loadContracts();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving contract:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: 'No se pudo guardar el contrato en el sistema.',
      });
    }
  };

  const handleDelete = (contract: VehicleContract) => {
    Swal.fire({
      title: '¿Eliminar documento?',
      text: `¿Estás seguro de eliminar el ${contract.docType} N° ${contract.contractNumber}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then(async (result) => {
      if (result.isConfirmed) {
        await contractsService.deleteContract(contract.id);
        Swal.fire({
          icon: 'success',
          title: 'Eliminado',
          text: 'Documento eliminado correctamente.',
          timer: 1500,
          showConfirmButton: false,
        });
        await loadContracts();
      }
    });
  };

  // KPIs
  const totalVolume = contracts.reduce((acc, c) => acc + (c.totalPrice || 0), 0);
  const totalDownPayments = contracts.reduce((acc, c) => acc + (c.downPayment || 0), 0);
  const totalBalances = contracts.reduce((acc, c) => acc + (c.balance || 0), 0);
  const activeContractsCount = contracts.filter((c) => c.status === 'VIGENTE').length;

  const filteredContracts = contracts.filter((c) => {
    const matchesType = filterType === 'ALL' || c.docType === filterType;
    if (!matchesType) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (c.contractNumber && String(c.contractNumber).toLowerCase().includes(q)) ||
      (c.customerName && String(c.customerName).toLowerCase().includes(q)) ||
      (c.customerDoc && String(c.customerDoc).toLowerCase().includes(q)) ||
      (c.model && String(c.model).toLowerCase().includes(q)) ||
      (c.brand && String(c.brand).toLowerCase().includes(q)) ||
      (c.engineNumber && String(c.engineNumber).toLowerCase().includes(q)) ||
      (c.chassisNumber && String(c.chassisNumber).toLowerCase().includes(q))
    );
  });

  const columns = [
    {
      key: 'contractNumber',
      header: 'N° Documento',
      render: (r: VehicleContract) => (
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider block text-secondary">
            {r.docType}
          </span>
          <span className="font-extrabold text-sm text-primary font-mono">
            N° {r.contractNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Cliente / Comprador',
      render: (r: VehicleContract) => (
        <div>
          <div className="font-bold text-sm text-primary uppercase">{r.customerName}</div>
          <div className="text-xs text-secondary font-mono">
            {r.customerDocType}: {r.customerDoc} • Tel: {r.customerPhone || 'S/N'}
          </div>
        </div>
      ),
    },
    {
      key: 'brand',
      header: 'Vehículo / Unidad',
      render: (r: VehicleContract) => (
        <div>
          <div className="font-bold text-xs text-primary uppercase">
            {r.brand} {r.model}
          </div>
          <div className="text-[11px] text-secondary font-mono">
            Motor: {r.engineNumber || 'S/N'} • Chasis: {r.chassisNumber || 'S/N'}
          </div>
        </div>
      ),
    },
    {
      key: 'totalPrice',
      header: 'Precio Total',
      render: (r: VehicleContract) => (
        <span className="font-extrabold text-sm text-primary">
          S/ {r.totalPrice.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'downPayment',
      header: 'A Cuenta',
      render: (r: VehicleContract) => (
        <div>
          <span className="font-bold text-xs text-emerald-600 block">
            S/ {r.downPayment.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </span>
          {r.paymentMethodDetail && (
            <span className="text-[10px] text-secondary truncate max-w-[120px] block">
              {r.paymentMethodDetail}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'balance',
      header: 'Saldo Pendiente',
      render: (r: VehicleContract) => (
        <span className={`font-bold text-xs ${r.balance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
          S/ {r.balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r: VehicleContract) => (
        <Badge variant={r.status === 'VIGENTE' ? 'warning' : r.status === 'CANCELADO' ? 'success' : 'danger'}>
          {r.status === 'VIGENTE' ? 'Vigente / Separado' : r.status === 'CANCELADO' ? 'Cancelado Total' : 'Anulado'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="Cotizaciones y Contratos"
        subtitle="Administración de contratos de compraventa vehicular, cotizaciones y estados de pago"
        action={
          <Button variant="primary" icon={<Plus size={18} />} onClick={handleOpenNew}>
            {filterType === 'COTIZACION' ? 'Nueva Cotización' : 'Nuevo Contrato'}
          </Button>
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Contratos Vigentes"
          value={activeContractsCount}
          icon={<FileText />}
          variant="primary"
          trend="Unidades separadas y en proceso"
        />
        <StatCard
          title="Facturación Acordada"
          value={`S/ ${totalVolume.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
          icon={<DollarSign />}
          variant="primary"
          trend="Valor total pactado"
        />
        <StatCard
          title="Cobrado en Anticipos"
          value={`S/ ${totalDownPayments.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
          icon={<CheckCircle2 />}
          variant="success"
          trend="Dinero recibido a cuenta"
        />
        <StatCard
          title="Saldos por Cobrar"
          value={`S/ ${totalBalances.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
          icon={<Clock />}
          variant="danger"
          trend="Por liquidar contraentrega"
        />
      </div>

      {/* Navigation Filter Tabs */}
      <div className="mb-6">
        <Tabs
          tabs={[
            { id: 'ALL', label: `Todos (${contracts.length})`, icon: <FileText size={15} /> },
            {
              id: 'CONTRATO',
              label: `Contratos (${contracts.filter((c) => c.docType === 'CONTRATO').length})`,
              icon: <CheckCircle2 size={15} />,
            },
            {
              id: 'COTIZACION',
              label: `Cotizaciones (${contracts.filter((c) => c.docType === 'COTIZACION').length})`,
              icon: <Clock size={15} />,
            },
          ]}
          activeTab={filterType}
          onChange={(id) => setFilterType(id as any)}
          variant="pills"
        />
      </div>

      {/* Data Table with Integrated Search */}
      {isLoading ? (
        <div className="p-8 text-center text-secondary">Cargando contratos y cotizaciones...</div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredContracts}
          searchPlaceholder="Buscar por cliente, DNI, modelo, N° motor o correlativo..."
          actions={(row) => (
            <div className="flex gap-2 justify-end">
              <button
                className="icon-btn icon-btn-sm btn-action-secondary border-none"
                title="Ver e Imprimir Contrato A4"
                onClick={() => handleOpenView(row)}
              >
                <Printer size={14} />
              </button>
              <button
                className="icon-btn icon-btn-sm btn-action-edit border-none"
                title="Editar Documento"
                onClick={() => handleOpenEdit(row)}
              >
                <Edit2 size={14} />
              </button>
              <button
                className="icon-btn icon-btn-sm btn-action-danger border-none"
                title="Eliminar"
                onClick={() => handleDelete(row)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        />
      )}

      {/* Vehicle Contract View & Edit Modal */}
      <VehicleContractModal
        contract={selectedContract}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveContract}
        initialMode={modalMode}
      />
    </div>
  );
}
