import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Edit3, Trash2, Calendar, Layers, Check, RefreshCw, 
  Wallet, Clock, CheckCircle, Sliders, Paperclip, Upload, Download, 
  FileSpreadsheet, AlertCircle, FileUp, Tag, CheckCheck
} from 'lucide-react';
import { PageHeader, Button, Card, CardBody, StatCard, Modal, Badge } from '../components/ui';
import { expensesService, Expense, ExpenseCategory } from '../lib/db-services';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

export const EXPENSE_CATEGORIES: { 
  id: ExpenseCategory; 
  label: string; 
  variant: 'info' | 'success' | 'primary' | 'warning' | 'danger' | 'neutral';
  desc: string;
}[] = [
  { 
    id: 'PRODUCTO', 
    label: 'PRODUCTO', 
    variant: 'info',
    desc: 'Compras de mercadería, reposición de stock, insumos y fletes de producto'
  },
  { 
    id: 'COMERCIAL', 
    label: 'COMERCIAL', 
    variant: 'success',
    desc: 'Publicidad en redes, marketing, eventos comerciales y comisiones'
  },
  { 
    id: 'PERSONAL', 
    label: 'PERSONAL', 
    variant: 'primary',
    desc: 'Retiros personales, gastos de dueños o socios'
  },
  { 
    id: 'TRABAJADOR', 
    label: 'TRABAJADOR', 
    variant: 'warning',
    desc: 'Planillas, sueldos, jornales, adelantos, refrigerios y beneficios'
  },
  { 
    id: 'DEUDA', 
    label: 'DEUDA', 
    variant: 'danger',
    desc: 'Amortización de préstamos bancarios, cuotas financieras e intereses'
  },
  { 
    id: 'OTROS', 
    label: 'OTROS', 
    variant: 'neutral',
    desc: 'Servicios básicos (luz/agua/internet), alquiler de local, útiles y varios'
  },
];

interface ParsedExpenseRow {
  description: string;
  category: ExpenseCategory;
  expenseType: 'FIXED' | 'VARIABLE';
  frequency: string;
  amount: number;
  expenseDate: string;
  isValid: boolean;
  errors: string[];
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'FIXED' | 'VARIABLE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ExpenseCategory>('ALL');
  
  // Capital & Modal states
  const [capital, setCapital] = useState<number>(() => expensesService.getCapital());
  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
  const [capitalInput, setCapitalInput] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Expense | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Expense>>({
    description: '',
    category: 'OTROS',
    expenseType: 'FIXED',
    frequency: 'MONTHLY',
    amount: 0,
    expenseDate: new Date().toISOString().split('T')[0],
  });

  // Import Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedExpenseRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      description: formData.description.trim(),
      category: formData.category || 'OTROS',
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
      category: 'OTROS',
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

  // --- EXCEL TEMPLATE DOWNLOAD GENERATOR ---
  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Ventas B&V';
      workbook.created = new Date();

      // Sheet 1: Plantilla de Gastos
      const sheet = workbook.addWorksheet('Plantilla Gastos', {
        views: [{ showGridLines: true }]
      });

      sheet.columns = [
        { header: 'Descripción', key: 'description', width: 38 },
        { header: 'Categoría', key: 'category', width: 22 },
        { header: 'Tipo', key: 'expenseType', width: 16 },
        { header: 'Frecuencia', key: 'frequency', width: 20 },
        { header: 'Monto', key: 'amount', width: 18 },
        { header: 'Fecha de Pago', key: 'expenseDate', width: 20 },
      ];

      // Format Header Row
      const headerRow = sheet.getRow(1);
      headerRow.height = 30;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '1E293B' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: '94A3B8' } },
          bottom: { style: 'medium', color: { argb: '0F172A' } },
          left: { style: 'thin', color: { argb: '94A3B8' } },
          right: { style: 'thin', color: { argb: '94A3B8' } },
        };
      });

      // Sample Data Rows to guide the user
      const sampleRows = [
        {
          description: 'Pago de alquiler de local comercial',
          category: 'OTROS',
          expenseType: 'FIJO',
          frequency: 'MENSUAL',
          amount: 1500.00,
          expenseDate: new Date().toISOString().split('T')[0],
        },
        {
          description: 'Campaña publicitaria Facebook Ads y TikTok',
          category: 'COMERCIAL',
          expenseType: 'VARIABLE',
          frequency: 'UNA VEZ',
          amount: 450.00,
          expenseDate: new Date().toISOString().split('T')[0],
        },
        {
          description: 'Planilla de sueldo mensual - Vendedor',
          category: 'TRABAJADOR',
          expenseType: 'FIJO',
          frequency: 'MENSUAL',
          amount: 1200.00,
          expenseDate: new Date().toISOString().split('T')[0],
        },
        {
          description: 'Compra de mercadería y repuestos de reposición',
          category: 'PRODUCTO',
          expenseType: 'VARIABLE',
          frequency: 'UNA VEZ',
          amount: 3200.00,
          expenseDate: new Date().toISOString().split('T')[0],
        },
        {
          description: 'Cuota de amortización préstamo bancario BCP',
          category: 'DEUDA',
          expenseType: 'FIJO',
          frequency: 'MENSUAL',
          amount: 850.00,
          expenseDate: new Date().toISOString().split('T')[0],
        },
        {
          description: 'Retiro personal para gastos familiares',
          category: 'PERSONAL',
          expenseType: 'VARIABLE',
          frequency: 'UNA VEZ',
          amount: 600.00,
          expenseDate: new Date().toISOString().split('T')[0],
        },
      ];

      sampleRows.forEach((item, index) => {
        const row = sheet.addRow(item);
        row.height = 24;
        
        const isEven = index % 2 === 0;
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 10, color: { argb: '1E293B' } };
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'center' };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isEven ? 'F8FAFC' : 'FFFFFF' },
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } },
          };

          // Currency format for amount
          if (colNumber === 5) {
            cell.numFmt = '"S/ " #,##0.00';
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
          }
        });
      });

      // Sheet 2: Guía de Valores Aceptados (Instrucciones)
      const guideSheet = workbook.addWorksheet('Instrucciones y Valores', {
        views: [{ showGridLines: true }]
      });

      guideSheet.columns = [
        { header: 'Campo', key: 'field', width: 22 },
        { header: 'Opciones / Valores Permitidos', key: 'options', width: 45 },
        { header: 'Obligatorio', key: 'required', width: 16 },
        { header: 'Descripción y Ejemplos', key: 'desc', width: 55 },
      ];

      const guideHeader = guideSheet.getRow(1);
      guideHeader.height = 28;
      guideHeader.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      const guideRows = [
        { field: 'Descripción', options: 'Texto libre (Ej. Pago de luz local sur)', required: 'SÍ', desc: 'Nombre claro o detalle del egreso' },
        { field: 'Categoría', options: 'PRODUCTO | COMERCIAL | PERSONAL | TRABAJADOR | DEUDA | OTROS', required: 'SÍ', desc: 'Rubro para clasificar y organizar el egreso' },
        { field: 'Tipo', options: 'FIJO | VARIABLE', required: 'SÍ', desc: 'Fijo (recurrente) o Variable (gasto puntual o único)' },
        { field: 'Frecuencia', options: 'MENSUAL | SEMANAL | ANUAL | UNA VEZ', required: 'Opcional (si es Fijo)', desc: 'Periodicidad del gasto si es de tipo FIJO' },
        { field: 'Monto', options: 'Número positivo (Ej. 150.50)', required: 'SÍ', desc: 'Importe en Soles sin símbolos extraños' },
        { field: 'Fecha de Pago', options: 'YYYY-MM-DD (Ej. 2026-09-15)', required: 'SÍ', desc: 'Fecha programada o ejecutada del gasto' },
      ];

      guideRows.forEach(row => {
        const r = guideSheet.addRow(row);
        r.height = 22;
        r.eachCell(cell => {
          cell.font = { name: 'Arial', size: 9 };
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } },
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Plantilla_Gastos_Operativos.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      showNotification('Plantilla descargada correctamente');
    } catch (error) {
      console.error('Error generando plantilla Excel:', error);
      alert('Error al generar la plantilla de Excel.');
    }
  };

  // --- PARSE IMPORTED EXCEL FILE ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setIsParsing(true);
    setParsedRows([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rawRows.length === 0) {
        alert('El archivo no contiene filas de datos.');
        setIsParsing(false);
        return;
      }

      const parsed: ParsedExpenseRow[] = [];

      rawRows.forEach((row, index) => {
        const rowKeys = Object.keys(row);
        
        const findVal = (patterns: string[]) => {
          for (const key of rowKeys) {
            const cleanKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            for (const p of patterns) {
              if (cleanKey.includes(p)) return row[key];
            }
          }
          return undefined;
        };

        const rawDesc = String(findVal(['descrip', 'gasto', 'detalle', 'concepto', 'motivo']) || '').trim();
        const rawCategory = String(findVal(['categ', 'rubro', 'clasif']) || '').trim().toUpperCase();
        const rawType = String(findVal(['tipo']) || '').trim().toUpperCase();
        const rawFreq = String(findVal(['frecuen', 'recurren', 'period']) || '').trim().toUpperCase();
        const rawAmount = findVal(['monto', 'importe', 'total', 'precio', 'costo', 'valor']);
        const rawDate = findVal(['fecha', 'date', 'pago']);

        const errors: string[] = [];

        // Validate Description
        if (!rawDesc) {
          errors.push('Descripción vacía');
        }

        // Validate & Normalize Category
        let category: ExpenseCategory = 'OTROS';
        const cleanCat = rawCategory.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        if (cleanCat.includes('PROD')) category = 'PRODUCTO';
        else if (cleanCat.includes('COMER') || cleanCat.includes('PUBLI') || cleanCat.includes('MARKET')) category = 'COMERCIAL';
        else if (cleanCat.includes('PERSO') || cleanCat.includes('SOCIO') || cleanCat.includes('DUEÑ') || cleanCat.includes('DUEN')) category = 'PERSONAL';
        else if (cleanCat.includes('TRABAJ') || cleanCat.includes('SUELD') || cleanCat.includes('PLANIL') || cleanCat.includes('EMPLEA') || cleanCat.includes('NOMINA')) category = 'TRABAJADOR';
        else if (cleanCat.includes('DEUD') || cleanCat.includes('PREST') || cleanCat.includes('BANC') || cleanCat.includes('CREDIT')) category = 'DEUDA';
        else category = 'OTROS';

        // Validate & Normalize Expense Type
        let expenseType: 'FIXED' | 'VARIABLE' = 'VARIABLE';
        if (rawType.includes('FIJ') || rawType.includes('FIX')) {
          expenseType = 'FIXED';
        } else {
          expenseType = 'VARIABLE';
        }

        // Validate & Normalize Frequency
        let frequency = 'ONCE';
        if (expenseType === 'FIXED') {
          if (rawFreq.includes('SEM')) frequency = 'WEEKLY';
          else if (rawFreq.includes('ANU')) frequency = 'YEARLY';
          else if (rawFreq.includes('UNA')) frequency = 'ONCE';
          else frequency = 'MONTHLY';
        }

        // Validate & Normalize Amount
        let numAmount = 0;
        if (typeof rawAmount === 'number') {
          numAmount = rawAmount;
        } else if (typeof rawAmount === 'string') {
          const cleanedStr = rawAmount.replace(/[^0-9.-]+/g, '');
          numAmount = parseFloat(cleanedStr);
        }
        if (isNaN(numAmount) || numAmount <= 0) {
          errors.push('Monto inválido o cero');
        }

        // Validate & Normalize Date
        let dateStr = new Date().toISOString().split('T')[0];
        if (rawDate) {
          if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
            dateStr = rawDate.toISOString().split('T')[0];
          } else if (typeof rawDate === 'string' && rawDate.trim()) {
            const trimmed = rawDate.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
              dateStr = trimmed;
            } else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(trimmed)) {
              const parts = trimmed.split(/[/-]/);
              const day = parts[0].padStart(2, '0');
              const month = parts[1].padStart(2, '0');
              const year = parts[2];
              dateStr = `${year}-${month}-${day}`;
            } else {
              const parsedDate = new Date(trimmed);
              if (!isNaN(parsedDate.getTime())) {
                dateStr = parsedDate.toISOString().split('T')[0];
              }
            }
          }
        }

        parsed.push({
          description: rawDesc || `Gasto fila #${index + 2}`,
          category,
          expenseType,
          frequency,
          amount: isNaN(numAmount) ? 0 : numAmount,
          expenseDate: dateStr,
          isValid: errors.length === 0,
          errors,
        });
      });

      setParsedRows(parsed);
    } catch (err) {
      console.error('Error parseando archivo Excel:', err);
      alert('Error al leer el archivo Excel. Asegúrese de que sea un archivo válido (.xlsx, .xls, .csv).');
    } finally {
      setIsParsing(false);
    }
  };

  // Submit bulk imported rows to DB
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('No hay filas válidas para importar.');
      return;
    }

    setIsSubmittingImport(true);

    try {
      const payloadList = validRows.map(r => ({
        description: r.description,
        category: r.category,
        expenseType: r.expenseType,
        frequency: r.frequency,
        amount: r.amount,
        expenseDate: r.expenseDate,
      }));

      const res = await expensesService.createManyExpenses(payloadList);

      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: '¡Importación Exitosa!',
          text: `Se han importado y registrado correctamente ${res.count} gastos operativos.`,
          confirmButtonColor: '#059669',
          customClass: {
            popup: 'rounded-2xl border border-color shadow-xl',
          },
        });

        // Add to state and reset modal
        setExpenses(prev => [...res.items, ...prev]);
        setIsImportModalOpen(false);
        setParsedRows([]);
        setImportFileName(null);
      } else {
        alert('Hubo un inconveniente al guardar los gastos. Por favor reintente.');
      }
    } catch (err) {
      console.error('Error confirming import:', err);
      alert('Error al procesar la importación.');
    } finally {
      setIsSubmittingImport(false);
    }
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

  // Filter list with Search, Type Filter and Category Filter
  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || e.expenseType === typeFilter;
    const matchesCategory = categoryFilter === 'ALL' || (e.category || 'OTROS') === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  const formatMoney = (amount: number) => {
    return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper to render Category Badge using standard UI Badge component
  const renderCategoryBadge = (catId?: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.id === catId) || EXPENSE_CATEGORIES.find(c => c.id === 'OTROS')!;
    return (
      <Badge variant={cat.variant}>
        {cat.label}
      </Badge>
    );
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;
  const totalImportAmount = parsedRows.filter(r => r.isValid).reduce((sum, r) => sum + r.amount, 0);

  return (
    <div>
      <PageHeader
        title="Gastos Operativos & Control de Capital"
        subtitle="Control de egresos fijos y variables clasificados por rubro con fondos descontados según su fecha de pago"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="outline" 
              icon={<Download size={15} />} 
              onClick={handleDownloadTemplate}
              title="Descargar formato oficial en Excel con filas de ejemplo"
            >
              Plantilla Excel
            </Button>
            <Button 
              variant="outline" 
              icon={<FileUp size={15} />} 
              onClick={() => {
                setParsedRows([]);
                setImportFileName(null);
                setIsImportModalOpen(true);
              }}
              title="Importar lista masiva de gastos desde un archivo Excel"
            >
              Importar Excel
            </Button>
            <Button 
              variant="secondary" 
              icon={<Sliders size={15} />} 
              onClick={openCapitalModal}
            >
              Configurar Capital ({formatMoney(capital)})
            </Button>
            <Button 
              variant="primary" 
              icon={<Plus size={16} />} 
              onClick={openAddModal}
            >
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

      {/* Summary Stats Grid */}
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
          trend="Descontados del capital"
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
          <div className="flex flex-col lg:flex-row gap-3 justify-between items-center mb-6">
            <div className="header-search flex-1 w-full lg:max-w-md">
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar gasto por descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-end items-center">
              {/* Category Filter */}
              <select 
                className="form-control text-xs font-semibold py-2 px-3"
                style={{ width: 'auto', minWidth: '150px' }}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
              >
                <option value="ALL">Todas las Categorías</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>

              {/* Type Filter */}
              <select 
                className="form-control text-xs font-semibold py-2 px-3"
                style={{ width: 'auto', minWidth: '130px' }}
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
              No se encontraron gastos registrados con los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-color text-xs text-secondary font-bold bg-app/20">
                    <th className="p-3">Fecha de Pago</th>
                    <th className="p-3">Descripción</th>
                    <th className="p-3">Categoría / Rubro</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Frecuencia</th>
                    <th className="p-3 text-center">Estado del Descuento</th>
                    <th className="p-3 text-center">Voucher</th>
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
                          {renderCategoryBadge(expense.category)}
                        </td>
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
                              <CheckCircle size={12} className="inline mr-1" /> Descontado
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

      {/* --- IMPORT EXCEL MODAL --- */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          if (!isSubmittingImport) {
            setIsImportModalOpen(false);
            setParsedRows([]);
            setImportFileName(null);
          }
        }}
        title="Importar Gastos Operativos desde Excel"
        size="lg"
      >
        <div className="space-y-5 py-1 text-xs">
          {/* Header Banner & Download action */}
          <div className="p-4 border border-color rounded-2xl bg-primary-50/50 dark:bg-primary-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-primary" />
                Carga masiva con formato estructurado
              </h4>
              <p className="text-xs text-secondary mt-1">
                Puedes subir un archivo <strong>.xlsx</strong>, <strong>.xls</strong> o <strong>.csv</strong> con tus egresos.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={14} />}
              onClick={handleDownloadTemplate}
              className="shrink-0 font-bold"
            >
              Descargar Formato
            </Button>
          </div>

          {/* Upload Dropzone */}
          <div className="space-y-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".xlsx,.xls,.csv" 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-color hover:border-primary rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-app/20 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/40 text-primary flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <FileUp size={24} />
              </div>
              <p className="font-bold text-sm text-primary">
                {importFileName ? importFileName : 'Haz clic aquí para seleccionar tu archivo Excel'}
              </p>
              <p className="text-secondary text-xs mt-1">
                Compatible con columnas: Descripción, Categoría, Tipo, Frecuencia, Monto y Fecha
              </p>
            </div>
          </div>

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="py-8 text-center text-secondary flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-primary" />
              <span>Analizando y validando filas del archivo...</span>
            </div>
          )}

          {/* Parsed Rows Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap justify-between items-center bg-app/30 p-3 rounded-xl border border-color gap-2">
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="text-secondary">Filas leídas: <strong className="text-primary">{parsedRows.length}</strong></span>
                  <span className="text-success-600 font-bold flex items-center gap-1">
                    <CheckCheck size={14} /> {validCount} Válidas
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-danger-600 font-bold flex items-center gap-1">
                      <AlertCircle size={14} /> {invalidCount} con errores
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-primary">
                  Importe Total Válido: <span className="font-mono text-sm text-success-600 font-extrabold">{formatMoney(totalImportAmount)}</span>
                </div>
              </div>

              <div className="max-h-[260px] overflow-y-auto border border-color rounded-xl">
                <table className="table w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-surface shadow-2xs">
                    <tr className="border-b border-color text-secondary font-bold">
                      <th className="p-2.5">Estado</th>
                      <th className="p-2.5">Descripción</th>
                      <th className="p-2.5">Categoría</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5 text-right">Monto</th>
                      <th className="p-2.5">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className={`border-b border-color ${row.isValid ? 'hover:bg-app/10' : 'bg-rose-50/40 dark:bg-rose-950/20'}`}
                      >
                        <td className="p-2.5">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-success-600 font-bold text-[11px]">
                              <CheckCircle size={13} /> Listo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-danger-600 font-bold text-[11px]" title={row.errors.join(', ')}>
                              <AlertCircle size={13} /> {row.errors[0]}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-semibold text-primary">{row.description}</td>
                        <td className="p-2.5">{renderCategoryBadge(row.category)}</td>
                        <td className="p-2.5">
                          {row.expenseType === 'FIXED' ? (
                            <Badge variant="success">Fijo</Badge>
                          ) : (
                            <Badge variant="warning">Variable</Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-primary">
                          {formatMoney(row.amount)}
                        </td>
                        <td className="p-2.5 text-secondary font-mono">{row.expenseDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-color mt-4">
            <Button 
              variant="secondary" 
              onClick={() => {
                setIsImportModalOpen(false);
                setParsedRows([]);
                setImportFileName(null);
              }}
              disabled={isSubmittingImport}
            >
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              onClick={handleConfirmImport}
              disabled={validCount === 0 || isSubmittingImport}
              icon={isSubmittingImport ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            >
              {isSubmittingImport ? 'Importando...' : `Confirmar e Importar (${validCount} Gastos)`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- CAPITAL MODAL --- */}
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

      {/* --- ADD / EDIT EXPENSE MODAL --- */}
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
              placeholder="Ej. Pago de alquiler de local, Campaña de redes, Planilla..."
              className="form-control w-full font-medium py-2.5 px-3.5"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category / Rubro Field */}
            <div className="space-y-1.5">
              <label className="block text-secondary font-bold">
                Categoría / Rubro de Gasto
              </label>
              <select
                className="form-control w-full py-2.5 px-3 font-bold text-xs"
                value={formData.category || 'OTROS'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-secondary font-normal block leading-tight">
                {EXPENSE_CATEGORIES.find(c => c.id === (formData.category || 'OTROS'))?.desc}
              </span>
            </div>

            {/* Type */}
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
                <option value="FIXED">Fijo (Recurrente)</option>
                <option value="VARIABLE">Variable (Puntual / Único)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Frequency */}
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

            {/* Amount */}
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

      {/* --- VOUCHER VIEWER MODAL --- */}
      <Modal
        isOpen={!!selectedVoucher}
        onClose={() => setSelectedVoucher(null)}
        title={`Comprobante / Voucher: ${selectedVoucher?.description || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs p-3 border border-color rounded-xl bg-app/20">
            <div>
              <span className="text-secondary block">Categoría: <strong>{selectedVoucher?.category || 'OTROS'}</strong></span>
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
