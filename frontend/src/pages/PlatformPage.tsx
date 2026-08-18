import React, { useState } from 'react';
import { Building2, Plus, Shield, CheckCircle, Power, Globe, Key } from 'lucide-react';
import { PageHeader, Button, Badge, DataTable, Modal } from '../components/ui';

interface TenantCompany {
  id: string;
  name: string;
  ruc: string;
  email: string;
  plan: string;
  active: boolean;
  createdAt: string;
}

export default function PlatformPage() {
  const [tenants, setTenants] = useState<TenantCompany[]>([
    { id: '1', name: 'Ventas B&V S.A.C.', ruc: '20998877665', email: 'admin@ventasbv.pe', plan: 'ENTERPRISE', active: true, createdAt: '2026-08-16' },
    { id: '2', name: 'Importaciones y Novedades SAC', ruc: '20123456789', email: 'contacto@novedades.pe', plan: 'PRO', active: true, createdAt: '2026-08-10' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const columns = [
    {
      key: 'name',
      header: 'Empresa Cliente (Tenant)',
      render: (r: TenantCompany) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-100 text-accent-700 flex items-center justify-center font-bold">
            <Building2 size={18} />
          </div>
          <div>
            <div className="font-bold text-primary-900">{r.name}</div>
            <div className="text-xs text-secondary">RUC: {r.ruc} • {r.email}</div>
          </div>
        </div>
      )
    },
    { key: 'plan', header: 'Plan SaaS', render: (r: TenantCompany) => <Badge variant="primary">{r.plan}</Badge> },
    { key: 'createdAt', header: 'Fecha Alta', render: (r: TenantCompany) => <span className="text-xs text-secondary">{r.createdAt}</span> },
    {
      key: 'active',
      header: 'Estado',
      render: (r: TenantCompany) => <Badge variant={r.active ? 'success' : 'danger'}>{r.active ? 'Activo' : 'Suspendido'}</Badge>
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-bg-app">
      <div className="flex justify-between items-center mb-8 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Globe size={24} className="text-accent-500" />
            <h1 className="text-3xl font-bold text-primary-900">Console Superadministrador SaaS</h1>
          </div>
          <p className="text-sm text-secondary">Administración global de empresas (tenants) e instancias independientes</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} className="mr-1.5 inline" /> Registrar Nueva Empresa
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={tenants}
        searchPlaceholder="Buscar por RUC o empresa..."
        actions={(row) => (
          <div className="flex gap-2 justify-end">
            <button
              className={`p-1.5 rounded-md ${row.active ? 'text-danger-600 hover:bg-danger-50' : 'text-success-600 hover:bg-success-50'}`}
              onClick={() => setTenants(tenants.map(t => t.id === row.id ? { ...t, active: !t.active } : t))}
              title={row.active ? 'Suspender Empresa' : 'Activar Empresa'}
            >
              <Power size={16} />
            </button>
          </div>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nueva Empresa en el SaaS"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsModalOpen(false)}>Crear Empresa & Admin</Button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label className="form-label">Nombre de la Empresa</label>
            <input type="text" className="form-control" placeholder="Ej. Comercializadora San Juan" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">RUC</label>
              <input type="text" className="form-control" placeholder="20..." required />
            </div>
            <div>
              <label className="form-label">Correo Administrador Principal</label>
              <input type="email" className="form-control" placeholder="admin@empresa.com" required />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
