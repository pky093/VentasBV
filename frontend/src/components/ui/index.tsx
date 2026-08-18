import React, { useState, useEffect } from 'react';
import { X, Search, ChevronLeft, ChevronRight, AlertCircle, Loader2, Filter } from 'lucide-react';


// Buttons
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  return (
    <button
      className={`btn btn-${variant} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin -ml-1 mr-1.5" size={16} />
      ) : (
        icon && <span className="inline-flex items-center">{icon}</span>
      )}
      {children}
    </button>
  );
};

// Card Components
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`card ${className}`}>{children}</div>
);

export const CardHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({
  title,
  subtitle,
  action,
}) => (
  <div className="card-header flex justify-between items-center">
    <div>
      <h3 className="font-bold text-base text-primary">{title}</h3>
      {subtitle && <p className="text-xs text-secondary mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`card-body ${className}`}>{children}</div>
);

// Badge
export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}> = ({ children, variant = 'primary', icon, className = '' }) => (
  <span className={`badge badge-${variant} ${className}`}>
    {icon && <span className="inline-flex items-center">{icon}</span>}
    {children}
  </span>
);

// Page Header Component
export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <div className="page-header flex justify-between items-center mb-6">
    <div>
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {action && <div className="flex gap-2 flex-wrap items-center">{action}</div>}
  </div>
);

// Stat Card Widget
export const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  trend?: string;
  trendType?: 'up' | 'down';
}> = ({ title, value, icon, variant = 'primary', trend }) => (
  <div className="stat-card">
    <div className={`stat-icon stat-icon-${variant}`}>{icon}</div>
    <div className="stat-content flex-1">
      <div className="stat-label">{title}</div>
      <div className="stat-value">{value}</div>
      {trend && (
        <div className="stat-trend stat-trend-up">
          {trend}
        </div>
      )}
    </div>
  </div>
);

// Modal Dialog
export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClass =
    size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : size === 'xl' ? 'max-w-6xl' : 'max-w-xl';

  return (
    <div className="modal-overlay">
      <div className={`modal-content ${sizeClass}`}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button onClick={onClose} className="icon-btn btn-ghost" title="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

// Data Table Component
export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = 'Buscar registros...',
  actions,
  loading = false,
  emptyMessage = 'No se encontraron registros',
  initialSearch = '',
}: {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  actions?: (row: T) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  initialSearch?: string;
}) {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setSearchTerm(initialSearch);
  }, [initialSearch]);

  const filteredData = data.filter((row) =>
    Object.values(row).some(
      (val) => val && String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="card overflow-hidden">
      {searchable && (
        <div className="p-4 border-b border-color bg-surface flex flex-wrap justify-between items-center gap-4">
          <div className="header-search">
            <Search size={16} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="text-xs text-secondary font-medium flex items-center gap-2">
            <Filter size={14} />
            <span>Total: <strong>{filteredData.length}</strong> registros</span>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
              {actions && <th className="text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12">
                  <Loader2 className="animate-spin mx-auto text-primary mb-2" size={28} />
                  <span className="text-sm text-secondary">Cargando información...</span>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12">
                  <AlertCircle className="mx-auto text-muted mb-2" size={32} />
                  <span className="text-sm font-medium text-secondary">{emptyMessage}</span>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, i) => (
                <tr key={row.id || i}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row) : row[col.key] ?? '-'}
                    </td>
                  ))}
                  {actions && <td className="text-right">{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-color bg-surface-hover flex justify-between items-center">
          <span className="text-xs text-secondary font-medium">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong>
          </span>
          <div className="flex gap-1">
            <button
              className="btn btn-sm btn-secondary"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              className="btn btn-sm btn-secondary"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Navigation Tabs
export interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'pills' | 'underline';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
}) => {
  const isPills = variant === 'pills';
  return (
    <div className={isPills ? 'tab-list-pills' : 'tab-list-underline'}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={
              isPills
                ? `tab-btn-pill ${isActive ? 'active' : ''}`
                : `tab-btn-underline ${isActive ? 'active' : ''}`
            }
          >
            {tab.icon && <span className="tab-icon">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};