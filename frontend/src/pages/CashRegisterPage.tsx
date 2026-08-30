import React, { useState } from 'react';
import { CreditCard, ArrowDownRight, ArrowUpRight, Lock, Unlock, DollarSign, Plus } from 'lucide-react';
import { PageHeader, Button, Badge, Card, DataTable, Modal } from '../components/ui';
import { useBranch } from '../context/BranchContext';
import { auditService } from '../lib/db-services';
import { getActiveTenantId } from '../lib/supabase';
import Swal from 'sweetalert2';

interface Movement {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  reason: string;
  time: string;
}

export default function CashRegisterPage() {
  const { activeBranchId, activeBranch } = useBranch();
  const [isOpen, setIsOpen] = useState(true);
  const [openingAmount, setOpeningAmount] = useState(0.00);

  const getStorageKey = () => `ventasbv_cash_movs_${getActiveTenantId() || 'global'}_${activeBranchId || 'main'}`;

  const [movements, setMovements] = useState<Movement[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`ventasbv_cash_movs_${getActiveTenantId() || 'global'}_${activeBranchId || 'main'}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movType, setMovType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [movAmount, setMovAmount] = useState<string>('');
  const [movReason, setMovReason] = useState<string>('');

  const totalIncome = movements.filter(m => m.type === 'INCOME').reduce((a, m) => a + m.amount, 0);
  const totalExpense = movements.filter(m => m.type === 'EXPENSE').reduce((a, m) => a + m.amount, 0);
  const expectedTotal = openingAmount + totalIncome - totalExpense;

  const branchName = activeBranchId === 'ALL' ? 'Todas las Sedes' : (activeBranch?.name || 'Sede Principal');

  const handleToggleCash = async () => {
    if (isOpen) {
      // Close cash
      const result = await Swal.fire({
        title: '¿Cerrar Turno de Caja?',
        text: `Se cerrará la caja con un saldo esperado de S/ ${expectedTotal.toFixed(2)} PEN.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, Cerrar Caja',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ef4444',
      });

      if (result.isConfirmed) {
        setIsOpen(false);
        auditService.logAction({
          action: 'CIERRE CAJA',
          entityType: 'cash_registers',
          branchId: activeBranchId && activeBranchId !== 'ALL' ? activeBranchId : undefined,
          description: `Cierre de turno de caja chica en ${branchName}. Saldo final: S/ ${expectedTotal.toFixed(2)} (Ingresos: S/ ${totalIncome.toFixed(2)}, Egresos: S/ ${totalExpense.toFixed(2)})`,
          details: {
            opening_amount: openingAmount,
            total_income: totalIncome,
            total_expense: totalExpense,
            final_amount: expectedTotal,
            branch_name: branchName,
          },
        });
        Swal.fire({ title: 'Caja Cerrada', text: 'El turno de caja fue cerrado correctamente.', icon: 'success', timer: 2000, showConfirmButton: false });
      }
    } else {
      // Open cash
      const { value: amountStr } = await Swal.fire({
        title: 'Apertura de Turno de Caja',
        text: 'Ingrese el monto inicial en efectivo:',
        input: 'number',
        inputValue: '200.00',
        inputAttributes: { step: '0.01', min: '0' },
        showCancelButton: true,
        confirmButtonText: 'Abrir Caja',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
      });

      if (amountStr !== undefined && amountStr !== null) {
        const val = parseFloat(amountStr) || 0;
        setOpeningAmount(val);
        setIsOpen(true);
        setMovements([]);
        localStorage.setItem(getStorageKey(), JSON.stringify([]));
        auditService.logAction({
          action: 'APERTURA CAJA',
          entityType: 'cash_registers',
          branchId: activeBranchId && activeBranchId !== 'ALL' ? activeBranchId : undefined,
          description: `Apertura de turno de caja chica en ${branchName} con saldo inicial de S/ ${val.toFixed(2)}`,
          details: {
            opening_amount: val,
            branch_name: branchName,
          },
        });
        Swal.fire({ title: 'Caja Abierta', text: `Turno de caja aperturado con S/ ${val.toFixed(2)}.`, icon: 'success', timer: 2000, showConfirmButton: false });
      }
    }
  };

  const handleRegisterMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(movAmount);
    if (!amountNum || amountNum <= 0 || !movReason.trim()) {
      Swal.fire('Atención', 'Ingrese un monto y motivo válidos.', 'warning');
      return;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newMov: Movement = {
      id: `mov-${Date.now()}`,
      type: movType,
      amount: amountNum,
      reason: movReason.trim(),
      time: timeStr,
    };

    const updatedList = [newMov, ...movements];
    setMovements(updatedList);
    localStorage.setItem(getStorageKey(), JSON.stringify(updatedList));
    setIsModalOpen(false);

    auditService.logAction({
      action: 'MOVIMIENTO CAJA',
      entityType: 'cash_movements',
      branchId: activeBranchId && activeBranchId !== 'ALL' ? activeBranchId : undefined,
      description: `${movType === 'INCOME' ? 'Ingreso de efectivo' : 'Egreso de efectivo'} de S/ ${amountNum.toFixed(2)} en caja chica (${branchName}). Motivo: "${movReason.trim()}"`,
      details: {
        movement_type: movType,
        amount: amountNum,
        reason: movReason.trim(),
        branch_name: branchName,
      },
    });

    setMovAmount('');
    setMovReason('');
    Swal.fire({ title: 'Registrado', text: 'Movimiento de caja registrado exitosamente.', icon: 'success', timer: 1500, showConfirmButton: false });
  };

  const columns = [
    { key: 'time', header: 'Hora', render: (r: Movement) => <span className="text-xs text-secondary font-mono">{r.time}</span> },
    {
      key: 'type',
      header: 'Tipo',
      render: (r: Movement) => (
        <Badge variant={r.type === 'INCOME' ? 'success' : 'danger'} className="font-bold">
          {r.type === 'INCOME' ? <ArrowDownRight size={12} className="inline mr-1" /> : <ArrowUpRight size={12} className="inline mr-1" />}
          {r.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
        </Badge>
      )
    },
    { key: 'reason', header: 'Concepto / Motivo', render: (r: Movement) => <span className="text-sm font-medium">{r.reason}</span> },
    { key: 'amount', header: 'Monto', render: (r: Movement) => <span className={`font-bold ${r.type === 'INCOME' ? 'text-success-600' : 'text-danger-600'}`}>S/ {r.amount.toFixed(2)}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caja Chica y Turno de Caja"
        subtitle={`Control de apertura, cierre de turno e ingresos/egresos de efectivo • ${branchName}`}
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(true)}
              disabled={!isOpen}
            >
              <Plus size={16} className="mr-1.5 inline" />
              Nuevo Movimiento
            </Button>
            <Button variant={isOpen ? 'danger' : 'primary'} onClick={handleToggleCash}>
              {isOpen ? <Lock size={16} className="mr-1.5 inline" /> : <Unlock size={16} className="mr-1.5 inline" />}
              {isOpen ? 'Cerrar Caja' : 'Abrir Caja'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-primary-50 dark:bg-primary-950/20 border-primary-200 dark:border-primary-800">
          <div className="text-xs text-primary-700 dark:text-primary-400 font-semibold mb-1">Monto de Apertura</div>
          <div className="text-2xl font-bold text-primary-900 dark:text-primary-100">S/ {openingAmount.toFixed(2)}</div>
        </Card>
        <Card className="p-4 bg-success-50/50 dark:bg-emerald-950/20 border-success-200 dark:border-emerald-800">
          <div className="text-xs text-success-700 dark:text-emerald-400 font-semibold mb-1">Total Ingresos</div>
          <div className="text-2xl font-bold text-success-600 dark:text-emerald-300">+S/ {totalIncome.toFixed(2)}</div>
        </Card>
        <Card className="p-4 bg-danger-50/50 dark:bg-rose-950/20 border-danger-200 dark:border-rose-800">
          <div className="text-xs text-danger-700 dark:text-rose-400 font-semibold mb-1">Total Egresos</div>
          <div className="text-2xl font-bold text-danger-600 dark:text-rose-300">-S/ {totalExpense.toFixed(2)}</div>
        </Card>
        <Card className="p-4 bg-accent-50 dark:bg-amber-950/20 border-accent-200 dark:border-amber-800">
          <div className="text-xs text-accent-800 dark:text-amber-400 font-semibold mb-1">Efectivo Esperado</div>
          <div className="text-2xl font-bold text-accent-700 dark:text-amber-300">S/ {expectedTotal.toFixed(2)}</div>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={movements}
        searchPlaceholder="Buscar concepto o motivo..."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Movimiento de Caja"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleRegisterMovement}>Registrar</Button>
          </>
        }
      >
        <form onSubmit={handleRegisterMovement} className="space-y-4">
          <div>
            <label className="form-label">Tipo de Movimiento</label>
            <select
              className="form-control"
              value={movType}
              onChange={(e) => setMovType(e.target.value as any)}
            >
              <option value="INCOME">Ingreso (Entrada de efectivo)</option>
              <option value="EXPENSE">Egreso (Salida / Gasto)</option>
            </select>
          </div>
          <div>
            <label className="form-label">Monto (PEN)</label>
            <input
              type="number"
              step="0.1"
              className="form-control"
              placeholder="0.00"
              value={movAmount}
              onChange={(e) => setMovAmount(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="form-label">Concepto o Justificación</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej. Pago de movilidad urgente..."
              value={movReason}
              onChange={(e) => setMovReason(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
