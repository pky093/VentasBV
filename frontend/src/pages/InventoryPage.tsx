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
  Layers,
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
import Swal from 'sweetalert2';
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
  const [transferTargetProduct, setTransferTargetProduct] = useState<Product | null>(null);

  // Form inputs for Movement Modal
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedMovementColor, setSelectedMovementColor] = useState('');
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
    const targetProdId = preselectedProdId || (products.length > 0 ? products[0].id : '');
    setSelectedProductId(targetProdId);

    const prod = products.find((p) => p.id === targetProdId);
    if (prod?.colors && prod.colors.length > 0) {
      setSelectedMovementColor(prod.colors[0].color || '');
    } else {
      setSelectedMovementColor('');
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

  const openTransferModal = (preselectedProdId?: string) => {
    if (preselectedProdId) {
      const found = products.find((p) => p.id === preselectedProdId);
      setTransferTargetProduct(found || null);
    } else {
      setTransferTargetProduct(null);
    }
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
        const curBranchStock = prod.branchStocks?.find(b => b.branchId === targetBranchId)?.stock ?? prod.stock;
        finalQty = Number(movementQty) - curBranchStock;
      }

      const finalReason = selectedMovementColor
        ? `${movementReason} (Variante: ${selectedMovementColor})`
        : movementReason;

      const success = await inventoryService.registerMovement({
        productId: prod.id,
        productName: prod.name,
        branchId: branch?.id || targetBranchId || '',
        branchName: branch?.name || activeBranch?.name || 'Sucursal',
        type: movementType,
        qty: finalQty,
        reason: finalReason || `${movementType === 'IN' ? 'Ingreso' : movementType === 'OUT' ? 'Salida' : 'Ajuste'} de stock`,
        colorVariant: selectedMovementColor || undefined,
      });

      if (success) {
        const actionLabel =
          movementType === 'IN' ? 'el ingreso' : movementType === 'OUT' ? 'la salida' : 'el ajuste';
        const branchLabel = branch?.name || activeBranch?.name || 'Sede Principal';

        Swal.fire({
          title: '¡Movimiento Registrado!',
          html: `
            <div style="text-align:center; padding: 6px;">
              <p style="font-size:14px; margin-bottom:10px; color:var(--text-primary);">
                Se registró ${actionLabel} de <b>${Math.abs(finalQty)} unid.</b> en <b>${prod.name}</b>
                ${selectedMovementColor ? `<br/><span style="font-size:12px; color:var(--text-secondary);">(Color: <b>${selectedMovementColor}</b>)</span>` : ''}
              </p>
              <div style="display:inline-block; background:var(--bg-surface-hover); padding:6px 14px; border-radius:10px; border:1px solid var(--border-color); font-size:12px; font-weight:bold; color:var(--primary-600);">
                Sucursal: ${branchLabel}
              </div>
            </div>
          `,
          icon: 'success',
          timer: 2200,
          showConfirmButton: false,
        });

        await loadData();
        setIsMovementModalOpen(false);
      } else {
        Swal.fire('Error', 'No se pudo procesar el movimiento en la base de datos.', 'error');
      }
    } catch (err) {
      console.error('Error saving movement:', err);
      Swal.fire('Error', 'Error inesperado al registrar el movimiento.', 'error');
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
      header: 'STOCK POR SUCURSAL',
      render: (r: Product) => {
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
        return <span className="text-xs text-secondary font-medium">{activeBranch?.name || 'Sede Principal'}</span>;
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
        <span className="text-xs text-primary font-medium flex items-center gap-1.5">
          <span className="font-semibold">{r.sourceBranchName || r.branchName || 'Sede Origen'}</span>
          <span className="text-primary-600 font-bold">&rarr;</span>
          <span className="text-emerald-700 dark:text-emerald-300 font-bold">{r.targetBranchName || 'Sede Destino'}</span>
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
        {(() => {
          const currentMovementProduct = products.find((p) => p.id === selectedProductId) || products[0] || null;
          const currentMovementBranch = branches.find((b) => b.id === selectedBranchId) || branches[0] || null;
          const currentMovementBranchStock =
            currentMovementProduct?.branchStocks?.find((bs) => bs.branchId === (currentMovementBranch?.id || ''))?.stock ??
            (currentMovementProduct?.stock || 0);

          const selectedMovementColorObj = currentMovementProduct?.colors?.find(
            (c) => c.color?.toLowerCase() === selectedMovementColor?.toLowerCase()
          );
          const selectedMovementColorStock =
            selectedMovementColorObj?.stock !== undefined ? Number(selectedMovementColorObj.stock) : null;

          let resultingMovementStock = currentMovementBranchStock;
          if (movementType === 'IN') {
            resultingMovementStock = currentMovementBranchStock + (Number(movementQty) || 0);
          } else if (movementType === 'OUT') {
            resultingMovementStock = Math.max(0, currentMovementBranchStock - (Number(movementQty) || 0));
          } else if (movementType === 'ADJUSTMENT') {
            if (adjustmentMode === 'SET') {
              resultingMovementStock = Number(movementQty) || 0;
            } else {
              resultingMovementStock = currentMovementBranchStock + (Number(movementQty) || 0);
            }
          }

          return (
            <form onSubmit={handleSaveMovement} className="space-y-4">
              <div className="p-3 bg-surface border border-color rounded-xl text-xs flex items-center justify-between">
                <span className="text-secondary font-medium">Operación Seleccionada:</span>
                {movementType === 'IN' ? (
                  <Badge variant="success" className="font-bold flex items-center gap-1">
                    <ArrowDownLeft size={13} /> + INGRESO / ENTRADA DE STOCK
                  </Badge>
                ) : movementType === 'OUT' ? (
                  <Badge variant="danger" className="font-bold flex items-center gap-1">
                    <ArrowUpRight size={13} /> - SALIDA / RETIRO DE STOCK
                  </Badge>
                ) : (
                  <Badge variant="warning" className="font-bold flex items-center gap-1">
                    <Sliders size={13} /> AJUSTE FÍSICO DE KARDEX
                  </Badge>
                )}
              </div>

              {/* 1. SELECCIÓN DE PRODUCTO */}
              <div className="form-group space-y-2">
                <div className="flex items-center justify-between">
                  <label className="form-label font-bold flex items-center gap-1.5 mb-0">
                    <Package size={15} className="text-primary-600" />
                    Seleccionar Producto
                  </label>
                  <span className="text-xs text-secondary font-medium">
                    Stock Total:{' '}
                    <strong className="text-primary font-bold">
                      {currentMovementProduct
                        ? (currentMovementProduct.branchStocks || []).reduce((sum, bs) => sum + bs.stock, 0) || currentMovementProduct.stock
                        : 0}{' '}
                      unid.
                    </strong>
                  </span>
                </div>

                <select
                  className="form-control"
                  value={selectedProductId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    setSelectedProductId(pId);
                    const pObj = products.find((p) => p.id === pId);
                    if (pObj?.colors && pObj.colors.length > 0) {
                      setSelectedMovementColor(pObj.colors[0].color || '');
                    } else {
                      setSelectedMovementColor('');
                    }
                  }}
                  required
                >
                  {products.map((p) => {
                    const pTotal = (p.branchStocks || []).reduce((sum, bs) => sum + bs.stock, 0) || p.stock;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.code ? `[${p.code}] ` : ''}{p.name} {p.brand ? `• ${p.brand}` : ''} — Stock Total: {pTotal} unid.
                      </option>
                    );
                  })}
                </select>

                {/* Variante de Color pills */}
                {currentMovementProduct?.colors && currentMovementProduct.colors.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <label className="form-label text-xs font-bold text-secondary flex items-center gap-1.5 mb-0">
                      <Layers size={14} className="text-primary-600" /> Variante de Color:
                    </label>
                    <div className="tab-list-pills p-1 inline-flex gap-1 flex-wrap">
                      {currentMovementProduct.colors.map((c) => {
                        const isActive = selectedMovementColor?.toLowerCase() === c.color?.toLowerCase();
                        return (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => setSelectedMovementColor(c.color)}
                            className={`tab-btn-pill ${isActive ? 'active' : ''}`}
                          >
                            {c.hex && (
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                                style={{ backgroundColor: c.hex }}
                              />
                            )}
                            <span>{c.color}</span>
                            {c.stock !== undefined && (
                              <span className="text-[11px] opacity-75 font-mono">({c.stock} unid.)</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Stock por sede pills */}
                <div className="space-y-1.5 pt-1">
                  <label className="form-label text-xs font-bold text-secondary flex items-center gap-1.5 mb-0">
                    <Building2 size={14} className="text-primary-600" /> Sede / Sucursal de Operación:
                  </label>
                  <div className="tab-list-pills p-1 inline-flex gap-1 flex-wrap">
                    {branches.map((b) => {
                      const bStock =
                        currentMovementProduct?.branchStocks?.find((bs) => bs.branchId === b.id)?.stock ?? 0;
                      const isActive = b.id === (selectedBranchId || (activeBranchId !== 'ALL' ? activeBranchId : branches[0]?.id));
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBranchId(b.id)}
                          className={`tab-btn-pill ${isActive ? 'active' : ''}`}
                        >
                          <Building2 size={13} className="tab-icon" />
                          <span>{b.name}:</span>
                          <strong className="font-mono">{bStock} unid.</strong>
                          {isActive && (
                            <span className="text-[10px] font-bold text-primary-700 dark:text-primary-300 ml-0.5">
                              (Seleccionada)
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {movementType === 'ADJUSTMENT' && (
                <div className="form-group">
                  <label className="form-label font-bold text-xs mb-1.5">Modo de Ajuste</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`p-3 border rounded-xl cursor-pointer text-xs font-semibold flex items-center gap-2 transition-all ${
                        adjustmentMode === 'DELTA'
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300'
                          : 'border-color bg-surface'
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
                      className={`p-3 border rounded-xl cursor-pointer text-xs font-semibold flex items-center gap-2 transition-all ${
                        adjustmentMode === 'SET'
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300'
                          : 'border-color bg-surface'
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

              {/* Balance Preview Card */}
              <div className="p-3.5 bg-surface border border-color rounded-xl flex items-center justify-between gap-3 text-xs w-full">
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-secondary block mb-0.5">
                    Sede Seleccionada
                  </span>
                  <span className="font-bold text-primary text-sm truncate block">
                    {currentMovementBranch?.name || 'Sede'}
                  </span>
                  <div className="text-secondary text-xs mt-0.5">
                    Stock actual: <strong className="text-primary font-mono">{currentMovementBranchStock} unid.</strong>
                    {selectedMovementColor && selectedMovementColorStock !== null && (
                      <span className="ml-1 text-[11px] text-secondary font-medium">
                        (Var. {selectedMovementColor}: {selectedMovementColorStock})
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 px-3.5 py-1.5 rounded-full bg-surface-hover border border-color font-bold text-xs font-mono">
                  {movementType === 'IN'
                    ? `+${movementQty}`
                    : movementType === 'OUT'
                    ? `-${movementQty}`
                    : `Ajuste: ${movementQty}`}
                </div>

                <div className="flex-1 min-w-0 text-right">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-secondary block mb-0.5">
                    Stock Resultante
                  </span>
                  <strong
                    className={`font-mono text-sm ${
                      resultingMovementStock < 0 ? 'text-danger-600' : 'text-emerald-600'
                    }`}
                  >
                    {resultingMovementStock} unid.
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label font-bold mb-1">
                    {movementType === 'IN'
                      ? 'Cantidad a Ingresar (+)'
                      : movementType === 'OUT'
                      ? 'Cantidad a Retirar (-)'
                      : adjustmentMode === 'SET'
                      ? 'Nuevo Stock Físico Real Total'
                      : 'Variación de Stock (ej. -2 o +5)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMovementQty((q) => Math.max(1, q - 1))}
                      className="btn btn-secondary px-3 py-2 shrink-0 font-bold"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      step="1"
                      className="form-control font-bold text-center text-sm"
                      value={movementQty}
                      onChange={(e) => setMovementQty(parseInt(e.target.value) || 0)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setMovementQty((q) => q + 1)}
                      className="btn btn-secondary px-3 py-2 shrink-0 font-bold"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label font-bold mb-1">Motivo / Referencia</label>
                  <input
                    type="text"
                    className="form-control text-xs"
                    placeholder="Ej. Guía de Remisión GR-004, Merma, etc."
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Motivo suggestions */}
              <div className="flex gap-1.5 flex-wrap items-center pt-1">
                <span className="text-xs font-semibold text-secondary flex items-center gap-1">
                  <Sparkles size={12} className="text-primary-600 dark:text-primary-400" />
                  Sugerencias:
                </span>
                {[
                  movementType === 'IN' ? 'Orden de Compra OC-005' : 'Merma por Rotura',
                  movementType === 'IN' ? 'Ingreso por Importación' : 'Uso Interno de Oficina',
                  'Inventario Físico Mensual',
                  'Corrección de Kardex',
                  ...(movementType === 'IN'
                    ? ['Devolución de Cliente']
                    : movementType === 'OUT'
                    ? ['Venta Directa']
                    : ['Ajuste por Auditoría']),
                ].map((chip) => (
                  <SuggestionChip
                    key={chip}
                    label={chip}
                    selected={movementReason === chip}
                    onClick={() => setMovementReason(chip)}
                    size="xs"
                  />
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-color">
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
          );
        })()}
      </Modal>

      {/* Inter-Branch Transfer Modal */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferTargetProduct(null);
        }}
        products={products}
        branches={contextBranches.length > 0 ? contextBranches : branches}
        preselectedProduct={transferTargetProduct}
        targetBranchId={activeBranchId}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}

