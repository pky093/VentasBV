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
} from 'lucide-react';
import { PageHeader, Button, Badge, Tabs, DataTable, Modal } from '../components/ui';
import {
  productsService,
  branchesService,
  inventoryService,
  Product,
  Branch,
  InventoryMovement,
} from '../lib/db-services';

export default function InventoryPage() {
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
  const [adjustmentMode, setAdjustmentMode] = useState<'DELTA' | 'SET'>('DELTA'); // DELTA (+/-) or SET (nuevo stock total)

  // Form inputs for Transfer Modal
  const [transferProductId, setTransferProductId] = useState('');
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [targetBranchId, setTargetBranchId] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [transferReason, setTransferReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prods, brs, movs] = await Promise.all([
        productsService.getProducts(),
        branchesService.getBranches(),
        inventoryService.getMovements(),
      ]);

      setProducts(prods);
      setBranches(brs);
      setMovements(movs);

      if (prods.length > 0 && !selectedProductId) {
        setSelectedProductId(prods[0].id);
        setTransferProductId(prods[0].id);
      }
      if (brs.length > 0) {
        if (!selectedBranchId) setSelectedBranchId(brs[0].id);
        if (!sourceBranchId) setSourceBranchId(brs[0].id);
        if (!targetBranchId && brs.length > 1) setTargetBranchId(brs[1].id);
      }
    } catch (err) {
      console.error('Error loading inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openMovementModal = (type: 'IN' | 'OUT' | 'ADJUSTMENT', preselectedProdId?: string) => {
    setMovementType(type);
    if (preselectedProdId) {
      setSelectedProductId(preselectedProdId);
    } else if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
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

  const openTransferModal = (preselectedProdId?: string) => {
    if (preselectedProdId) {
      setTransferProductId(preselectedProdId);
    } else if (products.length > 0 && !transferProductId) {
      setTransferProductId(products[0].id);
    }

    setTransferQty(1);
    setTransferReason('Transferencia de reabastecimiento entre sedes');
    setIsTransferModalOpen(true);
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    const prod = products.find((p) => p.id === selectedProductId);
    const branch = branches.find((b) => b.id === selectedBranchId) || branches[0];
    if (!prod) return;

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      let finalQty = Number(movementQty);

      if (movementType === 'ADJUSTMENT' && adjustmentMode === 'SET') {
        // SET mode: quantity input is target new stock, so delta = target - current
        finalQty = Number(movementQty) - prod.stock;
      }

      const success = await inventoryService.registerMovement({
        productId: prod.id,
        productName: prod.name,
        branchId: branch?.id || '',
        branchName: branch?.name || 'Sede Principal',
        type: movementType,
        qty: finalQty,
        reason: movementReason || `${movementType === 'IN' ? 'Ingreso' : movementType === 'OUT' ? 'Salida' : 'Ajuste'} de stock`,
      });

      if (success) {
        setFeedbackMsg({
          type: 'success',
          text: `Se registró correctamente el ${
            movementType === 'IN' ? 'ingreso' : movementType === 'OUT' ? 'salida' : 'ajuste'
          } de "${prod.name}".`,
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

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProductId) return;

    const prod = products.find((p) => p.id === transferProductId);
    const srcBranch = branches.find((b) => b.id === sourceBranchId) || branches[0];
    const tgtBranch = branches.find((b) => b.id === targetBranchId) || branches[1] || branches[0];

    if (!prod) return;

    if (sourceBranchId === targetBranchId) {
      alert('La sede de origen y la sede de destino deben ser diferentes.');
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const success = await inventoryService.registerTransfer({
        productId: prod.id,
        productName: prod.name,
        sourceBranchId: srcBranch?.id || '',
        sourceBranchName: srcBranch?.name || 'Sede Origen',
        targetBranchId: tgtBranch?.id || '',
        targetBranchName: tgtBranch?.name || 'Sede Destino',
        qty: Number(transferQty),
        reason: transferReason || `Transferencia hacia ${tgtBranch?.name}`,
      });

      if (success) {
        setFeedbackMsg({
          type: 'success',
          text: `Transferencia de ${transferQty} unid. de "${prod.name}" a ${tgtBranch?.name} completada.`,
        });
        await loadData();
        setIsTransferModalOpen(false);
      } else {
        setFeedbackMsg({ type: 'error', text: 'No se pudo registrar la transferencia.' });
      }
    } catch (err) {
      console.error('Error saving transfer:', err);
      setFeedbackMsg({ type: 'error', text: 'Error al procesar la transferencia.' });
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
          <div className="text-xs text-secondary">
            Marca: <strong>{r.brand}</strong> | Categoría: {r.category}
          </div>
        </div>
      ),
    },
    {
      key: 'branch',
      header: 'SUCURSAL',
      render: () => <span className="text-xs text-secondary font-medium">Sede Principal</span>,
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
            ? '📦 Registrar Ingreso de Producto (Entrada)'
            : movementType === 'OUT'
            ? '📤 Registrar Salida de Producto (Egreso)'
            : '⚡ Ajuste Manual de Inventario'
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
          <div className="flex gap-2 flex-wrap items-center pt-1">
            <span className="text-[11px] text-secondary">Sugerencias:</span>
            {[
              movementType === 'IN' ? 'Orden de Compra OC-005' : 'Merma por Rotura',
              movementType === 'IN' ? 'Ingreso por Importación' : 'Uso Interno de Oficina',
              'Inventario Físico Mensual',
              'Corrección de Kardex',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                className="text-[11px] px-2 py-0.5 rounded bg-surface hover:bg-surface-hover border border-color text-secondary"
                onClick={() => setMovementReason(chip)}
              >
                {chip}
              </button>
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

      {/* MODAL 2: TRANSFERENCIA ENTRE SEDES */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="⇄ Transferir Stock Entre Sedes / Sucursales"
        size="lg"
      >
        <form onSubmit={handleSaveTransfer} className="space-y-4">
          <div className="form-group">
            <label className="form-label font-bold">Producto a Transferir</label>
            <select
              className="form-control"
              value={transferProductId}
              onChange={(e) => setTransferProductId(e.target.value)}
              required
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code}) — Stock Disponible: {p.stock} unid.
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label font-bold">Sede Origen (Salida)</label>
              <select
                className="form-control"
                value={sourceBranchId}
                onChange={(e) => setSourceBranchId(e.target.value)}
                required
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label font-bold">Sede Destino (Ingreso)</label>
              <select
                className="form-control"
                value={targetBranchId}
                onChange={(e) => setTargetBranchId(e.target.value)}
                required
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id} disabled={b.id === sourceBranchId}>
                    {b.name} {b.id === sourceBranchId ? '(Misma sede)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label font-bold">Cantidad a Transferir</label>
              <input
                type="number"
                min="1"
                step="1"
                className="form-control font-bold text-lg"
                value={transferQty}
                onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label font-bold font-bold">Motivo / Observación</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. Reabastecimiento por alta demanda"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-color">
            <Button variant="secondary" type="button" onClick={() => setIsTransferModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting}>
              Confirmar Transferencia
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

