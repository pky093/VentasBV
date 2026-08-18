import React, { useState } from 'react';
import { Settings, Building2, Palette, DollarSign, FileText, Save, Check } from 'lucide-react';
import { PageHeader, Button, Card, CardHeader, CardBody, Tabs } from '../components/ui';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  const [companyInfo, setCompanyInfo] = useState({
    name: 'Ventas B&V S.A.C.',
    tradeName: 'B&V Tecnologías',
    ruc: '20998877665',
    phone: '01 425-8900',
    email: 'contacto@ventasbv.pe',
    address: 'Av. Javier Prado Este 1230, San Isidro, Lima',
    currency: 'PEN',
    taxRate: '18.00',
  });

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    { id: 'general', label: 'Datos de la Empresa', icon: <Building2 size={16} /> },
    { id: 'currency', label: 'Moneda & Impuestos', icon: <DollarSign size={16} /> },
    { id: 'branding', label: 'Personalización de Marca', icon: <Palette size={16} /> },
    { id: 'billing', label: 'Series de Comprobantes', icon: <FileText size={16} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Configuración de la Empresa"
        subtitle="Ajustes generales, moneda principal, IGV, series de facturación y apariencia"
        action={
          <Button onClick={handleSave}>
            {saved ? <Check size={18} className="mr-1.5 inline" /> : <Save size={18} className="mr-1.5 inline" />}
            {saved ? '¡Guardado!' : 'Guardar Cambios'}
          </Button>
        }
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'general' && (
        <Card>
          <CardHeader title="Información General" subtitle="Datos visibles en comprobantes y reportes" />
          <CardBody>
            <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Razón Social</label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Nombre Comercial</label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyInfo.tradeName}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, tradeName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">RUC de la Empresa</label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyInfo.ruc}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, ruc: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Teléfono Principal</label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyInfo.phone}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Correo Electrónico Corporativo</label>
                <input
                  type="email"
                  className="form-control"
                  value={companyInfo.email}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Dirección Fiscal Principal</label>
                <input
                  type="text"
                  className="form-control"
                  value={companyInfo.address}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                />
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {activeTab === 'currency' && (
        <Card>
          <CardHeader title="Moneda Principal e Impuestos" subtitle="Selecciona la moneda por defecto y porcentaje de IGV / IVA" />
          <CardBody>
            <form onSubmit={handleSave} className="space-y-4 max-w-xl">
              <div>
                <label className="form-label">Moneda Principal del Sistema</label>
                <select
                  className="form-control"
                  value={companyInfo.currency}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, currency: e.target.value })}
                >
                  <option value="PEN">Soles Peruanos (PEN - S/)</option>
                  <option value="USD">Dólares Americanos (USD - $)</option>
                  <option value="EUR">Euros (EUR - €)</option>
                </select>
                <p className="text-xs text-secondary mt-1">El sistema convertirá dinámicamente los montos en la vista al cambiar la moneda.</p>
              </div>

              <div>
                <label className="form-label">Tasa de Impuesto / IGV (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={companyInfo.taxRate}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, taxRate: e.target.value })}
                />
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {activeTab === 'branding' && (
        <Card>
          <CardHeader title="Aariancia y Tema de Marca" subtitle="Personaliza los colores de la interfaz SaaS" />
          <CardBody>
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="form-label">Paleta de Colores Preset</label>
                <div className="grid grid-cols-3 gap-3">
                  <button type="button" className="p-3 border-2 border-primary-600 rounded-lg text-left bg-primary-50">
                    <div className="font-bold text-xs text-primary-900">Indigo / Gold</div>
                    <div className="flex gap-1 mt-1">
                      <div className="w-4 h-4 rounded bg-[#1e3a5f]"></div>
                      <div className="w-4 h-4 rounded bg-[#d4a84b]"></div>
                    </div>
                  </button>
                  <button type="button" className="p-3 border rounded-lg text-left hover:border-neutral-300">
                    <div className="font-bold text-xs text-neutral-800">Ocean Blue</div>
                    <div className="flex gap-1 mt-1">
                      <div className="w-4 h-4 rounded bg-[#0284c7]"></div>
                      <div className="w-4 h-4 rounded bg-[#38bdf8]"></div>
                    </div>
                  </button>
                  <button type="button" className="p-3 border rounded-lg text-left hover:border-neutral-300">
                    <div className="font-bold text-xs text-neutral-800">Emerald Business</div>
                    <div className="flex gap-1 mt-1">
                      <div className="w-4 h-4 rounded bg-[#059669]"></div>
                      <div className="w-4 h-4 rounded bg-[#34d399]"></div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {activeTab === 'billing' && (
        <Card>
          <CardHeader title="Series de Comprobantes Configuradas" />
          <CardBody>
            <div className="space-y-3 max-w-lg">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <div className="font-bold text-sm text-primary-900">Factura Electrónica</div>
                  <div className="text-xs text-secondary">Serie: F001</div>
                </div>
                <div className="text-xs font-mono font-bold">Correlativo actual: 89</div>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <div className="font-bold text-sm text-primary-900">Boleta de Venta</div>
                  <div className="text-xs text-secondary">Serie: B001</div>
                </div>
                <div className="text-xs font-mono font-bold">Correlativo actual: 124</div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
