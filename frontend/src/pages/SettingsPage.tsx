import React, { useState, useEffect } from 'react';
import { Building2, Palette, DollarSign, FileText, Save, Check, Loader2, RefreshCw } from 'lucide-react';
import { PageHeader, Button, Card, CardHeader, CardBody, Tabs } from '../components/ui';
import { settingsService } from '../lib/db-services';
import { applyTenantTheme, getPresets } from '../lib/tenant-theme';
import Swal from 'sweetalert2';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePreset, setActivePreset] = useState('indigo_gold');

  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    trade_name: '',
    ruc: '',
    phone: '',
    email: '',
    address: '',
    currency_code: 'PEN',
    tax_rate: '18.00',
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
          currency_code: tenant.currency_code || 'PEN',
          tax_rate: tenant.tax_rate?.toString() || '18.00',
        });

        // Load active color preset
        const savedPreset = tenant.primary_color || localStorage.getItem('color_preset') || 'indigo_gold';
        setActivePreset(savedPreset);
        applyTenantTheme(savedPreset);
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
        currency_code: companyInfo.currency_code,
        tax_rate: parseFloat(companyInfo.tax_rate) || 18.00,
        primary_color: activePreset,
      });

      if (success) {
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

  const handlePresetChange = async (presetId: string) => {
    setActivePreset(presetId);
    applyTenantTheme(presetId);
    // Save to DB immediately
    await settingsService.updateTenantInfo({ primary_color: presetId });
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
        subtitle="Ajustes generales, moneda principal, IGV, series de facturación y apariencia"
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
          <CardHeader title="Información General" subtitle="Datos visibles en comprobantes y reportes — estos datos aparecerán en boletas y facturas" />
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
                    placeholder="Ej: Mi Empresa S.A.C."
                  />
                </div>
                <div>
                  <label className="form-label">Nombre Comercial</label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyInfo.trade_name}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, trade_name: e.target.value })}
                    placeholder="Ej: MiMarca"
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
        <Card>
          <CardHeader title="Apariencia y Tema de Marca" subtitle="Personaliza los colores de la interfaz — los cambios se aplican inmediatamente" />
          <CardBody>
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="form-label mb-3" style={{ display: 'block' }}>Paleta de Colores Preset</label>
                <div className="grid grid-cols-2 gap-4" style={{ maxWidth: '500px' }}>
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetChange(preset.id)}
                      className="border-none"
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        textAlign: 'left' as const,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: activePreset === preset.id ? '2px solid var(--primary-600)' : '2px solid var(--border-color)',
                        background: activePreset === preset.id ? 'var(--primary-50, #eff6ff)' : 'var(--bg-surface)',
                        transform: activePreset === preset.id ? 'scale(1.02)' : 'scale(1)',
                        boxShadow: activePreset === preset.id ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                      }}
                    >
                      <div style={{
                        fontWeight: 700,
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        {activePreset === preset.id && <Check size={14} style={{ color: 'var(--primary-600)' }} />}
                        {preset.name}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: preset.colors[0],
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }} />
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: preset.colors[1],
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }} />
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase' as const }}>
                  Vista Previa del Tema Activo
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                  <div style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--primary-600)', color: '#fff', fontSize: '12px', fontWeight: 700 }}>
                    Botón Primario
                  </div>
                  <div style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--primary-100, #dbeafe)', color: 'var(--primary-700)', fontSize: '12px', fontWeight: 700 }}>
                    Badge Info
                  </div>
                  <div style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--accent-500, #10b981)', color: '#fff', fontSize: '12px', fontWeight: 700 }}>
                    Accent
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
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
