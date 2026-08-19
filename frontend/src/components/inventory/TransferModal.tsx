import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Building2, Package, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Modal, Button } from '../ui';
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

  // Source branch stock for selected product
  const sourceBranchStock = selectedProduct?.branchStocks?.find((bs) => bs.branchId === sourceBranchId)?.stock ?? 0;
  const targetBranchStock = selectedProduct?.branchStocks?.find((bs) => bs.branchId === destBranchId)?.stock ?? 0;

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
      alert('Selecciona un producto válido.');
      return;
    }

    if (!sourceBranchId || !destBranchId) {
      alert('Debes seleccionar la sede de origen y la sede de destino.');
      return;
    }

    if (sourceBranchId === destBranchId) {
      alert('La sede de origen y destino deben ser diferentes.');
      return;
    }

    if (transferQty <= 0) {
      alert('Ingresa una cantidad mayor a 0.');
      return;
    }

    if (sourceBranchStock < transferQty) {
      alert(`La sede de origen solo cuenta con ${sourceBranchStock} unidades disponibles.`);
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
          html: `Se han traspasado <b>${transferQty} unid.</b> de <b>${selectedProduct.name}</b> desde <b>${sourceBranch?.name}</b> hacia <b>${destBranch?.name}</b>.<br/><br/><span class="text-xs text-blue-600 font-bold">Tiempo estimado de entrega: ${estimatedDays} día(s)</span>`,
          icon: 'success',
          confirmButtonColor: '#2563eb',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
        });
        onClose();
        if (onSuccess) onSuccess();
      } else {
        alert('Error al registrar el traspaso en la base de datos.');
      }
    } catch (err) {
      console.error('Error enviando traspaso:', err);
      alert('Ocurrió un error inesperado al procesar el traspaso.');
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
      <form onSubmit={handleTransferSubmit} className="space-y-5">
        {/* PRODUCT SELECTOR */}
        <div className="form-group">
          <label className="form-label font-bold flex items-center gap-1.5">
            <Package size={16} className="text-primary-600" /> Producto a Traspasar
          </label>
          <select
            className="form-control"
            value={selectedProductId}
            onChange={(e) => handleProductChange(e.target.value)}
            required
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name} ({p.brand})
              </option>
            ))}
          </select>
        </div>

        {/* BRANCH STOCKS BREAKDOWN BANNER */}
        {selectedProduct?.branchStocks && selectedProduct.branchStocks.length > 0 && (
          <div className="p-3 bg-surface/70 border border-color rounded-xl">
            <div className="text-xs font-bold text-secondary mb-2 flex items-center gap-1">
              <Building2 size={14} /> Stock actual por Sede:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {selectedProduct.branchStocks.map((bs) => (
                <div
                  key={bs.branchId}
                  className={`p-2 rounded-lg text-xs border ${
                    bs.stock > 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <div className="font-bold truncate">{bs.branchName}</div>
                  <div className="font-mono text-sm">{bs.stock} unid.</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ORIGIN & TARGET BRANCH SELECTORS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label font-bold text-xs">Sede Origen (Provee Stock)</label>
            <select
              className="form-control text-xs font-semibold"
              value={sourceBranchId}
              onChange={(e) => setSourceBranchId(e.target.value)}
              required
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} disabled={b.id === destBranchId}>
                  🏬 {b.name} {b.id === destBranchId ? '(Destino actual)' : ''}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block font-semibold">
              Disponible en origen: {sourceBranchStock} unid.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label font-bold text-xs">Sede Destino (Recibe Stock)</label>
            <select
              className="form-control text-xs font-semibold"
              value={destBranchId}
              onChange={(e) => setDestBranchId(e.target.value)}
              required
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} disabled={b.id === sourceBranchId}>
                  🏬 {b.name} {b.id === sourceBranchId ? '(Origen actual)' : ''}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-secondary mt-1 block">
              Stock actual en destino: {targetBranchStock} unid.
            </span>
          </div>
        </div>

        {/* QUANTITY & ESTIMATED DAYS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label font-bold text-xs">Cantidad a Traspasar</label>
            <input
              type="number"
              min="1"
              max={sourceBranchStock > 0 ? sourceBranchStock : 9999}
              className="form-control font-bold"
              value={transferQty}
              onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value) || 1))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label font-bold text-xs flex items-center gap-1">
              <Clock size={14} className="text-primary-600" /> Días Estimados para la Entrega
            </label>
            <input
              type="number"
              min="1"
              max="30"
              className="form-control font-bold text-primary-600"
              value={estimatedDays}
              onChange={(e) => setEstimatedDays(Math.max(1, parseInt(e.target.value) || 1))}
              placeholder="Ej. 2 días"
              required
            />
            <span className="text-[11px] text-secondary mt-1 block">
              Indica al cliente o vendedor el tiempo de llegada estimado.
            </span>
          </div>
        </div>

        {/* REASON / NOTES */}
        <div className="form-group">
          <label className="form-label font-bold text-xs">Motivo u Observación del Traspaso</label>
          <textarea
            className="form-control text-xs"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. Solicitud urgente por venta pendiente en mostrador"
          />
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
      <Button
        variant="primary"
        type="submit"
        loading={isSubmitting}
        icon={<ArrowRightLeft size={16} />}
      >
        Confirmar y Registrar Traspaso
      </Button>
        </div>
      </form>
    </Modal>
  );
};
