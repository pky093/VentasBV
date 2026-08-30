import React from 'react';
import {
  Building2,
  User,
  MapPin,
  Calendar,
  Pencil,
  Power,
  RotateCcw,
  ShieldCheck,
  FileCode2,
} from 'lucide-react';
import { Badge, Button } from '../ui';
import type { TenantCompany } from '../../pages/PlatformPage';

interface TenantCardProps {
  tenant: TenantCompany;
  isEditing: boolean;
  onEdit: (tenant: TenantCompany) => void;
  onToggleStatus: (tenant: TenantCompany) => void;
  onEnterTenant?: (tenant: TenantCompany) => void;
}

export const TenantCard: React.FC<TenantCardProps> = ({
  tenant,
  isEditing,
  onEdit,
  onToggleStatus,
  onEnterTenant,
}) => {
  return (
    <div className={`tenant-card ${!tenant.active ? 'tenant-card--disabled' : ''} ${isEditing ? 'tenant-card--editing' : ''}`}>
      <div className="tenant-card__mark">
        <Building2 size={24} />
      </div>

      <div className="tenant-card__body">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="eyebrow" style={{ marginBottom: 0, fontSize: '0.75rem' }}>
              RUC <strong>{tenant.ruc}</strong>
            </span>

            {tenant.sunatEnv === 'PRODUCTION' ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono flex items-center gap-1">
                <ShieldCheck size={12} /> SUNAT PROD
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono">
                SUNAT BETA
              </span>
            )}
          </div>

          <h3>
            {tenant.name}
          </h3>
          <span className="tenant-card__legal">
            {tenant.legalName || 'Sin razón social registrada'}
          </span>
        </div>

        <div className="tenant-card__meta">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={tenant.active ? 'success' : 'danger'}>
              {tenant.active ? 'Habilitada' : 'Suspendida'}
            </Badge>
            <Badge
              variant={
                tenant.plan === 'ENTERPRISE'
                  ? 'primary'
                  : tenant.plan === 'PRO'
                  ? 'info'
                  : 'neutral'
              }
            >
              {tenant.plan}
            </Badge>
          </div>

          <div className="tenant-card__meta-item">
            <User size={13} className="text-amber-500 shrink-0" />
            <span>
              <strong>{tenant.adminName}</strong>{' '}
              <span className="text-secondary">({tenant.adminEmail})</span>
            </span>
          </div>

          <div className="tenant-card__meta-item">
            <FileCode2 size={13} className="text-blue-500 shrink-0" />
            <span className="font-mono text-[11px]">
              Series: <strong>{tenant.invoiceSeries || 'F001'}</strong> / <strong>{tenant.receiptSeries || 'B001'}</strong> ({tenant.establishmentCode || '0000'})
            </span>
          </div>

          {tenant.address && (
            <div className="tenant-card__meta-item">
              <MapPin size={13} className="text-secondary shrink-0" />
              <span>{tenant.address}</span>
            </div>
          )}

          <div className="tenant-card__meta-item">
            <Calendar size={13} className="text-secondary shrink-0" />
            <span className="font-mono text-[11px] text-secondary">
              Registro: {tenant.createdAt}
            </span>
          </div>
        </div>
      </div>

      <div className="tenant-card__actions">
        {onEnterTenant && tenant.active && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEnterTenant(tenant)}
            title="Administrar empresa en el sistema"
          >
            Administrar
          </Button>
        )}

        <Button
          type="button"
          variant={isEditing ? 'primary' : 'ghost'}
          size="sm"
          icon={<Pencil size={14} />}
          onClick={() => onEdit(tenant)}
        >
          {isEditing ? 'Editando...' : 'Editar'}
        </Button>

        <Button
          type="button"
          variant={tenant.active ? 'danger' : 'success'}
          size="sm"
          icon={tenant.active ? <Power size={14} /> : <RotateCcw size={14} />}
          onClick={() => onToggleStatus(tenant)}
        >
          {tenant.active ? 'Suspender' : 'Activar'}
        </Button>
      </div>
    </div>
  );
};

export default TenantCard;
