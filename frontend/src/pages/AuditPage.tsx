import React, { useState, useEffect } from 'react';
import { Activity, Shield, User, Clock, Store, RefreshCw, Laptop, Search, FileText } from 'lucide-react';
import { PageHeader, Button, Badge, DataTable, SuggestionChip, Card } from '../components/ui';
import { auditService, AuditLogEntry } from '../lib/db-services';

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const data = await auditService.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const renderActionBadge = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('VENTA') || act.includes('POS')) {
      return <Badge variant="success" className="font-extrabold px-2.5 py-0.5">VENTA POS</Badge>;
    }
    if (act.includes('STOCK') || act.includes('AJUSTE') || act.includes('KARDEX')) {
      return <Badge variant="warning" className="font-extrabold px-2.5 py-0.5">AJUSTE STOCK</Badge>;
    }
    if (act.includes('TRASPASO') || act.includes('TRANSFER')) {
      return <Badge variant="primary" className="font-extrabold px-2.5 py-0.5">TRASPASO</Badge>;
    }
    if (act.includes('LOGIN') || act.includes('AUTH') || act.includes('SESION')) {
      return <Badge variant="primary" className="font-extrabold px-2.5 py-0.5">LOGIN</Badge>;
    }
    if (act.includes('CAJA')) {
      return <Badge variant="success" className="font-extrabold px-2.5 py-0.5">CAJA CHICA</Badge>;
    }
    if (act === 'INSERT' || act.includes('CREAR')) {
      return <Badge variant="success" className="font-extrabold px-2.5 py-0.5">CREAR</Badge>;
    }
    if (act === 'UPDATE' || act.includes('MODIFICAR') || act.includes('EDIT')) {
      return <Badge variant="warning" className="font-extrabold px-2.5 py-0.5">MODIFICAR</Badge>;
    }
    if (act === 'DELETE' || act.includes('ELIMINAR') || act.includes('ANULAR')) {
      return <Badge variant="danger" className="font-extrabold px-2.5 py-0.5">ELIMINAR</Badge>;
    }
    return <Badge variant="neutral" className="font-extrabold px-2.5 py-0.5">{act}</Badge>;
  };

  const columns = [
    {
      key: 'time',
      header: 'Fecha y Hora',
      render: (r: AuditLogEntry) => (
        <div className="flex items-center gap-1.5 text-xs text-secondary font-mono">
          <Clock size={13} className="text-primary-500 shrink-0" />
          <span>{r.time}</span>
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'Usuario Actor',
      render: (r: AuditLogEntry) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400 flex items-center justify-center font-bold text-xs shrink-0">
            {r.actor.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-bold text-sm text-primary block leading-tight">{r.actor}</span>
            {r.username && (
              <span className="text-[10px] text-secondary font-medium">@{r.username}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Acción Realizada',
      render: (r: AuditLogEntry) => renderActionBadge(r.action),
    },
    {
      key: 'branchName',
      header: 'Sucursal',
      render: (r: AuditLogEntry) => (
        <SuggestionChip
          label={r.branchName || 'Sede Principal'}
          size="sm"
          className="font-semibold"
        />
      ),
    },
    {
      key: 'description',
      header: 'Detalle de la Operación',
      render: (r: AuditLogEntry) => (
        <span className="text-xs text-primary font-medium block leading-snug">
          {r.description}
        </span>
      ),
    },
    {
      key: 'ip',
      header: 'Dirección IP / Origen',
      render: (r: AuditLogEntry) => (
        <span className="text-xs text-secondary font-mono">
          {r.ip}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registro de Auditoría de Sistema"
        subtitle="Trazabilidad inalterable de todas las operaciones realizadas por los usuarios y sus respectivas sucursales"
        action={
          <Button
            variant="secondary"
            onClick={loadAuditLogs}
            title="Recargar logs de auditoría"
          >
            <RefreshCw size={15} className={`mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar Auditoría
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={logs}
        searchPlaceholder="Buscar por usuario, sucursal, acción o detalle..."
        loading={isLoading}
      />
    </div>
  );
}

