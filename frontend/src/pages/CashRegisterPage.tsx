import React, { useState } from 'react';
import { CreditCard, ArrowDownRight, ArrowUpRight, Lock, Unlock, DollarSign } from 'lucide-react';
import { PageHeader, Button, Badge, Card, CardHeader, CardBody, DataTable, Modal } from '../components/ui';

interface Movement {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  reason: string;
  time: string;
}

export default function CashRegisterPage() {
  const [isOpen, setIsOpen] = useState(true);
  const [openingAmount] = useState(200.00);

  const [movements] = useState<Movement[]>([
    { id: '1', type: 'INCOME', amount: 650.00, reason: 'Venta V-000104 en efectivo', time: '15:40' },
    { id: '2', type: 'EXPENSE', amount: 35.00, reason: 'Pago de flete local urgente', time: '13:10' },
    { id: '3', type: 'INCOME', amount: 95.00, reason: 'Venta V-000102 en efectivo', time: '12:25' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalIncome = movements.filter(m => m.type === 'INCOME').reduce((a, m) => a + m.amount, 0);
  const totalExpense = movements.filter(m => m.type === 'EXPENSE').reduce((a, m) => a + m.amount, 0);
  const expectedTotal = openingAmount + totalIncome - totalExpense;

  const columns = [
    { key: 'time', header: 'Hora', render: (r: Movement) => <span className="text-xs text-secondary">{r.time}</span> },
    {
      key: 'type',
      header: 'Tipo',
      render: (r: Movement) => (
        <Badge variant={r.type === 'INCOME' ? 'success' : 'danger'}>
          {r.type === 'INCOME' ? <ArrowDownRight size={12} className="inline mr-1" /> : <ArrowUpRight size={12} className="inline mr-1" />}
          {r.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
        </Badge>
      )
    },
    { key: 'reason', header: 'Concepto / Motivo', render: (r: Movement) => <span className="text-sm">{r.reason}</span> },
    { key: 'amount', header: 'Monto', render: (r: Movement) => <span className={`font-bold ${r.type === 'INCOME' ? 'text-success-600' : 'text-danger-600'}`}>S/ {r.amount.toFixed(2)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Caja Chica y Turno de Caja"
        subtitle="Control de apertura, cierre de turno e ingresos/egresos de efectivo"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
              Nuevo Movimiento
            </Button>
            <Button variant={isOpen ? 'danger' : 'primary'} onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <Lock size={16} className="mr-1.5 inline" /> : <Unlock size={16} className="mr-1.5 inline" />}
              {isOpen ? 'Cerrar Caja' : 'Abrir Caja'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="p-4 bg-primary-50 border-primary-200">
          <div className="text-xs text-primary-700 font-semibold mb-1">Monto de Apertura</div>
          <div className="text-2xl font-bold text-primary-900">S/ {openingAmount.toFixed(2)}</div>
        </Card>
        <Card className="p-4 bg-success-50/50 border-success-200">
          <div className="text-xs text-success-700 font-semibold mb-1">Total Ingresos</div>
          <div className="text-2xl font-bold text-success-600">+S/ {totalIncome.toFixed(2)}</div>
        </Card>
        <Card className="p-4 bg-danger-50/50 border-danger-200">
          <div className="text-xs text-danger-700 font-semibold mb-1">Total Egresos</div>
          <div className="text-2xl font-bold text-danger-600">-S/ {totalExpense.toFixed(2)}</div>
        </Card>
        <Card className="p-4 bg-accent-50 border-accent-200">
          <div className="text-xs text-accent-800 font-semibold mb-1">Efectivo Esperado</div>
          <div className="text-2xl font-bold text-accent-700">S/ {expectedTotal.toFixed(2)}</div>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={movements}
        searchPlaceholder="Buscar concepto..."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Movimiento de Caja"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsModalOpen(false)}>Registrar</Button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label className="form-label">Tipo de Movimiento</label>
            <select className="form-control">
              <option value="INCOME">Ingreso (Entrada de efectivo)</option>
              <option value="EXPENSE">Egreso (Salida / Gasto)</option>
            </select>
          </div>
          <div>
            <label className="form-label">Monto (PEN)</label>
            <input type="number" step="0.1" className="form-control" placeholder="0.00" required />
          </div>
          <div>
            <label className="form-label">Concepto o Justificación</label>
            <input type="text" className="form-control" placeholder="Ej. Pago de movilidad..." required />
          </div>
        </form>
      </Modal>
    </div>
  );
}
