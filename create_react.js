const fs = require('fs');
const path = require('path');

const root = path.resolve('C:/Users/pboca/.gemini/antigravity/scratch/VentasBV/frontend/src');

const files = {
  "App.tsx": `import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import POSPage from './pages/POSPage';
import ProductsPage from './pages/ProductsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="pos" element={<POSPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="*" element={<div className="p-6">En construcción...</div>} />
      </Route>
    </Routes>
  );
}`,

  "layout/AppLayout.tsx": `import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Store, Users, Shield, BookOpen, Package, 
  Archive, Truck, ShoppingCart, Users2, DollarSign, MonitorSmartphone, 
  CreditCard, FileText, BarChart3, Activity, Bell, Settings, LogOut, Menu
} from 'lucide-react';

const MENU_ITEMS = [
  { section: 'PRINCIPAL', items: [{ label: 'Dashboard', icon: LayoutDashboard, path: '/app' }] },
  { section: 'CATÁLOGO', items: [
    { label: 'Productos', icon: Package, path: '/app/products' }
  ]},
  { section: 'VENTAS', items: [
    { label: 'Punto de Venta', icon: MonitorSmartphone, path: '/app/pos' }
  ]}
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="app-layout">
      <div className={\`app-sidebar \${collapsed ? 'collapsed' : ''}\`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">V</div>
          {!collapsed && <div className="sidebar-title">Ventas B&V</div>}
        </div>
        <div className="sidebar-nav">
          {MENU_ITEMS.map((group, i) => (
            <div key={i} className="sidebar-nav-group">
              {!collapsed && <div className="sidebar-nav-title">{group.section}</div>}
              {group.items.map((item, j) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/app' && location.pathname.startsWith(item.path));
                return (
                  <Link key={j} to={item.path} className={\`sidebar-nav-item \${isActive ? 'active' : ''}\`}>
                    <Icon size={20} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <button className="btn btn-ghost btn-icon" onClick={() => setCollapsed(!collapsed)}>
            <Menu size={20} />
          </button>
        </div>
      </div>
      <div className="app-main">
        <div className="app-header">
          <div className="font-semibold text-lg">Sistema de Gestión</div>
          <div className="flex items-center gap-4">
            <Bell size={20} className="text-secondary" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                A
              </div>
            </div>
          </div>
        </div>
        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}`,

  "pages/LoginPage.tsx": `import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [mode, setMode] = useState<'admin' | 'staff'>('admin');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/app');
  };

  return (
    <div className="flex min-h-screen bg-bg-app">
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 text-white p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-accent-500 mb-4">Ventas B&V</h1>
          <p className="text-primary-100 text-lg">El sistema definitivo para la gestión de tus ventas e inventario.</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="p-6 bg-white/10 rounded-xl backdrop-blur">
            <h3 className="font-bold text-xl text-accent-400 mb-2">Punto de Venta</h3>
            <p className="text-sm text-primary-100">Facturación rápida, control de caja y múltiples métodos de pago en tiempo real.</p>
          </div>
          <div className="p-6 bg-white/10 rounded-xl backdrop-blur">
            <h3 className="font-bold text-xl text-accent-400 mb-2">Inventario</h3>
            <p className="text-sm text-primary-100">Kardex detallado, múltiples sucursales y alertas automáticas de stock bajo.</p>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-primary-900 mb-2">Bienvenido</h2>
            <p className="text-secondary">Inicia sesión en tu cuenta para continuar</p>
          </div>
          
          <div className="flex p-1 bg-neutral-100 rounded-lg mb-8">
            <button 
              className={\`flex-1 py-2 text-sm font-medium rounded-md \${mode === 'admin' ? 'bg-white shadow text-primary-700' : 'text-secondary'}\`}
              onClick={() => setMode('admin')}
            >
              Administrador
            </button>
            <button 
              className={\`flex-1 py-2 text-sm font-medium rounded-md \${mode === 'staff' ? 'bg-white shadow text-primary-700' : 'text-secondary'}\`}
              onClick={() => setMode('staff')}
            >
              Personal
            </button>
          </div>

          <form onSubmit={handleLogin}>
            {mode === 'staff' && (
              <div className="form-group">
                <label className="form-label">RUC de la Empresa</label>
                <input type="text" className="form-control" placeholder="20123456789" required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Usuario o Correo</label>
              <input type="text" className="form-control" placeholder="admin@ventas.com" required />
            </div>
            <div className="form-group">
              <div className="flex justify-between items-center">
                <label className="form-label">Contraseña</label>
                <a href="#" className="text-xs text-primary-500 hover:underline">¿Olvidaste tu contraseña?</a>
              </div>
              <input type="password" className="form-control" placeholder="••••••••" required />
            </div>
            
            <button type="submit" className="btn btn-primary w-full mt-6 py-2.5 text-base">
              Ingresar al Sistema
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}`,

  "pages/DashboardPage.tsx": `import React from 'react';
import { DollarSign, ShoppingCart, Package, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen de actividad del día</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary">Nueva Venta</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="stat-card">
          <div className="stat-icon stat-icon-primary"><DollarSign /></div>
          <div className="stat-content">
            <div className="stat-label">Ventas Hoy</div>
            <div className="stat-value">S/ 2,450.00</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-success"><ShoppingCart /></div>
          <div className="stat-content">
            <div className="stat-label">Operaciones</div>
            <div className="stat-value">34</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-warning"><Package /></div>
          <div className="stat-content">
            <div className="stat-label">Productos Activos</div>
            <div className="stat-value">1,204</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-danger"><AlertTriangle /></div>
          <div className="stat-content">
            <div className="stat-label">Stock Bajo</div>
            <div className="stat-value">12</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="font-semibold">Últimas Ventas</h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Comprobante</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium">B001-0000124</td>
                  <td>Juan Pérez</td>
                  <td>S/ 150.00</td>
                  <td><span className="badge badge-success">Pagado</span></td>
                </tr>
                <tr>
                  <td className="font-medium">F001-0000089</td>
                  <td>Empresa ABC SAC</td>
                  <td>S/ 1,200.00</td>
                  <td><span className="badge badge-success">Pagado</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">Alertas de Inventario</h3>
          </div>
          <div className="card-body">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border-color pb-3">
                <div>
                  <div className="font-medium text-sm">Laptop HP Pavilion</div>
                  <div className="text-xs text-danger-500">Stock: 2 unidades (Mín: 5)</div>
                </div>
                <button className="btn btn-sm btn-secondary">Comprar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`,

  "pages/ProductsPage.tsx": `import React from 'react';
import { Plus, Search, Filter } from 'lucide-react';

export default function ProductsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle">Gestiona el catálogo de productos</p>
        </div>
        <button className="btn btn-primary"><Plus size={16} /> Nuevo Producto</button>
      </div>

      <div className="card mb-6">
        <div className="p-4 flex gap-4 border-b border-border-color bg-neutral-50">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-secondary" size={18} />
            <input type="text" className="form-control pl-10" placeholder="Buscar por código, nombre o categoría..." />
          </div>
          <button className="btn btn-secondary"><Filter size={16} /> Filtros</button>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio Venta</th>
                <th>Stock Actual</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-mono text-xs">PROD-001</td>
                <td className="font-medium">Monitor LG 24"</td>
                <td>Monitores</td>
                <td>S/ 650.00</td>
                <td>24 unid.</td>
                <td><span className="badge badge-success">Activo</span></td>
                <td><button className="btn btn-sm btn-ghost">Editar</button></td>
              </tr>
              <tr>
                <td className="font-mono text-xs">PROD-002</td>
                <td className="font-medium">Teclado Mecánico Redragon</td>
                <td>Periféricos</td>
                <td>S/ 180.00</td>
                <td><span className="text-danger-500 font-medium">3 unid.</span></td>
                <td><span className="badge badge-success">Activo</span></td>
                <td><button className="btn btn-sm btn-ghost">Editar</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}`,

  "pages/POSPage.tsx": `import React, { useState } from 'react';
import { Search, ShoppingCart, User, Plus, Minus, Trash2, CreditCard, Banknote } from 'lucide-react';

export default function POSPage() {
  const [cart, setCart] = useState([
    { id: 1, name: 'Monitor LG 24"', price: 650.00, qty: 1 }
  ]);

  const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  return (
    <div className="pos-layout -m-6 h-[calc(100vh-64px)]">
      <div className="pos-main">
        <div className="p-4 bg-bg-surface border-b border-border-color flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-secondary" size={18} />
            <input type="text" className="form-control pl-10" placeholder="Buscar por código de barras o nombre..." />
          </div>
          <select className="form-control w-48">
            <option>Todas las categorías</option>
            <option>Monitores</option>
            <option>Periféricos</option>
          </select>
        </div>
        
        <div className="pos-products">
          <div className="pos-product-card">
            <div className="h-24 bg-neutral-100 rounded-md mb-3 flex items-center justify-center">
              <span className="text-neutral-400">IMG</span>
            </div>
            <h4 className="font-medium text-sm mb-1 truncate">Monitor LG 24"</h4>
            <div className="text-xs text-secondary mb-2">Stock: 24</div>
            <div className="font-bold text-primary-700">S/ 650.00</div>
          </div>
          <div className="pos-product-card">
            <div className="h-24 bg-neutral-100 rounded-md mb-3 flex items-center justify-center">
              <span className="text-neutral-400">IMG</span>
            </div>
            <h4 className="font-medium text-sm mb-1 truncate">Teclado Mecánico</h4>
            <div className="text-xs text-secondary mb-2">Stock: 3</div>
            <div className="font-bold text-primary-700">S/ 180.00</div>
          </div>
          <div className="pos-product-card">
            <div className="h-24 bg-neutral-100 rounded-md mb-3 flex items-center justify-center">
              <span className="text-neutral-400">IMG</span>
            </div>
            <h4 className="font-medium text-sm mb-1 truncate">Mouse Logitech G203</h4>
            <div className="text-xs text-secondary mb-2">Stock: 15</div>
            <div className="font-bold text-primary-700">S/ 95.00</div>
          </div>
        </div>
      </div>
      
      <div className="pos-sidebar">
        <div className="p-4 border-b border-border-color">
          <div className="flex items-center gap-2 mb-3 text-sm font-medium">
            <User size={16} /> Cliente
          </div>
          <div className="flex gap-2">
            <input type="text" className="form-control" placeholder="DNI / RUC o Nombre" />
            <button className="btn btn-secondary btn-icon"><Plus size={18} /></button>
          </div>
          <div className="mt-2 text-xs text-secondary">Cliente Varios (00000000)</div>
        </div>
        
        <div className="pos-cart-items">
          {cart.map(item => (
            <div key={item.id} className="pos-cart-item">
              <div className="flex-1">
                <div className="font-medium text-sm">{item.name}</div>
                <div className="text-xs text-secondary">S/ {item.price.toFixed(2)} x {item.qty}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border-color rounded-md">
                  <button className="px-2 py-1 text-secondary hover:text-primary-600"><Minus size={14} /></button>
                  <span className="px-2 text-sm font-medium">{item.qty}</span>
                  <button className="px-2 py-1 text-secondary hover:text-primary-600"><Plus size={14} /></button>
                </div>
                <div className="font-bold text-sm w-16 text-right">S/ {(item.price * item.qty).toFixed(2)}</div>
                <button className="text-danger-500 hover:bg-danger-100 p-1 rounded"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="pos-totals">
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-secondary">Subtotal</span>
            <span>S/ {(total / 1.18).toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-secondary">IGV (18%)</span>
            <span>S/ {(total - (total / 1.18)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-4 text-xl font-bold text-primary-900 border-t border-border-color pt-2">
            <span>TOTAL</span>
            <span>S/ {total.toFixed(2)}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button className="btn btn-secondary flex-col gap-1 py-3 h-auto text-primary-700 bg-primary-50 border-primary-200">
              <Banknote size={24} />
              <span>Efectivo</span>
            </button>
            <button className="btn btn-secondary flex-col gap-1 py-3 h-auto">
              <CreditCard size={24} />
              <span>Tarjeta</span>
            </button>
          </div>
          
          <button className="btn btn-primary w-full py-3 text-lg font-bold">
            COBRAR S/ {total.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}`
};

for (const [file, content] of Object.entries(files)) {
  const filePath = path.join(root, file);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
console.log("React files created successfully.");
