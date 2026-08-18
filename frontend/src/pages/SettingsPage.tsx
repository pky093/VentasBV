import React, { useState, useEffect } from 'react';
import { Building2, Palette, DollarSign, FileText, Save, Check, Loader2, RefreshCw, Sliders } from 'lucide-react';
import { PageHeader, Button, Card, CardHeader, CardBody, Tabs } from '../components/ui';
import { settingsService } from '../lib/db-services';
import { applyTenantTheme, applyCustomTheme, getPresets, PRESETS, ThemeColors } from '../lib/tenant-theme';
import Swal from 'sweetalert2';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePreset, setActivePreset] = useState('default');

  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    trade_name: '',
    ruc: '',
    phone: '',
    email: '',
    address: '',
    logo_path: '',
    currency_code: 'PEN',
    tax_rate: '18.00',
  });

  const [customColors, setCustomColors] = useState<ThemeColors>({
    primaryColor: '#2563eb',
    secondaryColor: '#10b981',
    pageBg: '#f1f5f9',
    sidebarBg: '#0f172a',
    sidebarText: '#94a3b8',
    surfaceBg: '#ffffff',
  });

  const [seriesList, setSeriesList] = useState<{ document_type: string; series: string; next_number: number }[]>([]);
  const presets = getPresets();

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [tenant, series] = await Promise.all([
        settingsService.getTenantInfo(),
        settingsService.getInvoiceSeries(),
      ]);

      if (tenant && Object.keys(tenant).length > 0) {
        setCompanyInfo({
          name: tenant.name || '',
          trade_name: tenant.trade_name || '',
          ruc: tenant.ruc || '',
          phone: tenant.phone || '',
          email: tenant.email || '',
          address: tenant.address || '',
          logo_path: tenant.logo_path || '',
          currency_code: tenant.currency_code || 'PEN',
          tax_rate: tenant.tax_rate?.toString() || '18.00',
        });

        const loadedColors: ThemeColors = {
          primaryColor: tenant.primary_color || '#2563eb',
          secondaryColor: tenant.secondary_color || '#10b981',
          pageBg: tenant.page_background_color || '#f1f5f9',
          sidebarBg: tenant.sidebar_background_color || '#0f172a',
          sidebarText: tenant.sidebar_text_color || '#94a3b8',
          surfaceBg: tenant.surface_color || '#ffffff',
        };

        setCustomColors(loadedColors);
        applyCustomTheme(loadedColors);
        setActivePreset(tenant.color_preset || 'default');
      }

      if (series && series.length > 0) {
        setSeriesList(series);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const success = await settingsService.updateTenantInfo({
        name: companyInfo.name,
        trade_name: companyInfo.trade_name,
        ruc: companyInfo.ruc,
        phone: companyInfo.phone,
        email: companyInfo.email,
        address: companyInfo.address,
        logo_path: companyInfo.logo_path,
        currency_code: companyInfo.currency_code,
        tax_rate: parseFloat(companyInfo.tax_rate) || 18.00,
        primary_color: customColors.primaryColor,
        secondary_color: customColors.secondaryColor,
        page_background_color: customColors.pageBg,
        sidebar_background_color: customColors.sidebarBg,
        sidebar_text_color: customColors.sidebarText,
        surface_color: customColors.surfaceBg,
        color_preset: activePreset,
      });

      if (success) {
        window.dispatchEvent(new Event('tenant_info_updated'));
        Swal.fire({
          icon: 'success',
          title: '¡Guardado!',
          text: 'La configuración se ha actualizado correctamente.',
          timer: 2000,
          showConfirmButton: false,
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo guardar la configuración. Verifica la conexión.',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
        });
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error inesperado al guardar.',
        background: 'var(--bg-surface)',
        color: 'var(--text-primary)',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePresetSelect = (presetId: string) => {
    const preset = PRESETS[presetId] || PRESETS['default'];
    setActivePreset(presetId);
    setCustomColors(preset.colors);
    applyCustomTheme(preset.colors);
  };

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    const updated = { ...customColors, [key]: value };
    setCustomColors(updated);
    applyCustomTheme(updated);
    setActivePreset('custom');
  };

  const tabs = [
    { id: 'general', label: 'Datos de la Empresa', icon: <Building2 size={16} /> },
    { id: 'currency', label: 'Moneda & Impuestos', icon: <DollarSign size={16} /> },
    { id: 'branding', label: 'Personalización de Marca', icon: <Palette size={16} /> },
    { id: 'billing', label: 'Series de Comprobantes', icon: <FileText size={16} /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary-600" />
        <span className="ml-3 text-secondary font-medium">Cargando configuración...</span>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Configuración de la Empresa"
        subtitle="Ajustes generales, logo corporativo, paleta de colores personalizada y facturación"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadSettings}>
              <RefreshCw size={16} className="mr-1.5 inline" />
              Recargar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={18} className="mr-1.5 inline animate-spin" /> : <Save size={18} className="mr-1.5 inline" />}
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        }
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'general' && (
        <Card>
          <CardHeader title="Información General" subtitle="Datos visibles en comprobantes, logo y menú lateral de la empresa" />
          <CardBody>
            <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
              {/* Logo Section */}
              <div className="p-4 rounded-xl border border-color bg-slate-50 dark:bg-slate-800/40 mb-4">
                <label className="form-label font-bold text-sm mb-2 block">Logo de la Empresa (Para menú y boletas)</label>
                <div className="flex items-center gap-4">
                  {companyInfo.logo_path ? (
                    <div style={{ width: '64px', height: '64px', minWidth: '64px', minHeight: '64px', flexShrink: 0, borderRadius: '12px', border: '1px solid var(--border-color)', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', overflow: 'hidden' }}>
                      <img src={companyInfo.logo_path} alt="Logo Empresa" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <div style={{ width: '64px', height: '64px', minWidth: '64px', minHeight: '64px', flexShrink: 0, borderRadius: '12px', border: '2px dashed var(--border-color)', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, textAlign: 'center', padding: '4px' }}>
                      Sin Logo
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      className="form-control text-xs"
                      placeholder="https://... URL pública de la imagen del logo"
                      value={companyInfo.logo_path}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, logo_path: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <label className="btn btn-secondary text-xs cursor-pointer py-1.5 px-3 inline-flex items-center gap-1.5 rounded-lg border font-semibold">
                        📁 Subir Imagen de Logo...
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setCompanyInfo({ ...companyInfo, logo_path: event.target.result as string });
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {companyInfo.logo_path && (
                        <button
                          type="button"
                          className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1"
                          onClick={() => setCompanyInfo({ ...companyInfo, logo_path: '' })}
                        >
                          Quitar Logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-secondary mt-2">
                  El logo se mostrará en la parte superior del menú lateral (Imagen 2) y en la boleta/factura física e impresa.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Razón Social (Nombre de la Empresa)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                    placeholder="Ej: Venta Vehiculos"
                  />
                </div>
                <div>
                  <label className="form-label">Nombre Comercial / Subtítulo</label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyInfo.trade_name}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, trade_name: e.target.value })}
                    placeholder="Ej: Motors S.A.C."
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
                    maxLength={11}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, ruc: e.target.value })}
                    placeholder="20XXXXXXXXX"
                  />
                  <p className="text-xs text-secondary mt-1">11 dígitos — aparece en todos los comprobantes</p>
                </div>
                <div>
                  <label className="form-label">Teléfono Principal</label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyInfo.phone}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                    placeholder="(01) 000-0000"
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
                  placeholder="contacto@empresa.pe"
                />
              </div>
              <div>
                <label className="form-label">Dirección Fiscal Principal</label>
                <input
                  type="text"
                  className="form-control"
                  value={companyInfo.address}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                  placeholder="Av. Principal 123, Distrito, Ciudad"
                />
                <p className="text-xs text-secondary mt-1">Domicilio fiscal registrado ante SUNAT</p>
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
                  value={companyInfo.currency_code}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, currency_code: e.target.value })}
                >
                  <option value="PEN">Soles Peruanos (PEN - S/)</option>
                  <option value="USD">Dólares Americanos (USD - $)</option>
                  <option value="EUR">Euros (EUR - €)</option>
                </select>
                <p className="text-xs text-secondary mt-1">El sistema usará esta moneda por defecto en precios y comprobantes.</p>
              </div>

              <div>
                <label className="form-label">Tasa de Impuesto / IGV (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={companyInfo.tax_rate}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, tax_rate: e.target.value })}
                />
                <p className="text-xs text-secondary mt-1">Tasa de IGV vigente en Perú: 18%</p>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {activeTab === 'branding' && (
        <div className="space-y-6 max-w-4xl">
          {/* Section 1: Presets */}
          <Card>
            <CardHeader title="Paletas de Colores por Defecto" subtitle="Selecciona un tema preconfigurado para tu plataforma" />
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {presets.map((preset) => {
                  const isSelected = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset.id)}
                      className="border-none"
                      style={{
                        padding: '16px',
                        borderRadius: '14px',
                        textAlign: 'left' as const,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: isSelected ? '2px solid var(--primary-600)' : '1px solid var(--border-color)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-surface)',
                        boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      <div className="font-bold text-sm flex items-center justify-between mb-3" style={{ color: 'var(--text-primary)' }}>
                        <span>{preset.name}</span>
                        {isSelected && <Check size={16} className="text-primary-600" />}
                      </div>
                      <div className="flex gap-2 items-center">
                        <div title="Primario" style={{ width: '26px', height: '26px', borderRadius: '50%', background: preset.colors.primaryColor, border: '1px solid rgba(0,0,0,0.1)' }} />
                        <div title="Secundario / Accent" style={{ width: '26px', height: '26px', borderRadius: '50%', background: preset.colors.secondaryColor, border: '1px solid rgba(0,0,0,0.1)' }} />
                        <div title="Menú Lateral" style={{ width: '26px', height: '26px', borderRadius: '50%', background: preset.colors.sidebarBg, border: '1px solid rgba(0,0,0,0.1)' }} />
                        <div title="Fondo Página" style={{ width: '26px', height: '26px', borderRadius: '50%', background: preset.colors.pageBg, border: '1px solid rgba(0,0,0,0.1)' }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Section 2: Custom Color Pickers */}
          <Card>
            <CardHeader title="Personalización de Colores a tu Gusto" subtitle="Cambia individualmente cada color del sistema: primario, secundario, fondo de página y menú lateral" />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Primary Color */}
                <div className="p-3.5 rounded-xl border border-color flex items-center justify-between bg-surface">
                  <div>
                    <div className="font-semibold text-sm">Color Primario</div>
                    <div className="text-xs text-secondary">Botones principales, íconos y acentos primarios</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-10 h-10 rounded-lg cursor-pointer border border-color p-0.5 bg-white"
                      value={customColors.primaryColor}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-control text-xs uppercase font-mono w-24"
                      value={customColors.primaryColor}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="p-3.5 rounded-xl border border-color flex items-center justify-between bg-surface">
                  <div>
                    <div className="font-semibold text-sm">Color Secundario / Destacado</div>
                    <div className="text-xs text-secondary">Badges, enlaces activos y acentos secundarios</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-10 h-10 rounded-lg cursor-pointer border border-color p-0.5 bg-white"
                      value={customColors.secondaryColor}
                      onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-control text-xs uppercase font-mono w-24"
                      value={customColors.secondaryColor}
                      onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                    />
                  </div>
                </div>

                {/* Page Background */}
                <div className="p-3.5 rounded-xl border border-color flex items-center justify-between bg-surface">
                  <div>
                    <div className="font-semibold text-sm">Fondo de la Página</div>
                    <div className="text-xs text-secondary">Color general del fondo de la aplicación</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-10 h-10 rounded-lg cursor-pointer border border-color p-0.5 bg-white"
                      value={customColors.pageBg}
                      onChange={(e) => handleColorChange('pageBg', e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-control text-xs uppercase font-mono w-24"
                      value={customColors.pageBg}
                      onChange={(e) => handleColorChange('pageBg', e.target.value)}
                    />
                  </div>
                </div>

                {/* Sidebar Background */}
                <div className="p-3.5 rounded-xl border border-color flex items-center justify-between bg-surface">
                  <div>
                    <div className="font-semibold text-sm">Fondo del Menú Lateral</div>
                    <div className="text-xs text-secondary">Color de fondo del panel de navegación lateral</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-10 h-10 rounded-lg cursor-pointer border border-color p-0.5 bg-white"
                      value={customColors.sidebarBg}
                      onChange={(e) => handleColorChange('sidebarBg', e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-control text-xs uppercase font-mono w-24"
                      value={customColors.sidebarBg}
                      onChange={(e) => handleColorChange('sidebarBg', e.target.value)}
                    />
                  </div>
                </div>

                {/* Sidebar Text Color */}
                <div className="p-3.5 rounded-xl border border-color flex items-center justify-between bg-surface">
                  <div>
                    <div className="font-semibold text-sm">Color Texto del Menú</div>
                    <div className="text-xs text-secondary">Color de los enlaces y etiquetas del menú lateral</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-10 h-10 rounded-lg cursor-pointer border border-color p-0.5 bg-white"
                      value={customColors.sidebarText}
                      onChange={(e) => handleColorChange('sidebarText', e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-control text-xs uppercase font-mono w-24"
                      value={customColors.sidebarText}
                      onChange={(e) => handleColorChange('sidebarText', e.target.value)}
                    />
                  </div>
                </div>

                {/* Surface Background */}
                <div className="p-3.5 rounded-xl border border-color flex items-center justify-between bg-surface">
                  <div>
                    <div className="font-semibold text-sm">Fondo de Tarjetas (Surface)</div>
                    <div className="text-xs text-secondary">Color de fondo de las tarjetas y contenedores</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-10 h-10 rounded-lg cursor-pointer border border-color p-0.5 bg-white"
                      value={customColors.surfaceBg}
                      onChange={(e) => handleColorChange('surfaceBg', e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-control text-xs uppercase font-mono w-24"
                      value={customColors.surfaceBg}
                      onChange={(e) => handleColorChange('surfaceBg', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div style={{
                marginTop: '20px',
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-color)',
              }}>
                <div className="text-xs font-semibold text-secondary uppercase mb-3">
                  Vista Previa en Tiempo Real
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button className="btn btn-primary text-xs">Botón Primario</button>
                  <button className="btn btn-secondary text-xs">Botón Secundario</button>
                  <span className="badge badge-success text-xs">Estado Activo</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'billing' && (
        <Card>
          <CardHeader title="Series de Comprobantes Configuradas" subtitle="Series activas para la emisión de comprobantes electrónicos" />
          <CardBody>
            <div className="space-y-3 max-w-lg">
              {seriesList.length > 0 ? (
                seriesList.map((s, i) => (
                  <div key={i} className="flex justify-between items-center p-4 border rounded-xl" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-app)' }}>
                    <div>
                      <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {s.document_type === 'FACTURA' ? '📋 Factura Electrónica' : '🧾 Boleta de Venta'}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Serie: <strong>{s.series}</strong></div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold" style={{ color: 'var(--primary-600)' }}>
                        Próximo: {s.series}-{String(s.next_number).padStart(5, '0')}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex justify-between items-center p-4 border rounded-xl" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-app)' }}>
                    <div>
                      <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>📋 Factura Electrónica</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Serie: <strong>F001</strong></div>
                    </div>
                    <div className="text-xs font-mono font-bold" style={{ color: 'var(--primary-600)' }}>Correlativo actual: —</div>
                  </div>
                  <div className="flex justify-between items-center p-4 border rounded-xl" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-app)' }}>
                    <div>
                      <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>🧾 Boleta de Venta</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Serie: <strong>B001</strong></div>
                    </div>
                    <div className="text-xs font-mono font-bold" style={{ color: 'var(--primary-600)' }}>Correlativo actual: —</div>
                  </div>
                </>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
