import React, { useState, useEffect } from 'react';
import { X, Search, ChevronLeft, ChevronRight, AlertCircle, Loader2, Filter, FileText, Receipt } from 'lucide-react';
export { BVLogo } from './BVLogo';


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
  <div className="page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
    <div>
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {action && <div className="flex gap-2 flex-wrap items-center w-full sm:w-auto justify-start sm:justify-end">{action}</div>}
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
    <div className="modal-overlay p-2 sm:p-4">
      <div className={`modal-content w-full ${sizeClass} max-h-[90vh] flex flex-col`}>
        <div className="modal-header shrink-0">
          <h3 className="modal-title text-base sm:text-lg">{title}</h3>
          <button onClick={onClose} className="icon-btn btn-ghost" title="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body overflow-y-auto flex-1 p-4 sm:p-6">{children}</div>
        {footer && <div className="modal-footer shrink-0">{footer}</div>}
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
  className?: string;
  headerClassName?: string;
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
        <div className="p-3 sm:p-4 border-b border-color bg-surface flex flex-wrap justify-between items-center gap-3">
          <div className="header-search w-full sm:w-64">
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

      {/* Desktop Table View (>=768px) */}
      <div className="table-container data-table-desktop-view">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.headerClassName || ''}>{col.header}</th>
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
                    <td key={col.key} className={col.className || ''}>
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

      {/* Mobile Compact View (<768px) - Structured matching Image 2 reference */}
      <div className="data-table-mobile-view bg-surface rounded-2xl border border-color shadow-sm divide-y divide-color overflow-hidden my-3 mx-2 sm:mx-4">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="animate-spin mx-auto text-primary mb-2" size={28} />
            <span className="text-sm text-secondary">Cargando información...</span>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto text-muted mb-2" size={32} />
            <span className="text-sm font-medium text-secondary">{emptyMessage}</span>
          </div>
        ) : (
          paginatedData.map((row, i) => {
            const mainCol = columns[0];
            const secondCol =
              columns.find((c) => c.key === 'customer' || c.key === 'client' || c.key === 'name') ||
              columns[1];
            const statusCol = columns.find((c) => c.key === 'status' || c.key === 'state');
            const amountCol = columns.find(
              (c) => c.key === 'total' || c.key === 'monto' || c.key === 'amount' || c.key === 'price'
            );
            const dateCol = columns.find(
              (c) => c.key === 'date' || c.key === 'createdAt' || c.key === 'fecha'
            );
            const extraCol = columns.find(
              (c) => c.key === 'paymentMethod' || c.key === 'branch' || c.key === 'pago' || c.key === 'category'
            );

            // Document type inference (e.g., Boleta or Factura for sales)
            const docCode = String(row[mainCol?.key] || '');
            const docTypeLabel = docCode.startsWith('F')
              ? 'Factura'
              : docCode.startsWith('B')
              ? 'Boleta'
              : '';

            return (
              <div
                key={row.id || i}
                className="px-5 sm:px-6 py-4.5 sm:py-5 hover:bg-surface-hover/60 transition-all flex flex-col gap-2"
              >
                {/* Line 1: Document Type Label (if applicable) */}
                {docTypeLabel && (
                  <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                    {docTypeLabel}
                  </span>
                )}

                {/* Line 2: Main Code (Left) + Total Amount (Right) */}
                <div className="flex justify-between items-baseline gap-3">
                  <span className="font-extrabold text-primary text-base tracking-tight">
                    {mainCol?.render ? mainCol.render(row) : (row[mainCol?.key] ?? '-')}
                  </span>
                  {amountCol && (
                    <span className="font-extrabold text-primary text-base shrink-0">
                      {amountCol.render ? amountCol.render(row) : row[amountCol.key]}
                    </span>
                  )}
                </div>

                {/* Line 3: Status Badge right under Code */}
                {statusCol && (
                  <div className="flex items-center mt-0.5">
                    {statusCol.render ? statusCol.render(row) : (row[statusCol.key] ?? '-')}
                  </div>
                )}

                {/* Line 4: Primary Sub-item (Customer Name / Item Description) */}
                {secondCol && secondCol !== mainCol && (
                  <div className="font-bold text-sm text-primary mt-1">
                    {secondCol.render ? secondCol.render(row) : (row[secondCol.key] ?? '-')}
                  </div>
                )}

                {/* Line 5: Payment Method / Category / Extra details */}
                {extraCol && (
                  <div className="text-xs text-secondary font-medium">
                    {extraCol.render ? extraCol.render(row) : (row[extraCol.key] ?? '-')}
                  </div>
                )}

                {/* Line 6: Date & Time */}
                {dateCol && (
                  <div className="text-xs text-secondary mt-0.5">
                    {dateCol.render ? dateCol.render(row) : row[dateCol.key]}
                  </div>
                )}

                {/* Line 7: Action Buttons (Centered / Aligned cleanly with top border) */}
                {actions && (
                  <div className="flex flex-wrap items-center justify-end gap-2.5 mt-3 pt-2.5 border-t border-color/40">
                    {actions(row)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="px-4 sm:px-6 py-3 border-t border-color bg-surface-hover flex flex-col sm:flex-row gap-2 justify-between items-center">
          <span className="text-xs text-secondary font-medium">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong>
          </span>
          <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              className="btn btn-sm btn-secondary flex-1 sm:flex-initial"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              className="btn btn-sm btn-secondary flex-1 sm:flex-initial"
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
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
  className = '',
}) => {
  const isPills = variant === 'pills';
  return (
    <div className={`${isPills ? 'tab-list-pills' : 'tab-list-underline'} ${className}`}>
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