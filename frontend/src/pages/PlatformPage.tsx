import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Shield,
  Search,
  Pencil,
  LogOut,
  ExternalLink,
  User,
  ShoppingCart,
  AlertCircle,
  Key,
  FileCode,
  Radio,
  Lock,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button, Field, PageHeader } from '../components/ui';
import { TenantCard } from '../components/platform/TenantCard';
import { tenantsService, TenantCompany, TenantFormValues } from '../lib/db-services';
import Swal from 'sweetalert2';

export type { TenantCompany };

type StatusFilter = 'ALL' | 'ACTIVE' | 'DISABLED';
type FormTab = 'general' | 'sunat' | 'admin';

const defaultFormValues: TenantFormValues = {
  name: '',
  legalName: '',
  ruc: '',
  plan: 'ENTERPRISE',
  address: '',
  phone: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',

  sunatEnv: 'BETA',
  solUser: '',
  solPassword: '',
  certPassword: '',
  certFileName: '',
  clientId: '',
  clientSecret: '',
  establishmentCode: '0000',
  invoiceSeries: 'F001',
  receiptSeries: 'B001',
  creditNoteSeries: 'FC01',
  debitNoteSeries: 'FD01',
  guiaSeries: 'T001',
  ubigeo: '150101',
  urbanization: '',
  department: 'Lima',
  province: 'Lima',
  district: 'Lima',
};

export default function PlatformPage() {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [activeTab, setActiveTab] = useState<FormTab>('general');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [tenants, setTenants] = useState<TenantCompany[]>([]);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const data = await tenantsService.getTenants();
      setTenants(data);
    } catch (err) {
      console.error('Error loading tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const form = useForm<TenantFormValues>({
    defaultValues: defaultFormValues,
  });

  const resetForm = () => {
    setEditingId(null);
    setActiveTab('general');
    form.reset(defaultFormValues);
  };

  const startEditing = (tenant: TenantCompany) => {
    setEditingId(tenant.id);
    setActiveTab('general');
    form.reset({
      name: tenant.name,
      legalName: tenant.legalName || '',
      ruc: tenant.ruc,
      plan: tenant.plan,
      address: tenant.address || '',
      phone: tenant.phone || '',
      adminName: tenant.adminName,
      adminEmail: tenant.adminEmail,
      adminPassword: '',
      sunatEnv: tenant.sunatEnv || 'BETA',
      solUser: tenant.solUser || '',
      solPassword: tenant.solPassword || '',
      certPassword: tenant.certPassword || '',
      certFileName: tenant.certFileName || '',
      clientId: tenant.clientId || '',
      clientSecret: tenant.clientSecret || '',
      establishmentCode: tenant.establishmentCode || '0000',
      invoiceSeries: tenant.invoiceSeries || 'F001',
      receiptSeries: tenant.receiptSeries || 'B001',
      creditNoteSeries: tenant.creditNoteSeries || 'FC01',
      debitNoteSeries: tenant.debitNoteSeries || 'FD01',
      guiaSeries: tenant.guiaSeries || 'T001',
      ubigeo: tenant.ubigeo || '150101',
      urbanization: tenant.urbanization || '',
      department: tenant.department || 'Lima',
      province: tenant.province || 'Lima',
      district: tenant.district || 'Lima',
    });

    const formCard = document.getElementById('platform-form-card');
    if (formCard) {
      formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const onSubmit = async (values: TenantFormValues) => {
    setIsSaving(true);
    try {
      if (editingId) {
        const ok = await tenantsService.updateTenant(editingId, values);
        if (ok) {
          await loadTenants();
          Swal.fire({
            title: '¡Organización y CPE Actualizados!',
            html: `Se guardaron los datos y credenciales SUNAT para <b>${values.name}</b> exitosamente.`,
            icon: 'success',
            confirmButtonColor: '#f59e0b',
          });
          resetForm();
        } else {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar la empresa en la base de datos.',
            icon: 'error',
          });
        }
      } else {
        const newTenant = await tenantsService.createTenant(values);
        if (newTenant) {
          await loadTenants();
          Swal.fire({
            title: '¡Empresa y Configuración SUNAT Creadas!',
            html: `Se registró <b>${values.name}</b> (RUC: ${values.ruc}) con ambiente <b>${values.sunatEnv}</b>.<br/><br/>
                   <span style="font-size:12px; color:#f59e0b; font-weight:bold;">Admin Inicial:</span><br/>
                   <code style="font-size:12px;">${values.adminEmail}</code> | <code style="font-size:12px;">Pass: ${values.adminPassword || '••••••••'}</code>`,
            icon: 'success',
            confirmButtonColor: '#f59e0b',
          });
          resetForm();
        } else {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo crear la empresa en la base de datos.',
            icon: 'error',
          });
        }
      }
    } catch (err: any) {
      console.error('Error in onSubmit:', err);
      Swal.fire({
        title: 'Error inesperado',
        text: err?.message || 'Ocurrió un problema al procesar los datos.',
        icon: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = (tenant: TenantCompany) => {
    const nextStatus = !tenant.active;
    const actionLabel = nextStatus ? 'activar' : 'suspender';

    Swal.fire({
      title: `¿Deseas ${actionLabel} la empresa?`,
      text: nextStatus
        ? `El personal de "${tenant.name}" podrá volver a ingresar y emitir comprobantes.`
        : `El personal de "${tenant.name}" no podrá acceder hasta que sea reactivada.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Sí, ${actionLabel}`,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: nextStatus ? '#10b981' : '#ef4444',
    }).then(async (result) => {
      if (result.isConfirmed) {
        const ok = await tenantsService.toggleTenantStatus(tenant.id, nextStatus, tenant.name);
        if (ok) {
          await loadTenants();
          Swal.fire({
            title: nextStatus ? '¡Empresa Activada!' : '¡Empresa Suspendida!',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo cambiar el estado de la empresa.',
            icon: 'error',
          });
        }
      }
    });
  };

  const handleEnterTenant = (tenant: TenantCompany) => {
    localStorage.setItem('tenant_id', tenant.id);
    localStorage.setItem('tenant_name', tenant.name);
    localStorage.setItem('tenant_ruc', tenant.ruc);
    localStorage.setItem('company_name', tenant.name);
    localStorage.setItem('company_ruc', tenant.ruc);
    navigate('/app');
  };

  const handleLogout = () => {
    localStorage.removeItem('is_logged_in');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_role');
    navigate('/login');
  };

  const filteredTenants = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' ? tenant.active : !tenant.active);
      const searchable = [
        tenant.name,
        tenant.legalName,
        tenant.ruc,
        tenant.adminName,
        tenant.adminEmail,
        tenant.address,
        tenant.sunatEnv,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesStatus && (!term || searchable.includes(term));
    });
  }, [tenants, search, statusFilter]);

  const authUser = localStorage.getItem('auth_user') || 'admin@ventasbv.pe';
  const editingTenant = tenants.find((t) => t.id === editingId);

  return (
    <div className="platform-shell">
      {/* Top Platform Bar */}
      <header className="platform-bar">
        <div className="platform-bar__brand">
          <div className="platform-bar__logo-icon">
            <ShoppingCart size={20} />
          </div>
          <div className="flex items-center">
            <span className="platform-bar__brand-title">B&V Ventas</span>
            <small>Consola de Plataforma</small>
          </div>
        </div>

        <div className="platform-bar__actions">
          <div className="platform-bar__user">
            <User size={15} />
            <span>{authUser}</span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/app')}
            className="platform-bar__btn"
            title="Ir al POS Demo"
          >
            <ExternalLink size={15} />
            <span>Ir al Sistema Demo</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="platform-bar__btn platform-bar__btn-logout"
            title="Cerrar sesión de Superadmin"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Platform Workspace */}
      <main className="platform-workspace">
        <PageHeader
          eyebrow="Control Multi-Tenant & Facturación SUNAT"
          title="Consola de Plataforma SaaS"
          description="Gestión global de empresas (tenants), licencias y configuración de Clave SOL, Certificados Digitales y Series Electrónicas para emisión legal con SUNAT."
        />

        <div className="platform-grid">
          {/* LEFT COLUMN: TENANT LEDGER LIST (Using modular TenantCard components) */}
          <section>
            <div className="platform-list-heading">
              <div>
                <h2>Todas las empresas</h2>
                <span>
                  {loading ? 'Cargando...' : `${filteredTenants.length} de ${tenants.length} registradas`}
                </span>
              </div>

              <div className="platform-filters">
                <div className="search-box-wrap">
                  <Search size={16} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por RUC, nombre o correo..."
                    className="search-box-input"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="filter-select"
                >
                  <option value="ALL">Todas</option>
                  <option value="ACTIVE">Habilitadas</option>
                  <option value="DISABLED">Suspendidas</option>
                </select>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={loadTenants}
                  disabled={loading}
                  icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
                  title="Recargar lista de empresas"
                >
                  Actualizar
                </Button>
              </div>
            </div>

            {/* LEDGER OF CARDS (Using TenantCard Component) */}
            <div className="platform-ledger">
              {loading ? (
                <div className="p-12 text-center bg-surface rounded-2xl border border-color flex flex-col items-center justify-center gap-3">
                  <Loader2 size={32} className="animate-spin text-amber-500" />
                  <p className="text-sm font-semibold text-secondary">
                    Cargando organizaciones y credenciales SUNAT...
                  </p>
                </div>
              ) : filteredTenants.length > 0 ? (
                filteredTenants.map((tenant) => (
                  <TenantCard
                    key={tenant.id}
                    tenant={tenant}
                    isEditing={editingId === tenant.id}
                    onEdit={startEditing}
                    onToggleStatus={toggleStatus}
                    onEnterTenant={handleEnterTenant}
                  />
                ))
              ) : (
                <div className="p-8 text-center bg-surface rounded-2xl border border-color">
                  <AlertCircle size={32} className="mx-auto text-muted mb-2" />
                  <h3 className="text-sm font-bold text-primary">No se encontraron empresas</h3>
                  <p className="text-xs text-secondary mt-1">
                    Prueba cambiando el texto de búsqueda o registra una nueva organización a la derecha.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT COLUMN: STICKY CREATE / EDIT FORM */}
          <aside id="platform-form-card" className="platform-create-card">
            <header>
              <div>
                <p className="eyebrow" style={{ fontSize: '0.7rem' }}>
                  {editingId ? `Editando: ${editingTenant?.name}` : 'Nueva Organización'}
                </p>
                <h2>{editingId ? 'Configuración de Empresa & SUNAT' : 'Registrar Empresa & SUNAT'}</h2>
              </div>
              {editingId ? <Pencil size={20} className="text-amber-500" /> : <Plus size={20} className="text-amber-500" />}
            </header>

            {/* Internal Tab Navigation for Form - Clean Pill Tabs */}
            <div className="platform-form-tabs">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`platform-form-tab ${activeTab === 'general' ? 'platform-form-tab--active' : ''}`}
              >
                <Building2 size={14} />
                <span>General</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sunat')}
                className={`platform-form-tab ${activeTab === 'sunat' ? 'platform-form-tab--active' : ''}`}
              >
                <Shield size={14} />
                <span>Facturación SUNAT (CPE)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`platform-form-tab ${activeTab === 'admin' ? 'platform-form-tab--active' : ''}`}
              >
                <User size={14} />
                <span>Super Admin</span>
              </button>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* TAB 1: GENERAL */}
              {activeTab === 'general' && (
                <>
                  <Field label="Nombre Comercial" error={form.formState.errors.name?.message} required>
                    <input
                      type="text"
                      placeholder="Ej. MotoRS S.A.C."
                      className="platform-input"
                      {...form.register('name', { required: 'El nombre comercial es obligatorio.' })}
                    />
                  </Field>

                  <Field label="Razón Social (según Ficha RUC)" error={form.formState.errors.legalName?.message}>
                    <input
                      type="text"
                      placeholder="Ej. MotoRS Perú S.A.C."
                      className="platform-input"
                      {...form.register('legalName')}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label={editingId ? 'RUC (Identificador Fijo)' : 'RUC de la Empresa'}
                      error={form.formState.errors.ruc?.message}
                      required
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={11}
                        disabled={Boolean(editingId)}
                        placeholder="20601234567"
                        className="platform-input font-mono font-bold"
                        {...form.register('ruc', {
                          required: 'El RUC es obligatorio.',
                          pattern: {
                            value: /^\d{11}$/,
                            message: 'Debe tener exactamente 11 dígitos numéricos.',
                          },
                        })}
                      />
                    </Field>

                    <Field label="Plan SaaS" required>
                      <select
                        className="platform-input font-bold"
                        {...form.register('plan')}
                      >
                        <option value="ENTERPRISE">ENTERPRISE (Ilimitado)</option>
                        <option value="PRO">PRO (Hasta 5 Sedes)</option>
                        <option value="BASIC">BASIC (Sede Única)</option>
                      </select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Dirección Fiscal">
                      <input
                        type="text"
                        placeholder="Av. Principal 123"
                        className="platform-input"
                        {...form.register('address')}
                      />
                    </Field>

                    <Field label="Teléfono de Contacto">
                      <input
                        type="text"
                        placeholder="01 234 5678"
                        className="platform-input"
                        {...form.register('phone')}
                      />
                    </Field>
                  </div>
                </>
              )}

              {/* TAB 2: SUNAT & CPE */}
              {activeTab === 'sunat' && (
                <>
                  <div className="platform-banner">
                    <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      Configura el ambiente de facturación electrónica UBL 2.1 con SUNAT. En <strong>BETA</strong> podrás homologar y probar envíos sin valor tributario.
                    </span>
                  </div>

                  {/* SUNAT Environment Selector */}
                  <Field label="Ambiente de Envío SUNAT" required>
                    <div className="grid grid-cols-2 gap-2.5">
                      <label
                        className={`sunat-env-card ${
                          form.watch('sunatEnv') === 'BETA' ? 'sunat-env-card--active-beta' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          value="BETA"
                          className="hidden"
                          {...form.register('sunatEnv')}
                        />
                        <Radio size={16} className={form.watch('sunatEnv') === 'BETA' ? 'text-amber-600' : 'text-slate-400'} />
                        <div>
                          <div className="text-xs font-bold">BETA / Pruebas</div>
                          <div className="text-[10px] text-slate-500">Homologación y Test</div>
                        </div>
                      </label>

                      <label
                        className={`sunat-env-card ${
                          form.watch('sunatEnv') === 'PRODUCTION' ? 'sunat-env-card--active-prod' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          value="PRODUCTION"
                          className="hidden"
                          {...form.register('sunatEnv')}
                        />
                        <Radio size={16} className={form.watch('sunatEnv') === 'PRODUCTION' ? 'text-emerald-600' : 'text-slate-400'} />
                        <div>
                          <div className="text-xs font-bold">PRODUCCIÓN</div>
                          <div className="text-[10px] text-slate-500">Validez Legal Tributaria</div>
                        </div>
                      </label>
                    </div>
                  </Field>

                  {/* Clave SOL */}
                  <div className="platform-form-section">
                    <div className="platform-form-section__title">
                      <Key size={14} className="text-amber-500" />
                      <span>Credenciales Clave SOL (Usuario Secundario)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Usuario SOL" required>
                        <input
                          type="text"
                          placeholder="Ej. MODDATOS o USER1"
                          className="platform-input font-mono uppercase"
                          {...form.register('solUser')}
                        />
                      </Field>

                      <Field label="Clave SOL" required>
                        <input
                          type="password"
                          placeholder="••••••••"
                          className="platform-input font-mono"
                          {...form.register('solPassword')}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Certificado Digital */}
                  <div className="platform-form-section">
                    <div className="platform-form-section__title">
                      <Lock size={14} className="text-amber-500" />
                      <span>Certificado Digital (.PFX / .P12)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Archivo Certificado (.pfx)">
                        <input
                          type="text"
                          placeholder="certificado.pfx"
                          className="platform-input text-xs font-mono"
                          {...form.register('certFileName')}
                        />
                      </Field>

                      <Field label="Contraseña Certificado">
                        <input
                          type="password"
                          placeholder="••••••••"
                          className="platform-input font-mono"
                          {...form.register('certPassword')}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Series Electrónicas */}
                  <div className="platform-form-section">
                    <div className="platform-form-section__title">
                      <FileCode size={14} className="text-amber-500" />
                      <span>Series Electrónicas & Domicilio Fiscal</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Field label="Factura">
                        <input
                          type="text"
                          placeholder="F001"
                          maxLength={4}
                          className="platform-input text-center font-mono font-bold"
                          {...form.register('invoiceSeries')}
                        />
                      </Field>

                      <Field label="Boleta">
                        <input
                          type="text"
                          placeholder="B001"
                          maxLength={4}
                          className="platform-input text-center font-mono font-bold"
                          {...form.register('receiptSeries')}
                        />
                      </Field>

                      <Field label="Nota Crédito">
                        <input
                          type="text"
                          placeholder="FC01"
                          maxLength={4}
                          className="platform-input text-center font-mono font-bold"
                          {...form.register('creditNoteSeries')}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Cód. Establecimiento SUNAT">
                        <input
                          type="text"
                          placeholder="0000 (Casa Matriz)"
                          maxLength={4}
                          className="platform-input font-mono"
                          {...form.register('establishmentCode')}
                        />
                      </Field>

                      <Field label="Ubigeo (6 dígitos)">
                        <input
                          type="text"
                          placeholder="150101"
                          maxLength={6}
                          className="platform-input font-mono"
                          {...form.register('ubigeo')}
                        />
                      </Field>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 3: ADMIN */}
              {activeTab === 'admin' && (
                <div className="administrator-fields">
                  <div className="administrator-fields__header">
                    <Shield size={15} className="text-amber-500" />
                    <span>Super Admin Principal de la Organización</span>
                  </div>

                  <Field label="Nombre Completo Admin" error={form.formState.errors.adminName?.message} required>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez"
                      className="platform-input"
                      {...form.register('adminName', { required: 'El nombre del admin es obligatorio.' })}
                    />
                  </Field>

                  <Field label="Correo del Admin" error={form.formState.errors.adminEmail?.message} required>
                    <input
                      type="email"
                      placeholder="admin@empresa.pe"
                      className="platform-input"
                      {...form.register('adminEmail', {
                        required: 'El correo es obligatorio.',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Formato de correo no válido.',
                        },
                      })}
                    />
                  </Field>

                  <Field label={editingId ? 'Nueva Contraseña (Opcional)' : 'Contraseña Inicial'} required={!editingId}>
                    <input
                      type="password"
                      placeholder={editingId ? 'Dejar en blanco para conservar contraseña actual' : '••••••••'}
                      className="platform-input font-mono"
                      {...form.register('adminPassword', {
                        required: editingId ? false : 'La contraseña inicial es requerida.',
                      })}
                    />
                  </Field>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="platform-form-actions">
                {editingId && (
                  <Button type="button" variant="ghost" onClick={resetForm} disabled={isSaving}>
                    Cancelar
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  icon={isSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                >
                  {isSaving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Empresa & Admin'}
                </Button>
              </div>
            </form>
          </aside>
        </div>
      </main>
    </div>
  );
}



