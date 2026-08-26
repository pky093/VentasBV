import React from 'react';
import { usePermissions } from '../context/PermissionContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PermissionRouteProps {
  permission?: string;
  children: React.ReactNode;
  fallbackPath?: string;
}

export const PermissionRoute: React.FC<PermissionRouteProps> = ({ 
  permission, 
  children, 
  fallbackPath = '/app' 
}) => {
  const { hasPermission, isLoading, userRole } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-secondary text-sm font-semibold animate-pulse">
          Verificando permisos de acceso...
        </div>
      </div>
    );
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="p-8 max-w-lg mx-auto my-12 text-center bg-surface border border-color rounded-2xl shadow-sm">
        <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200 dark:border-rose-800">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-primary mb-2">Acceso Restringido</h2>
        <p className="text-sm text-secondary mb-4 leading-relaxed">
          Tu usuario con rol <span className="font-bold text-primary">{userRole || 'Vendedor'}</span> no dispone del permiso necesario para visualizar o gestionar este módulo.
        </p>
        <div className="mb-6 p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-300 inline-block">
          Permiso requerido: <span className="text-rose-600 font-bold">{permission}</span>
        </div>
        <div>
          <Link
            to={fallbackPath}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <ArrowLeft size={16} />
            <span>Volver al Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};