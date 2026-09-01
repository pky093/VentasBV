import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRightLeft,
  Building2,
  Package,
  Clock,
  AlertTriangle,
  ArrowRight,
  Plus,
  Minus,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Modal, Button, SuggestionChip, Badge } from '../ui';
import { Product, Branch, inventoryService } from '../../lib/db-services';
import Swal from 'sweetalert2';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  branches: Branch[];
  preselectedProduct?: Product | null;
  targetBranchId?: string;
  onSuccess?: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  products,
  branches,
  preselectedProduct,
  targetBranchId,
  onSuccess,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [sourceBranchId, setSourceBranchId] = useState<string>('');
  const [destBranchId, setDestBranchId] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [transferQty, setTransferQty] = useState<number>(1);
  const [estimatedDays, setEstimatedDays] = useState<number>(1);
  const [reason, setReason] = useState<string>('Reabastecimiento por falta de stock en sede');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active usable branches
  const activeBranches = useMemo(() => {
    const list = (branches || []).filter((b) => b.status !== 'INACTIVE');
    return list.length > 0 ? list : branches || [];
  }, [branches]);

  // Selected product resolution
  const selectedProduct = useMemo(() => {
    return (
      products.find((p) => p.id === selectedProductId) ||
      preselectedProduct ||
      products[0] ||
      null
    );
  }, [products, selectedProductId, preselectedProduct]);

  // Helper to obtain stock for a specific branch
  const getBranchStock = (bId: string): number => {
    if (!selectedProduct || !bId) return 0;
    const bs = selectedProduct.branchStocks?.find((s) => s.branchId === bId);
    if (bs !== undefined) return Number(bs.stock) || 0;
    return 0;
  };

  // Total stock across all available branches
  const totalBranchesStock = useMemo(() => {
    if (!selectedProduct) return 0;
    if (activeBranches.length > 0 && selectedProduct.branchStocks && selectedProduct.branchStocks.length > 0) {
      return activeBranches.reduce((sum, b) => sum + getBranchStock(b.id), 0);
    }
    return Number(selectedProduct.stock) || 0;
  }, [selectedProduct, activeBranches]);

  // Setup initial selection on open or preselected product changes
  useEffect(() => {
    if (!isOpen) return;

    const initialProd = preselectedProduct || products[0] || null;
    if (initialProd) {
      setSelectedProductId(initialProd.id);
      if (initialProd.colors && initialProd.colors.length > 0) {
        setSelectedColor(initialProd.colors[0].color || '');
      } else {
        setSelectedColor('');
      }
    }

    if (activeBranches.length < 2) {
      if (activeBranches.length === 1) {
        setSourceBranchId(activeBranches[0].id);
        setDestBranchId(activeBranches[0].id);
      }
      return;
    }

    // 1. Pick the branch that actually has available stock as default SOURCE
    const branchesWithStock = (initialProd?.branchStocks || [])
      .filter((bs) => activeBranches.some((ab) => ab.id === bs.branchId))
      .sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0));

    let bestSource = '';
    if (branchesWithStock.length > 0 && (branchesWithStock[0].stock || 0) > 0) {
      bestSource = branchesWithStock[0].branchId;
    } else {
      bestSource = activeBranches[0]?.id || '';
    }

    // 2. Pick the other branch as DESTINATION
    let finalDest = '';
    if (targetBranchId && targetBranchId !== 'ALL' && targetBranchId !== bestSource && activeBranches.some((b) => b.id === targetBranchId)) {
      finalDest = targetBranchId;
    } else {
      const otherBranch = activeBranches.find((b) => b.id !== bestSource);
      finalDest = otherBranch?.id || activeBranches[0]?.id || '';
    }

    setSourceBranchId(bestSource);
    setDestBranchId(finalDest);
    setTransferQty(1);
    setEstimatedDays(1);
    setReason('Reabastecimiento por falta de stock en sede');
  }, [isOpen, preselectedProduct, targetBranchId, activeBranches, products]);

  // Source and target branch stock calculations
  // Source and target branch stock calculations
  const sourceBranchStock = getBranchStock(sourceBranchId);
  const targetBranchStock = getBranchStock(destBranchId);

  // Helper to get stock of a specific color variant in a specific branch
  const getColorStockInBranch = (colorName: string, bId: string): number => {
    if (!selectedProduct?.colors || !colorName || !bId) return 0;
    const found = selectedProduct.colors.find((c) => c.color?.toLowerCase() === colorName.toLowerCase());
    if (!found) return 0;
    if (found.branchStocks && typeof found.branchStocks === 'object' && found.branchStocks[bId] !== undefined) {
      return Number(found.branchStocks[bId]) || 0;
    }
    const mainBranchId = activeBranches[0]?.id;
    if (bId === mainBranchId) {
      return Number(found.stock) || 0;
    }
    return 0;
  };

  // Selected color stock in source branch & target branch
  const sourceColorStock = useMemo(() => {
    if (!selectedProduct?.colors || selectedProduct.colors.length === 0 || !selectedColor) return null;
    return getColorStockInBranch(selectedColor, sourceBranchId);
  }, [selectedProduct, selectedColor, sourceBranchId, activeBranches]);

  const targetColorStock = useMemo(() => {
    if (!selectedProduct?.colors || selectedProduct.colors.length === 0 || !selectedColor) return null;
    return getColorStockInBranch(selectedColor, destBranchId);
  }, [selectedProduct, selectedColor, destBranchId, activeBranches]);

  // Effective maximum quantity that can be transferred from source branch
  const maxAvailableStock = useMemo(() => {
    if (sourceColorStock !== null) {
      return Math.min(sourceBranchStock, sourceColorStock);
    }
    return sourceBranchStock;
  }, [sourceBranchStock, sourceColorStock]);

  const resultingSourceStock = Math.max(0, sourceBranchStock - (Number(transferQty) || 0));
  const resultingDestStock = targetBranchStock + (Number(transferQty) || 0);
  const resultingSourceColorStock = sourceColorStock !== null ? Math.max(0, sourceColorStock - (Number(transferQty) || 0)) : null;
  const resultingTargetColorStock = targetColorStock !== null ? targetColorStock + (Number(transferQty) || 0) : null;

  const sourceBranch = activeBranches.find((b) => b.id === sourceBranchId);
  const destBranch = activeBranches.find((b) => b.id === destBranchId);

  // When selecting a color variant
  const handleColorSelect = (colorName: string) => {
    setSelectedColor(colorName);
    const cStock = getColorStockInBranch(colorName, sourceBranchId);
    const effectiveLimit = Math.min(sourceBranchStock, cStock);
    if (effectiveLimit > 0 && transferQty > effectiveLimit) {
      setTransferQty(effectiveLimit);
    } else if (effectiveLimit <= 0) {
      setTransferQty(1);
    }
  };

  // When changing product in dropdown
  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    if (prod.colors && prod.colors.length > 0) {
      setSelectedColor(prod.colors[0].color || '');
    } else {
      setSelectedColor('');
    }

    // Auto switch source branch to the branch with highest stock for this product
    if (prod.branchStocks && activeBranches.length >= 2) {
      const sorted = [...prod.branchStocks]
        .filter((bs) => activeBranches.some((ab) => ab.id === bs.branchId))
        .sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0));

      if (sorted.length > 0 && (sorted[0].stock || 0) > 0) {
        const topSource = sorted[0].branchId;
        setSourceBranchId(topSource);
        const altDest = activeBranches.find((b) => b.id !== topSource)?.id || '';
        if (altDest) setDestBranchId(altDest);
      }
    }
    setTransferQty(1);
  };

  // Handle source branch change
  const handleSourceBranchChange = (newSourceId: string) => {
    setSourceBranchId(newSourceId);
    if (newSourceId === destBranchId) {
      const altDest = activeBranches.find((b) => b.id !== newSourceId);
      if (altDest) setDestBranchId(altDest.id);
    }
    const avail = getBranchStock(newSourceId);
    const cStock = selectedColor ? getColorStockInBranch(selectedColor, newSourceId) : avail;
    const effectiveLimit = Math.min(avail, cStock);
    if (effectiveLimit > 0 && transferQty > effectiveLimit) {
      setTransferQty(effectiveLimit);
    }
  };

  // Handle dest branch change
  const handleDestBranchChange = (newDestId: string) => {
    setDestBranchId(newDestId);
    if (newDestId === sourceBranchId) {
      const altSource = activeBranches.find((b) => b.id !== newDestId);
      if (altSource) setSourceBranchId(altSource.id);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      Swal.fire('Atención', 'Selecciona un producto válido.', 'warning');
      return;
    }

    if (activeBranches.length < 2) {
      Swal.fire('Atención', 'Se requieren al menos 2 sedes registradas para programar traspasos.', 'warning');
      return;
    }

    if (!sourceBranchId || !destBranchId) {
      Swal.fire('Atención', 'Debes seleccionar la sede de origen y la sede de destino.', 'warning');
      return;
    }

    if (sourceBranchId === destBranchId) {
      Swal.fire('Atención', 'La sede de origen y la de destino no pueden ser iguales.', 'warning');
      return;
    }

    if (transferQty <= 0) {
      Swal.fire('Atención', 'Ingresa una cantidad válida a traspasar (mínimo 1).', 'warning');
      return;
    }

    if (sourceBranchStock < transferQty) {
      Swal.fire(
        'Stock Insuficiente',
        `La sede de origen "${sourceBranch?.name || 'Origen'}" solo cuenta con ${sourceBranchStock} unidades disponibles de "${selectedProduct.name}".`,
        'warning'
      );
      return;
    }

    if (sourceColorStock !== null && transferQty > sourceColorStock) {
      Swal.fire(
        'Variante con Stock Insuficiente',
        `En la sede de origen "${sourceBranch?.name || 'Origen'}" solo dispones de ${sourceColorStock} unid. de la variante de color "${selectedColor}". No puedes traspasar ${transferQty} unidades.`,
        'warning'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const finalReason = selectedColor ? `${reason} (Variante: ${selectedColor})` : reason;

      const ok = await inventoryService.registerTransfer({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        sourceBranchId,
        sourceBranchName: sourceBranch?.name || 'Sede Origen',
        targetBranchId: destBranchId,
        targetBranchName: destBranch?.name || 'Sede Destino',
        qty: Number(transferQty),
        estimatedDays: Number(estimatedDays),
        reason: finalReason,
        colorVariant: selectedColor || undefined,
      });

      if (ok) {
        Swal.fire({
          title: '¡Traspaso Registrado!',
          html: `
            <div style="text-align:center; padding: 6px;">
              <p style="font-size:14px; margin-bottom:12px; color:var(--text-primary);">
                Se traspasaron <b>${transferQty} unid.</b> de <b>${selectedProduct.name}</b>
                ${selectedColor ? `<br/><span style="font-size:12px; color:var(--text-secondary);">(Color: <b>${selectedColor}</b>)</span>` : ''}
              </p>
              <div style="display:inline-flex; align-items:center; gap:10px; background:var(--bg-surface-hover); padding:8px 16px; border-radius:12px; border:1px solid var(--border-color); font-size:13px; font-weight:bold;">
                <span style="color:var(--primary-600);">${sourceBranch?.name}</span>
                <span style="font-size:16px;">➔</span>
                <span style="color:#059669;">${destBranch?.name}</span>
              </div>
              <p style="font-size:12px; color:var(--text-secondary); margin-top:12px;">
                Tiempo estimado de llegada: <b>${estimatedDays} día(s) hábil(es)</b>
              </p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#3b82f6',
        });
        onClose();
        if (onSuccess) onSuccess();
      } else {
        Swal.fire('Error', 'No se pudo registrar el traspaso en la base de datos.', 'error');
      }
    } catch (err) {
      console.error('Error enviando traspaso:', err);
      Swal.fire('Error', 'Ocurrió un error inesperado al procesar el traspaso.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Traspaso de Inventario entre Sedes"
      size="lg"
    >
      {activeBranches.length < 2 ? (
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/40 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <Building2 size={24} />
          </div>
          <div>
            <h3 className="font-bold text-base text-primary">Se requieren al menos 2 sedes activas</h3>
            <p className="text-xs text-secondary mt-1">
              Para programar un traspaso entre sedes necesitas tener al menos dos sedes activas registradas en la empresa.
            </p>
          </div>
          <div className="pt-2">
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          {/* Header Banner */}
          <div className="p-3 bg-surface border border-color rounded-xl flex items-center justify-between text-xs">
            <span className="text-secondary font-medium">Operación de Inventario:</span>
            <Badge variant="primary" className="flex items-center gap-1 font-bold">
              <ArrowRightLeft size={12} /> TRASPASO ENTRE SEDES
            </Badge>
          </div>

          {/* 1. SELECCIÓN DE PRODUCTO */}
          <div className="form-group space-y-2">
            <div className="flex items-center justify-between">
              <label className="form-label font-bold flex items-center gap-1.5 mb-0">
                <Package size={15} className="text-primary-600" />
                Producto a Traspasar
              </label>
              <span className="text-xs text-secondary font-medium">
                Stock Total: <strong className="text-primary font-bold">{totalBranchesStock} unid.</strong>
              </span>
            </div>

            <select
              className="form-control"
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              required
            >
              {products.map((p) => {
                const pTotal = activeBranches.reduce(
                  (sum, b) => sum + (p.branchStocks?.find((bs) => bs.branchId === b.id)?.stock ?? 0),
                  0
                );
                return (
                  <option key={p.id} value={p.id}>
                    {p.code ? `[${p.code}] ` : ''}{p.name} {p.brand ? `• ${p.brand}` : ''} — Stock: {pTotal} unid.
                  </option>
                );
              })}
            </select>

            {/* Color variants if present */}
            {selectedProduct?.colors && selectedProduct.colors.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <label className="form-label text-xs font-bold text-secondary flex items-center gap-1.5 mb-0">
                  <Layers size={14} className="text-primary-600" /> Variante de Color:
                  <span className="text-[11px] font-normal text-secondary ml-1">
                    (Stock disponible en {sourceBranch?.name || 'Origen'})
                  </span>
                </label>
                <div className="tab-list-pills p-1 inline-flex gap-1 flex-wrap">
                  {selectedProduct.colors.map((c) => {
                    const isActive = selectedColor?.toLowerCase() === c.color?.toLowerCase();
                    const cStockInSource = getColorStockInBranch(c.color, sourceBranchId);
                    return (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => handleColorSelect(c.color)}
                        className={`tab-btn-pill ${isActive ? 'active' : ''}`}
                      >
                        {c.hex && (
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: c.hex }}
                          />
                        )}
                        <span>{c.color}</span>
                        <span className={`text-[11px] font-mono ${cStockInSource === 0 ? 'opacity-50 text-danger-500' : 'opacity-85 font-semibold'}`}>
                          ({cStockInSource} unid.)
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sede Stock Breakdown list */}
            <div className="space-y-1.5 pt-1">
              <label className="form-label text-xs font-bold text-secondary flex items-center gap-1.5 mb-0">
                <Building2 size={14} className="text-primary-600" /> Stock por sede:
              </label>
              <div className="tab-list-pills p-1 inline-flex gap-1 flex-wrap">
                {activeBranches.map((b) => {
                  const bStock = getBranchStock(b.id);
                  const isSource = b.id === sourceBranchId;
                  const isDest = b.id === destBranchId;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        if (bStock > 0 && b.id !== destBranchId) {
                          handleSourceBranchChange(b.id);
                        } else if (b.id !== sourceBranchId) {
                          handleDestBranchChange(b.id);
                        }
                      }}
                      className={`tab-btn-pill ${isSource || isDest ? 'active' : ''}`}
                    >
                      <Building2 size={13} className="tab-icon" />
                      <span>{b.name}:</span>
                      <strong className="font-mono">{bStock} unid.</strong>
                      {isSource && (
                        <span className="text-[10px] font-bold text-primary-700 dark:text-primary-300 ml-0.5">
                          (Origen)
                        </span>
                      )}
                      {isDest && (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 ml-0.5">
                          (Destino)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. SEDES DE ORIGEN Y DESTINO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ORIGIN BRANCH */}
            <div className="form-group">
              <label className="form-label font-bold flex items-center justify-between mb-1">
                <span>Sede Origen (Salida de stock)</span>
                <span className="text-xs font-bold text-primary-600 font-mono">
                  Disp: {sourceBranchStock} unid.
                  {selectedColor && sourceColorStock !== null ? ` (${selectedColor}: ${sourceColorStock})` : ''}
                </span>
              </label>
              <select
                className="form-control"
                value={sourceBranchId}
                onChange={(e) => handleSourceBranchChange(e.target.value)}
                required
              >
                {activeBranches.map((b) => {
                  const bStock = getBranchStock(b.id);
                  return (
                    <option key={b.id} value={b.id} disabled={b.id === destBranchId}>
                      {b.name} ({bStock} disponibles{bStock === 0 ? ' - sin stock' : ''})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* DESTINATION BRANCH */}
            <div className="form-group">
              <label className="form-label font-bold flex items-center justify-between mb-1">
                <span>Sede Destino (Recepción)</span>
                <span className="text-xs font-bold text-emerald-600 font-mono">
                  Actual: {targetBranchStock} ➔ {resultingDestStock}
                  {selectedColor && targetColorStock !== null ? ` (${selectedColor}: ${targetColorStock} ➔ ${resultingTargetColorStock})` : ''}
                </span>
              </label>
              <select
                className="form-control"
                value={destBranchId}
                onChange={(e) => handleDestBranchChange(e.target.value)}
                required
              >
                {activeBranches.map((b) => {
                  const bStock = getBranchStock(b.id);
                  return (
                    <option key={b.id} value={b.id} disabled={b.id === sourceBranchId}>
                      {b.name} ({bStock} actuales)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Warning if source has no stock or color has no stock */}
          {sourceBranchStock <= 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Sede de origen sin stock:</span> La sede seleccionada (
                <b>{sourceBranch?.name}</b>) no cuenta con unidades disponibles de este producto. Selecciona una sede
                de origen con existencias para poder realizar el traspaso.
              </div>
            </div>
          )}

          {sourceBranchStock > 0 && sourceColorStock !== null && sourceColorStock <= 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Variante sin existencias en {sourceBranch?.name}:</span> La variante de color (
                <b>{selectedColor}</b>) tiene 0 unidades disponibles en esta sede. Selecciona otra variante para traspasar.
              </div>
            </div>
          )}

          {/* Route & Balance Summary Card */}
          <div className="p-4 bg-surface border border-color rounded-xl flex items-center justify-between gap-3 text-xs w-full">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary block mb-0.5">
                Sede Origen
              </span>
              <span className="font-bold text-primary text-sm truncate block">{sourceBranch?.name || 'Origen'}</span>
              <div className="text-secondary text-xs mt-0.5 whitespace-nowrap">
                Disp: <strong className="text-primary">{sourceBranchStock}</strong> ➔ Queda:{' '}
                <strong className={resultingSourceStock < 0 ? 'text-danger-600' : 'text-primary'}>
                  {resultingSourceStock}
                </strong>
                {selectedColor && sourceColorStock !== null && (
                  <span className="block text-[11px] text-secondary font-medium mt-0.5">
                    {selectedColor}: <strong>{sourceColorStock}</strong> ➔ Queda:{' '}
                    <strong className={resultingSourceColorStock === 0 ? 'text-amber-600 font-bold' : 'text-primary'}>
                      {resultingSourceColorStock}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            <div className="inline-flex items-center justify-center shrink-0 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold text-xs gap-2 border border-primary-300 dark:border-primary-700 whitespace-nowrap shadow-xs">
              <span>{transferQty} {transferQty === 1 ? 'unid.' : 'unids.'}</span>
              <ArrowRight size={14} className="shrink-0" />
            </div>

            <div className="flex-1 min-w-0 text-right">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary block mb-0.5">
                Sede Destino
              </span>
              <span className="font-bold text-primary text-sm truncate block">{destBranch?.name || 'Destino'}</span>
              <div className="text-secondary text-xs mt-0.5 whitespace-nowrap">
                Actual: <strong className="text-secondary">{targetBranchStock}</strong> ➔ Queda:{' '}
                <strong className="text-emerald-600 font-bold">{resultingDestStock}</strong>
                {selectedColor && targetColorStock !== null && (
                  <span className="block text-[11px] text-emerald-600 font-semibold mt-0.5">
                    {selectedColor}: <strong>{targetColorStock}</strong> ➔ Queda:{' '}
                    <strong className="font-bold">{resultingTargetColorStock}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. CANTIDAD Y DÍAS ESTIMADOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label font-bold mb-0">Cantidad a Traspasar</label>
                {maxAvailableStock > 0 && (
                  <button
                    type="button"
                    onClick={() => setTransferQty(maxAvailableStock)}
                    className="text-xs text-primary-600 hover:underline font-semibold"
                  >
                    Máximo: {maxAvailableStock} unid.{selectedColor ? ` (${selectedColor})` : ''}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTransferQty((q) => Math.max(1, q - 1))}
                  className="btn btn-secondary px-3 py-2 shrink-0 font-bold"
                  disabled={maxAvailableStock <= 0}
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  min="1"
                  max={maxAvailableStock > 0 ? maxAvailableStock : 1}
                  className="form-control font-bold text-center text-sm"
                  value={transferQty}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setTransferQty(maxAvailableStock > 0 ? Math.min(maxAvailableStock, Math.max(1, val)) : Math.max(1, val));
                  }}
                  disabled={maxAvailableStock <= 0}
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setTransferQty((q) => (maxAvailableStock > 0 ? Math.min(maxAvailableStock, q + 1) : q + 1))
                  }
                  className="btn btn-secondary px-3 py-2 shrink-0 font-bold"
                  disabled={maxAvailableStock <= 0 || transferQty >= maxAvailableStock}
                >
                  <Plus size={14} />
                </button>
              </div>
              {maxAvailableStock > 0 && transferQty > maxAvailableStock && (
                <span className="text-[11px] text-danger-600 font-semibold mt-0.5 block">
                  ⚠ Excede el stock disponible {selectedColor ? `para la variante ${selectedColor}` : 'en sede'} ({maxAvailableStock} unid.)
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label font-bold flex items-center gap-1 mb-1">
                <Clock size={13} className="text-primary-600" />
                Tiempo Estimado de Entrega
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  className="form-control font-bold text-sm"
                  value={estimatedDays}
                  onChange={(e) => setEstimatedDays(Math.max(1, parseInt(e.target.value) || 1))}
                  required
                />
                <span className="text-xs font-medium text-secondary shrink-0">días hábiles</span>
              </div>
            </div>
          </div>

          {/* 4. MOTIVO U OBSERVACIÓN */}
          <div className="form-group space-y-1.5">
            <label className="form-label font-bold mb-0">Motivo u Observación del Traspaso</label>
            <textarea
              className="form-control text-xs"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Reabastecimiento urgente por venta pendiente en mostrador"
            />
            {/* Motivo suggestions */}
            <div className="flex gap-1.5 flex-wrap items-center pt-1">
              <span className="text-xs font-semibold text-secondary flex items-center gap-1">
                <Sparkles size={12} className="text-primary-600 dark:text-primary-400" />
                Sugerencias:
              </span>
              {[
                'Reabastecimiento por falta de stock en sede',
                'Solicitud urgente por venta en mostrador',
                'Balance y redistribución de inventario',
                'Exhibición y vitrina',
              ].map((chip) => (
                <SuggestionChip
                  key={chip}
                  label={chip}
                  selected={reason === chip}
                  onClick={() => setReason(chip)}
                  size="xs"
                />
              ))}
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex justify-end gap-3 pt-4 border-t border-color">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={isSubmitting}
              icon={<ArrowRightLeft size={16} />}
              disabled={maxAvailableStock <= 0 || transferQty > maxAvailableStock || isSubmitting}
            >
              Confirmar y Registrar Traspaso
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
