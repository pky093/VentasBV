const fs = require('fs');
const path = require('path');

const root = path.resolve('C:/Users/pboca/.gemini/antigravity/scratch/VentasBV/frontend/src');

const pages = [
  'SetPasswordPage', 'PlatformPage', 'BranchesPage', 'UsersPage', 'RolesPage', 
  'CatalogPage', 'ProductDetailPage', 'InventoryPage', 'SuppliersPage', 
  'PurchasesPage', 'CustomersPage', 'SalesPage', 'CashRegisterPage', 
  'BillingPage', 'ReportsPage', 'AuditPage', 'NotificationsPage', 
  'SettingsPage', 'ProfilePage'
];

for (const page of pages) {
  const filePath = path.join(root, 'pages', page + '.tsx');
  const name = page.replace('Page', '');
  const content = "import React from 'react';\n\n" +
    "export default function " + page + "() {\n" +
    "  return (\n" +
    "    <div className=\"p-6\">\n" +
    "      <h1 className=\"text-2xl font-bold mb-4\">" + name + "</h1>\n" +
    "      <p>Esta página está en construcción. Aquí irá el contenido de " + name + ".</p>\n" +
    "    </div>\n" +
    "  );\n" +
    "}\n";
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

// Update App.tsx
const appContent = "import React from 'react';\n" +
"import { Routes, Route, Navigate } from 'react-router-dom';\n" +
"import AppLayout from './layout/AppLayout';\n" +
"import LoginPage from './pages/LoginPage';\n" +
"import SetPasswordPage from './pages/SetPasswordPage';\n" +
"import PlatformPage from './pages/PlatformPage';\n" +
"\n" +
"// App Pages\n" +
"import DashboardPage from './pages/DashboardPage';\n" +
"import BranchesPage from './pages/BranchesPage';\n" +
"import UsersPage from './pages/UsersPage';\n" +
"import RolesPage from './pages/RolesPage';\n" +
"import CatalogPage from './pages/CatalogPage';\n" +
"import ProductsPage from './pages/ProductsPage';\n" +
"import ProductDetailPage from './pages/ProductDetailPage';\n" +
"import InventoryPage from './pages/InventoryPage';\n" +
"import SuppliersPage from './pages/SuppliersPage';\n" +
"import PurchasesPage from './pages/PurchasesPage';\n" +
"import CustomersPage from './pages/CustomersPage';\n" +
"import SalesPage from './pages/SalesPage';\n" +
"import POSPage from './pages/POSPage';\n" +
"import CashRegisterPage from './pages/CashRegisterPage';\n" +
"import BillingPage from './pages/BillingPage';\n" +
"import ReportsPage from './pages/ReportsPage';\n" +
"import AuditPage from './pages/AuditPage';\n" +
"import NotificationsPage from './pages/NotificationsPage';\n" +
"import SettingsPage from './pages/SettingsPage';\n" +
"import ProfilePage from './pages/ProfilePage';\n" +
"\n" +
"export default function App() {\n" +
"  return (\n" +
"    <Routes>\n" +
"      <Route path=\"/\" element={<Navigate to=\"/app\" replace />} />\n" +
"      <Route path=\"/login\" element={<LoginPage />} />\n" +
"      <Route path=\"/set-password\" element={<SetPasswordPage />} />\n" +
"      <Route path=\"/platform\" element={<PlatformPage />} />\n" +
"      \n" +
"      <Route path=\"/app\" element={<AppLayout />}>\n" +
"        <Route index element={<DashboardPage />} />\n" +
"        <Route path=\"branches\" element={<BranchesPage />} />\n" +
"        <Route path=\"users\" element={<UsersPage />} />\n" +
"        <Route path=\"roles\" element={<RolesPage />} />\n" +
"        <Route path=\"catalog\" element={<CatalogPage />} />\n" +
"        <Route path=\"products\" element={<ProductsPage />} />\n" +
"        <Route path=\"products/:id\" element={<ProductDetailPage />} />\n" +
"        <Route path=\"inventory\" element={<InventoryPage />} />\n" +
"        <Route path=\"suppliers\" element={<SuppliersPage />} />\n" +
"        <Route path=\"purchases\" element={<PurchasesPage />} />\n" +
"        <Route path=\"customers\" element={<CustomersPage />} />\n" +
"        <Route path=\"sales\" element={<SalesPage />} />\n" +
"        <Route path=\"pos\" element={<POSPage />} />\n" +
"        <Route path=\"cash\" element={<CashRegisterPage />} />\n" +
"        <Route path=\"billing\" element={<BillingPage />} />\n" +
"        <Route path=\"reports\" element={<ReportsPage />} />\n" +
"        <Route path=\"audit\" element={<AuditPage />} />\n" +
"        <Route path=\"notifications\" element={<NotificationsPage />} />\n" +
"        <Route path=\"settings\" element={<SettingsPage />} />\n" +
"        <Route path=\"profile\" element={<ProfilePage />} />\n" +
"      </Route>\n" +
"    </Routes>\n" +
"  );\n" +
"}\n";

fs.writeFileSync(path.join(root, 'App.tsx'), appContent);
console.log("Pages created successfully.");
