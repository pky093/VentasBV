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
  eyebrow?: string;
  title: string;
  subtitle?: string;
  description?: string;
  action?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ eyebrow, title, subtitle, description, action, actions }) => {
  const subText = subtitle || description;
  const actionContent = action || actions;
  return (
    <div className="page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
      <div>
        {eyebrow && <p className="eyebrow text-xs mb-1">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {subText && <p className="page-subtitle text-xs text-secondary mt-0.5">{subText}</p>}
      </div>
      {actionContent && (
        <div className="flex gap-2 flex-wrap items-center w-full sm:w-auto justify-start sm:justify-end">
          {actionContent}
        </div>
      )}
    </div>
  );
};

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

// Search Input Component
export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  value: string;
  onChangeValue?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChangeValue,
  onClear,
  onChange,
  placeholder = 'Buscar...',
  className = '',
  containerClassName = '',
  size = 'md',
  style,
  ...props
}) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const iconSize = isSm ? 14 : isLg ? 18 : 16;
  const clearIconSize = isSm ? 12 : isLg ? 16 : 14;
  const pl = isSm ? '2.25rem' : isLg ? '3rem' : '2.75rem';
  const pr = isSm ? '2rem' : isLg ? '2.75rem' : '2.5rem';
  const height = isSm ? '34px' : isLg ? '44px' : '40px';

  return (
    <div className={`group relative flex items-center w-full ${containerClassName}`}>
      <Search
        size={iconSize}
        style={{ left: isSm ? '10px' : '14px' }}
        className="absolute top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-600 dark:group-focus-within:text-rose-400 transition-colors pointer-events-none z-10"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange?.(e);
          onChangeValue?.(e.target.value);
        }}
        placeholder={placeholder}
        style={{
          paddingLeft: pl,
          paddingRight: pr,
          height: height,
          backgroundColor: '#ffffff',
          ...style,
        }}
        className={`w-full rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:focus:border-rose-400 text-xs sm:text-sm ${className}`}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onClear?.();
            onChangeValue?.('');
          }}
          style={{ right: isSm ? '8px' : '10px' }}
          className="absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer active:scale-95 z-10"
          title="Limpiar búsqueda"
        >
          <X size={clearIconSize} />
        </button>
      )}
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
    <div className="card overflow-hidden border border-color bg-surface shadow-sm rounded-xl">
      {/* Search & Stats Toolbar */}
      {searchable && (
        <div className="p-3.5 sm:p-4 border-b border-color flex flex-wrap justify-between items-center gap-3 bg-surface">
          <div className="flex-1 min-w-[200px] max-w-sm">
            <SearchInput
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChangeValue={(val) => {
                setSearchTerm(val);
                setPage(1);
              }}
            />
          </div>
          <div className="text-xs text-secondary font-medium flex items-center gap-1.5 shrink-0">
            <Filter size={13} className="text-secondary/70" />
            <span>
              Total: <strong className="text-primary font-bold">{filteredData.length}</strong> registros
            </span>
          </div>
        </div>
      )}

      {/* Desktop & Tablet Table (>= 768px) */}
      <div className="table-container data-table-desktop-view">
        <table className="table w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.headerClassName || ''}>
                  {col.header}
                </th>
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
                  <AlertCircle className="mx-auto text-secondary/50 mb-2" size={32} />
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

      {/* Mobile Responsive List (< 768px) - Clean, Modern, Zero Horizontal Scroll */}
      <div className="data-table-mobile-view divide-y divide-color">
        {loading ? (
          <div className="text-center py-10 p-6">
            <Loader2 className="animate-spin mx-auto text-primary mb-2" size={28} />
            <span className="text-sm text-secondary">Cargando información...</span>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="text-center py-10 p-6">
            <AlertCircle className="mx-auto text-secondary/50 mb-2" size={32} />
            <span className="text-sm font-medium text-secondary">{emptyMessage}</span>
          </div>
        ) : (
          paginatedData.map((row, i) => {
            // Find status column to position at top-right
            const statusCol = columns.find((c) => {
              const k = c.key.toLowerCase();
              return k.includes('status') || k.includes('estado') || k.includes('state');
            });

            // Primary identifier column
            const primaryCol = columns[0];
            const hasHeaderRow = primaryCol && columns.length > 1;

            // Remaining columns for the responsive grid
            const gridCols = columns.filter((c) => {
              if (hasHeaderRow && c.key === primaryCol.key) return false;
              if (statusCol && c.key === statusCol.key) return false;
              return true;
            });

            return (
              <div
                key={row.id || i}
                style={{ padding: '1.5rem 1.75rem' }}
                className="data-table-mobile-item bg-surface hover:bg-surface-hover transition-colors flex flex-col gap-4"
              >
                {/* Row Header: Identifier + Status */}
                {hasHeaderRow && (
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-color">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                        {primaryCol.header}
                      </span>
                      <div className="font-bold text-sm text-primary truncate mt-0.5">
                        {primaryCol.render ? primaryCol.render(row) : (row[primaryCol.key] ?? '-')}
                      </div>
                    </div>
                    {statusCol && (
                      <div className="shrink-0">
                        {statusCol.render ? statusCol.render(row) : (row[statusCol.key] ?? '-')}
                      </div>
                    )}
                  </div>
                )}

                {/* Columns Grid: All remaining columns shown with headers */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-1">
                  {gridCols.map((col) => {
                    const k = col.key.toLowerCase();
                    const isFullSpan =
                      k.includes('customer') ||
                      k.includes('client') ||
                      k.includes('buyer') ||
                      k.includes('name') ||
                      k.includes('vehicle') ||
                      k.includes('product') ||
                      k.includes('description') ||
                      k.includes('detail') ||
                      k.includes('notes') ||
                      k.includes('address') ||
                      k.includes('brand');

                    return (
                      <div
                        key={col.key}
                        className={`flex flex-col min-w-0 ${isFullSpan ? 'col-span-2' : 'col-span-1'} ${col.className || ''}`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary/80 block mb-0.5">
                          {col.header}
                        </span>
                        <div className="text-xs sm:text-sm text-primary font-medium">
                          {col.render ? col.render(row) : (row[col.key] ?? '-')}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Actions Row */}
                {actions && (
                  <div className="pt-3 border-t border-color flex items-center justify-end gap-2 flex-wrap">
                    {actions(row)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-color bg-surface flex flex-col sm:flex-row gap-2 justify-between items-center">
          <span className="text-xs text-secondary font-medium">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong> ({filteredData.length} registros)
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

// Field Component
export function Field({
  label,
  error,
  required,
  className = '',
  children,
}: {
  label: string;
  error?: string | undefined;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`form-field ${className}`}>
      <label className="form-field__label">
        <span>{label}</span>
        {required && <span className="text-amber-500 ml-0.5">*</span>}
      </label>
      <div className="form-field__control">{children}</div>
      {error && <p className="form-field__error">{error}</p>}
    </div>
  );
}

// Suggestion & Stock Chip Component (Matches Badge Pill Style)
export interface SuggestionChipProps {
  label: string;
  count?: number | string;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
  size?: 'xs' | 'sm';
}

export const SuggestionChip: React.FC<SuggestionChipProps> = ({
  label,
  count,
  selected = false,
  onClick,
  icon,
  className = '',
  size = 'xs',
}) => {
  const isClickable = Boolean(onClick);

  return (
    <span
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`badge badge-primary ${
        isClickable ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-transform' : ''
      } ${
        selected ? 'ring-2 ring-primary-500 font-extrabold shadow-xs' : ''
      } ${className}`}
      style={{
        padding: size === 'sm' ? '0.35rem 0.85rem' : '0.25rem 0.75rem',
        fontSize: size === 'sm' ? '0.8125rem' : '0.75rem',
      }}
    >
      {icon && <span className="inline-flex items-center mr-1">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span className="font-mono ml-1 font-bold">
          {count}
        </span>
      )}
    </span>
  );
};