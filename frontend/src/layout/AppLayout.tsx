import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { loadSavedTheme } from '../lib/tenant-theme';
import { BVLogo } from '../components/ui/BVLogo';
import { UserProfileMenu } from '../components/ui/UserProfileMenu';
import { 
  LayoutDashboard, Store, Users, Shield, BookOpen, Package, 
  Archive, Truck, ShoppingCart, Users2, DollarSign, MonitorSmartphone, 
  CreditCard, FileText, BarChart3, Activity, Bell, Settings,
  Sun, Moon, Search, ChevronDown, ArrowRight, Receipt, Menu, LogOut, User,
  FileCheck, Calendar, Sparkles
} from 'lucide-react';
import { usePermissions } from '../context/PermissionContext';
import SyncStatusIndicator from '../components/ui/SyncStatusIndicator';

const MENU_ITEMS = [
  { section: 'PRINCIPAL', items: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/app', perm: 'dashboard.read' },
    { label: 'Punto de Venta', icon: MonitorSmartphone, path: '/app/pos', perm: 'sales.create' }
  ]},
  { section: 'VENTAS', items: [
    { label: 'Cotizaciones & Contratos', icon: FileCheck, path: '/app/contracts', perm: 'contracts.read' },
    { label: 'Clientes', icon: Users2, path: '/app/customers', perm: 'customers.read' },
    { label: 'Historial de Ventas', icon: DollarSign, path: '/app/sales', perm: 'sales.read' },
    { label: 'Créditos / Cobranzas', icon: Calendar, path: '/app/credits', perm: 'sales.read' },
    { label: 'Caja Chica / Registro', icon: CreditCard, path: '/app/cash', perm: 'cash.read' }
  ]},
  { section: 'CATÁLOGO', items: [
    { label: 'Catálogo Digital & WhatsApp', icon: Sparkles, path: '/app/digital-catalog', perm: 'products.read' },
    { label: 'Productos', icon: Package, path: '/app/products', perm: 'products.read' },
    { label: 'Categorías & Atributos', icon: BookOpen, path: '/app/catalog', perm: 'catalog.read' }
  ]},
  { section: 'OPERACIONES', items: [
    { label: 'Inventario / Kardex', icon: Archive, path: '/app/inventory', perm: 'inventory.read' },
    { label: 'Gastos Operativos', icon: Receipt, path: '/app/expenses', perm: 'expenses.read' },
    { label: 'Ordenes de Compra', icon: ShoppingCart, path: '/app/purchases', perm: 'purchases.read' },
    { label: 'Proveedores', icon: Truck, path: '/app/suppliers', perm: 'suppliers.read' }
  ]},
  { section: 'COMPROBANTES', items: [
    { label: 'Facturación / Boletas', icon: FileText, path: '/app/billing', perm: 'billing.read' },
    { label: 'Reportes & BI', icon: BarChart3, path: '/app/reports', perm: 'reports.read' }
  ]},
  { section: 'GESTIÓN', items: [
    { label: 'Usuarios', icon: Users, path: '/app/users', perm: 'users.read' },
    { label: 'Roles y Permisos', icon: Shield, path: '/app/roles', perm: 'roles.manage' },
    { label: 'Sucursales', icon: Store, path: '/app/branches', perm: 'branches.manage' }
  ]},
  { section: 'SISTEMA', items: [
    { label: 'Notificaciones', icon: Bell, path: '/app/notifications', perm: 'notifications.read' },
    { label: 'Auditoría', icon: Activity, path: '/app/audit', perm: 'audit.read' },
    { label: 'Configuración', icon: Settings, path: '/app/settings', perm: 'settings.manage' }
  ]}
];

import { settingsService, notificationsService, auditService } from '../lib/db-services';

import { applyCustomTheme } from '../lib/tenant-theme';

import { useBranch } from '../context/BranchContext';

export default function AppLayout() {
  const { branches, activeBranchId, activeBranch, setActiveBranchId, isSuperAdmin } = useBranch();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<{ name?: string; trade_name?: string; logo_path?: string }>({});
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const loadNotificationsCount = async () => {
    try {
      const list = await notificationsService.getNotifications();
      setUnreadNotificationsCount(list.filter(n => !n.read).length);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTenantData = async () => {
    try {
      const info = await settingsService.getTenantInfo();
      if (info) {
        setTenantInfo({
          name: info.name,
          trade_name: info.trade_name,
          logo_path: info.logo_path,
        });

        if (info.primary_color) {
          applyCustomTheme({
            primaryColor: info.primary_color || '#2563eb',
            secondaryColor: info.secondary_color || '#10b981',
            pageBg: info.page_background_color || '#f1f5f9',
            sidebarBg: info.sidebar_background_color || '#0f172a',
            sidebarText: info.sidebar_text_color || '#94a3b8',
            surfaceBg: info.surface_color || '#ffffff',
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTenantData();
    loadNotificationsCount();
    window.addEventListener('tenant_info_updated', loadTenantData);
    window.addEventListener('notifications_updated', loadNotificationsCount);
    return () => {
      window.removeEventListener('tenant_info_updated', loadTenantData);
      window.removeEventListener('notifications_updated', loadNotificationsCount);
    };
  }, []);

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

  // User dropdown menu state
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [authUser, setAuthUser] = useState(() => localStorage.getItem('auth_user') || 'Admin Principal');
  const [tenantRuc, setTenantRuc] = useState(() => localStorage.getItem('tenant_ruc') || '20998877665');

  useEffect(() => {
    const handleProfileUpdate = () => {
      setAuthUser(localStorage.getItem('auth_user') || 'Admin Principal');
      setTenantRuc(localStorage.getItem('tenant_ruc') || '20998877665');
    };
    window.addEventListener('user_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('user_profile_updated', handleProfileUpdate);
    };
  }, []);


  const handleLogout = async () => {
    const user = localStorage.getItem('auth_user') || 'Usuario';
    const username = localStorage.getItem('auth_username') || user;
    const role = localStorage.getItem('user_role') || localStorage.getItem('auth_role') || 'Usuario';
    const userId = localStorage.getItem('auth_user_id') || undefined;
    const branchId = localStorage.getItem('active_branch_id') || undefined;
    const branchName = localStorage.getItem('active_branch_name') || 'Sede Principal';

    try {
      await auditService.logAction({
        action: 'CIERRE DE SESIÓN',
        entityType: 'auth',
        branchId: branchId,
        actorUserId: userId,
        actorUserName: user,
        actorUsername: username,
        actorRole: role,
        branchName: branchName,
        description: `Cierre de sesión de ${user} (${role}) en la sede ${branchName}`,
        details: {
          user_name: `${user} (${role})`,
          username: username,
          branch_name: branchName,
        },
      });
    } catch (e) {
      console.error('Error logging logout:', e);
    }

    localStorage.removeItem('is_logged_in');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_username');
    localStorage.removeItem('auth_email');
    localStorage.removeItem('auth_user_id');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('user_role');
    localStorage.removeItem('auth_ruc');
    localStorage.removeItem('tenant_id');
    localStorage.removeItem('tenant_name');
    localStorage.removeItem('tenant_ruc');
    localStorage.removeItem('active_branch_id');
    localStorage.removeItem('active_branch_name');
    localStorage.removeItem('is_platform_superadmin');
    navigate('/login');
  };

  const { hasPermission, userRole } = usePermissions();

  const visibleMenuGroups = MENU_ITEMS.map(group => ({
    ...group,
    items: group.items.filter(item => !item.perm || hasPermission(item.perm))
  })).filter(group => group.items.length > 0);

  const allModules = visibleMenuGroups.flatMap(group => group.items);
  const filteredModules = globalSearch.trim()
    ? allModules.filter(m => m.label.toLowerCase().includes(globalSearch.toLowerCase()))
    : [];

  // Click outside listener for sidebar, global search, and user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setCollapsed(true);
        setMobileOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    loadSavedTheme();
  }, []);

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
          className="sidebar-header flex items-center justify-between gap-2 px-4 cursor-pointer select-none py-3 border-b border-slate-800/80"
          onClick={handleBrandClick}
          title="Haz clic para desplegar / ocultar menú"
        >
          {tenantInfo.logo_path ? (
            <img
              src={tenantInfo.logo_path}
              alt="Logo"
              style={{
                maxHeight: '36px',
                maxWidth: '48px',
                objectFit: 'contain',
                flexShrink: 0,
                borderRadius: '8px',
                overflow: 'hidden',
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
              }}
            />
          ) : (
            <BVLogo variant={collapsed ? 'icon' : 'compact'} height={collapsed ? 28 : 34} />
          )}
          {!collapsed && (
            <div className="sidebar-title-container min-w-0 flex-1 ml-2">
              <div className="sidebar-title flex items-center justify-between text-sm font-extrabold text-white truncate">
                <span className="truncate">{tenantInfo.name || 'Ventas B&V'}</span>
                <ChevronDown size={14} className="opacity-70 ml-1 shrink-0 text-slate-400" />
              </div>
              <div 
                className="sidebar-subtitle text-[10px] font-bold uppercase tracking-wider truncate"
                style={{ color: 'var(--accent-500, #10b981)' }}
              >
                {tenantInfo.trade_name || 'ENTERPRISE POS'}
              </div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {visibleMenuGroups.map((group, i) => {
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
            <button
              className="icon-btn mobile-menu-btn shrink-0"
              onClick={() => {
                setMobileOpen(prev => !prev);
                setCollapsed(false);
              }}
              title="Abrir Menú"
            >
              <Menu size={20} />
            </button>
            <div className="header-title-section">
              <div className="header-title truncate font-bold">Sistema de Gestión Comercial</div>
              <div className="header-subtitle truncate text-xs text-secondary font-medium">
                {tenantInfo.name || (typeof window !== 'undefined' ? localStorage.getItem('tenant_name') || '' : '')}
              </div>
            </div>
          </div>

          <div className="header-actions">
            {/* Branch Selector Dropdown */}
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs">
              <Store size={15} className="text-secondary shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-secondary font-medium uppercase tracking-wider">Sucursal Activa</span>
                {isSuperAdmin || branches.length > 1 ? (
                  <select
                    value={activeBranchId}
                    onChange={(e) => setActiveBranchId(e.target.value)}
                    className="bg-transparent font-medium text-primary border-0 p-0 pr-4 focus:ring-0 cursor-pointer outline-none text-xs hover:text-primary-600 transition-colors"
                  >
                    {isSuperAdmin && (
                      <option value="ALL" className="bg-surface text-primary">
                        Todas las Sedes (Super Admin)
                      </option>
                    )}
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-surface text-primary">
                        {b.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-medium text-primary text-xs">
                    {branches[0]?.name || activeBranch?.name || 'Sede Principal'}
                  </span>
                )}
              </div>
            </div>
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

            {/* Sync Status Indicator */}
            <SyncStatusIndicator />

            <Link to="/app/notifications" className="icon-btn relative" title="Notificaciones">
              <Bell size={18} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-600 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center px-1 shadow-sm animate-pulse">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </Link>

            {/* User Profile Pill with Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <div 
                className="user-profile-pill cursor-pointer select-none hover:opacity-90 transition-opacity flex items-center"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                title="Opciones de Cuenta y Cerrar Sesión"
              >
                <div className="user-avatar">{authUser.charAt(0).toUpperCase()}</div>
                <div className="user-profile-info hidden sm:flex">
                  <span className="user-profile-name">{authUser}</span>
                  <span className="user-profile-role">{userRole || 'Vendedor'}</span>
                </div>
                <ChevronDown size={14} className="text-secondary ml-1.5 opacity-70 shrink-0" />
              </div>

              {userMenuOpen && (
                <UserProfileMenu
                  authUser={authUser}
                  userRole={userRole}
                  tenantRuc={tenantRuc}
                  onClose={() => setUserMenuOpen(false)}
                  onLogout={handleLogout}
                />
              )}
            </div>
          </div>
        </header>

        <main className={`app-content ${location.pathname === '/app/pos' ? 'pos-page-content' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}