import React, { useState, useEffect } from 'react';
import {
  Archive,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ArrowRightLeft,
  Plus,
  Minus,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Package,
  Sparkles,
} from 'lucide-react';
import { PageHeader, Button, Badge, Tabs, DataTable, Modal, SuggestionChip } from '../components/ui';
import {
  productsService,
  branchesService,
  inventoryService,
  Product,
  Branch,
  InventoryMovement,
} from '../lib/db-services';
import { useBranch } from '../context/BranchContext';
import { TransferModal } from '../components/inventory/TransferModal';

export default function InventoryPage() {
  const { activeBranchId, activeBranch, branches: contextBranches } = useBranch();
  const [activeTab, setActiveTab] = useState('stock');
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Type filter for Kardex tab
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER'>('ALL');

  // Modals state
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Form inputs for Movement Modal
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [movementQty, setMovementQty] = useState(1);
  const [movementReason, setMovementReason] = useState('');
  const [adjustmentMode, setAdjustmentMode] = useState<'DELTA' | 'SET'>('DELTA');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prods, brs, movs] = await Promise.all([
        productsService.getProducts(activeBranchId),
        branchesService.getBranches(),
        inventoryService.getMovements(activeBranchId),
      ]);

      setProducts(prods);
      setBranches(brs);
      setMovements(movs);

      if (prods.length > 0 && !selectedProductId) {
        setSelectedProductId(prods[0].id);
      }
      if (brs.length > 0) {
        const defaultBId = activeBranchId && activeBranchId !== 'ALL' ? activeBranchId : brs[0].id;
        setSelectedBranchId(defaultBId);
      }
    } catch (err) {
      console.error('Error loading inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (activeBranchId && activeBranchId !== 'ALL') {
      setSelectedBranchId(activeBranchId);
    }
  }, [activeBranchId]);

  const openMovementModal = (type: 'IN' | 'OUT' | 'ADJUSTMENT', preselectedProdId?: string) => {
    setMovementType(type);
    if (preselectedProdId) {
      setSelectedProductId(preselectedProdId);
    } else if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }

    if (activeBranchId && activeBranchId !== 'ALL') {
      setSelectedBranchId(activeBranchId);
    } else if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }

    setMovementQty(1);
    setAdjustmentMode('DELTA');

    if (type === 'IN') {
      setMovementReason('Ingreso por Guía / Orden de Compra');
    } else if (type === 'OUT') {
      setMovementReason('Salida por Venta / Despacho');
    } else {
      setMovementReason('Ajuste Físico por Inventario / Merma');
    }

    setIsMovementModalOpen(true);
  };

  const openTransferModal = (_preselectedProdId?: string) => {
    setIsTransferModalOpen(true);
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    const prod = products.find((p) => p.id === selectedProductId);
    const targetBranchId = selectedBranchId || (activeBranchId !== 'ALL' ? activeBranchId : branches[0]?.id);
    const branch = branches.find((b) => b.id === targetBranchId) || (activeBranchId !== 'ALL' ? activeBranch : branches[0]);
    if (!prod) return;

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      let finalQty = Number(movementQty);

      if (movementType === 'ADJUSTMENT' && adjustmentMode === 'SET') {
        finalQty = Number(movementQty) - prod.stock;
      }

      const success = await inventoryService.registerMovement({
        productId: prod.id,
        productName: prod.name,
        branchId: branch?.id || targetBranchId || '',
        branchName: branch?.name || activeBranch?.name || 'Sucursal',
        type: movementType,
        qty: finalQty,
        reason: movementReason || `${movementType === 'IN' ? 'Ingreso' : movementType === 'OUT' ? 'Salida' : 'Ajuste'} de stock`,
      });

      if (success) {
        setFeedbackMsg({
          type: 'success',
          text: `Se registró correctamente el ${
            movementType === 'IN' ? 'ingreso' : movementType === 'OUT' ? 'salida' : 'ajuste'
          } de "${prod.name}" en la sucursal "${branch?.name || activeBranch?.name || 'Sede Seleccionada'}".`,
        });
        await loadData();
        setIsMovementModalOpen(false);
      } else {
        setFeedbackMsg({ type: 'error', text: 'No se pudo procesar el movimiento en la base de datos.' });
      }
    } catch (err) {
      console.error('Error saving movement:', err);
      setFeedbackMsg({ type: 'error', text: 'Error inesperado al registrar el movimiento.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'stock', label: 'Stock Actual por Sucursal', icon: <Archive size={16} /> },
    { id: 'kardex', label: 'Movimientos (Kardex)', icon: <RefreshCw size={16} /> },
    { id: 'transfers', label: 'Transferencias', icon: <ArrowRightLeft size={16} /> },
  ];

  // Filtered movements for Kardex tab
  const filteredMovements = movements.filter((m) => {
    if (typeFilter === 'ALL') return true;
    return m.type === typeFilter;
  });

  // Filtered movements for Transfer tab
  const transferMovements = movements.filter((m) => m.type === 'TRANSFER');

  // Columns for Kardex tab
  const kardexColumns = [
    {
      key: 'date',
      header: 'FECHA Y HORA',
      render: (r: InventoryMovement) => <span className="text-xs font-mono text-secondary">{r.date}</span>,
    },
    {
      key: 'product',
      header: 'PRODUCTO',
      render: (r: InventoryMovement) => (
        <div>
          <span className="font-semibold text-primary">{r.product}</span>
          {r.productSku && <div className="text-[11px] text-secondary font-mono">SKU: {r.productSku}</div>}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'TIPO',
      render: (r: InventoryMovement) => {
        if (r.type === 'IN')
          return (
            <Badge variant="success">
              <ArrowDownLeft size={12} className="inline mr-1" /> Entrada
            </Badge>
          );
        if (r.type === 'OUT')
          return (
            <Badge variant="danger">
              <ArrowUpRight size={12} className="inline mr-1" /> Salida
            </Badge>
          );
        if (r.type === 'TRANSFER')
          return (
            <Badge variant="info">
              <ArrowRightLeft size={12} className="inline mr-1" /> Transferencia
            </Badge>
          );
        return (
          <Badge variant="warning">
            <Sliders size={12} className="inline mr-1" /> Ajuste
          </Badge>
        );
      },
    },
    {
      key: 'qty',
      header: 'CANTIDAD',
      render: (r: InventoryMovement) => (
        <span
          className={`font-bold ${
            r.type === 'IN'
              ? 'text-success-600'
              : r.type === 'OUT'
              ? 'text-danger-600'
              : r.qty >= 0
              ? 'text-primary'
              : 'text-warning-600'
          }`}
        >
          {r.qty > 0 ? `+${r.qty}` : r.qty}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'KARDEX (PREV -> RESULT)',
      render: (r: InventoryMovement) => (
        <span className="text-xs font-mono">
          {r.prevStock} &rarr; <strong className="text-primary-800 dark:text-primary-200">{r.newStock}</strong>
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'MOTIVO / REFERENCIA',
      render: (r: InventoryMovement) => <span className="text-xs text-secondary">{r.reason}</span>,
    },
  ];

  // Columns for Stock tab
  const stockColumns = [
    {
      key: 'code',
      header: 'CÓDIGO SKU',
      render: (r: Product) => <span className="font-mono text-xs font-bold text-primary-600">{r.code}</span>,
    },
    {
      key: 'name',
      header: 'PRODUCTO / MARCA',
      render: (r: Product) => (
        <div>
          <div className="font-bold text-primary text-sm">{r.name}</div>
          <div className="text-xs text-secondary flex items-center gap-1.5 flex-wrap">
            <span>Marca: <strong>{r.brand}</strong></span>
            {r.model && <span>• Modelo: <strong>{r.model}</strong></span>}
            <span>| Categoría: {r.category}</span>
          </div>
          {r.colors && r.colors.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5 items-center">
              {r.colors.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-app border border-color text-primary"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                    style={{ backgroundColor: c.hex || '#94a3b8' }}
                  />
                  <span>{c.color}</span>
                  <span className="font-bold text-primary-600">({c.stock})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'branch',
      header: 'SUCURSAL',
      render: (r: Product) => {
        if (activeBranchId && activeBranchId !== 'ALL') {
          return (
            <SuggestionChip
              label={activeBranch?.name || 'Sucursal Seleccionada'}
              count={`${r.stock} unid.`}
            />
          );
        }
        if (r.branchStocks && r.branchStocks.length > 0) {
          return (
            <div className="flex flex-wrap gap-1.5 items-center">
              {r.branchStocks.map((bs) => (
                <SuggestionChip
                  key={bs.branchId}
                  label={bs.branchName}
                  count={`${bs.stock} unid.`}
                  selected={bs.branchId === activeBranchId}
                />
              ))}
            </div>
          );
        }
        return <span className="text-xs text-secondary font-medium">Todas las Sedes</span>;
      },
    },
    {
      key: 'stock',
      header: 'STOCK ACTUAL',
      render: (r: Product) => {
        const isLow = r.stock <= r.minStock;
        const isZero = r.stock === 0;
        return (
          <div className="flex items-center gap-2">
            <span
              className={`font-bold text-sm ${
                isZero ? 'text-danger-600' : isLow ? 'text-warning-600' : 'text-primary'
              }`}
            >
              {r.stock} unid.
            </span>
            {isZero ? (
              <Badge variant="danger" className="text-[10px]">
                Agotado
              </Badge>
            ) : isLow ? (
              <Badge variant="warning" className="text-[10px]">
                Stock Bajo
              </Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'minStock',
      header: 'STOCK MÍNIMO',
      render: (r: Product) => <span className="text-xs text-secondary font-mono">{r.minStock} unid.</span>,
    },
  ];

  // Columns for Transfers tab
  const transferColumns = [
    {
      key: 'date',
      header: 'FECHA',
      render: (r: InventoryMovement) => <span className="text-xs font-mono text-secondary">{r.date}</span>,
    },
    {
      key: 'product',
      header: 'PRODUCTO',
      render: (r: InventoryMovement) => <span className="font-semibold text-primary">{r.product}</span>,
    },
    {
      key: 'route',
      header: 'ORIGEN → DESTINO',
      render: (r: InventoryMovement) => (
        <span className="text-xs text-primary font-medium">
          {r.sourceBranchName || 'Sede Principal'} &rarr;{' '}
          <strong className="text-primary-700">{r.targetBranchName || 'Sucursal Miraflores'}</strong>
        </span>
      ),
    },
    {
      key: 'qty',
      header: 'CANTIDAD',
      render: (r: InventoryMovement) => <span className="font-bold text-primary">{r.qty} unid.</span>,
    },
    {
      key: 'reason',
      header: 'MOTIVO',
      render: (r: InventoryMovement) => <span className="text-xs text-secondary">{r.reason}</span>,
    },
    {
      key: 'status',
      header: 'ESTADO',
      render: () => <Badge variant="success">Completado</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inventario y Kardex"
        subtitle="Control de existencias, ingresos, salidas, transferencias entre sedes y ajustes de stock"
        action={
          <div className="flex gap-2 flex-wrap">
            <Button variant="success" icon={<Plus size={16} />} onClick={() => openMovementModal('IN')}>
              + Ingreso
            </Button>
            <Button variant="danger" icon={<Minus size={16} />} onClick={() => openMovementModal('OUT')}>
              - Salida
            </Button>
            <Button variant="warning" icon={<Sliders size={16} />} onClick={() => openMovementModal('ADJUSTMENT')}>
              Ajuste Manual
            </Button>
            <Button variant="secondary" icon={<ArrowRightLeft size={16} />} onClick={() => openTransferModal()}>
              Transferir Stock
            </Button>
          </div>
        }
      />

      {/* Global Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`mb-4 p-3.5 rounded-lg flex items-center gap-3 text-sm font-medium ${
            feedbackMsg.type === 'success'
              ? 'bg-success-500/10 border border-success-500/30 text-success-700 dark:text-success-300'
              : 'bg-danger-500/10 border border-danger-500/30 text-danger-700 dark:text-danger-300'
          }`}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* TAB 1: STOCK ACTUAL */}
      {activeTab === 'stock' && (
        <DataTable
          columns={stockColumns}
          data={products}
          loading={isLoading}
          searchPlaceholder="Buscar por código SKU, nombre, marca..."
          actions={(row) => (
            <div className="flex gap-1 justify-end">
              <button
                className="btn btn-sm btn-ghost text-success-600 hover:bg-success-50 dark:hover:bg-success-950/30"
                title="Registrar Ingreso de este producto"
                onClick={() => openMovementModal('IN', row.id)}
              >
                <Plus size={14} className="mr-0.5 inline" /> Ingreso
              </button>
              <button
                className="btn btn-sm btn-ghost text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30"
                title="Registrar Salida de este producto"
                onClick={() => openMovementModal('OUT', row.id)}
              >
                <Minus size={14} className="mr-0.5 inline" /> Salida
              </button>
              <button
                className="btn btn-sm btn-ghost text-warning-600 hover:bg-warning-50 dark:hover:bg-warning-950/30"
                title="Ajustar Stock"
                onClick={() => openMovementModal('ADJUSTMENT', row.id)}
              >
                <Sliders size={14} className="mr-0.5 inline" /> Ajustar
              </button>
              <button
                className="btn btn-sm btn-ghost text-secondary hover:text-primary-600"
                title="Transferir Stock a otra sede"
                onClick={() => openTransferModal(row.id)}
              >
                <ArrowRightLeft size={14} className="mr-0.5 inline" /> Transferir
              </button>
            </div>
          )}
        />
      )}

      {/* TAB 2: KARDEX MOVIMIENTOS */}
      {activeTab === 'kardex' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center bg-surface p-3 border border-color rounded-xl">
            <span className="text-xs font-bold text-secondary mr-2">Filtrar por Tipo:</span>
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`btn btn-sm ${typeFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Todos ({movements.length})
            </button>
            <button
              onClick={() => setTypeFilter('IN')}
              className={`btn btn-sm ${typeFilter === 'IN' ? 'btn-success' : 'btn-ghost'}`}
            >
              <ArrowDownLeft size={14} className="mr-1 inline" /> Entradas
            </button>
            <button
              onClick={() => setTypeFilter('OUT')}
              className={`btn btn-sm ${typeFilter === 'OUT' ? 'btn-danger' : 'btn-ghost'}`}
            >
              <ArrowUpRight size={14} className="mr-1 inline" /> Salidas
            </button>
            <button
              onClick={() => setTypeFilter('ADJUSTMENT')}
              className={`btn btn-sm ${typeFilter === 'ADJUSTMENT' ? 'btn-warning' : 'btn-ghost'}`}
            >
              <Sliders size={14} className="mr-1 inline" /> Ajustes
            </button>
            <button
              onClick={() => setTypeFilter('TRANSFER')}
              className={`btn btn-sm ${typeFilter === 'TRANSFER' ? 'btn-secondary' : 'btn-ghost'}`}
            >
              <ArrowRightLeft size={14} className="mr-1 inline" /> Transferencias
            </button>
          </div>

          <DataTable
            columns={kardexColumns}
            data={filteredMovements}
            loading={isLoading}
            searchPlaceholder="Buscar por producto o motivo..."
          />
        </div>
      )}

      {/* TAB 3: TRANSFERENCIAS */}
      {activeTab === 'transfers' && (
        <DataTable
          columns={transferColumns}
          data={transferMovements}
          loading={isLoading}
          searchPlaceholder="Buscar transferencias..."
          emptyMessage="No se han registrado transferencias entre sedes aún."
        />
      )}

      {/* MODAL 1: REGISTRO DE MOVIMIENTO (INGRESO / SALIDA / AJUSTE) */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title={
          movementType === 'IN'
            ? 'Registrar Ingreso de Producto (Entrada)'
            : movementType === 'OUT'
            ? 'Registrar Salida de Producto (Egreso)'
            : 'Ajuste Manual de Inventario'
        }
        size="lg"
      >
        <form onSubmit={handleSaveMovement} className="space-y-4">
          <div className="p-3 bg-surface border border-color rounded-lg text-xs flex items-center justify-between">
            <span className="text-secondary font-medium">Operación Seleccionada:</span>
            {movementType === 'IN' ? (
              <Badge variant="success">+ INGRESO / ENTRADA DE STOCK</Badge>
            ) : movementType === 'OUT' ? (
              <Badge variant="danger">- SALIDA / RETIRO DE STOCK</Badge>
            ) : (
              <Badge variant="warning">⚡ AJUSTE FÍSICO DE KARDEX</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label font-bold">Seleccionar Producto</label>
              <select
                className="form-control"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                required
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) — Stock Actual: {p.stock}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label font-bold">Sede / Sucursal</label>
              <select
                className="form-control"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                required
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.isMain ? '(Principal)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {movementType === 'ADJUSTMENT' && (
            <div className="form-group">
              <label className="form-label font-bold">Modo de Ajuste</label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`p-3 border rounded-lg cursor-pointer text-xs font-semibold flex items-center gap-2 ${
                    adjustmentMode === 'DELTA' ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/40' : 'border-color'
                  }`}
                >
                  <input
                    type="radio"
                    name="adjMode"
                    checked={adjustmentMode === 'DELTA'}
                    onChange={() => setAdjustmentMode('DELTA')}
                  />
                  <span>Diferencia (+/- cantidad)</span>
                </label>
                <label
                  className={`p-3 border rounded-lg cursor-pointer text-xs font-semibold flex items-center gap-2 ${
                    adjustmentMode === 'SET' ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/40' : 'border-color'
                  }`}
                >
                  <input
                    type="radio"
                    name="adjMode"
                    checked={adjustmentMode === 'SET'}
                    onChange={() => setAdjustmentMode('SET')}
                  />
                  <span>Establecer Stock Físico Real</span>
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label font-bold">
                {movementType === 'IN'
                  ? 'Cantidad a Ingresar (+)'
                  : movementType === 'OUT'
                  ? 'Cantidad a Retirar (-)'
                  : adjustmentMode === 'SET'
                  ? 'Nuevo Stock Físico Real Total'
                  : 'Variación de Stock (ej. -2 o +5)'}
              </label>
              <input
                type="number"
                step="1"
                className="form-control font-bold text-lg"
                value={movementQty}
                onChange={(e) => setMovementQty(parseInt(e.target.value) || 0)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label font-bold">Motivo / Referencia</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. Guía de Remisión GR-004, Merma, etc."
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Motivo suggestions */}
          <div className="flex gap-1.5 flex-wrap items-center pt-1.5">
            <span className="text-[11px] font-semibold text-secondary flex items-center gap-1">
              <Sparkles size={13} className="text-primary-600 dark:text-primary-400" />
              Sugerencias:
            </span>
            {[
              movementType === 'IN' ? 'Orden de Compra OC-005' : 'Merma por Rotura',
              movementType === 'IN' ? 'Ingreso por Importación' : 'Uso Interno de Oficina',
              'Inventario Físico Mensual',
              'Corrección de Kardex',
              ...(movementType === 'IN' ? ['Devolución de Cliente'] : movementType === 'OUT' ? ['Venta Directa'] : ['Ajuste por Auditoría']),
            ].map((chip) => (
              <SuggestionChip
                key={chip}
                label={chip}
                selected={movementReason === chip}
                onClick={() => setMovementReason(chip)}
                size="sm"
              />
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-color">
            <Button variant="secondary" type="button" onClick={() => setIsMovementModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={movementType === 'IN' ? 'success' : movementType === 'OUT' ? 'danger' : 'warning'}
              type="submit"
              loading={isSubmitting}
            >
              Guardar Movimiento
            </Button>
          </div>
        </form>
      </Modal>

      {/* Inter-Branch Transfer Modal */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        products={products}
        branches={contextBranches}
        targetBranchId={activeBranchId}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}

