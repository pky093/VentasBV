-- 1. DROP OLD TABLES
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- 2. SETUP EXTENSIONS & SCHEMA
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS private;

-- 3. CUSTOM ENUMS
DO $$ BEGIN
    CREATE TYPE branch_status AS ENUM ('ACTIVE', 'INACTIVE');
    CREATE TYPE user_status AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');
    CREATE TYPE data_type AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT');
    CREATE TYPE product_status AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'INACTIVE');
    CREATE TYPE stock_control AS ENUM ('QUANTITY', 'UNIT');
    CREATE TYPE unit_status AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'DEFECTIVE');
    CREATE TYPE movement_type AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER');
    CREATE TYPE physical_count_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
    CREATE TYPE purchase_status AS ENUM ('DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED');
    CREATE TYPE customer_type AS ENUM ('PERSON', 'BUSINESS');
    CREATE TYPE document_type AS ENUM ('DNI', 'RUC', 'CE', 'PASSPORT', 'BOLETA', 'FACTURA', 'NOTA_CREDITO', 'NOTA_DEBITO');
    CREATE TYPE sale_status AS ENUM ('PENDING', 'PAID', 'COMPLETED', 'CANCELLED');
    CREATE TYPE payment_method AS ENUM ('CASH', 'TRANSFER', 'CARD', 'YAPE', 'PLIN', 'OTHER');
    CREATE TYPE cash_register_status AS ENUM ('OPEN', 'CLOSED');
    CREATE TYPE cash_movement_type AS ENUM ('INCOME', 'EXPENSE');
    CREATE TYPE invoice_status AS ENUM ('PENDING', 'ISSUED', 'ACCEPTED', 'REJECTED', 'CANCELLED');
    CREATE TYPE notification_type AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'DANGER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION private.set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION private.audit_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  old_row jsonb;
  new_row jsonb;
  t_id uuid;
  row_id text;
BEGIN
  old_row := CASE WHEN tg_op IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  new_row := CASE WHEN tg_op IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;
  t_id := COALESCE(NULLIF(new_row ->> 'tenant_id', '')::uuid, NULLIF(old_row ->> 'tenant_id', '')::uuid);
  IF tg_table_name = 'tenants' THEN
    t_id := COALESCE(NULLIF(new_row ->> 'id', '')::uuid, NULLIF(old_row ->> 'id', '')::uuid);
  END IF;
  row_id := COALESCE(new_row ->> 'id', old_row ->> 'id', new_row ->> 'user_id', old_row ->> 'user_id');
  INSERT INTO public.audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id, previous_values, new_values)
  VALUES (t_id, (SELECT auth.uid()), tg_op, tg_table_name, row_id::uuid, old_row, new_row);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. CREATE TABLES
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    trade_name TEXT,
    ruc TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_path TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    page_background_color TEXT,
    surface_color TEXT,
    text_color TEXT,
    muted_text_color TEXT,
    border_color TEXT,
    sidebar_background_color TEXT,
    sidebar_text_color TEXT,
    sidebar_active_color TEXT,
    sidebar_active_text_color TEXT,
    navbar_background_color TEXT,
    navbar_text_color TEXT,
    button_primary_color TEXT,
    button_primary_text_color TEXT,
    button_secondary_color TEXT,
    button_secondary_text_color TEXT,
    list_header_color TEXT,
    list_row_color TEXT,
    currency_code TEXT DEFAULT 'PEN',
    timezone TEXT DEFAULT 'America/Lima',
    tax_rate NUMERIC(5,2) DEFAULT 18.00,
    receipt_series TEXT,
    invoice_series TEXT,
    fiscal_config JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    manager_name TEXT,
    status branch_status DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY, -- References auth.users
    full_name TEXT NOT NULL,
    email TEXT,
    avatar_path TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_admins (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    module TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_code TEXT NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS tenant_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id),
    branch_ids UUID[] DEFAULT '{}',
    username TEXT,
    status user_status DEFAULT 'INVITED',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS membership_permissions (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES tenant_memberships(id) ON DELETE CASCADE,
    permission_code TEXT NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
    PRIMARY KEY (membership_id, permission_code)
);

-- Catalogs
CREATE TABLE IF NOT EXISTS product_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    product_type_id UUID REFERENCES product_types(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS custom_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    data_type data_type NOT NULL,
    options JSONB DEFAULT '[]',
    required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS type_attributes (
    product_type_id UUID NOT NULL REFERENCES product_types(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES custom_attributes(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    PRIMARY KEY (product_type_id, attribute_id)
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code TEXT,
    sku TEXT,
    barcode TEXT,
    name TEXT NOT NULL,
    product_type_id UUID REFERENCES product_types(id),
    category_id UUID REFERENCES categories(id),
    brand_id UUID REFERENCES brands(id),
    model_id UUID REFERENCES models(id),
    short_description TEXT,
    full_description TEXT,
    image_path TEXT,
    cost NUMERIC(12,4) DEFAULT 0,
    price NUMERIC(12,2) DEFAULT 0,
    min_price NUMERIC(12,2) DEFAULT 0,
    stock_control stock_control DEFAULT 'QUANTITY',
    min_stock NUMERIC(12,2) DEFAULT 0,
    status product_status DEFAULT 'AVAILABLE',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_attribute_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES custom_attributes(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    value_text TEXT,
    value_number NUMERIC,
    value_date DATE,
    value_boolean BOOLEAN,
    value_json JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(product_id, attribute_id)
);

CREATE TABLE IF NOT EXISTS product_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    unit_code TEXT NOT NULL,
    status unit_status DEFAULT 'AVAILABLE',
    attributes JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    changes JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Inventory
CREATE TABLE IF NOT EXISTS branch_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity NUMERIC(12,2) DEFAULT 0,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(branch_id, product_id)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_unit_id UUID REFERENCES product_units(id),
    movement_type movement_type NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    previous_stock NUMERIC(12,2) NOT NULL,
    resulting_stock NUMERIC(12,2) NOT NULL,
    reason TEXT,
    reference_type TEXT,
    reference_id UUID,
    source_branch_id UUID REFERENCES branches(id),
    target_branch_id UUID REFERENCES branches(id),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS physical_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    status physical_count_status DEFAULT 'PENDING',
    counted_by UUID REFERENCES profiles(id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS physical_count_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    count_id UUID NOT NULL REFERENCES physical_counts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    system_quantity NUMERIC(12,2) DEFAULT 0,
    counted_quantity NUMERIC(12,2),
    difference NUMERIC(12,2),
    adjusted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Suppliers & Purchases
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ruc TEXT,
    business_name TEXT NOT NULL,
    contact_name TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    status purchase_status DEFAULT 'DRAFT',
    notes TEXT,
    total NUMERIC(12,2) DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity NUMERIC(12,2) NOT NULL,
    unit_cost NUMERIC(12,4) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    purchase_order_id UUID REFERENCES purchase_orders(id),
    document_number TEXT,
    document_date DATE,
    subtotal NUMERIC(12,2) DEFAULT 0,
    tax NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_unit_id UUID REFERENCES product_units(id),
    quantity NUMERIC(12,2) NOT NULL,
    unit_cost NUMERIC(12,4) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_type customer_type DEFAULT 'PERSON',
    document_type document_type,
    document_number TEXT,
    full_name TEXT,
    business_name TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id),
    customer_id UUID REFERENCES customers(id),
    seller_id UUID REFERENCES profiles(id),
    sale_number TEXT NOT NULL,
    status sale_status DEFAULT 'PENDING',
    subtotal NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    tax NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    payment_method payment_method DEFAULT 'CASH',
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_unit_id UUID REFERENCES product_units(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quantity NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    discount NUMERIC(12,2) DEFAULT 0,
    subtotal NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Cash Register
CREATE TABLE IF NOT EXISTS cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id),
    opened_by UUID REFERENCES profiles(id),
    closed_by UUID REFERENCES profiles(id),
    opening_amount NUMERIC(12,2) DEFAULT 0,
    closing_amount NUMERIC(12,2),
    expected_amount NUMERIC(12,2),
    difference NUMERIC(12,2),
    status cash_register_status DEFAULT 'OPEN',
    opened_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    movement_type cash_movement_type NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Billing
CREATE TABLE IF NOT EXISTS invoice_series (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    series TEXT NOT NULL,
    next_number INTEGER DEFAULT 1,
    PRIMARY KEY (tenant_id, document_type, series)
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id),
    document_type document_type NOT NULL,
    series TEXT NOT NULL,
    sequence_number TEXT NOT NULL,
    customer_name TEXT,
    customer_document TEXT,
    customer_address TEXT,
    subtotal NUMERIC(12,2) DEFAULT 0,
    tax NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    status invoice_status DEFAULT 'PENDING',
    xml_path TEXT,
    pdf_path TEXT,
    issued_by UUID REFERENCES profiles(id),
    issued_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- System & Settings
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    previous_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'INFO',
    read BOOLEAN DEFAULT false,
    entity_type TEXT,
    entity_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, key)
);

CREATE TABLE IF NOT EXISTS taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rate NUMERIC(5,2) NOT NULL,
    active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT,
    file_type TEXT,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. PERMISSIONS & DEFAULT SEEDING
INSERT INTO permissions (code, name, module) VALUES
    ('dashboard.read', 'Ver Dashboard', 'Dashboard'),
    ('dashboard.manage', 'Administrar Dashboard', 'Dashboard'),
    ('companies.read', 'Ver Empresas', 'Empresas'),
    ('companies.manage', 'Administrar Empresas', 'Empresas'),
    ('branches.read', 'Ver Sucursales', 'Sucursales'),
    ('branches.manage', 'Administrar Sucursales', 'Sucursales'),
    ('users.read', 'Ver Usuarios', 'Usuarios'),
    ('users.manage', 'Administrar Usuarios', 'Usuarios'),
    ('roles.read', 'Ver Roles', 'Roles'),
    ('roles.manage', 'Administrar Roles', 'Roles'),
    ('catalog.read', 'Ver Catálogo', 'Catálogo'),
    ('catalog.manage', 'Administrar Catálogo', 'Catálogo'),
    ('products.read', 'Ver Productos', 'Productos'),
    ('products.create', 'Crear Productos', 'Productos'),
    ('products.edit', 'Editar Productos', 'Productos'),
    ('products.delete', 'Eliminar Productos', 'Productos'),
    ('products.export', 'Exportar Productos', 'Productos'),
    ('inventory.read', 'Ver Inventario', 'Inventario'),
    ('inventory.manage', 'Administrar Inventario', 'Inventario'),
    ('inventory.adjust', 'Ajustar Inventario', 'Inventario'),
    ('inventory.transfer', 'Transferir Inventario', 'Inventario'),
    ('suppliers.read', 'Ver Proveedores', 'Proveedores'),
    ('suppliers.manage', 'Administrar Proveedores', 'Proveedores'),
    ('purchases.read', 'Ver Compras', 'Compras'),
    ('purchases.create', 'Crear Compras', 'Compras'),
    ('purchases.approve', 'Aprobar Compras', 'Compras'),
    ('customers.read', 'Ver Clientes', 'Clientes'),
    ('customers.manage', 'Administrar Clientes', 'Clientes'),
    ('sales.read', 'Ver Ventas', 'Ventas'),
    ('sales.create', 'Crear Ventas', 'Ventas'),
    ('sales.edit', 'Editar Ventas', 'Ventas'),
    ('sales.cancel', 'Anular Ventas', 'Ventas'),
    ('sales.approve', 'Aprobar Ventas', 'Ventas'),
    ('sales.export', 'Exportar Ventas', 'Ventas'),
    ('cash.read', 'Ver Caja', 'Caja'),
    ('cash.manage', 'Administrar Caja', 'Caja'),
    ('cash.close', 'Cerrar Caja', 'Caja'),
    ('billing.read', 'Ver Facturación', 'Facturación'),
    ('billing.manage', 'Administrar Facturación', 'Facturación'),
    ('billing.void', 'Anular Comprobantes', 'Facturación'),
    ('reports.read', 'Ver Reportes', 'Reportes'),
    ('reports.export', 'Exportar Reportes', 'Reportes'),
    ('audit.read', 'Ver Auditoría', 'Auditoría'),
    ('settings.manage', 'Administrar Configuración', 'Configuración'),
    ('notifications.read', 'Ver Notificaciones', 'Notificaciones')
ON CONFLICT (code) DO NOTHING;

-- Trigger to seed defaults when tenant is created
CREATE OR REPLACE FUNCTION private.seed_tenant_defaults() RETURNS trigger AS $$
DECLARE
    admin_role_id UUID;
    vendedor_role_id UUID;
    almacen_role_id UUID;
    cajero_role_id UUID;
    contador_role_id UUID;
BEGIN
    -- Create Roles
    INSERT INTO roles (tenant_id, name, description, is_system) VALUES
        (NEW.id, 'Administrador', 'Acceso total al sistema', true) RETURNING id INTO admin_role_id;
    INSERT INTO roles (tenant_id, name, description, is_system) VALUES
        (NEW.id, 'Vendedor', 'Acceso a ventas y clientes', true) RETURNING id INTO vendedor_role_id;
    INSERT INTO roles (tenant_id, name, description, is_system) VALUES
        (NEW.id, 'Almacenero', 'Acceso a inventario y compras', true) RETURNING id INTO almacen_role_id;
    INSERT INTO roles (tenant_id, name, description, is_system) VALUES
        (NEW.id, 'Cajero', 'Acceso a caja y facturación', true) RETURNING id INTO cajero_role_id;
    INSERT INTO roles (tenant_id, name, description, is_system) VALUES
        (NEW.id, 'Contador', 'Acceso a reportes y facturación', true) RETURNING id INTO contador_role_id;

    -- Assign ALL permissions to Admin
    INSERT INTO role_permissions (tenant_id, role_id, permission_code)
    SELECT NEW.id, admin_role_id, code FROM permissions;

    -- Assign to Vendedor
    INSERT INTO role_permissions (tenant_id, role_id, permission_code)
    SELECT NEW.id, vendedor_role_id, code FROM permissions 
    WHERE code IN ('dashboard.read', 'products.read', 'customers.read', 'customers.manage', 'sales.read', 'sales.create', 'sales.edit', 'cash.read', 'billing.read');

    -- Assign to Almacenero
    INSERT INTO role_permissions (tenant_id, role_id, permission_code)
    SELECT NEW.id, almacen_role_id, code FROM permissions 
    WHERE code IN ('dashboard.read', 'products.read', 'inventory.read', 'inventory.manage', 'inventory.adjust', 'inventory.transfer', 'suppliers.read', 'purchases.read');

    -- Assign to Cajero
    INSERT INTO role_permissions (tenant_id, role_id, permission_code)
    SELECT NEW.id, cajero_role_id, code FROM permissions 
    WHERE code IN ('dashboard.read', 'sales.read', 'cash.read', 'cash.manage', 'cash.close', 'billing.read', 'billing.manage');

    -- Assign to Contador
    INSERT INTO role_permissions (tenant_id, role_id, permission_code)
    SELECT NEW.id, contador_role_id, code FROM permissions 
    WHERE code IN ('dashboard.read', 'reports.read', 'reports.export', 'billing.read', 'audit.read', 'purchases.read');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_tenant_created
    AFTER INSERT ON tenants
    FOR EACH ROW EXECUTE FUNCTION private.seed_tenant_defaults();

-- 7. AUTH & SECURITY FUNCTIONS
CREATE OR REPLACE FUNCTION private.is_platform_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION private.is_tenant_member(check_tenant_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenant_memberships 
        WHERE tenant_id = check_tenant_id 
        AND user_id = auth.uid() 
        AND status = 'ACTIVE'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION private.has_permission(check_tenant_id UUID, required_permission TEXT) RETURNS BOOLEAN AS $$
BEGIN
    IF private.is_platform_admin() THEN RETURN TRUE; END IF;
    
    RETURN EXISTS (
        SELECT 1 
        FROM tenant_memberships tm
        LEFT JOIN role_permissions rp ON tm.role_id = rp.role_id AND tm.tenant_id = rp.tenant_id
        LEFT JOIN membership_permissions mp ON tm.id = mp.membership_id AND tm.tenant_id = mp.tenant_id
        WHERE tm.tenant_id = check_tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'ACTIVE'
        AND (rp.permission_code = required_permission OR mp.permission_code = required_permission)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. BUSINESS LOGIC FUNCTIONS
CREATE OR REPLACE FUNCTION register_inventory_movement(
    p_tenant_id UUID,
    p_branch_id UUID,
    p_product_id UUID,
    p_movement_type movement_type,
    p_quantity NUMERIC,
    p_reason TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_current_stock NUMERIC;
    v_resulting_stock NUMERIC;
    v_movement_id UUID;
BEGIN
    -- Get current stock and lock row
    SELECT quantity INTO v_current_stock 
    FROM branch_inventory 
    WHERE tenant_id = p_tenant_id AND branch_id = p_branch_id AND product_id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        v_current_stock := 0;
        INSERT INTO branch_inventory (tenant_id, branch_id, product_id, quantity)
        VALUES (p_tenant_id, p_branch_id, p_product_id, 0);
    END IF;

    IF p_movement_type IN ('IN', 'ADJUSTMENT' /* assumes positive adjustment or we handle sign in qty */) THEN
        v_resulting_stock := v_current_stock + p_quantity;
    ELSIF p_movement_type IN ('OUT', 'TRANSFER') THEN
        v_resulting_stock := v_current_stock - p_quantity;
        IF v_resulting_stock < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente';
        END IF;
    END IF;

    UPDATE branch_inventory SET quantity = v_resulting_stock
    WHERE tenant_id = p_tenant_id AND branch_id = p_branch_id AND product_id = p_product_id;

    INSERT INTO inventory_movements (
        tenant_id, branch_id, product_id, movement_type, quantity,
        previous_stock, resulting_stock, reason, reference_type, reference_id, created_by
    ) VALUES (
        p_tenant_id, p_branch_id, p_product_id, p_movement_type, p_quantity,
        v_current_stock, v_resulting_stock, p_reason, p_reference_type, p_reference_id, auth.uid()
    ) RETURNING id INTO v_movement_id;

    RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_sale(
    p_tenant_id UUID,
    p_branch_id UUID,
    p_customer_id UUID,
    p_sale_number TEXT,
    p_items JSONB,
    p_subtotal NUMERIC,
    p_tax NUMERIC,
    p_total NUMERIC,
    p_payment_method payment_method,
    p_cash_register_id UUID
) RETURNS UUID AS $$
DECLARE
    v_sale_id UUID;
    v_item JSONB;
BEGIN
    -- Create Sale
    INSERT INTO sales (tenant_id, branch_id, customer_id, sale_number, subtotal, tax, total, payment_method, seller_id, status)
    VALUES (p_tenant_id, p_branch_id, p_customer_id, p_sale_number, p_subtotal, p_tax, p_total, p_payment_method, auth.uid(), 'COMPLETED')
    RETURNING id INTO v_sale_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        INSERT INTO sale_items (sale_id, tenant_id, product_id, quantity, unit_price, subtotal)
        VALUES (v_sale_id, p_tenant_id, (v_item->>'product_id')::UUID, (v_item->>'quantity')::NUMERIC, (v_item->>'unit_price')::NUMERIC, (v_item->>'subtotal')::NUMERIC);

        PERFORM register_inventory_movement(
            p_tenant_id, p_branch_id, (v_item->>'product_id')::UUID, 'OUT', (v_item->>'quantity')::NUMERIC,
            'Venta ' || p_sale_number, 'SALE', v_sale_id
        );
    END LOOP;

    -- Register Cash Movement if required
    IF p_cash_register_id IS NOT NULL THEN
        INSERT INTO cash_movements (cash_register_id, tenant_id, movement_type, amount, reason, reference_type, reference_id, created_by)
        VALUES (p_cash_register_id, p_tenant_id, 'INCOME', p_total, 'Venta ' || p_sale_number, 'SALE', v_sale_id, auth.uid());
    END IF;

    RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION issue_invoice(
    p_tenant_id UUID,
    p_sale_id UUID,
    p_document_type document_type,
    p_series TEXT
) RETURNS UUID AS $$
DECLARE
    v_next_number INTEGER;
    v_sequence TEXT;
    v_invoice_id UUID;
    v_sale RECORD;
BEGIN
    SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;
    
    UPDATE invoice_series 
    SET next_number = next_number + 1
    WHERE tenant_id = p_tenant_id AND document_type = p_document_type AND series = p_series
    RETURNING next_number - 1 INTO v_next_number;

    IF v_next_number IS NULL THEN
        RAISE EXCEPTION 'Serie no configurada';
    END IF;

    v_sequence := LPAD(v_next_number::TEXT, 8, '0');

    INSERT INTO invoices (tenant_id, sale_id, document_type, series, sequence_number, subtotal, tax, total, status, issued_by)
    VALUES (p_tenant_id, p_sale_id, p_document_type, p_series, v_sequence, v_sale.subtotal, v_sale.tax, v_sale.total, 'ISSUED', auth.uid())
    RETURNING id INTO v_invoice_id;

    -- Insert items logic...
    INSERT INTO invoice_items (invoice_id, tenant_id, description, quantity, unit_price, subtotal)
    SELECT v_invoice_id, p_tenant_id, p.name, si.quantity, si.unit_price, si.subtotal
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    WHERE si.sale_id = p_sale_id;

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION open_cash_register(
    p_tenant_id UUID,
    p_branch_id UUID,
    p_opening_amount NUMERIC
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO cash_registers (tenant_id, branch_id, opened_by, opening_amount, status)
    VALUES (p_tenant_id, p_branch_id, auth.uid(), p_opening_amount, 'OPEN')
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION close_cash_register(
    p_cash_register_id UUID,
    p_closing_amount NUMERIC
) RETURNS UUID AS $$
DECLARE
    v_reg RECORD;
    v_incomes NUMERIC;
    v_expenses NUMERIC;
    v_expected NUMERIC;
BEGIN
    SELECT * INTO v_reg FROM cash_registers WHERE id = p_cash_register_id AND status = 'OPEN';
    IF NOT FOUND THEN RAISE EXCEPTION 'Caja no encontrada o ya cerrada'; END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_incomes FROM cash_movements WHERE cash_register_id = p_cash_register_id AND movement_type = 'INCOME';
    SELECT COALESCE(SUM(amount), 0) INTO v_expenses FROM cash_movements WHERE cash_register_id = p_cash_register_id AND movement_type = 'EXPENSE';

    v_expected := v_reg.opening_amount + v_incomes - v_expenses;

    UPDATE cash_registers 
    SET closing_amount = p_closing_amount,
        expected_amount = v_expected,
        difference = p_closing_amount - v_expected,
        status = 'CLOSED',
        closed_by = auth.uid(),
        closed_at = now()
    WHERE id = p_cash_register_id;

    RETURN p_cash_register_id;
END;
$$ LANGUAGE plpgsql;

-- 9. RLS & TRIGGERS LOOP
-- We apply set_updated_at and audit_row triggers dynamically
DO $$ 
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        -- Updated_at triggers
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'updated_at') THEN
            EXECUTE format('
                CREATE OR REPLACE TRIGGER %I_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
            ', t, t);
        END IF;

        -- Audit triggers
        IF t NOT IN ('audit_logs', 'profiles') THEN
            EXECUTE format('
                CREATE OR REPLACE TRIGGER %I_audit
                AFTER INSERT OR UPDATE OR DELETE ON %I
                FOR EACH ROW EXECUTE FUNCTION private.audit_row();
            ', t, t);
        END IF;
    END LOOP;
END $$;

-- 10. STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true) ON CONFLICT (id) DO NOTHING;

-- RLS Enable for ALL tables dynamically
DO $$ 
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
        
        -- Default Tenant Policy (if tenant_id exists)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'tenant_id') THEN
            EXECUTE format('
                CREATE POLICY "Tenant isolation %I" ON %I
                FOR ALL USING (
                    tenant_id IN (
                        SELECT tm.tenant_id FROM tenant_memberships tm WHERE tm.user_id = auth.uid() AND tm.status = ''ACTIVE''
                    ) OR private.is_platform_admin()
                );
            ', t, t);
        END IF;
    END LOOP;
END $$;
