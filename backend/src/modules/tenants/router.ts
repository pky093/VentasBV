import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { validateBody } from '../../middleware/validate.js';
import { db, tenantId, assertPermission } from '../shared.js';
import { throwIfSupabaseError } from '../../lib/supabase.js';

export const tenantsRouter = Router({ mergeParams: true });
// Base path is /api/v1/tenants/:tenantId

// 1. Settings & Branding
tenantsRouter.get('/', asyncHandler(async (req, res) => {
  await assertPermission(req, 'settings.manage');
  const { data, error } = await db(req).from('tenants').select('*').eq('id', tenantId(req)).single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.patch('/', asyncHandler(async (req, res) => {
  await assertPermission(req, 'settings.manage');
  const { data, error } = await db(req).from('tenants').update(req.body).eq('id', tenantId(req)).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.put('/logo', asyncHandler(async (req, res) => {
  await assertPermission(req, 'settings.manage');
  res.json({ success: true, data: { url: 'mock_logo_url' } });
}));

tenantsRouter.delete('/logo', asyncHandler(async (req, res) => {
  await assertPermission(req, 'settings.manage');
  res.json({ success: true, data: null });
}));

tenantsRouter.post('/assets', asyncHandler(async (req, res) => {
  await assertPermission(req, 'settings.manage');
  res.json({ success: true, data: { url: 'mock_asset_url' } });
}));

// 2. Branches
tenantsRouter.get('/branches', asyncHandler(async (req, res) => {
  await assertPermission(req, 'branches.read');
  const { data, error } = await db(req).from('branches').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/branches', asyncHandler(async (req, res) => {
  await assertPermission(req, 'branches.manage');
  const { data, error } = await db(req).from('branches').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.patch('/branches/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'branches.manage');
  const { data, error } = await db(req).from('branches').update(req.body).eq('id', req.params.id).eq('tenant_id', tenantId(req)).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.delete('/branches/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'branches.manage');
  const { error } = await db(req).from('branches').delete().eq('id', req.params.id).eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data: null });
}));

// 3. Users/Memberships
tenantsRouter.get('/memberships', asyncHandler(async (req, res) => {
  await assertPermission(req, 'users.read');
  const { data, error } = await db(req).from('tenant_members').select('*, profiles(*), roles(*)').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/access-users', asyncHandler(async (req, res) => {
  await assertPermission(req, 'users.manage');
  res.json({ success: true, data: { id: 'mock_user' } });
}));

tenantsRouter.patch('/memberships/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'users.manage');
  const { data, error } = await db(req).from('tenant_members').update(req.body).eq('id', req.params.id).eq('tenant_id', tenantId(req)).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

// 4. Roles
tenantsRouter.get('/roles', asyncHandler(async (req, res) => {
  await assertPermission(req, 'roles.read');
  const { data, error } = await db(req).from('roles').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/roles', asyncHandler(async (req, res) => {
  await assertPermission(req, 'roles.manage');
  const { data, error } = await db(req).from('roles').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.patch('/roles/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'roles.manage');
  const { data, error } = await db(req).from('roles').update(req.body).eq('id', req.params.id).eq('tenant_id', tenantId(req)).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

// 5. Catalog - Product Types
tenantsRouter.get('/product-types', asyncHandler(async (req, res) => {
  await assertPermission(req, 'catalog.read');
  const { data, error } = await db(req).from('product_types').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/product-types', asyncHandler(async (req, res) => {
  await assertPermission(req, 'catalog.manage');
  const { data, error } = await db(req).from('product_types').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.patch('/product-types/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'catalog.manage');
  const { data, error } = await db(req).from('product_types').update(req.body).eq('id', req.params.id).eq('tenant_id', tenantId(req)).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

// 6. Catalog - Categories
tenantsRouter.get('/categories', asyncHandler(async (req, res) => {
  await assertPermission(req, 'catalog.read');
  const { data, error } = await db(req).from('categories').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/categories', asyncHandler(async (req, res) => {
  await assertPermission(req, 'catalog.manage');
  const { data, error } = await db(req).from('categories').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.patch('/categories/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'catalog.manage');
  const { data, error } = await db(req).from('categories').update(req.body).eq('id', req.params.id).eq('tenant_id', tenantId(req)).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

// 7. Catalog - Brands
tenantsRouter.get('/brands', asyncHandler(async (req, res) => {
  await assertPermission(req, 'catalog.read');
  const { data, error } = await db(req).from('brands').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/brands', asyncHandler(async (req, res) => {
  await assertPermission(req, 'catalog.manage');
  const { data, error } = await db(req).from('brands').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.patch('/brands/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'catalog.manage');
  const { data, error } = await db(req).from('brands').update(req.body).eq('id', req.params.id).eq('tenant_id', tenantId(req)).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

// 8. Catalog - Models
tenantsRouter.get('/models', asyncHandler(async (req, res) => {
  await assertPermission(req, 'catalog.read');
  const { data, error } = await db(req).from('models').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/models', asyncHandler(async (req, res) => {
  await assertPermission(req, 'catalog.manage');
  const { data, error } = await db(req).from('models').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.patch('/models/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'catalog.manage');
  const { data, error } = await db(req).from('models').update(req.body).eq('id', req.params.id).eq('tenant_id', tenantId(req)).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

// 9. Catalog - Attributes
tenantsRouter.get('/attributes', asyncHandler(async (req, res) => {
  await assertPermission(req, 'catalog.read');
  const { data, error } = await db(req).from('attributes').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/attributes', asyncHandler(async (req, res) => {
  await assertPermission(req, 'catalog.manage');
  const { data, error } = await db(req).from('attributes').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.patch('/attributes/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'catalog.manage');
  const { data, error } = await db(req).from('attributes').update(req.body).eq('id', req.params.id).eq('tenant_id', tenantId(req)).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.get('/product-types/:id/attributes', asyncHandler(async (req, res) => {
  await assertPermission(req, 'catalog.read');
  const { data, error } = await db(req).from('product_type_attributes').select('*, attributes(*)').eq('product_type_id', req.params.id);
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/product-types/:id/attributes', asyncHandler(async (req, res) => {
  await assertPermission(req, 'catalog.manage');
  const { data, error } = await db(req).from('product_type_attributes').insert({ ...req.body, product_type_id: req.params.id }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

// 10. Products
tenantsRouter.get('/products', asyncHandler(async (req, res) => {
  await assertPermission(req, 'products.read');
  const { data, error } = await db(req).from('products').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/products', asyncHandler(async (req, res) => {
  await assertPermission(req, 'products.create');
  const { data, error } = await db(req).from('products').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.get('/products/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'products.read');
  const { data, error } = await db(req).from('products').select('*').eq('id', req.params.id).eq('tenant_id', tenantId(req)).single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.patch('/products/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'products.create');
  const { data, error } = await db(req).from('products').update(req.body).eq('id', req.params.id).eq('tenant_id', tenantId(req)).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.delete('/products/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'products.create');
  const { error } = await db(req).from('products').delete().eq('id', req.params.id).eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data: null });
}));

tenantsRouter.post('/products/:id/images', asyncHandler(async (req, res) => {
  await assertPermission(req, 'products.create');
  res.json({ success: true, data: { id: 'mock_img_id' } });
}));

tenantsRouter.delete('/products/:id/images/:imageId', asyncHandler(async (req, res) => {
  await assertPermission(req, 'products.create');
  res.json({ success: true, data: null });
}));

tenantsRouter.get('/products/:id/units', asyncHandler(async (req, res) => {
  await assertPermission(req, 'products.read');
  const { data, error } = await db(req).from('product_units').select('*').eq('product_id', req.params.id);
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/products/:id/units', asyncHandler(async (req, res) => {
  await assertPermission(req, 'products.create');
  const { data, error } = await db(req).from('product_units').insert({ ...req.body, product_id: req.params.id }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.patch('/products/:id/units/:unitId', asyncHandler(async (req, res) => {
  await assertPermission(req, 'products.create');
  const { data, error } = await db(req).from('product_units').update(req.body).eq('id', req.params.unitId).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

// 11. Inventory
tenantsRouter.get('/inventory', asyncHandler(async (req, res) => {
  await assertPermission(req, 'inventory.read');
  const { data, error } = await db(req).from('inventory').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.get('/inventory/:productId/movements', asyncHandler(async (req, res) => {
  await assertPermission(req, 'inventory.read');
  const { data, error } = await db(req).from('inventory_movements').select('*').eq('product_id', req.params.productId).eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/inventory/movements', asyncHandler(async (req, res) => {
  await assertPermission(req, 'inventory.manage');
  const { data, error } = await db(req).from('inventory_movements').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/inventory/adjustments', asyncHandler(async (req, res) => {
  await assertPermission(req, 'inventory.manage');
  res.json({ success: true, data: { status: 'adjusted' } });
}));

tenantsRouter.post('/inventory/transfers', asyncHandler(async (req, res) => {
  await assertPermission(req, 'inventory.manage');
  res.json({ success: true, data: { status: 'transferred' } });
}));

tenantsRouter.get('/inventory/alerts', asyncHandler(async (req, res) => {
  await assertPermission(req, 'inventory.read');
  res.json({ success: true, data: [] });
}));

// 12. Suppliers
tenantsRouter.get('/suppliers', asyncHandler(async (req, res) => {
  await assertPermission(req, 'suppliers.read');
  const { data, error } = await db(req).from('suppliers').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/suppliers', asyncHandler(async (req, res) => {
  await assertPermission(req, 'suppliers.manage');
  const { data, error } = await db(req).from('suppliers').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.patch('/suppliers/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'suppliers.manage');
  const { data, error } = await db(req).from('suppliers').update(req.body).eq('id', req.params.id).eq('tenant_id', tenantId(req)).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

// 13. Purchase Orders
tenantsRouter.get('/purchase-orders', asyncHandler(async (req, res) => {
  await assertPermission(req, 'purchases.read');
  const { data, error } = await db(req).from('purchase_orders').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/purchase-orders', asyncHandler(async (req, res) => {
  await assertPermission(req, 'purchases.create');
  const { data, error } = await db(req).from('purchase_orders').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.patch('/purchase-orders/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'purchases.create');
  const { data, error } = await db(req).from('purchase_orders').update(req.body).eq('id', req.params.id).eq('tenant_id', tenantId(req)).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/purchase-orders/:id/receive', asyncHandler(async (req, res) => {
  await assertPermission(req, 'purchases.create');
  res.json({ success: true, data: { status: 'received' } });
}));

// 14. Purchases
tenantsRouter.get('/purchases', asyncHandler(async (req, res) => {
  await assertPermission(req, 'purchases.read');
  const { data, error } = await db(req).from('purchases').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/purchases', asyncHandler(async (req, res) => {
  await assertPermission(req, 'purchases.create');
  const { data, error } = await db(req).from('purchases').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.get('/purchases/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'purchases.read');
  const { data, error } = await db(req).from('purchases').select('*, purchase_items(*)').eq('id', req.params.id).eq('tenant_id', tenantId(req)).single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

// 15. Customers
tenantsRouter.get('/customers', asyncHandler(async (req, res) => {
  await assertPermission(req, 'customers.read');
  const { data, error } = await db(req).from('customers').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/customers', asyncHandler(async (req, res) => {
  await assertPermission(req, 'customers.manage');
  const { data, error } = await db(req).from('customers').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.patch('/customers/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'customers.manage');
  const { data, error } = await db(req).from('customers').update(req.body).eq('id', req.params.id).eq('tenant_id', tenantId(req)).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.get('/customers/:id/history', asyncHandler(async (req, res) => {
  await assertPermission(req, 'customers.read');
  res.json({ success: true, data: [] });
}));

// 16. Sales
tenantsRouter.get('/sales', asyncHandler(async (req, res) => {
  await assertPermission(req, 'sales.read');
  const { data, error } = await db(req).from('sales').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/sales', asyncHandler(async (req, res) => {
  await assertPermission(req, 'sales.create');
  const { data, error } = await db(req).from('sales').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.get('/sales/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'sales.read');
  const { data, error } = await db(req).from('sales').select('*, sale_items(*)').eq('id', req.params.id).eq('tenant_id', tenantId(req)).single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.patch('/sales/:id/status', asyncHandler(async (req, res) => {
  await assertPermission(req, 'sales.create');
  const { data, error } = await db(req).from('sales').update({ status: req.body.status }).eq('id', req.params.id).eq('tenant_id', tenantId(req)).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/sales/:id/cancel', asyncHandler(async (req, res) => {
  await assertPermission(req, 'sales.create');
  res.json({ success: true, data: { status: 'cancelled' } });
}));

// 17. Cash Register
tenantsRouter.get('/cash', asyncHandler(async (req, res) => {
  await assertPermission(req, 'cash.read');
  const { data, error } = await db(req).from('cash_registers').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/cash/open', asyncHandler(async (req, res) => {
  await assertPermission(req, 'cash.manage');
  const { data, error } = await db(req).from('cash_registers').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/cash/close', asyncHandler(async (req, res) => {
  await assertPermission(req, 'cash.manage');
  res.json({ success: true, data: { status: 'closed' } });
}));

tenantsRouter.get('/cash/:id/movements', asyncHandler(async (req, res) => {
  await assertPermission(req, 'cash.read');
  const { data, error } = await db(req).from('cash_movements').select('*').eq('register_id', req.params.id).eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/cash/:id/movements', asyncHandler(async (req, res) => {
  await assertPermission(req, 'cash.manage');
  const { data, error } = await db(req).from('cash_movements').insert({ ...req.body, register_id: req.params.id, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

// 18. Billing
tenantsRouter.get('/invoices', asyncHandler(async (req, res) => {
  await assertPermission(req, 'billing.read');
  const { data, error } = await db(req).from('invoices').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/invoices', asyncHandler(async (req, res) => {
  await assertPermission(req, 'billing.manage');
  const { data, error } = await db(req).from('invoices').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.get('/invoices/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'billing.read');
  const { data, error } = await db(req).from('invoices').select('*').eq('id', req.params.id).eq('tenant_id', tenantId(req)).single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/invoices/:id/void', asyncHandler(async (req, res) => {
  await assertPermission(req, 'billing.manage');
  res.json({ success: true, data: { status: 'voided' } });
}));

tenantsRouter.get('/invoice-series', asyncHandler(async (req, res) => {
  await assertPermission(req, 'billing.read');
  const { data, error } = await db(req).from('invoice_series').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/invoice-series', asyncHandler(async (req, res) => {
  await assertPermission(req, 'billing.manage');
  const { data, error } = await db(req).from('invoice_series').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

// 19. Reports
tenantsRouter.get('/reports/dashboard', asyncHandler(async (req, res) => {
  await assertPermission(req, 'reports.read');
  res.json({ success: true, data: { sales: 0, customers: 0 } });
}));

tenantsRouter.get('/reports/sales', asyncHandler(async (req, res) => {
  await assertPermission(req, 'reports.read');
  res.json({ success: true, data: [] });
}));

tenantsRouter.get('/reports/purchases', asyncHandler(async (req, res) => {
  await assertPermission(req, 'reports.read');
  res.json({ success: true, data: [] });
}));

tenantsRouter.get('/reports/inventory', asyncHandler(async (req, res) => {
  await assertPermission(req, 'reports.read');
  res.json({ success: true, data: [] });
}));

tenantsRouter.get('/reports/kardex', asyncHandler(async (req, res) => {
  await assertPermission(req, 'reports.read');
  res.json({ success: true, data: [] });
}));

tenantsRouter.get('/reports/profit', asyncHandler(async (req, res) => {
  await assertPermission(req, 'reports.read');
  res.json({ success: true, data: [] });
}));

tenantsRouter.get('/reports/products', asyncHandler(async (req, res) => {
  await assertPermission(req, 'reports.read');
  res.json({ success: true, data: [] });
}));

tenantsRouter.get('/reports/cash', asyncHandler(async (req, res) => {
  await assertPermission(req, 'reports.read');
  res.json({ success: true, data: [] });
}));

tenantsRouter.get('/reports/export/:type', asyncHandler(async (req, res) => {
  await assertPermission(req, 'reports.read');
  res.json({ success: true, data: { url: 'mock_export_url' } });
}));

// 20. Audit
tenantsRouter.get('/audit', asyncHandler(async (req, res) => {
  await assertPermission(req, 'audit.read');
  const { data, error } = await db(req).from('audit_logs').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

// 21. Notifications
tenantsRouter.get('/notifications', asyncHandler(async (req, res) => {
  const { data, error } = await db(req).from('notifications').select('*').eq('user_id', req.auth!.id).eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.patch('/notifications/:id/read', asyncHandler(async (req, res) => {
  const { data, error } = await db(req).from('notifications').update({ read: true }).eq('id', req.params.id).eq('user_id', req.auth!.id).eq('tenant_id', tenantId(req)).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/notifications/read-all', asyncHandler(async (req, res) => {
  const { error } = await db(req).from('notifications').update({ read: true }).eq('user_id', req.auth!.id).eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data: { status: 'ok' } });
}));

// 22. Settings & Taxes
tenantsRouter.get('/settings', asyncHandler(async (req, res) => {
  await assertPermission(req, 'settings.manage');
  const { data, error } = await db(req).from('tenant_settings').select('*').eq('tenant_id', tenantId(req)).single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.patch('/settings', asyncHandler(async (req, res) => {
  await assertPermission(req, 'manage_settings');
  const { data, error } = await db(req).from('tenant_settings').upsert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.get('/taxes', asyncHandler(async (req, res) => {
  await assertPermission(req, 'settings.manage');
  const { data, error } = await db(req).from('taxes').select('*').eq('tenant_id', tenantId(req));
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.post('/taxes', asyncHandler(async (req, res) => {
  await assertPermission(req, 'manage_settings');
  const { data, error } = await db(req).from('taxes').insert({ ...req.body, tenant_id: tenantId(req) }).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));

tenantsRouter.patch('/taxes/:id', asyncHandler(async (req, res) => {
  await assertPermission(req, 'manage_settings');
  const { data, error } = await db(req).from('taxes').update(req.body).eq('id', req.params.id).eq('tenant_id', tenantId(req)).select().single();
  throwIfSupabaseError({ error });
  res.json({ success: true, data });
}));
