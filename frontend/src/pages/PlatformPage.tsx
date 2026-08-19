import React, { useState } from 'react';
import { Building2, Plus, Shield, CheckCircle, Power, Globe, Key, User, Lock, ExternalLink } from 'lucide-react';
import { Button, Badge, DataTable, Modal } from '../components/ui';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

interface TenantCompany {
  id: string;
  name: string;
  ruc: string;
  adminEmail: string;
  adminName: string;
  plan: string;
  active: boolean;
  createdAt: string;
}

export default function PlatformPage() {
  const [tenants, setTenants] = useState<TenantCompany[]>([
    { id: '1', name: 'MotoRS S.A.C.', ruc: '20998877665', adminEmail: 'admin@motors.pe', adminName: 'Admin MotoRS', plan: 'ENTERPRISE', active: true, createdAt: '2026-08-16' },
    { id: '2', name: 'Importaciones y Novedades SAC', ruc: '20123456789', adminEmail: 'contacto@novedades.pe', adminName: 'Carlos Admin', plan: 'PRO', active: true, createdAt: '2026-08-10' },
    { id: '3', name: 'Comercial San Juan E.I.R.L.', ruc: '20554433221', adminEmail: 'admin@sanjuan.pe', adminName: 'Juan Pérez', plan: 'BASIC', active: true, createdAt: '2026-08-01' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form fields for creating a new Company & its initial SuperAdmin
  const [companyName, setCompanyName] = useState('');
  const [ruc, setRuc] = useState('');
  const [plan, setPlan] = useState('ENTERPRISE');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const navigate = useNavigate();

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !ruc.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      alert('Ingresa la Razón Social, RUC, Correo y Contraseña del Super Admin.');
      return;
    }

    const newCompany: TenantCompany = {
      id: `tenant-${Date.now()}`,
      name: companyName,
      ruc,
      adminEmail,
      adminName: adminName || 'Super Admin',
      plan,
      active: true,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setTenants([newCompany, ...tenants]);
    setIsModalOpen(false);

    Swal.fire({
      title: '¡Empresa y Super Admin Registrados!',
      html: `Se creó la empresa <b>${companyName}</b> (RUC: ${ruc}) de forma exitosa.<br/><br/><span class="text-xs text-blue-600 font-bold">Credenciales del Super Admin:</span><br/><code class="text-xs">${adminEmail}</code> | <code class="text-xs">Pass: ${adminPassword}</code>`,
      icon: 'success',
      confirmButtonColor: '#2563eb',
    });

    // Reset form
    setCompanyName('');
    setRuc('');
    setAdminName('');
    setAdminEmail('');
    setAdminPassword('');
  };

  const columns = [
    {
      key: 'name',
      header: 'Empresa / Razón Social',
      render: (r: TenantCompany) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <div className="font-bold text-primary text-sm">{r.name}</div>
            <div className="text-xs text-secondary font-mono">RUC: {r.ruc}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'adminEmail',
      header: 'Super Admin Asignado',
      render: (r: TenantCompany) => (
        <div>
          <div className="text-xs font-bold text-primary">{r.adminName}</div>
          <div className="text-xs text-secondary">{r.adminEmail}</div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan SaaS',
      render: (r: TenantCompany) => (
        <Badge variant={r.plan === 'ENTERPRISE' ? 'primary' : r.plan === 'PRO' ? 'info' : 'secondary'}>
          {r.plan}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Fecha Registro',
      render: (r: TenantCompany) => <span className="text-xs text-secondary font-mono">{r.createdAt}</span>,
    },
    {
      key: 'active',
      header: 'Estado',
      render: (r: TenantCompany) => (
        <Badge variant={r.active ? 'success' : 'danger'}>
          {r.active ? 'Activo' : 'Suspendido'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-color">
        <div>
          <div className="flex items-center gap-2">
            <Globe size={26} className="text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-black text-primary tracking-tight">Consola de Plataforma SaaS Multi-Tenant</h1>
          </div>
          <p className="text-xs text-secondary mt-1">
            Gestión global de empresas (tenants), licencias y registro de nuevas organizaciones con su Super Admin.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/app')}>
            <ExternalLink size={16} className="mr-1.5" /> Ir al Sistema Demo
          </Button>
          <Button variant="primary" icon={<Plus size={18} />} onClick={() => setIsModalOpen(true)}>
            Registrar Nueva Empresa
          </Button>
        </div>
      </div>

      {/* Tenants Table */}
      <DataTable
        columns={columns}
        data={tenants}
        searchPlaceholder="Buscar empresa por RUC, nombre o correo..."
        actions={(row) => (
          <div className="flex gap-2 justify-end">
            <button
              className={`p-1.5 rounded-lg border border-color text-xs font-bold ${
                row.active ? 'text-danger-600 hover:bg-danger-50' : 'text-emerald-600 hover:bg-emerald-50'
              }`}
              onClick={() => setTenants(tenants.map((t) => (t.id === row.id ? { ...t, active: !t.active } : t)))}
              title={row.active ? 'Suspender Empresa' : 'Activar Empresa'}
            >
              <Power size={16} />
            </button>
          </div>
        )}
      />

      {/* Modal to Register New Company and its Super Admin */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Nueva Empresa en el SaaS"
        size="lg"
      >
        <form onSubmit={handleCreateCompany} className="space-y-5">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-700 dark:text-blue-300 font-medium">
            Al registrar una nueva empresa se creará automáticamente su espacio de trabajo aislado por RUC y la cuenta con rol Super Admin principal para su administración.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label font-bold text-xs">Razón Social / Nombre Empresa</label>
              <input
                type="text"
                className="form-control text-xs"
                placeholder="Ej. MotoRS Perú S.A.C."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label font-bold text-xs">RUC de la Empresa (11 dígitos)</label>
              <input
                type="text"
                maxLength={11}
                className="form-control text-xs font-mono"
                placeholder="20601234567"
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label font-bold text-xs">Plan SaaS</label>
            <select className="form-control text-xs font-bold" value={plan} onChange={(e) => setPlan(e.target.value)}>
              <option value="ENTERPRISE">ENTERPRISE (Ilimitado + Multi-Sede)</option>
              <option value="PRO">PRO (Hasta 5 Sedes)</option>
              <option value="BASIC">BASIC (Sede Única)</option>
            </select>
          </div>

          <div className="border-t border-color pt-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
              <Shield size={14} className="text-blue-600" /> Credenciales del Super Admin de la Empresa
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label font-bold text-xs">Nombre Completo Super Admin</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  placeholder="Ej. Juan Pérez (Administrador General)"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label font-bold text-xs">Correo del Super Admin</label>
                <input
                  type="email"
                  className="form-control text-xs"
                  placeholder="admin@empresa.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group mt-3">
              <label className="form-label font-bold text-xs">Contraseña Inicial</label>
              <input
                type="password"
                className="form-control text-xs font-mono"
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" icon={<Plus size={16} />}>
              Crear Empresa & Super Admin
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
