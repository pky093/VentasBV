import React, { useState, useEffect } from 'react';
import { Printer, Edit3, Eye, FileText, User, Car, DollarSign, Shield, MessageCircle } from 'lucide-react';
import { Modal, Button, Tabs } from '../ui';
import type { VehicleContract } from '../../lib/contracts-service';
import { settingsService, catalogService, Category, Brand, Model } from '../../lib/db-services';
import { supabase } from '../../lib/supabase';
import Swal from 'sweetalert2';

export interface VehicleContractModalProps {
  contract: VehicleContract | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (contract: Partial<VehicleContract>) => void;
  initialMode?: 'VIEW' | 'EDIT';
}

export const VehicleContractModal: React.FC<VehicleContractModalProps> = ({
  contract,
  isOpen,
  onClose,
  onSave,
  initialMode = 'VIEW',
}) => {
  const [mode, setMode] = useState<'VIEW' | 'EDIT'>(initialMode);
  const [formData, setFormData] = useState<Partial<VehicleContract>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [companyInfo, setCompanyInfo] = useState({
    name: typeof window !== 'undefined' ? (localStorage.getItem('tenant_name') || 'GRUPO K CONTRERAS S.A.C') : 'GRUPO K CONTRERAS S.A.C',
    tradeName: typeof window !== 'undefined' ? (localStorage.getItem('tenant_name') || 'GRUPO K CONTRERAS S.A.C') : 'GRUPO K CONTRERAS S.A.C',
    ruc: typeof window !== 'undefined' ? (localStorage.getItem('tenant_ruc') || '20613639030') : '20613639030',
    address: 'Retamas',
    phone: '+51 993 275 893',
    logo_path: '',
    signature_path: '',
  });

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      if (contract) {
        setFormData({ ...contract });
      } else {
        const today = new Date().toISOString().split('T')[0];
        setFormData({
          contractNumber: '000158',
          docType: 'CONTRATO',
          vehicleType: 'MOTOCICLETA',
          date: today,
          customerName: '',
          customerDocType: 'DNI',
          customerDoc: '',
          customerAddress: '',
          customerPhone: '',
          maritalStatus: 'SOLTERO',
          brand: 'BAJAJ',
          model: '',
          color: '',
          cylinderCapacity: '',
          dua: '',
          item: '01',
          engineNumber: '',
          chassisNumber: '',
          totalPrice: 0,
          downPayment: 0,
          balance: 0,
          paymentMethodDetail: '',
          dueDate: today,
          balanceReason: '',
          notaryLegalization: 'SI_20',
          observations: 'En caso de desistimiento de la compra, se aplicará penalidad según contrato.',
          status: 'VIGENTE',
        });
      }

      settingsService.getTenantInfo().then((info) => {
        if (info && Object.keys(info).length > 0) {
          setCompanyInfo({
            name: info.legal_name || info.name || 'GRUPO K CONTRERAS S.A.C',
            tradeName: info.trade_name || info.name || 'GRUPO K CONTRERAS S.A.C',
            ruc: info.ruc || '20613639030',
            address: info.address || 'Retamas',
            phone: info.phone || '+51 993 275 893',
            logo_path: info.logo_path || '',
            signature_path: info.signature_path || '',
          });
        }
      });

      catalogService.getCategories().then((cats) => {
        setCategories(cats.filter((c) => c.active !== false));
      });
      catalogService.getBrands().then((brs) => {
        setBrands(brs.filter((b) => b.active !== false));
      });
      catalogService.getModels().then((mdls) => {
        setModels(mdls.filter((m) => m.active !== false));
      });
    }
  }, [isOpen, contract, initialMode]);

  const handlePriceChange = (total: number, down: number) => {
    const bal = Math.max(total - down, 0);
    setFormData((prev) => ({
      ...prev,
      totalPrice: total,
      downPayment: down,
      balance: bal,
    }));
  };

  const handleSendWhatsApp = async () => {
    // 1. Obtener y normalizar el número telefónico del cliente
    const inputPhone = formData.customerPhone || contract?.customerPhone || '';
    const digits = inputPhone.replace(/\D/g, '');

    if (!digits) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin Teléfono Registrado',
        text: 'El cliente no tiene un número telefónico o celular registrado para enviar el documento.',
        confirmButtonText: 'Entendido',
      });
      return;
    }

    // Prefijo de país (+51 para Perú si es celular de 9 dígitos)
    let targetPhone = digits;
    if (digits.length === 9) {
      targetPhone = `51${digits}`;
    } else if (digits.length === 10 && digits.startsWith('0')) {
      targetPhone = `51${digits.slice(1)}`;
    }

    const isQuote = formData.docType === 'COTIZACION';
    const docTitle = isQuote ? 'COTIZACIÓN' : 'CONTRATO DE COMPRA VENTA';
    const company = companyInfo.tradeName || companyInfo.name || 'GRUPO K CONTRERAS S.A.C';
    const date = formData.date || new Date().toISOString().split('T')[0];

    let pdfLink = '';

    // 2. Generar el PDF, subir a la nube para enlace público y descargar copia local
    const printElement = document.getElementById('contract-a4-printable');
    if (printElement) {
      try {
        // @ts-ignore
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default || html2pdfModule;
        const fileName = `${formData.docType || 'DOCUMENTO'}_${formData.contractNumber || '000158'}.pdf`;

        const opt: any = {
          margin: [4, 4, 4, 4],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        };

        const worker = html2pdf().set(opt).from(printElement);

        try {
          const pdfBlob = await worker.outputPdf('blob');
          if (pdfBlob) {
            const { error: uploadError } = await supabase.storage
              .from('assets')
              .upload(`contracts/${fileName}`, pdfBlob, { contentType: 'application/pdf', upsert: true });

            if (!uploadError) {
              const { data: urlData } = supabase.storage.from('assets').getPublicUrl(`contracts/${fileName}`);
              if (urlData?.publicUrl) {
                pdfLink = urlData.publicUrl;
              }
            }
          }
        } catch (storageErr) {
          console.warn('Error subiendo PDF a storage:', storageErr);
        }

        // Descarga automática en el equipo
        await worker.save();
      } catch (pdfErr) {
        console.warn('Error al generar PDF:', pdfErr);
      }
    }

    const text =
      `HOLA, BUEN DIA\n` +
      `DE PARTE DE \n` +
      `*${company.toUpperCase()}* *${docTitle} N° ${formData.contractNumber || '000158'}* \n` +
      `*Fecha de Emisión:* ${date}\n\n` +
      (pdfLink ? `*Documento PDF:*\n${pdfLink}` : '');

    // 3. Abrir DIRECTAMENTE el chat de WhatsApp con el número del cliente
    const url = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    const printElement = document.getElementById('contract-a4-printable');
    if (!printElement) return;

    const printWindow = window.open('', '_blank', 'width=900,height=1050');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${formData.docType || 'CONTRATO'} N° ${formData.contractNumber || '000000'} - ${formData.customerName || 'Cliente'}</title>
            <meta charset="utf-8" />
            <style>
              @page {
                size: A4 portrait;
                margin: 0;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background-color: #ffffff !important;
                font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
                color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .a4-container {
                width: 210mm;
                min-height: 297mm;
                padding: 10mm 14mm 12mm 14mm;
                box-sizing: border-box;
                margin: 0 auto;
                background: #ffffff !important;
              }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1.5px solid #000; padding: 4px 6px; font-size: 11px; text-align: left; vertical-align: middle; }
            </style>
          </head>
          <body>
            <div class="a4-container">
              ${printElement.innerHTML}
            </div>
            <script>window.onload = function() { window.focus(); window.print(); setTimeout(function() { window.close(); }, 500); };</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) onSave(formData);
    setMode('VIEW');
  };

  if (!isOpen) return null;

  const activeCategories = categories.length > 0 ? categories : [
    { id: 'MOTOCICLETA', name: 'Motocicleta', active: true },
    { id: 'REPUESTOS', name: 'Repuestos', active: true },
    { id: 'CUATRIMOTO', name: 'Cuatrimoto', active: true },
    { id: 'ELECTRICA', name: 'Eléctrica', active: true },
    { id: 'TRIMOTO_PASAJEROS', name: 'Trimoto Pasajeros', active: true },
  ];

  const selectedCategory = activeCategories.find(
    (c) =>
      c.id === formData.vehicleType ||
      (formData.vehicleType || '').toUpperCase() === c.name.toUpperCase() ||
      (formData.vehicleType || '').toUpperCase() === c.name.toUpperCase().replace(' ', '_')
  );

  const displayBrands = brands.filter((b) => {
    if (!selectedCategory) return true;
    return b.categoryId === selectedCategory.id;
  });

  const selectedBrandObj = displayBrands.find(
    (b) => b.name.toUpperCase() === (formData.brand || '').toUpperCase()
  );

  const filteredModels = models.filter((m) => {
    if (!selectedBrandObj) return true;
    return m.brandId === selectedBrandObj.id;
  });

  const isCurrentBrandInList = displayBrands.some(
    (b) => b.name.toUpperCase() === (formData.brand || '').toUpperCase()
  );
  const isCurrentModelInList = filteredModels.some(
    (m) => m.name.toUpperCase() === (formData.model || '').toUpperCase()
  );

  const modalTitle = formData.contractNumber
    ? `${formData.docType === 'COTIZACION' ? 'Editar Cotización' : 'Editar Contrato de Compraventa'} N° ${formData.contractNumber}`
    : `${formData.docType === 'COTIZACION' ? 'Nueva Cotización Vehicular' : 'Nuevo Contrato de Compraventa'}`;

  const renderPrintBox = (checked: boolean) => (
    <span
      style={{
        display: 'inline-block',
        width: '13px',
        height: '13px',
        minWidth: '13px',
        minHeight: '13px',
        lineHeight: '11px',
        border: '1.5px solid #000',
        textAlign: 'center',
        verticalAlign: 'middle',
        fontSize: '9.5px',
        fontWeight: 900,
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#000000',
        margin: '0 2px',
        padding: 0,
      }}
    >
      {checked ? 'X' : ''}
    </span>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="xl"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          {mode === 'EDIT' ? (
            <Button variant="primary" onClick={handleFormSubmit}>
              {formData.docType === 'COTIZACION' ? 'Guardar Cotización' : 'Guardar Contrato'}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                icon={<MessageCircle size={16} className="text-emerald-600" />}
                onClick={handleSendWhatsApp}
                className="text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
              >
                Enviar WhatsApp
              </Button>
              <Button variant="primary" icon={<Printer size={16} />} onClick={handlePrint}>
                Imprimir Documento A4
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="mb-4 pb-3 border-b border-color">
        <Tabs
          tabs={[
            { id: 'EDIT', label: 'Formulario de Datos', icon: <Edit3 size={14} /> },
            { id: 'VIEW', label: 'Vista Previa Impresión A4', icon: <Eye size={14} /> },
          ]}
          activeTab={mode}
          onChange={(m) => setMode(m as any)}
          variant="pills"
          className="mb-0"
        />
      </div>

      {mode === 'EDIT' ? (
        <form onSubmit={handleFormSubmit} className="max-h-[72vh] overflow-y-auto px-1 pr-2 pb-6">
          {/* SECCIÓN: Parámetros del Documento */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs sm:text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
                <FileText size={16} className="text-rose-600" /> Parámetros del Documento
              </span>
              <span className="text-[10px] font-bold text-secondary uppercase bg-app px-2.5 py-0.5 rounded border border-color">
                {formData.docType || 'CONTRATO'}
              </span>
            </div>

            {/* Fila 1: 3 en la misma fila */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">Tipo de Documento</label>
                <select
                  value={formData.docType || 'CONTRATO'}
                  onChange={(e) => setFormData({ ...formData, docType: e.target.value as any })}
                  className="form-control text-xs font-bold"
                >
                  <option value="CONTRATO">CONTRATO DE COMPRA VENTA</option>
                  <option value="COTIZACION">COTIZACIÓN FORMAL</option>
                </select>
              </div>
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">N° Correlativo</label>
                <input
                  type="text"
                  value={formData.contractNumber || ''}
                  onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                  className="form-control text-xs font-mono font-bold"
                  placeholder="000158"
                  required
                />
              </div>
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">Fecha Emisión</label>
                <input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="form-control text-xs"
                  required
                />
              </div>
            </div>

            {/* Fila 2: Categoría de Bien usando componente Tabs */}
            <div className="pt-1">
              <label className="form-label text-xs font-semibold mb-2 block text-secondary">
                Categoría de Bien
              </label>
              <Tabs
                tabs={activeCategories.map((cat) => ({
                  id: cat.name.toUpperCase().replace(' ', '_'),
                  label: cat.name,
                }))}
                activeTab={
                  formData.vehicleType ||
                  (activeCategories[0]?.name.toUpperCase().replace(' ', '_') ?? 'MOTOCICLETA')
                }
                onChange={(id) =>
                  setFormData({
                    ...formData,
                    vehicleType: id as any,
                    brand: '',
                    model: '',
                  })
                }
                variant="pills"
                className="w-auto flex-wrap"
              />
            </div>
          </div>

          {/* SECCIÓN 1: Datos del Propietario / Comprador */}
          <div className="space-y-4 pt-10">
            <div className="flex items-center gap-2 pb-1">
              <span className="text-xs sm:text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
                <User size={16} className="text-rose-600" /> 1. Datos del Propietario / Comprador
              </span>
            </div>

            {/* Fila 1: 3 en la misma fila */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">Razón Social / Nombre Completo</label>
                <input
                  type="text"
                  value={formData.customerName || ''}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Ej. CONTRERAS TORRES NILVER EVER"
                  className="form-control text-xs uppercase font-medium"
                  required
                />
              </div>
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">DNI / RUC</label>
                <input
                  type="text"
                  value={formData.customerDoc || ''}
                  onChange={(e) => setFormData({ ...formData, customerDoc: e.target.value })}
                  placeholder="60413282"
                  className="form-control text-xs font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">Teléfono / Celular</label>
                <input
                  type="text"
                  value={formData.customerPhone || ''}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder="993275893"
                  className="form-control text-xs font-medium"
                />
              </div>
            </div>

            {/* Fila 2: Dirección (2 cols) + Estado Civil (1 col) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="form-label text-xs font-semibold mb-1 block">Dirección Domiciliaria / Legal</label>
                <input
                  type="text"
                  value={formData.customerAddress || ''}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  placeholder="Ej. Retamas / Av. Principal 123"
                  className="form-control text-xs font-medium"
                />
              </div>
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">Estado Civil</label>
                <div className="flex gap-4 items-center h-[38px] px-3 bg-surface rounded-lg border border-color">
                  {['SOLTERO', 'CASADO', 'OTRO'].map((st) => (
                    <label key={st} className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="maritalStatus"
                        value={st}
                        checked={formData.maritalStatus === st}
                        onChange={() => setFormData({ ...formData, maritalStatus: st as any })}
                      />
                      {st.charAt(0) + st.slice(1).toLowerCase()}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Descripción Técnica del Vehículo */}
          <div className="space-y-4 pt-10">
            <div className="flex items-center gap-2 pb-1">
              <span className="text-xs sm:text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
                <Car size={16} className="text-rose-600" /> 2. Descripción Técnica del Vehículo
              </span>
            </div>

            {/* Fila 1: 3 en la misma fila */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">Marca</label>
                <select
                  value={formData.brand || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brand: e.target.value,
                      model: '',
                    })
                  }
                  className="form-control text-xs font-bold uppercase"
                  required
                >
                  <option value="">-- Marca --</option>
                  {formData.brand && !isCurrentBrandInList && (
                    <option value={formData.brand}>{formData.brand.toUpperCase()}</option>
                  )}
                  {displayBrands.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">Modelo</label>
                <select
                  value={formData.model || ''}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="form-control text-xs font-bold uppercase"
                  required
                  disabled={!formData.brand}
                >
                  <option value="">{!formData.brand ? 'Elija Marca' : '-- Modelo --'}</option>
                  {formData.model && !isCurrentModelInList && (
                    <option value={formData.model}>{formData.model.toUpperCase()}</option>
                  )}
                  {filteredModels.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">Color(es)</label>
                <input
                  type="text"
                  value={formData.color || ''}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="Ej. Amarillo, Gris"
                  className="form-control text-xs font-medium"
                />
              </div>
            </div>

            {/* Fila 2: 3 en la misma fila */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">Cilindraje</label>
                <input
                  type="text"
                  value={formData.cylinderCapacity || ''}
                  onChange={(e) => setFormData({ ...formData, cylinderCapacity: e.target.value })}
                  placeholder="Ej. 373 cc"
                  className="form-control text-xs font-medium"
                />
              </div>
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">N° DUA</label>
                <input
                  type="text"
                  value={formData.dua || ''}
                  onChange={(e) => setFormData({ ...formData, dua: e.target.value })}
                  placeholder="118-2026-10-045821"
                  className="form-control text-xs font-mono"
                />
              </div>
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">Ítem</label>
                <input
                  type="text"
                  value={formData.item || ''}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  placeholder="01"
                  className="form-control text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Fila 3: Motor y Chasis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">N° de Motor</label>
                <input
                  type="text"
                  value={formData.engineNumber || ''}
                  onChange={(e) => setFormData({ ...formData, engineNumber: e.target.value })}
                  placeholder="JLXCSH51401"
                  className="form-control text-xs font-mono font-bold uppercase"
                  required
                />
              </div>
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">N° de Chasis / VIN</label>
                <input
                  type="text"
                  value={formData.chassisNumber || ''}
                  onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value })}
                  placeholder="MD2C49NX8TCK74226"
                  className="form-control text-xs font-mono font-bold uppercase"
                  required
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: Forma de Pago & Saldos */}
          <div className="space-y-4 pt-10">
            <div className="flex items-center gap-2 pb-1">
              <span className="text-xs sm:text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
                <DollarSign size={16} className="text-rose-600" /> 3. Forma de Pago
              </span>
            </div>

            {/* Fila 1: 3 en la misma fila */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">Precio Total (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.totalPrice || ''}
                  onChange={(e) => handlePriceChange(Number(e.target.value), formData.downPayment || 0)}
                  placeholder="17740"
                  className="form-control text-xs font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">A Cuenta (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.downPayment || ''}
                  onChange={(e) => handlePriceChange(formData.totalPrice || 0, Number(e.target.value))}
                  placeholder="10740"
                  className="form-control text-xs font-mono font-bold text-emerald-600"
                  required
                />
              </div>
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">Saldo Pendiente (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.balance ?? ''}
                  readOnly
                  className="form-control text-xs font-mono font-bold bg-slate-50 text-rose-600 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Fila 2: 3 en la misma fila */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">Fecha Límite Cancelación</label>
                <input
                  type="date"
                  value={formData.dueDate || ''}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="form-control text-xs"
                />
              </div>
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">Detalle A Cuenta / Banco</label>
                <input
                  type="text"
                  value={formData.paymentMethodDetail || ''}
                  onChange={(e) => setFormData({ ...formData, paymentMethodDetail: e.target.value })}
                  placeholder="Ej. BCP: 03596987 / Efectivo"
                  className="form-control text-xs font-medium"
                />
              </div>
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">Motivo del Saldo</label>
                <input
                  type="text"
                  value={formData.balanceReason || ''}
                  onChange={(e) => setFormData({ ...formData, balanceReason: e.target.value })}
                  placeholder="7000 Anticipo / Saldo contraentrega"
                  className="form-control text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: Legalización & Observaciones */}
          <div className="space-y-4 pt-10">
            <div className="flex items-center gap-2 pb-1">
              <span className="text-xs sm:text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-wide">
                <Shield size={16} className="text-rose-600" /> 4. Legalización & Observaciones
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label text-xs font-semibold mb-1 block">Legalización Notarial</label>
                <div className="flex flex-col gap-2 p-2.5 bg-surface rounded-lg border border-color">
                  <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="notary"
                      checked={formData.notaryLegalization === 'SI_20'}
                      onChange={() => setFormData({ ...formData, notaryLegalization: 'SI_20' })}
                    />
                    SI S/ 20
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="notary"
                      checked={formData.notaryLegalization === 'CLIENTE'}
                      onChange={() => setFormData({ ...formData, notaryLegalization: 'CLIENTE' })}
                    />
                    Cliente Legaliza
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="notary"
                      checked={formData.notaryLegalization === 'NO'}
                      onChange={() => setFormData({ ...formData, notaryLegalization: 'NO' })}
                    />
                    No Aplica
                  </label>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="form-label text-xs font-semibold mb-1 block">Observaciones del Contrato</label>
                <textarea
                  rows={4}
                  value={formData.observations || ''}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="En caso de desistimiento de la compra, se aplicará penalidad según contrato..."
                  className="form-control text-xs font-medium"
                />
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* VIEW MODE: Official Printable A4 Document Fitting 1 Clean Sheet */
        <div className="bg-slate-100 p-2 sm:p-5 rounded-xl max-h-[75vh] overflow-y-auto flex justify-center w-full">
          <div
            id="contract-a4-printable"
            style={{
              width: '100%',
              maxWidth: '790px',
              minHeight: '1000px',
              backgroundColor: '#ffffff',
              color: '#000000',
              padding: '28px 32px 40px',
              fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
              fontSize: '11px',
              lineHeight: '1.4',
              border: '1px solid #cbd5e1',
              boxSizing: 'border-box',
              borderRadius: '4px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* Header Box: Logo + Company Info vs Document Type / Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '16px', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    {companyInfo.logo_path ? (
                      <img src={companyInfo.logo_path} alt="Logo" style={{ maxHeight: '44px', maxWidth: '145px', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '-0.02em', color: '#b91c1c' }}>
                        {companyInfo.tradeName || 'GRUPO K CONTRERAS S.A.C'}
                      </div>
                    )}
                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#b91c1c', textTransform: 'uppercase' }}>
                      {companyInfo.tradeName || companyInfo.name || 'GRUPO K CONTRERAS S.A.C'}
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569', fontWeight: 600 }}>
                    {companyInfo.name} • RUC N° {companyInfo.ruc}
                  </div>
                </div>

                {/* Right Document Box */}
                <div style={{ border: '2px solid #000000', borderRadius: '4px', padding: '6px 10px', textAlign: 'center', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', fontWeight: 800, fontSize: '11px', marginBottom: '3px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      COTIZACIÓN {renderPrintBox(formData.docType === 'COTIZACION')}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      CONTRATO {renderPrintBox(formData.docType !== 'COTIZACION')}
                    </span>
                  </div>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, borderTop: '1px solid #cbd5e1', paddingTop: '3px' }}>
                    Fecha: <strong>{formData.date || '2026-08-25'}</strong>
                  </div>
                </div>
              </div>

              {/* Title & Document Correlative Number */}
              <div style={{ textAlign: 'center', margin: '10px 0 12px' }}>
                <div style={{ fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {formData.docType === 'COTIZACION' ? 'COTIZACIÓN DE VEHÍCULO' : 'CONTRATO DE COMPRA VENTA'}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#b91c1c', letterSpacing: '0.05em', marginTop: '2px' }}>
                  N° {formData.contractNumber || '000158'}
                </div>
              </div>

              {/* Vehicle Type Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 14px', border: '1.5px solid #000', borderRadius: '3px', marginBottom: '12px', fontSize: '11px', fontWeight: 800, backgroundColor: '#ffffff' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {renderPrintBox((formData.vehicleType as string) !== 'REPUESTOS')}
                  Motocicleta
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {renderPrintBox((formData.vehicleType as string) === 'REPUESTOS')}
                  Repuestos
                </span>
              </div>

              {/* 1. DATOS DEL PROPIETARIO */}
              <div style={{ marginBottom: '12px', backgroundColor: '#ffffff' }} className="no-split">
                <div style={{ fontWeight: 900, fontSize: '11px', textTransform: 'uppercase', color: '#b91c1c', marginBottom: '3px' }}>
                  DATOS DEL PROPIETARIO:
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '22%', fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '10.5px' }}>
                        Razón Social / Apellidos y Nombre(s)
                      </td>
                      <td colSpan={3} style={{ fontWeight: 800, fontSize: '11.5px', textTransform: 'uppercase', padding: '5px 8px', border: '1.5px solid #000' }}>
                        {formData.customerName || 'CONTRERAS TORRES NILVER EVER'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '10.5px' }}>Dirección</td>
                      <td style={{ padding: '5px 8px', border: '1.5px solid #000', fontSize: '11px' }}>{formData.customerAddress || 'Retamas'}</td>
                      <td style={{ width: '14%', fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '10.5px' }}>DNI / RUC</td>
                      <td style={{ width: '20%', fontWeight: 800, fontFamily: 'monospace', fontSize: '11.5px', padding: '5px 8px', border: '1.5px solid #000' }}>{formData.customerDoc || '60413282'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '10.5px' }}>Estado Civil</td>
                      <td style={{ padding: '5px 8px', border: '1.5px solid #000' }}>
                        <div style={{ display: 'flex', gap: '14px', fontSize: '10.5px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {renderPrintBox(formData.maritalStatus === 'SOLTERO')} Soltero
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {renderPrintBox(formData.maritalStatus === 'CASADO')} Casado
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {renderPrintBox(formData.maritalStatus === 'OTRO')} Otro
                          </span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '10.5px' }}>Teléfono</td>
                      <td style={{ fontWeight: 700, padding: '5px 8px', border: '1.5px solid #000', fontSize: '11px' }}>{formData.customerPhone || '993275893'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 2. DESCRIPCIÓN DEL VEHÍCULO */}
              <div style={{ marginBottom: '12px', backgroundColor: '#ffffff' }} className="no-split">
                <div style={{ fontWeight: 900, fontSize: '11px', textTransform: 'uppercase', color: '#b91c1c', marginBottom: '3px' }}>
                  DESCRIPCIÓN DEL VEHÍCULO:
                  <span style={{ fontSize: '9.5px', color: '#475569', textTransform: 'none', marginLeft: '6px', fontWeight: 400 }}>
                    El vehículo en mención tiene las siguientes características:
                  </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '14%', fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '10.5px' }}>Marca</td>
                      <td style={{ width: '22%', fontWeight: 800, padding: '5px 8px', border: '1.5px solid #000', textTransform: 'uppercase' }}>{formData.brand || 'BAJAJ'}</td>
                      <td style={{ width: '14%', fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '10.5px' }}>Modelo</td>
                      <td style={{ width: '22%', fontWeight: 800, padding: '5px 8px', border: '1.5px solid #000', textTransform: 'uppercase' }}>{formData.model || 'PULSAR 400 Z'}</td>
                      <td style={{ width: '12%', fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '10.5px' }}>Color</td>
                      <td style={{ width: '16%', fontWeight: 700, padding: '5px 8px', border: '1.5px solid #000' }}>{formData.color || 'Amarillo, Gris'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '10.5px' }}>Cilindraje</td>
                      <td style={{ padding: '5px 8px', border: '1.5px solid #000', fontWeight: 600 }}>{formData.cylinderCapacity || '373 cc'}</td>
                      <td style={{ fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '10.5px' }}>DUA</td>
                      <td style={{ padding: '5px 8px', border: '1.5px solid #000', fontFamily: 'monospace', fontWeight: 600 }}>{formData.dua || '118-2026-10-045821'}</td>
                      <td style={{ fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '10.5px' }}>ITEM</td>
                      <td style={{ padding: '5px 8px', border: '1.5px solid #000', fontFamily: 'monospace', fontWeight: 700 }}>{formData.item || '01'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '10.5px' }}>N° Motor</td>
                      <td colSpan={2} style={{ padding: '5px 8px', fontWeight: 800, fontFamily: 'monospace', fontSize: '11.5px', border: '1.5px solid #000', letterSpacing: '0.03em' }}>
                        {formData.engineNumber || 'JLXCSH51401'}
                      </td>
                      <td style={{ fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '10.5px' }}>N° Chasis</td>
                      <td colSpan={2} style={{ padding: '5px 8px', fontWeight: 800, fontFamily: 'monospace', fontSize: '11.5px', border: '1.5px solid #000', letterSpacing: '0.03em' }}>
                        {formData.chassisNumber || 'MD2C49NX8TCK74226'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 3. FORMA DE PAGO */}
              <div style={{ marginBottom: '12px', backgroundColor: '#ffffff' }} className="no-split">
                <div style={{ fontWeight: 900, fontSize: '11px', textTransform: 'uppercase', color: '#b91c1c', marginBottom: '3px' }}>
                  FORMA DE PAGO:
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '12%', fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '10.5px' }}>Precio:</td>
                      <td style={{ width: '22%', fontWeight: 800, fontSize: '11.5px', padding: '5px 8px', border: '1.5px solid #000' }}>
                        S/ {(formData.totalPrice || 17740).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ width: '14%', fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '10.5px' }}>A Cuenta:</td>
                      <td style={{ width: '24%', fontWeight: 800, fontSize: '11.5px', padding: '5px 8px', border: '1.5px solid #000', color: '#047857' }}>
                        S/ {(formData.downPayment || 10740).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ width: '12%', fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '10.5px' }}>Saldo:</td>
                      <td style={{ width: '16%', fontWeight: 800, fontSize: '11.5px', padding: '5px 8px', border: '1.5px solid #000', color: '#b91c1c' }}>
                        S/ {(formData.balance ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '10.5px' }}>
                        Motivo del Saldo:
                      </td>
                      <td colSpan={3} style={{ border: '1.5px solid #000', padding: '5px 8px', fontSize: '10.5px' }}>
                        {formData.balanceReason || '7000 Anticipo / Saldo contraentrega de placa y tarjeta'}
                      </td>
                      <td style={{ fontWeight: 700, background: '#f8fafc', padding: '5px 8px', border: '1.5px solid #000', fontSize: '9.5px', lineHeight: '1.2' }}>
                        Fecha de Cancelación Total:
                      </td>
                      <td style={{ fontWeight: 800, padding: '5px 8px', border: '1.5px solid #000', fontSize: '11px' }}>
                        {formData.dueDate || '2026-08-25'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4. LEGALIZACIÓN NOTARIAL & OBSERVACIONES */}
              <div style={{ border: '1.5px solid #000', borderRadius: '3px', padding: '6px 10px', marginBottom: '12px', backgroundColor: '#ffffff', color: '#000000' }} className="no-split">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 900, fontSize: '11px' }}>Legalización Notarial de firma:</span>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', fontWeight: 700 }}>
                      SI S/ 20 {renderPrintBox(formData.notaryLegalization === 'SI_20')}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', fontWeight: 700 }}>
                      Cliente Legaliza {renderPrintBox(formData.notaryLegalization === 'CLIENTE')}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', color: '#b91c1c' }}>OBSERVACIONES:</div>
                  <div style={{ fontSize: '10px', color: '#1e293b', paddingTop: '2px' }}>
                    {formData.observations || 'En caso de desistimiento de la compra, se aplicará penalidad según contrato.'}
                  </div>
                </div>
              </div>

              {/* 5. CLÁUSULAS */}
              <div style={{ fontSize: '9.5px', color: '#1e293b', lineHeight: '1.4', marginBottom: '14px', backgroundColor: '#ffffff' }} className="no-split">
                <p style={{ margin: '2px 0' }}>
                  <strong>1.</strong> En caso de desistimiento de la compra de la unidad separada, se aplicará una <strong>penalidad de S/ 300</strong> por concepto de gastos administrativos y/o registrales.
                </p>
                <p style={{ margin: '2px 0' }}>
                  <strong>2.</strong> Firmo en señal de conformidad con cada una de las cláusulas establecida en el presente contrato y anexos.
                </p>
              </div>
            </div>

            {/* 6. FIRMAS (Firmemente dentro del pie de la hoja A4) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '28px', textAlign: 'center', backgroundColor: '#ffffff', color: '#000000' }} className="no-split">
              <div>
                {companyInfo.signature_path ? (
                  <div style={{ height: '75px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '4px' }}>
                    <img src={companyInfo.signature_path} alt="Firma Autorizada" style={{ maxHeight: '72px', maxWidth: '220px', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div style={{ height: '75px' }} />
                )}
                <div style={{ borderTop: '1.5px solid #000', width: '80%', margin: '0 auto 5px' }} />
                <div style={{ fontWeight: 900, fontSize: '11px', textTransform: 'uppercase' }}>
                  {companyInfo.tradeName || 'GRUPO K CONTRERAS S.A.C'}
                </div>
                <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>Concesionario Autorizado</div>
              </div>

              <div>
                <div style={{ height: '75px' }} />
                <div style={{ borderTop: '1.5px solid #000', width: '80%', margin: '0 auto 5px' }} />
                <div style={{ fontWeight: 900, fontSize: '11px', textTransform: 'uppercase' }}>
                  COMPRADOR
                </div>
                <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>DNI / RUC N° {formData.customerDoc || '60413282'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default VehicleContractModal;
