import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, Shield, User, Clock, RefreshCw, ShoppingCart, Send, Layers,
  ArrowLeftRight, Lock, Unlock, DollarSign, Receipt, PlusCircle, Edit3,
  Trash2, Settings, Bot, UserCheck, ShieldAlert, LogIn, LogOut, AlertTriangle, FileText
} from 'lucide-react';
import { PageHeader, Button, Badge, DataTable, SuggestionChip, StatCard, Tabs } from '../components/ui';
import { auditService, AuditLogEntry } from '../lib/db-services';

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');

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

  const tabs = [
    { id: 'ALL', label: 'Todas las Acciones' },
    { id: 'AUTH', label: 'Sesión & Accesos' },
    { id: 'SALES', label: 'Ventas & SUNAT' },
    { id: 'INVENTORY', label: 'Inventario & Stock' },
    { id: 'CASH', label: 'Caja & Gastos' },
    { id: 'CATALOG', label: 'Catálogo & Clientes' },
    { id: 'USERS', label: 'Usuarios & Roles' },
  ];

  // Filter logs by selected category
  const filteredLogs = useMemo(() => {
    if (activeCategory === 'ALL') return logs;
    return logs.filter((log) => {
      const act = (log.action || '').toUpperCase();
      const entity = (log.entityType || '').toLowerCase();

      if (activeCategory === 'AUTH') {
        return act.includes('SESI') || act.includes('LOGIN') || act.includes('AUTH') || act.includes('ACCESO');
      }
      if (activeCategory === 'SALES') {
        return act.includes('VENTA') || act.includes('SUNAT') || act.includes('NOTA_CREDITO') || act.includes('ANULACI') || entity === 'sales' || entity === 'contracts';
      }
      if (activeCategory === 'INVENTORY') {
        return act.includes('STOCK') || act.includes('TRASPASO') || act.includes('AJUSTE') || act.includes('KARDEX') || entity === 'inventory';
      }
      if (activeCategory === 'CASH') {
        return act.includes('CAJA') || act.includes('GASTO') || entity === 'cash_registers' || entity === 'cash_movements' || entity === 'expenses';
      }
      if (activeCategory === 'CATALOG') {
        return entity === 'products' || entity === 'categories' || entity === 'brands' || entity === 'models' || entity === 'suppliers' || entity === 'customers';
      }
      if (activeCategory === 'USERS') {
        return entity === 'users' || entity === 'roles' || entity === 'profiles' || act.includes('PERMISO') || act.includes('USUARIO');
      }
      return true;
    });
  }, [logs, activeCategory]);

  // Metrics
  const metrics = useMemo(() => {
    const totalOps = logs.length;
    const humanActors = new Set(logs.map(l => l.actor).filter(a => a && !a.toLowerCase().includes('sistema')));
    const uniqueActors = humanActors.size > 0 ? humanActors.size : (totalOps > 0 ? 1 : 0);
    const salesCount = logs.filter(l => l.action.toUpperCase().includes('VENTA')).length;
    const lastOpTime = logs.length > 0 ? logs[0].time : 'Sin actividad';

    return {
      totalOps,
      uniqueActors,
      salesCount,
      lastOpTime,
    };
  }, [logs]);

  const renderActionBadge = (action: string) => {
    const act = (action || '').toUpperCase();

    if (act === 'INICIO DE SESIÓN' || act.includes('INICIO')) {
      return (
        <Badge variant="primary" icon={<LogIn size={12} className="inline mr-1" />}>
          INICIO DE SESIÓN
        </Badge>
      );
    }
    if (act === 'CIERRE DE SESIÓN' || act.includes('CIERRE DE')) {
      return (
        <Badge variant="neutral" icon={<LogOut size={12} className="inline mr-1" />}>
          CIERRE DE SESIÓN
        </Badge>
      );
    }
    if (act.includes('FALLIDO') || act.includes('ACCESO')) {
      return (
        <Badge variant="danger" icon={<AlertTriangle size={12} className="inline mr-1" />}>
          ACCESO FALLIDO
        </Badge>
      );
    }
    if (act.includes('VENTA') || act.includes('POS')) {
      return (
        <Badge variant="success" icon={<ShoppingCart size={12} className="inline mr-1" />}>
          VENTA POS
        </Badge>
      );
    }
    if (act.includes('SUNAT')) {
      return (
        <Badge variant="primary" icon={<Send size={12} className="inline mr-1" />}>
          ENVÍO SUNAT
        </Badge>
      );
    }
    if (act.includes('NOTA_CREDITO') || act.includes('CRÉDITO')) {
      return (
        <Badge variant="warning" icon={<FileText size={12} className="inline mr-1" />}>
          NOTA DE CRÉDITO
        </Badge>
      );
    }
    if (act.includes('ANULACI')) {
      return (
        <Badge variant="danger" icon={<ShieldAlert size={12} className="inline mr-1" />}>
          ANULACIÓN
        </Badge>
      );
    }
    if (act.includes('STOCK') || act.includes('AJUSTE')) {
      return (
        <Badge variant="warning" icon={<Layers size={12} className="inline mr-1" />}>
          AJUSTE STOCK
        </Badge>
      );
    }
    if (act.includes('TRASPASO') || act.includes('TRANSFER')) {
      return (
        <Badge variant="info" icon={<ArrowLeftRight size={12} className="inline mr-1" />}>
          TRASPASO
        </Badge>
      );
    }
    if (act === 'APERTURA CAJA') {
      return (
        <Badge variant="success" icon={<Unlock size={12} className="inline mr-1" />}>
          APERTURA CAJA
        </Badge>
      );
    }
    if (act === 'CIERRE CAJA') {
      return (
        <Badge variant="neutral" icon={<Lock size={12} className="inline mr-1" />}>
          CIERRE CAJA
        </Badge>
      );
    }
    if (act === 'MOVIMIENTO CAJA') {
      return (
        <Badge variant="info" icon={<DollarSign size={12} className="inline mr-1" />}>
          MOVIMIENTO CAJA
        </Badge>
      );
    }
    if (act.includes('GASTO')) {
      return (
        <Badge variant="danger" icon={<Receipt size={12} className="inline mr-1" />}>
          GASTO OPERATIVO
        </Badge>
      );
    }
    if (act === 'INSERT' || act.includes('CREAR')) {
      return (
        <Badge variant="success" icon={<PlusCircle size={12} className="inline mr-1" />}>
          CREAR
        </Badge>
      );
    }
    if (act === 'UPDATE' || act.includes('MODIFICAR') || act.includes('EDIT')) {
      return (
        <Badge variant="warning" icon={<Edit3 size={12} className="inline mr-1" />}>
          MODIFICAR
        </Badge>
      );
    }
    if (act === 'DELETE' || act.includes('ELIMINAR')) {
      return (
        <Badge variant="danger" icon={<Trash2 size={12} className="inline mr-1" />}>
          ELIMINAR
        </Badge>
      );
    }
    if (act.includes('CONFIG')) {
      return (
        <Badge variant="neutral" icon={<Settings size={12} className="inline mr-1" />}>
          CONFIGURACIÓN
        </Badge>
      );
    }
    return <Badge variant="neutral">{act}</Badge>;
  };

  const columns = [
    {
      key: 'time',
      header: 'FECHA Y HORA',
      render: (r: AuditLogEntry) => (
        <div className="flex items-center gap-1.5 text-xs text-secondary font-mono">
          <Clock size={13} className="text-primary-500 shrink-0" />
          <span className="font-medium whitespace-nowrap">{r.time}</span>
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'USUARIO ACTOR',
      render: (r: AuditLogEntry) => {
        const isSystem = r.actor.toLowerCase().includes('sistema');
        return (
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              isSystem
                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                : 'bg-primary-100 text-primary-700 dark:bg-primary-950/70 dark:text-primary-300 border border-primary-200 dark:border-primary-800'
            }`}>
              {isSystem ? <Bot size={15} /> : (r.actor.charAt(0).toUpperCase() || <User size={15} />)}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-sm text-primary block leading-tight truncate">
                {r.actor}
              </span>
              <span className="text-[11px] text-secondary font-medium block">
                {r.username ? `@${r.username}` : (isSystem ? '@sistema' : '')}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'action',
      header: 'ACCIÓN REALIZADA',
      render: (r: AuditLogEntry) => renderActionBadge(r.action),
    },
    {
      key: 'branchName',
      header: 'SUCURSAL',
      render: (r: AuditLogEntry) => (
        <SuggestionChip
          label={r.branchName || 'Sede Principal'}
          size="sm"
          className="font-semibold text-xs whitespace-nowrap"
        />
      ),
    },
    {
      key: 'description',
      header: 'DETALLE DE LA OPERACIÓN',
      render: (r: AuditLogEntry) => (
        <span className="text-xs text-primary font-medium block leading-snug">
          {r.description}
        </span>
      ),
    },
    {
      key: 'ip',
      header: 'DIRECCIÓN IP / ORIGEN',
      render: (r: AuditLogEntry) => (
        <span className="text-xs text-secondary font-mono whitespace-nowrap">
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

      {/* KPI Stat Cards (Matching system components) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Operaciones"
          value={metrics.totalOps}
          icon={<Activity size={20} />}
          variant="primary"
        />
        <StatCard
          title="Usuarios Activos"
          value={metrics.uniqueActors}
          icon={<UserCheck size={20} />}
          variant="success"
        />
        <StatCard
          title="Ventas & Boletas"
          value={metrics.salesCount}
          icon={<ShoppingCart size={20} />}
          variant="warning"
        />
        <StatCard
          title="Última Operación"
          value={metrics.lastOpTime}
          icon={<Clock size={20} />}
          variant="primary"
        />
      </div>

      {/* Standard System Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeCategory}
        onChange={setActiveCategory}
        variant="pills"
      />

      {/* Standard System Data Table */}
      <DataTable
        columns={columns}
        data={filteredLogs}
        searchPlaceholder="Buscar por usuario, sucursal, acción o detalle de operación..."
        loading={isLoading}
      />
    </div>
  );
}

