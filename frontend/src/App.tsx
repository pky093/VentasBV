import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicCatalogPage from './pages/PublicCatalogPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import SetPasswordPage from './pages/SetPasswordPage';

// Lazy load internal ERP management pages
const AppLayout = lazy(() => import('./layout/AppLayout'));
const PlatformPage = lazy(() => import('./pages/PlatformPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const BranchesPage = lazy(() => import('./pages/BranchesPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const RolesPage = lazy(() => import('./pages/RolesPage'));
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const DigitalCatalogPage = lazy(() => import('./pages/DigitalCatalogPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'));
const PurchasesPage = lazy(() => import('./pages/PurchasesPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const SalesPage = lazy(() => import('./pages/SalesPage'));
const CreditsPage = lazy(() => import('./pages/CreditsPage'));
const POSPage = lazy(() => import('./pages/POSPage'));
const CashRegisterPage = lazy(() => import('./pages/CashRegisterPage'));
const ContractsPage = lazy(() => import('./pages/ContractsPage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

import { BranchProvider } from './context/BranchContext';
import { PermissionProvider } from './context/PermissionContext';
import { SyncProvider } from './context/SyncContext';
import { PermissionRoute } from './components/PermissionRoute';

const AuthenticatedERP: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return (
    <SyncProvider>
      <BranchProvider>
        <PermissionProvider>
          <Suspense fallback={<div className="min-h-screen bg-app flex items-center justify-center text-secondary text-sm">Cargando módulo...</div>}>
            {children}
          </Suspense>
        </PermissionProvider>
      </BranchProvider>
    </SyncProvider>
  );
};

export default function App() {
  return (
    <Routes>
      {/* Public Customer Routes (Fast Instant Load, No ERP Sync Overhead) */}
      <Route path="/catalog/showcase" element={<PublicCatalogPage />} />
      <Route path="/catalog" element={<PublicCatalogPage />} />
      <Route path="/catalogo" element={<PublicCatalogPage />} />
      <Route path="/showcase" element={<PublicCatalogPage />} />
      <Route path="/motos" element={<PublicCatalogPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route path="/motos/:id" element={<ProductDetailPage />} />

      {/* Multi-Tenant Public Routes for Clients: /:tenantSlug/catalogo, /:tenantSlug/catalog, /:tenantSlug */}
      <Route path="/:tenantSlug/catalogo" element={<PublicCatalogPage />} />
      <Route path="/:tenantSlug/catalog" element={<PublicCatalogPage />} />
      <Route path="/:tenantSlug/showcase" element={<PublicCatalogPage />} />
      <Route path="/:tenantSlug/motos" element={<PublicCatalogPage />} />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route
        path="/platform"
        element={
          <AuthenticatedERP>
            <PlatformPage />
          </AuthenticatedERP>
        }
      />
      
      <Route
        path="/app"
        element={
          <AuthenticatedERP>
            <AppLayout />
          </AuthenticatedERP>
        }
      >
        <Route index element={<PermissionRoute permission="dashboard.read"><DashboardPage /></PermissionRoute>} />
        <Route path="branches" element={<PermissionRoute permission="branches.manage"><BranchesPage /></PermissionRoute>} />
        <Route path="users" element={<PermissionRoute permission="users.read"><UsersPage /></PermissionRoute>} />
        <Route path="roles" element={<PermissionRoute permission="roles.manage"><RolesPage /></PermissionRoute>} />
        <Route path="catalog" element={<PermissionRoute permission="catalog.read"><CatalogPage /></PermissionRoute>} />
        <Route path="digital-catalog" element={<PermissionRoute permission="products.read"><DigitalCatalogPage /></PermissionRoute>} />
        <Route path="products" element={<PermissionRoute permission="products.read"><ProductsPage /></PermissionRoute>} />
        <Route path="products/:id" element={<PermissionRoute permission="products.read"><ProductDetailPage /></PermissionRoute>} />
        <Route path="inventory" element={<PermissionRoute permission="inventory.read"><InventoryPage /></PermissionRoute>} />
        <Route path="suppliers" element={<PermissionRoute permission="suppliers.read"><SuppliersPage /></PermissionRoute>} />
        <Route path="purchases" element={<PermissionRoute permission="purchases.read"><PurchasesPage /></PermissionRoute>} />
        <Route path="customers" element={<PermissionRoute permission="customers.read"><CustomersPage /></PermissionRoute>} />
        <Route path="sales" element={<PermissionRoute permission="sales.read"><SalesPage /></PermissionRoute>} />
        <Route path="credits" element={<PermissionRoute permission="sales.read"><CreditsPage /></PermissionRoute>} />
        <Route path="pos" element={<PermissionRoute permission="sales.create"><POSPage /></PermissionRoute>} />
        <Route path="cash" element={<PermissionRoute permission="cash.read"><CashRegisterPage /></PermissionRoute>} />
        <Route path="contracts" element={<PermissionRoute permission="contracts.read"><ContractsPage /></PermissionRoute>} />
        <Route path="billing" element={<PermissionRoute permission="billing.read"><BillingPage /></PermissionRoute>} />
        <Route path="reports" element={<PermissionRoute permission="reports.read"><ReportsPage /></PermissionRoute>} />
        <Route path="expenses" element={<PermissionRoute permission="expenses.read"><ExpensesPage /></PermissionRoute>} />
        <Route path="audit" element={<PermissionRoute permission="audit.read"><AuditPage /></PermissionRoute>} />
        <Route path="notifications" element={<PermissionRoute permission="notifications.read"><NotificationsPage /></PermissionRoute>} />
        <Route path="settings" element={<PermissionRoute permission="settings.manage"><SettingsPage /></PermissionRoute>} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
