import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { loadSavedTheme } from '../lib/tenant-theme';
import { 
  LayoutDashboard, Store, Users, Shield, BookOpen, Package, 
  Archive, Truck, ShoppingCart, Users2, DollarSign, MonitorSmartphone, 
  CreditCard, FileText, BarChart3, Activity, Bell, Settings,
  Sun, Moon, Search, ChevronDown, ArrowRight, Receipt
} from 'lucide-react';

const MENU_ITEMS = [
  { section: 'PRINCIPAL', items: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/app' },
    { label: 'Punto de Venta', icon: MonitorSmartphone, path: '/app/pos' }
  ]},
  { section: 'VENTAS', items: [
    { label: 'Clientes', icon: Users2, path: '/app/customers' },
    { label: 'Historial de Ventas', icon: DollarSign, path: '/app/sales' },
    { label: 'Caja Chica / Registro', icon: CreditCard, path: '/app/cash' }
  ]},
  { section: 'CATÁLOGO', items: [
    { label: 'Productos', icon: Package, path: '/app/products' },
    { label: 'Categorías & Atributos', icon: BookOpen, path: '/app/catalog' }
  ]},
  { section: 'OPERACIONES', items: [
    { label: 'Inventario / Kardex', icon: Archive, path: '/app/inventory' },
    { label: 'Gastos Operativos', icon: Receipt, path: '/app/expenses' },
    { label: 'Ordenes de Compra', icon: ShoppingCart, path: '/app/purchases' },
    { label: 'Proveedores', icon: Truck, path: '/app/suppliers' }
  ]},
  { section: 'COMPROBANTES', items: [
    { label: 'Facturación / Boletas', icon: FileText, path: '/app/billing' },
    { label: 'Reportes & BI', icon: BarChart3, path: '/app/reports' }
  ]},
  { section: 'GESTIÓN', items: [
    { label: 'Usuarios', icon: Users, path: '/app/users' },
    { label: 'Roles y Permisos', icon: Shield, path: '/app/roles' },
    { label: 'Sucursales', icon: Store, path: '/app/branches' }
  ]},
  { section: 'SISTEMA', items: [
    { label: 'Notificaciones', icon: Bell, path: '/app/notifications' },
    { label: 'Auditoría', icon: Activity, path: '/app/audit' },
    { label: 'Configuración', icon: Settings, path: '/app/settings' }
  ]}
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'PRINCIPAL': true,
    'VENTAS': true,
    'CATÁLOGO': true,
    'OPERACIONES': false,
    'COMPROBANTES': false,
    'GESTIÓN': false,
    'SISTEMA': false,
  });

  // Global search state
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const allModules = MENU_ITEMS.flatMap(group => group.items);
  const filteredModules = globalSearch.trim()
    ? allModules.filter(m => m.label.toLowerCase().includes(globalSearch.toLowerCase()))
    : [];

  // Click outside listener for sidebar and global search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setCollapsed(true);
        setMobileOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    loadSavedTheme();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const handleBrandClick = () => {
    setCollapsed(prev => !prev);
    setMobileOpen(prev => !prev);
  };

  const handleSelectModule = (path: string) => {
    navigate(path);
    setGlobalSearch('');
    setSearchOpen(false);
  };

  return (
    <div className="app-layout">
      {/* Mobile Backdrop Overlay */}
      <div 
        className={`sidebar-backdrop ${mobileOpen ? 'mobile-open' : ''}`}
        onClick={() => {
          setMobileOpen(false);
          setCollapsed(true);
        }}
      />

      {/* Sidebar */}
      <aside 
        ref={sidebarRef}
        className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      >
        <div 
          className="sidebar-header"
          onClick={handleBrandClick}
          title="Haz clic para desplegar / ocultar menú"
        >
          <div className="sidebar-logo">V</div>
          {!collapsed && (
            <div className="sidebar-title-container">
              <div className="sidebar-title">
                Ventas B&V
                <ChevronDown size={14} className="opacity-70 ml-1" />
              </div>
              <div className="sidebar-subtitle">Enterprise POS</div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {MENU_ITEMS.map((group, i) => {
            const isSectionExpanded = collapsed || !!expandedSections[group.section];
            return (
              <div key={i} className="sidebar-nav-group">
                {!collapsed && (
                  <div 
                    className="sidebar-nav-title flex justify-between items-center cursor-pointer select-none py-1 hover:text-primary-600 transition-colors"
                    onClick={() => toggleSection(group.section)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span>{group.section}</span>
                    <ChevronDown 
                      size={12} 
                      className={`transition-transform duration-200 ${expandedSections[group.section] ? '' : '-rotate-90'}`} 
                    />
                  </div>
                )}
                {isSectionExpanded && (
                  <div className="sidebar-nav-group-items flex flex-col gap-0.5 mt-1">
                    {group.items.map((item, j) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path || (item.path !== '/app' && location.pathname.startsWith(item.path));
                      return (
                        <Link 
                          key={j} 
                          to={item.path} 
                          className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                          title={collapsed ? item.label : undefined}
                          onClick={() => {
                            setMobileOpen(false);
                          }}
                        >
                          <Icon size={20} />
                          {!collapsed && <span>{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main Container */}
      <div className="app-main">
        <header className="app-header">
          <div className="header-left">
            <div className="header-title-section">
              <div className="header-title">Sistema de Gestión Comercial</div>
              <div className="header-subtitle">Ventas B&V • Sede Principal</div>
            </div>
          </div>

          <div className="header-actions">
            {/* Functional Header Search Bar */}
            <div className="header-search" ref={searchContainerRef}>
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Buscar módulo, producto..." 
                value={globalSearch}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setSearchOpen(true);
                }}
              />
              {searchOpen && globalSearch.trim().length > 0 && (
                <div className="header-search-results">
                  {filteredModules.length === 0 ? (
                    <div className="p-3 text-xs text-secondary text-center">
                      No se encontraron módulos con "{globalSearch}"
                    </div>
                  ) : (
                    filteredModules.map((m, idx) => {
                      const Icon = m.icon;
                      return (
                        <div 
                          key={idx}
                          className="header-search-item"
                          onClick={() => handleSelectModule(m.path)}
                        >
                          <Icon size={16} className="text-primary-500" />
                          <span className="flex-1 font-semibold">{m.label}</span>
                          <ArrowRight size={14} className="text-secondary opacity-60" />
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <button 
              className="icon-btn" 
              onClick={toggleTheme} 
              title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <Link to="/app/notifications" className="icon-btn" title="Notificaciones">
              <Bell size={18} />
              <span className="icon-btn-badge" />
            </Link>

            <div className="user-profile-pill">
              <div className="user-avatar">A</div>
              <div className="user-profile-info hidden sm:flex">
                <span className="user-profile-name">Admin Principal</span>
                <span className="user-profile-role">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}