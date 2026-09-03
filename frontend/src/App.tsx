import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import LoginPage from './pages/LoginPage';
import SetPasswordPage from './pages/SetPasswordPage';
import PlatformPage from './pages/PlatformPage';

// App Pages
import DashboardPage from './pages/DashboardPage';
import BranchesPage from './pages/BranchesPage';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import CatalogPage from './pages/CatalogPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import InventoryPage from './pages/InventoryPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchasesPage from './pages/PurchasesPage';
import CustomersPage from './pages/CustomersPage';
import SalesPage from './pages/SalesPage';
import CreditsPage from './pages/CreditsPage';
import POSPage from './pages/POSPage';
import CashRegisterPage from './pages/CashRegisterPage';
import ContractsPage from './pages/ContractsPage';
import BillingPage from './pages/BillingPage';
import ReportsPage from './pages/ReportsPage';
import ExpensesPage from './pages/ExpensesPage';
import AuditPage from './pages/AuditPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import DigitalCatalogPage from './pages/DigitalCatalogPage';
import PublicCatalogPage from './pages/PublicCatalogPage';

import { BranchProvider } from './context/BranchContext';
import { PermissionProvider } from './context/PermissionContext';
import { SyncProvider } from './context/SyncContext';
import { PermissionRoute } from './components/PermissionRoute';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <SyncProvider>
      <BranchProvider>
        <PermissionProvider>
          <Routes>
            {/* Public Customer Routes (No Login Required) */}
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
                <ProtectedRoute>
                  <PlatformPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
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
        </PermissionProvider>
      </BranchProvider>
    </SyncProvider>
  );
}
