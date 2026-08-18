import React, { useState } from 'react';
import { Activity, Shield, User, Clock, FileText } from 'lucide-react';
import { PageHeader, Badge, DataTable } from '../components/ui';

interface AuditLog {
  id: string;
  time: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  ip: string;
}

export default function AuditPage() {
  const [logs] = useState<AuditLog[]>([
    { id: '1', time: '2026-08-16 15:40:12', actor: 'Carlos Mendoza', action: 'INSERT', entity: 'sales', entityId: 'v-000104', ip: '192.168.1.45' },
    { id: '2', time: '2026-08-16 14:15:02', actor: 'Super Administrador', action: 'UPDATE', entity: 'tenants', entityId: 't-main', ip: '190.235.12.89' },
    { id: '3', time: '2026-08-16 11:30:44', actor: 'Ana Sofía Torres', action: 'INSERT', entity: 'inventory_movements', entityId: 'inv-882', ip: '192.168.1.80' },
  ]);

  const columns = [
    { key: 'time', header: 'Fecha y Hora', render: (r: AuditLog) => <span className="text-xs text-secondary font-mono">{r.time}</span> },
    {
      key: 'actor',
      header: 'Usuario Actor',
      render: (r: AuditLog) => (
        <div className="flex items-center gap-2">
          <User size={14} className="text-primary-600" />
          <span className="font-semibold text-sm text-primary-900">{r.actor}</span>
        </div>
      )
    },
    {
      key: 'action',
      header: 'Acción',
      render: (r: AuditLog) => {
        if (r.action === 'INSERT') return <Badge variant="success">CREAR</Badge>;
        if (r.action === 'UPDATE') return <Badge variant="warning">MODIFICAR</Badge>;
        return <Badge variant="danger">ELIMINAR</Badge>;
      }
    },
    { key: 'entity', header: 'Entidad Afectada', render: (r: AuditLog) => <span className="text-xs font-mono bg-neutral-100 px-2 py-0.5 rounded">{r.entity}</span> },
    { key: 'ip', header: 'Dirección IP', render: (r: AuditLog) => <span className="text-xs text-secondary font-mono">{r.ip}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Registro de Auditoría de Sistema"
        subtitle="Trazabilidad inalterable de todas las operaciones realizadas por los usuarios"
      />

      <DataTable
        columns={columns}
        data={logs}
        searchPlaceholder="Filtrar auditoría por usuario o entidad..."
      />
    </div>
  );
}
