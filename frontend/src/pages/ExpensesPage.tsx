import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, DollarSign, Calendar, Layers, Check, ShoppingBag, RefreshCw } from 'lucide-react';
import { PageHeader, Button, Card, CardBody, StatCard, Modal, Badge } from '../components/ui';
import { expensesService, Expense } from '../lib/db-services';
import Swal from 'sweetalert2';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'FIXED' | 'VARIABLE'>('ALL');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Expense>>({
    description: '',
    expenseType: 'FIXED',
    frequency: 'MONTHLY',
    amount: 0,
    expenseDate: new Date().toISOString().split('T')[0],
  });

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadExpenses = () => {
    setIsLoading(true);
    expensesService.getExpenses().then((data) => {
      setExpenses(data);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  // Handler for form submit (Create/Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description?.trim() || !formData.amount || formData.amount <= 0) {
      alert('Por favor complete la descripción y un monto válido.');
      return;
    }

    const payload = {
      description: formData.description,
      expenseType: formData.expenseType || 'FIXED',
      frequency: formData.expenseType === 'FIXED' ? (formData.frequency || 'MONTHLY') : 'ONCE',
      amount: Number(formData.amount),
      expenseDate: formData.expenseDate || new Date().toISOString().split('T')[0],
    };

    if (formData.id) {
      // Update
      const success = await expensesService.updateExpense(formData.id, payload);
      if (success) {
        setExpenses(expenses.map(e => e.id === formData.id ? { ...e, ...payload } : e));
        showNotification('Gasto actualizado correctamente');
      }
    } else {
      // Create
      const created = await expensesService.createExpense(payload);
      if (created) {
        setExpenses([created, ...expenses]);
        showNotification('Gasto registrado y guardado en Supabase');
      }
    }
    setIsModalOpen(false);
  };

  // Handler for delete
  const handleDelete = (id: string, description: string) => {
    Swal.fire({
      title: '¿Está seguro de eliminar este gasto?',
      html: `Esta acción eliminará de forma permanente el gasto <strong style="color: var(--danger-600); font-weight: 700;">"${description}"</strong>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626', // matches var(--danger-600)
      cancelButtonColor: '#64748b',  // matches var(--neutral-500)
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      customClass: {
        popup: 'rounded-2xl border border-color shadow-xl',
        confirmButton: 'btn btn-danger font-semibold px-4 py-2 text-sm',
        cancelButton: 'btn btn-secondary font-semibold px-4 py-2 text-sm',
      },
      buttonsStyling: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        const success = await expensesService.deleteExpense(id);
        if (success) {
          setExpenses(expenses.filter(e => e.id !== id));
          showNotification('Gasto eliminado de la base de datos');
        }
      }
    });
  };

  const openAddModal = () => {
    setFormData({
      description: '',
      expenseType: 'FIXED',
      frequency: 'MONTHLY',
      amount: 0,
      expenseDate: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (expense: Expense) => {
    setFormData(expense);
    setIsModalOpen(true);
  };

  // Math totals
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const fixedTotal = expenses.filter(e => e.expenseType === 'FIXED').reduce((sum, e) => sum + e.amount, 0);
  const variableTotal = expenses.filter(e => e.expenseType === 'VARIABLE').reduce((sum, e) => sum + e.amount, 0);

  // Filter list
  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || e.expenseType === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatMoney = (amount: number) => {
    return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div>
      <PageHeader
        title="Gastos Operativos"
        subtitle="Control, registro y desglose de egresos fijos y variables del negocio"
        action={
          <Button variant="primary" icon={<Plus size={18} />} onClick={openAddModal}>
            Registrar Gasto
          </Button>
        }
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-fadeIn">
          <Check size={16} /> {toastMessage}
        </div>
      )}

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard 
          title="Gastos Totales" 
          value={formatMoney(totalExpenses)} 
          icon={<DollarSign />} 
          variant="primary" 
          trend="Total egresos de operaciones"
        />
        <StatCard 
          title="Gastos Fijos" 
          value={formatMoney(fixedTotal)} 
          icon={<Layers />} 
          variant="success" 
          trend="Costos recurrentes (Planilla, Alquiler, etc.)"
        />
        <StatCard 
          title="Gastos Variables" 
          value={formatMoney(variableTotal)} 
          icon={<ShoppingBag />} 
          variant="warning" 
          trend="Costos por eventos o demanda (Repuestos, etc.)"
        />
      </div>

      {/* Filter and Table Card */}
      <Card>
        <CardBody>
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
            <div className="header-search flex-1 w-full sm:max-w-xs">
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar gasto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <select 
                className="form-control text-xs font-semibold"
                style={{ width: 'auto', minWidth: '140px', padding: '0.45rem 2rem 0.45rem 0.75rem' }}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
              >
                <option value="ALL">Todos los Tipos</option>
                <option value="FIXED">Gastos Fijos</option>
                <option value="VARIABLE">Gastos Variables</option>
              </select>
              <Button 
                variant="secondary" 
                onClick={loadExpenses} 
                disabled={isLoading} 
                size="sm"
                icon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
              >
                Sincronizar
              </Button>
            </div>
          </div>

          {/* Expenses Table */}
          {isLoading ? (
            <div className="py-12 text-center text-sm text-secondary">
              Cargando gastos desde Supabase...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="py-12 text-center text-sm text-secondary">
              No se encontraron gastos registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-color text-xs text-secondary font-bold bg-app/20">
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Descripción</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Frecuencia</th>
                    <th className="p-3 text-right">Monto</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-color hover:bg-app/10 transition-colors text-xs font-medium">
                      <td className="p-3 text-secondary">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="opacity-60" />
                          {expense.expenseDate}
                        </div>
                      </td>
                      <td className="p-3 font-bold text-primary">{expense.description}</td>
                      <td className="p-3">
                        {expense.expenseType === 'FIXED' ? (
                          <Badge variant="success">Fijo</Badge>
                        ) : (
                          <Badge variant="warning">Variable</Badge>
                        )}
                      </td>
                      <td className="p-3 text-secondary">
                        {expense.expenseType === 'FIXED' ? (
                          <span className="font-semibold text-secondary">
                            {expense.frequency === 'MONTHLY' ? 'Mensual' :
                             expense.frequency === 'WEEKLY' ? 'Semanal' :
                             expense.frequency === 'YEARLY' ? 'Anual' : expense.frequency}
                          </span>
                        ) : (
                          <span className="opacity-40">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-extrabold text-sm text-primary">
                        {formatMoney(expense.amount)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            className="icon-btn icon-btn-sm btn-action-edit border-none"
                            title="Editar Gasto"
                            onClick={() => openEditModal(expense)}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="icon-btn icon-btn-sm btn-action-danger border-none"
                            title="Eliminar Gasto"
                            onClick={() => handleDelete(expense.id, expense.description)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Add / Edit Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={formData.id ? 'Editar Gasto Operativo' : 'Registrar Gasto Operativo'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-secondary mb-1">Descripción del Gasto</label>
            <input
              type="text"
              required
              placeholder="Ej. Pago de planilla, Compra de herramientas..."
              className="form-control w-full font-medium"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-secondary mb-1">Tipo de Gasto</label>
              <select
                className="form-control w-full"
                value={formData.expenseType || 'FIXED'}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  expenseType: e.target.value as any,
                  frequency: e.target.value === 'FIXED' ? 'MONTHLY' : 'ONCE'
                })}
              >
                <option value="FIXED">Fijo</option>
                <option value="VARIABLE">Variable</option>
              </select>
            </div>

            <div>
              <label className="block text-secondary mb-1">Frecuencia / Recurrencia</label>
              <select
                className="form-control w-full"
                disabled={formData.expenseType === 'VARIABLE'}
                value={formData.frequency || 'MONTHLY'}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              >
                {formData.expenseType === 'FIXED' ? (
                  <>
                    <option value="MONTHLY">Mensual</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="YEARLY">Anual</option>
                    <option value="ONCE">Una vez</option>
                  </>
                ) : (
                  <option value="ONCE">No aplica (Variable)</option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-secondary mb-1">Monto (S/)</label>
              <input
                type="number"
                step="0.01"
                required
                min="0.01"
                className="form-control w-full font-medium"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-secondary mb-1">Fecha del Gasto</label>
              <input
                type="date"
                required
                className="form-control w-full font-medium"
                value={formData.expenseDate || ''}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-color mt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {formData.id ? 'Guardar Cambios' : 'Registrar Gasto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
