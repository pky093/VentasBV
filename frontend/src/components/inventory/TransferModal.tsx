import React, { useState, useEffect } from 'react';
import {
  ArrowRightLeft,
  Building2,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Plus,
  Minus,
  Layers,
  Check,
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
  const [transferQty, setTransferQty] = useState<number>(1);
  const [estimatedDays, setEstimatedDays] = useState<number>(2);
  const [reason, setReason] = useState<string>('Reabastecimiento por falta de stock en sede');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || preselectedProduct || products[0];

  useEffect(() => {
    if (isOpen) {
      const initialProd = preselectedProduct || products[0];
      if (initialProd) {
        setSelectedProductId(initialProd.id);
      }

      const activeTargetId = targetBranchId && targetBranchId !== 'ALL' ? targetBranchId : branches[0]?.id || '';
      setDestBranchId(activeTargetId);

      // Find source branch that has stock
      if (initialProd?.branchStocks) {
        const branchWithStock = initialProd.branchStocks.find(
          (bs) => bs.branchId !== activeTargetId && bs.stock > 0
        );
        if (branchWithStock) {
          setSourceBranchId(branchWithStock.branchId);
        } else {
          const defaultSource = branches.find((b) => b.id !== activeTargetId)?.id || branches[0]?.id || '';
          setSourceBranchId(defaultSource);
        }
      } else {
        const defaultSource = branches.find((b) => b.id !== activeTargetId)?.id || branches[0]?.id || '';
        setSourceBranchId(defaultSource);
      }

      setTransferQty(1);
      setEstimatedDays(2);
      setReason('Reabastecimiento por falta de stock en sede');
    }
  }, [isOpen, preselectedProduct, targetBranchId, branches, products]);

  // Source and target branch stock for selected product
  const sourceBranchStock = selectedProduct?.branchStocks?.find((bs) => bs.branchId === sourceBranchId)?.stock ?? 0;
  const targetBranchStock = selectedProduct?.branchStocks?.find((bs) => bs.branchId === destBranchId)?.stock ?? 0;
  const resultingDestStock = targetBranchStock + (Number(transferQty) || 0);

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod?.branchStocks) {
      const branchWithStock = prod.branchStocks.find((bs) => bs.branchId !== destBranchId && bs.stock > 0);
      if (branchWithStock) {
        setSourceBranchId(branchWithStock.branchId);
      }
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      Swal.fire('Atención', 'Selecciona un producto válido.', 'warning');
      return;
    }

    if (!sourceBranchId || !destBranchId) {
      Swal.fire('Atención', 'Debes seleccionar la sede de origen y la sede de destino.', 'warning');
      return;
    }

    if (sourceBranchId === destBranchId) {
      Swal.fire('Atención', 'La sede de origen y destino deben ser diferentes.', 'warning');
      return;
    }

    if (transferQty <= 0) {
      Swal.fire('Atención', 'Ingresa una cantidad mayor a 0.', 'warning');
      return;
    }

    if (sourceBranchStock < transferQty) {
      Swal.fire(
        'Stock Insuficiente',
        `La sede de origen solo cuenta con ${sourceBranchStock} unidades disponibles de "${selectedProduct.name}".`,
        'warning'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const sourceBranch = branches.find((b) => b.id === sourceBranchId);
      const destBranch = branches.find((b) => b.id === destBranchId);

      const ok = await inventoryService.registerTransfer({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        sourceBranchId,
        sourceBranchName: sourceBranch?.name || 'Sede Origen',
        targetBranchId: destBranchId,
        targetBranchName: destBranch?.name || 'Sede Destino',
        qty: Number(transferQty),
        estimatedDays: Number(estimatedDays),
        reason,
      });

      if (ok) {
        Swal.fire({
          title: '¡Traspaso Programado!',
          html: `
            <div style="text-align:center; padding: 4px;">
              <p style="font-size:14px; margin-bottom:8px;">Se programó el traslado de <b>${transferQty} unid.</b> de <b>${selectedProduct.name}</b></p>
              <div style="display:inline-flex; align-items:center; gap:8px; background:var(--bg-surface-hover); padding:6px 14px; border-radius:10px; border:1px solid var(--border-color); font-size:12px; font-weight:bold;">
                <span>${sourceBranch?.name}</span>
                <span style="color:var(--primary-600); font-size:16px;">➔</span>
                <span>${destBranch?.name}</span>
              </div>
              <p style="font-size:12px; color:var(--text-secondary); margin-top:10px;">Tiempo estimado de llegada: <b>${estimatedDays} día(s)</b></p>
            </div>
          `,
          icon: 'success',
          timer: 3000,
          showConfirmButton: false,
        });
        onClose();
        if (onSuccess) onSuccess();
      } else {
        Swal.fire('Error', 'Error al registrar el traspaso en la base de datos.', 'error');
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
      title="Solicitar / Programar Traspaso entre Sedes"
      size="lg"
    >
      <form onSubmit={handleTransferSubmit} className="space-y-4">
        {/* 1. SELECCIÓN DE PRODUCTO */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-primary flex items-center gap-1.5">
              <Package size={15} className="text-primary-600" />
              Producto a Traspasar
            </label>
            <span className="text-[11px] font-medium text-secondary">
              Stock Total: <strong className="text-primary font-bold">{selectedProduct?.stock ?? 0} unid.</strong>
            </span>
          </div>
          <select
            className="form-control text-xs sm:text-sm font-medium"
            value={selectedProductId}
            onChange={(e) => handleProductChange(e.target.value)}
            required
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code ? `[${p.code}] ` : ''}{p.name} {p.brand ? `• ${p.brand}` : ''} (Stock: {p.stock})
              </option>
            ))}
          </select>
          {/* Sede Stock Breakdown list as simple inline text */}
          {selectedProduct?.branchStocks && selectedProduct.branchStocks.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-secondary pt-0.5">
              <span className="font-semibold text-secondary flex items-center gap-1">
                <Building2 size={12} className="text-primary-600" /> Por sede:
              </span>
              {selectedProduct.branchStocks.map((bs) => (
                <span
                  key={bs.branchId}
                  className={`px-1.5 py-0.5 rounded text-[10.5px] font-medium ${
                    bs.branchId === sourceBranchId
                      ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-bold border border-primary-200 dark:border-primary-800'
                      : 'bg-surface-hover text-secondary'
                  }`}
                >
                  {bs.branchName}: <strong className="font-mono">{bs.stock} unid.</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 2. SEDES DE ORIGEN Y DESTINO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* ORIGIN BRANCH */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-primary flex items-center justify-between">
              <span>Sede Origen (Salida)</span>
              <span className="text-[11px] font-medium text-primary-600 font-mono">
                Disp: {sourceBranchStock} unid.
              </span>
            </label>
            <select
              className="form-control text-xs font-medium"
              value={sourceBranchId}
              onChange={(e) => setSourceBranchId(e.target.value)}
              required
            >
              {branches.map((b) => {
                const bs = selectedProduct?.branchStocks?.find((s) => s.branchId === b.id)?.stock ?? 0;
                return (
                  <option key={b.id} value={b.id} disabled={b.id === destBranchId}>
                    {b.name} ({bs} disponibles)
                  </option>
                );
              })}
            </select>
          </div>

          {/* DESTINATION BRANCH */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-primary flex items-center justify-between">
              <span>Sede Destino (Ingreso)</span>
              <span className="text-[11px] font-medium text-secondary font-mono">
                Actual: {targetBranchStock} ➔ <strong className="text-primary-600">{resultingDestStock}</strong>
              </span>
            </label>
            <select
              className="form-control text-xs font-medium"
              value={destBranchId}
              onChange={(e) => setDestBranchId(e.target.value)}
              required
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} disabled={b.id === sourceBranchId}>
                  {b.name} {b.id === sourceBranchId ? '(Origen actual)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. CANTIDAD Y DÍAS ESTIMADOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-primary">Cantidad a Traspasar</label>
              {sourceBranchStock > 0 && (
                <button
                  type="button"
                  onClick={() => setTransferQty(sourceBranchStock)}
                  className="text-[10.5px] text-primary-600 hover:underline font-semibold"
                >
                  Máx: {sourceBranchStock} unid.
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTransferQty((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-lg border border-border-color bg-surface hover:bg-surface-hover flex items-center justify-center text-primary font-bold active:scale-95 transition-transform shrink-0"
              >
                <Minus size={15} />
              </button>
              <input
                type="number"
                min="1"
                max={sourceBranchStock > 0 ? sourceBranchStock : 9999}
                className="form-control font-bold text-center text-sm"
                value={transferQty}
                onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value) || 1))}
                required
              />
              <button
                type="button"
                onClick={() =>
                  setTransferQty((q) => (sourceBranchStock > 0 ? Math.min(sourceBranchStock, q + 1) : q + 1))
                }
                className="w-9 h-9 rounded-lg border border-border-color bg-surface hover:bg-surface-hover flex items-center justify-center text-primary font-bold active:scale-95 transition-transform shrink-0"
              >
                <Plus size={15} />
              </button>
            </div>
            {sourceBranchStock > 0 && transferQty > sourceBranchStock && (
              <span className="text-[11px] text-danger-600 font-semibold mt-0.5 block">
                ⚠ Excede el stock disponible en la sede de origen ({sourceBranchStock} unid.)
              </span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-primary flex items-center gap-1">
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
            <span className="text-[10.5px] text-secondary block">
              Tiempo estimado de traslado para seguimiento.
            </span>
          </div>
        </div>

        {/* 4. MOTIVO U OBSERVACIÓN */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-primary">Motivo u Observación del Traspaso</label>
          <textarea
            className="form-control text-xs"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. Reabastecimiento urgente por venta pendiente en mostrador"
          />
          {/* Motivo suggestions */}
          <div className="flex gap-1.5 flex-wrap items-center pt-1">
            <span className="text-[11px] font-semibold text-secondary flex items-center gap-1">
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
        <div className="flex justify-end gap-2.5 pt-3 border-t border-border-color">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={isSubmitting}
            icon={<ArrowRightLeft size={15} />}
            disabled={sourceBranchStock <= 0 || transferQty > sourceBranchStock}
          >
            Confirmar y Registrar Traspaso
          </Button>
        </div>
      </form>
    </Modal>
  );
};
