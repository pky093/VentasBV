import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, DollarSign, Calendar, Layers, Check, ShoppingBag, RefreshCw, Wallet, Clock, CheckCircle, Sliders, Paperclip, Upload, Download, FileText } from 'lucide-react';
import { PageHeader, Button, Card, CardBody, StatCard, Modal, Badge } from '../components/ui';
import { expensesService, Expense } from '../lib/db-services';
import Swal from 'sweetalert2';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'FIXED' | 'VARIABLE'>('ALL');
  
  // Capital & Modal states
  const [capital, setCapital] = useState<number>(() => expensesService.getCapital());
  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
  const [capitalInput, setCapitalInput] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Expense | null>(null);
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

  // Capital Update Handler
  const handleSaveCapital = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(capitalInput);
    if (isNaN(val) || val < 0) {
      alert('Por favor ingrese un monto de capital válido.');
      return;
    }
    expensesService.setCapital(val);
    setCapital(val);
    setIsCapitalModalOpen(false);
    showNotification('Capital operativo actualizado a ' + formatMoney(val));
  };

  const openCapitalModal = () => {
    setCapitalInput(String(capital));
    setIsCapitalModalOpen(true);
  };

  // Handle File Upload for Voucher/Comprobante
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo no debe superar los 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        voucherUrl: result,
        voucherName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

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
      voucherUrl: formData.voucherUrl,
      voucherName: formData.voucherName,
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
        showNotification('Gasto registrado correctamente');
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
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
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
      voucherUrl: undefined,
      voucherName: undefined,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (expense: Expense) => {
    setFormData(expense);
    setIsModalOpen(true);
  };

  // Date & Capital Calculations
  const todayStr = new Date().toISOString().split('T')[0];

  // Executed expenses (expenseDate <= todayStr) -> Deducted from Capital
  const executedTotal = expenses
    .filter(e => e.expenseDate <= todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  // Scheduled expenses (expenseDate > todayStr) -> Pending deduction on date
  const scheduledTotal = expenses
    .filter(e => e.expenseDate > todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  const availableCapital = capital - executedTotal;
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
        title="Gastos Operativos & Control de Capital"
        subtitle="Control de egresos fijos y variables con fondos descontados según su fecha de vencimiento"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={<Sliders size={16} />} onClick={openCapitalModal}>
              Configurar Capital ({formatMoney(capital)})
            </Button>
            <Button variant="primary" icon={<Plus size={18} />} onClick={openAddModal}>
              Registrar Gasto
            </Button>
          </div>
        }
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-fadeIn">
          <Check size={16} /> {toastMessage}
        </div>
      )}

      {/* Summary Stats Grid (Capital & Expenses breakdown) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="CAPITAL DISPONIBLE" 
          value={formatMoney(availableCapital)} 
          icon={<Wallet size={20} />} 
          variant={availableCapital >= 0 ? 'success' : 'danger'} 
          trend={`Base: ${formatMoney(capital)} | Descontado: ${formatMoney(executedTotal)}`}
        />
        <StatCard 
          title="GASTOS EJECUTADOS" 
          value={formatMoney(executedTotal)} 
          icon={<CheckCircle size={20} />} 
          variant="primary" 
          trend="Descontados del capital (fechas <= hoy)"
        />
        <StatCard 
          title="GASTOS PROGRAMADOS" 
          value={formatMoney(scheduledTotal)} 
          icon={<Clock size={20} />} 
          variant="warning" 
          trend="Se descontarán al llegar su fecha"
        />
        <StatCard 
          title="GASTOS TOTALES" 
          value={formatMoney(totalExpenses)} 
          icon={<Layers size={20} />} 
          variant="primary" 
          trend={`Fijos: ${formatMoney(fixedTotal)} | Var: ${formatMoney(variableTotal)}`}
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
                    <th className="p-3">Fecha de Pago</th>
                    <th className="p-3">Descripción</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Frecuencia</th>
                    <th className="p-3 text-center">Estado del Descuento</th>
                    <th className="p-3 text-center">Comprobante / Voucher</th>
                    <th className="p-3 text-right">Monto</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => {
                    const isExecuted = expense.expenseDate <= todayStr;
                    return (
                      <tr key={expense.id} className="border-b border-color hover:bg-app/10 transition-colors text-xs font-medium">
                        <td className="p-3 text-secondary">
                          <div className="flex items-center gap-1.5 font-mono">
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
                        <td className="p-3 text-center">
                          {isExecuted ? (
                            <Badge variant="success" className="font-semibold text-xs">
                              <CheckCircle size={12} className="inline mr-1" /> Descontado de Capital
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="font-semibold text-xs">
                              <Clock size={12} className="inline mr-1" /> Programado ({expense.expenseDate})
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {expense.voucherUrl ? (
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<Paperclip size={13} />}
                              onClick={() => setSelectedVoucher(expense)}
                            >
                              Ver Voucher
                            </Button>
                          ) : (
                            <span className="opacity-40 text-xs">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-extrabold text-sm text-primary font-mono">
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Capital Modal */}
      <Modal
        isOpen={isCapitalModalOpen}
        onClose={() => setIsCapitalModalOpen(false)}
        title="Configurar Capital Operativo Base"
      >
        <form onSubmit={handleSaveCapital} className="space-y-5 py-1">
          <p className="text-xs text-secondary font-normal leading-relaxed">
            El Capital Operativo es el fondo del negocio del cual se descuentan automáticamente los gastos ejecutados. 
            Los gastos programados a futuro se descontarán únicamente al cumplir su fecha de vencimiento.
          </p>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-primary">
              Monto de Capital Base (S/)
            </label>
            <input
              type="number"
              step="0.01"
              required
              min="0"
              className="form-control w-full py-2.5 px-3.5 text-sm font-bold font-mono"
              value={capitalInput}
              onChange={(e) => setCapitalInput(e.target.value)}
              placeholder="Ej. 10000.00"
            />
          </div>

          <div className="border border-color rounded-xl p-4 space-y-3 text-xs">
            <div className="flex justify-between items-center text-secondary font-medium">
              <span>Capital Base Declarado:</span>
              <strong className="text-primary font-mono text-sm">
                {formatMoney(parseFloat(capitalInput) || 0)}
              </strong>
            </div>

            <div className="flex justify-between items-center text-danger-600 font-medium">
              <span>Gastos Descontados (&le; hoy):</span>
              <strong className="font-mono text-sm">
                - {formatMoney(executedTotal)}
              </strong>
            </div>

            <div className="pt-2.5 border-t border-color flex justify-between items-center font-bold text-sm">
              <span className="text-primary">Capital Disponible Resultante:</span>
              <span className={`font-mono text-sm ${((parseFloat(capitalInput) || 0) - executedTotal) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {formatMoney((parseFloat(capitalInput) || 0) - executedTotal)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-5 border-t border-color mt-6">
            <Button variant="secondary" onClick={() => setIsCapitalModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Guardar Capital
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={formData.id ? 'Editar Gasto Operativo' : 'Registrar Gasto Operativo'}
      >
        <form onSubmit={handleSubmit} className="space-y-5 py-1 text-xs font-semibold">
          <div className="space-y-1.5">
            <label className="block text-secondary font-bold">Descripción del Gasto</label>
            <input
              type="text"
              required
              placeholder="Ej. Pago de planilla, Compra de herramientas..."
              className="form-control w-full font-medium py-2.5 px-3.5"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-secondary font-bold">Tipo de Gasto</label>
              <select
                className="form-control w-full py-2.5 px-3"
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

            <div className="space-y-1.5">
              <label className="block text-secondary font-bold">Frecuencia / Recurrencia</label>
              <select
                className="form-control w-full py-2.5 px-3"
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
            <div className="space-y-1.5">
              <label className="block text-secondary font-bold">Monto (S/)</label>
              <input
                type="number"
                step="0.01"
                required
                min="0.01"
                className="form-control w-full font-medium font-mono py-2.5 px-3.5"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-secondary font-bold">Fecha de Pago Programada</label>
              <input
                type="date"
                required
                className="form-control w-full font-medium font-mono py-2.5 px-3.5"
                value={formData.expenseDate || ''}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
              />
            </div>
          </div>

          {/* Voucher / Attachment Input */}
          <div className="space-y-2 mt-5 mb-5">
            <label className="block text-secondary font-bold text-xs">
              Comprobante / Voucher Adjunto (Opcional - Imagen o PDF)
            </label>
            {formData.voucherUrl ? (
              <div className="flex items-center justify-between p-3 border border-color rounded-xl bg-surface shadow-2xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Paperclip size={15} className="text-primary shrink-0" />
                  <span className="text-xs font-mono truncate text-primary font-bold">
                    {formData.voucherName || 'Comprobante_Adjunto'}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-danger-600 hover:text-danger-700 text-xs font-bold px-2 py-1"
                  onClick={() => setFormData({ ...formData, voucherUrl: undefined, voucherName: undefined })}
                >
                  Quitar Archivo
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-3.5 border border-dashed border-color rounded-xl cursor-pointer hover:bg-app/10 transition-colors text-xs text-secondary font-medium">
                <Upload size={16} />
                <span>Adjuntar Comprobante o Voucher (JPG, PNG, PDF)</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>

          <div className="border border-color rounded-xl p-4 text-xs text-secondary space-y-2 mt-5 mb-6">
            <div className="font-bold text-primary flex items-center gap-1.5">
              <Clock size={14} /> Control de Descuento por Fecha:
            </div>
            {formData.expenseDate && formData.expenseDate <= todayStr ? (
              <span className="text-success-600 font-semibold block leading-relaxed">
                La fecha es hoy o anterior: Se descontará de inmediato del Capital al guardar.
              </span>
            ) : (
              <span className="text-warning-600 font-semibold block leading-relaxed">
                La fecha es posterior a hoy ({formData.expenseDate}): Se registrará como "Programado" y se descontará del Capital automáticamente cuando llegue esa fecha.
              </span>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-5 border-t border-color mt-6">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {formData.id ? 'Guardar Cambios' : 'Registrar Gasto'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Voucher Viewer Modal */}
      <Modal
        isOpen={!!selectedVoucher}
        onClose={() => setSelectedVoucher(null)}
        title={`Comprobante / Voucher: ${selectedVoucher?.description || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs p-3 border border-color rounded-xl bg-app/20">
            <div>
              <span className="text-secondary block">Fecha del Gasto: <strong className="text-primary font-mono">{selectedVoucher?.expenseDate}</strong></span>
              <span className="font-bold text-primary block">Monto: <strong className="text-primary font-mono">{selectedVoucher ? formatMoney(selectedVoucher.amount) : ''}</strong></span>
            </div>
            {selectedVoucher?.voucherUrl && (
              <a
                href={selectedVoucher.voucherUrl}
                download={selectedVoucher.voucherName || 'comprobante_voucher.pdf'}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary btn-sm flex items-center gap-1.5"
              >
                <Download size={14} /> Descargar Archivo
              </a>
            )}
          </div>

          <div className="border border-color rounded-xl overflow-hidden min-h-[300px] flex items-center justify-center bg-surface p-2">
            {selectedVoucher?.voucherUrl?.startsWith('data:application/pdf') || selectedVoucher?.voucherName?.endsWith('.pdf') ? (
              <iframe
                src={selectedVoucher.voucherUrl}
                className="w-full h-[500px] border-none rounded-lg"
                title="Vista previa PDF"
              />
            ) : (
              <img
                src={selectedVoucher?.voucherUrl}
                alt="Comprobante Voucher"
                className="max-h-[500px] w-auto object-contain mx-auto rounded-lg shadow-sm"
              />
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
