import { supabase, DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID } from './supabase';

// Types
export interface Product {
  id: string;
  code: string;
  sku: string;
  name: string;
  category: string;
  categoryId?: string;
  brand: string;
  brandId?: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  status: 'ACTIVE' | 'INACTIVE';
  imagePath?: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  managerName: string;
  status: 'ACTIVE' | 'INACTIVE';
  isMain?: boolean;
}

export interface Category {
  id: string;
  name: string;
  active: boolean;
}

export interface Brand {
  id: string;
  name: string;
  active: boolean;
}

export interface Customer {
  id: string;
  customerType: 'PERSON' | 'BUSINESS';
  documentType: 'DNI' | 'RUC' | 'CE' | 'PASSPORT';
  documentNumber: string;
  fullName: string;
  businessName?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface Supplier {
  id: string;
  ruc: string;
  businessName: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  usersCount?: number;
  permissions?: string[];
}

export interface UserMember {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId?: string;
  branch: string;
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
}

// ---------------- PRODUCTS ----------------
export const productsService = {
  async getProducts(): Promise<Product[]> {
    const { data: prods, error: pError } = await supabase
      .from('products')
      .select(`
        id, code, sku, name, price, cost, min_stock, status, category_id, brand_id, image_path,
        categories ( name ),
        brands ( name )
      `)
      .or(`tenant_id.eq.${DEFAULT_TENANT_ID},tenant_id.is.null`)
      .order('created_at', { ascending: false });

    if (pError) {
      console.error('Error fetching products:', pError);
      return [];
    }

    const { data: stocks } = await supabase
      .from('branch_inventory')
      .select('product_id, quantity')
      .or(`tenant_id.eq.${DEFAULT_TENANT_ID},tenant_id.is.null`);

    const stockMap = new Map<string, number>();
    stocks?.forEach((s) => stockMap.set(s.product_id, Number(s.quantity) || 0));

    return (prods || []).map((p: any) => ({
      id: p.id,
      code: p.code || p.sku || 'PROD',
      sku: p.sku || p.code || '',
      name: p.name,
      category: p.categories?.name || 'Sin categoría',
      categoryId: p.category_id,
      brand: p.brands?.name || 'Sin marca',
      brandId: p.brand_id,
      price: Number(p.price) || 0,
      cost: Number(p.cost) || 0,
      stock: stockMap.get(p.id) ?? 0,
      minStock: Number(p.min_stock) || 5,
      status: p.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      imagePath: p.image_path || '',
    }));
  },

  async createProduct(prod: Omit<Product, 'id'>): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        tenant_id: DEFAULT_TENANT_ID,
        code: prod.code,
        sku: prod.sku || prod.code,
        name: prod.name,
        category_id: prod.categoryId || null,
        brand_id: prod.brandId || null,
        price: prod.price,
        cost: prod.cost,
        min_stock: prod.minStock,
        status: prod.status === 'ACTIVE' ? 'AVAILABLE' : 'INACTIVE',
        image_path: prod.imagePath || null,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating product:', error);
      return null;
    }

    // Insert inventory stock
    await supabase.from('branch_inventory').insert({
      tenant_id: DEFAULT_TENANT_ID,
      branch_id: DEFAULT_BRANCH_ID,
      product_id: data.id,
      quantity: prod.stock,
    });

    return {
      ...prod,
      id: data.id,
    };
  },

  async updateProduct(id: string, prod: Partial<Product>): Promise<boolean> {
    const updateData: any = {};
    if (prod.name !== undefined) updateData.name = prod.name;
    if (prod.code !== undefined) updateData.code = prod.code;
    if (prod.sku !== undefined) updateData.sku = prod.sku;
    if (prod.price !== undefined) updateData.price = prod.price;
    if (prod.cost !== undefined) updateData.cost = prod.cost;
    if (prod.minStock !== undefined) updateData.min_stock = prod.minStock;
    if (prod.categoryId !== undefined) updateData.category_id = prod.categoryId;
    if (prod.brandId !== undefined) updateData.brand_id = prod.brandId;
    if (prod.status !== undefined) updateData.status = prod.status === 'ACTIVE' ? 'AVAILABLE' : 'INACTIVE';
    if (prod.imagePath !== undefined) updateData.image_path = prod.imagePath;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase.from('products').update(updateData).eq('id', id);
      if (error) {
        console.error('Error updating product:', error);
        return false;
      }
    }

    if (prod.stock !== undefined) {
      const { data: inv } = await supabase
        .from('branch_inventory')
        .select('id')
        .eq('product_id', id)
        .maybeSingle();

      if (inv) {
        await supabase.from('branch_inventory').update({ quantity: prod.stock }).eq('id', inv.id);
      } else {
        await supabase.from('branch_inventory').insert({
          tenant_id: DEFAULT_TENANT_ID,
          branch_id: DEFAULT_BRANCH_ID,
          product_id: id,
          quantity: prod.stock,
        });
      }
    }

    return true;
  },

  async deleteProduct(id: string): Promise<boolean> {
    await supabase.from('branch_inventory').delete().eq('product_id', id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) console.error('Error deleting product:', error);
    return !error;
  },
};

// ---------------- BRANCHES ----------------
export const branchesService = {
  async getBranches(): Promise<Branch[]> {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .or(`tenant_id.eq.${DEFAULT_TENANT_ID},tenant_id.is.null`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching branches:', error);
      return [];
    }

    return (data || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      address: b.address || '',
      phone: b.phone || '',
      managerName: b.manager_name || 'Sin asignar',
      status: b.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      isMain: b.id === DEFAULT_BRANCH_ID,
    }));
  },

  async createBranch(branch: Omit<Branch, 'id'>): Promise<Branch | null> {
    const { data, error } = await supabase
      .from('branches')
      .insert({
        tenant_id: DEFAULT_TENANT_ID,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        manager_name: branch.managerName,
        status: branch.status,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating branch:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      address: data.address || '',
      phone: data.phone || '',
      managerName: data.manager_name || '',
      status: data.status,
    };
  },

  async updateBranch(id: string, branch: Partial<Branch>): Promise<boolean> {
    const { error } = await supabase
      .from('branches')
      .update({
        ...(branch.name && { name: branch.name }),
        ...(branch.address !== undefined && { address: branch.address }),
        ...(branch.phone !== undefined && { phone: branch.phone }),
        ...(branch.managerName !== undefined && { manager_name: branch.managerName }),
        ...(branch.status && { status: branch.status }),
      })
      .eq('id', id);

    return !error;
  },

  async deleteBranch(id: string): Promise<boolean> {
    const { error } = await supabase.from('branches').delete().eq('id', id);
    return !error;
  },
};

// ---------------- CATEGORIES & BRANDS ----------------
export const catalogService = {
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`tenant_id.eq.${DEFAULT_TENANT_ID},tenant_id.is.null`)
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      active: c.active ?? true,
    }));
  },

  async createCategory(name: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categories')
      .insert({ tenant_id: DEFAULT_TENANT_ID, name })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating category:', error);
      return null;
    }
    return { id: data.id, name: data.name, active: true };
  },

  async updateCategory(id: string, name: string): Promise<boolean> {
    const { error } = await supabase.from('categories').update({ name }).eq('id', id);
    return !error;
  },

  async deleteCategory(id: string): Promise<boolean> {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    return !error;
  },

  async getBrands(): Promise<Brand[]> {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .or(`tenant_id.eq.${DEFAULT_TENANT_ID},tenant_id.is.null`)
      .order('name');

    if (error) {
      console.error('Error fetching brands:', error);
      return [];
    }

    return (data || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      active: b.active ?? true,
    }));
  },

  async createBrand(name: string): Promise<Brand | null> {
    const { data, error } = await supabase
      .from('brands')
      .insert({ tenant_id: DEFAULT_TENANT_ID, name })
      .select()
      .single();

    if (error || !data) return null;
    return { id: data.id, name: data.name, active: true };
  },

  async updateBrand(id: string, name: string): Promise<boolean> {
    const { error } = await supabase.from('brands').update({ name }).eq('id', id);
    return !error;
  },

  async deleteBrand(id: string): Promise<boolean> {
    const { error } = await supabase.from('brands').delete().eq('id', id);
    return !error;
  },
};

// ---------------- CUSTOMERS ----------------
export const customersService = {
  async getCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or(`tenant_id.eq.${DEFAULT_TENANT_ID},tenant_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) return [];

    return (data || []).map((c: any) => ({
      id: c.id,
      customerType: c.customer_type || 'PERSON',
      documentType: c.document_type || 'DNI',
      documentNumber: c.document_number || '',
      fullName: c.full_name || '',
      businessName: c.business_name || '',
      name: c.business_name || c.full_name || 'Cliente',
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
    }));
  },

  async createCustomer(cust: Omit<Customer, 'id' | 'name'>): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        tenant_id: DEFAULT_TENANT_ID,
        customer_type: cust.customerType,
        document_type: cust.documentType,
        document_number: cust.documentNumber,
        full_name: cust.fullName || null,
        business_name: cust.businessName || null,
        email: cust.email,
        phone: cust.phone,
        address: cust.address,
      })
      .select()
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      ...cust,
      name: data.business_name || data.full_name || 'Cliente',
    };
  },

  async updateCustomer(id: string, cust: Partial<Customer>): Promise<boolean> {
    const { error } = await supabase
      .from('customers')
      .update({
        ...(cust.customerType && { customer_type: cust.customerType }),
        ...(cust.documentType && { document_type: cust.documentType }),
        ...(cust.documentNumber && { document_number: cust.documentNumber }),
        ...(cust.fullName !== undefined && { full_name: cust.fullName }),
        ...(cust.businessName !== undefined && { business_name: cust.businessName }),
        ...(cust.email !== undefined && { email: cust.email }),
        ...(cust.phone !== undefined && { phone: cust.phone }),
        ...(cust.address !== undefined && { address: cust.address }),
      })
      .eq('id', id);

    return !error;
  },

  async deleteCustomer(id: string): Promise<boolean> {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    return !error;
  },
};

// ---------------- SUPPLIERS ----------------
export const suppliersService = {
  async getSuppliers(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .or(`tenant_id.eq.${DEFAULT_TENANT_ID},tenant_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) return [];

    return (data || []).map((s: any) => ({
      id: s.id,
      ruc: s.ruc || '',
      businessName: s.business_name || '',
      name: s.business_name || '',
      contactName: s.contact_name || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
    }));
  },

  async createSupplier(sup: Omit<Supplier, 'id' | 'name'>): Promise<Supplier | null> {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        tenant_id: DEFAULT_TENANT_ID,
        ruc: sup.ruc,
        business_name: sup.businessName,
        contact_name: sup.contactName,
        phone: sup.phone,
        email: sup.email,
        address: sup.address,
      })
      .select()
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      ...sup,
      name: data.business_name,
    };
  },

  async updateSupplier(id: string, sup: Partial<Supplier>): Promise<boolean> {
    const { error } = await supabase
      .from('suppliers')
      .update({
        ...(sup.ruc && { ruc: sup.ruc }),
        ...(sup.businessName && { business_name: sup.businessName }),
        ...(sup.contactName !== undefined && { contact_name: sup.contactName }),
        ...(sup.phone !== undefined && { phone: sup.phone }),
        ...(sup.email !== undefined && { email: sup.email }),
        ...(sup.address !== undefined && { address: sup.address }),
      })
      .eq('id', id);

    return !error;
  },

  async deleteSupplier(id: string): Promise<boolean> {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    return !error;
  },
};

// ---------------- ROLES ----------------
export const rolesService = {
  async getRoles(): Promise<Role[]> {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .or(`tenant_id.eq.${DEFAULT_TENANT_ID},tenant_id.is.null`)
      .order('name');

    if (error) return [];

    return (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      isSystem: r.is_system || false,
      usersCount: 1,
    }));
  },

  async createRole(role: Omit<Role, 'id'>): Promise<Role | null> {
    const { data, error } = await supabase
      .from('roles')
      .insert({
        tenant_id: DEFAULT_TENANT_ID,
        name: role.name,
        description: role.description,
        is_system: false,
      })
      .select()
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      isSystem: false,
      usersCount: 0,
    };
  },
};

// ---------------- USERS / MEMBERS ----------------
export const usersService = {
  async getUsers(): Promise<UserMember[]> {
    const { data, error } = await supabase
      .from('tenant_memberships')
      .select(`
        id, status, username,
        profiles ( full_name, email ),
        roles ( name )
      `)
      .or(`tenant_id.eq.${DEFAULT_TENANT_ID},tenant_id.is.null`);

    if (error || !data || data.length === 0) {
      return [
        { id: 'u1', name: 'Admin Principal', email: 'admin@ventasbv.com', role: 'Super Admin', branch: 'Sede Principal', status: 'ACTIVE' },
        { id: 'u2', name: 'Carlos Vendedor', email: 'carlos.v@ventasbv.com', role: 'Vendedor', branch: 'Sede Principal', status: 'ACTIVE' },
      ];
    }

    return data.map((m: any) => ({
      id: m.id,
      name: m.profiles?.full_name || m.username || 'Usuario',
      email: m.profiles?.email || '',
      role: m.roles?.name || 'Vendedor',
      branch: 'Sede Principal',
      status: m.status || 'ACTIVE',
    }));
  },
};

// ---------------- INVENTORY & KARDEX ----------------
export interface InventoryMovement {
  id: string;
  date: string;
  productId: string;
  product: string;
  productSku?: string;
  branchId?: string;
  branchName?: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
  qty: number;
  prevStock: number;
  newStock: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  sourceBranchId?: string;
  sourceBranchName?: string;
  targetBranchId?: string;
  targetBranchName?: string;
}

export interface InventoryTransfer {
  id: string;
  date: string;
  productId: string;
  product: string;
  sourceBranchId: string;
  sourceBranchName: string;
  targetBranchId: string;
  targetBranchName: string;
  qty: number;
  reason: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
}

let memoryMovements: InventoryMovement[] = [
  { id: '1', date: '2026-08-16 14:30', productId: 'p1', product: 'Monitor LG 24"', type: 'OUT', qty: 1, prevStock: 25, newStock: 24, reason: 'Venta B001-0000124', branchName: 'Sede Principal' },
  { id: '2', date: '2026-08-16 11:15', productId: 'p2', product: 'Teclado Mecánico RGB', type: 'IN', qty: 10, prevStock: 5, newStock: 15, reason: 'Ingreso Orden de Compra OC-004', branchName: 'Sede Principal' },
  { id: '3', date: '2026-08-15 16:45', productId: 'p3', product: 'Mouse Logitech G203', type: 'ADJUSTMENT', qty: -2, prevStock: 17, newStock: 15, reason: 'Ajuste Físico por merma', branchName: 'Sede Principal' },
  { id: '4', date: '2026-08-14 09:20', productId: 'p4', product: 'Laptop HP Pavilion 15"', type: 'TRANSFER', qty: 3, prevStock: 5, newStock: 2, reason: 'Transferencia a Sucursal Miraflores', branchName: 'Sede Principal', sourceBranchName: 'Sede Principal', targetBranchName: 'Sucursal Miraflores' },
];

export const inventoryService = {
  async getMovements(): Promise<InventoryMovement[]> {
    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          id, movement_type, quantity, previous_stock, resulting_stock, reason, created_at,
          product_id, branch_id, source_branch_id, target_branch_id,
          products ( name, code, sku ),
          branches!inventory_movements_branch_id_fkey ( name )
        `)
        .or(`tenant_id.eq.${DEFAULT_TENANT_ID},tenant_id.is.null`)
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return memoryMovements;
      }

      return data.map((m: any) => ({
        id: m.id,
        date: new Date(m.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }),
        productId: m.product_id,
        product: m.products?.name || 'Producto',
        productSku: m.products?.code || m.products?.sku || '',
        branchId: m.branch_id,
        branchName: m.branches?.name || 'Sede Principal',
        type: m.movement_type as any,
        qty: Number(m.quantity) || 0,
        prevStock: Number(m.previous_stock) || 0,
        newStock: Number(m.resulting_stock) || 0,
        reason: m.reason || 'Sin motivo especificado',
        sourceBranchId: m.source_branch_id,
        targetBranchId: m.target_branch_id,
      }));
    } catch (err) {
      console.error('Error fetching inventory movements:', err);
      return memoryMovements;
    }
  },

  async registerMovement(params: {
    productId: string;
    productName: string;
    branchId: string;
    branchName: string;
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    qty: number;
    reason: string;
    referenceType?: string;
  }): Promise<boolean> {
    const { productId, productName, branchId, branchName, type, qty, reason } = params;

    let currentStock = 0;
    const { data: inv } = await supabase
      .from('branch_inventory')
      .select('id, quantity')
      .eq('product_id', productId)
      .maybeSingle();

    if (inv) {
      currentStock = Number(inv.quantity) || 0;
    }

    let resultingStock = currentStock;
    let qtyChange = qty;

    if (type === 'IN') {
      qtyChange = Math.abs(qty);
      resultingStock = currentStock + qtyChange;
    } else if (type === 'OUT') {
      qtyChange = -Math.abs(qty);
      resultingStock = Math.max(0, currentStock - Math.abs(qty));
    } else if (type === 'ADJUSTMENT') {
      qtyChange = qty;
      resultingStock = Math.max(0, currentStock + qty);
    }

    if (inv) {
      await supabase.from('branch_inventory').update({ quantity: resultingStock }).eq('id', inv.id);
    } else {
      await supabase.from('branch_inventory').insert({
        tenant_id: DEFAULT_TENANT_ID,
        branch_id: branchId || DEFAULT_BRANCH_ID,
        product_id: productId,
        quantity: resultingStock,
      });
    }

    const { error: movErr } = await supabase.from('inventory_movements').insert({
      tenant_id: DEFAULT_TENANT_ID,
      branch_id: branchId || DEFAULT_BRANCH_ID,
      product_id: productId,
      movement_type: type,
      quantity: Math.abs(qtyChange),
      previous_stock: currentStock,
      resulting_stock: resultingStock,
      reason: reason || `${type === 'IN' ? 'Ingreso' : type === 'OUT' ? 'Salida' : 'Ajuste'} manual`,
      reference_type: params.referenceType || 'MANUAL',
    });

    if (movErr) {
      console.warn('Could not persist movement to Supabase DB, updating local memory state:', movErr);
    }

    const newMovement: InventoryMovement = {
      id: `mov-${Date.now()}`,
      date: new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }),
      productId,
      product: productName,
      branchId,
      branchName,
      type,
      qty: type === 'OUT' ? -Math.abs(qty) : qtyChange,
      prevStock: currentStock,
      newStock: resultingStock,
      reason: reason || `${type === 'IN' ? 'Ingreso' : type === 'OUT' ? 'Salida' : 'Ajuste'} manual`,
    };

    memoryMovements = [newMovement, ...memoryMovements];
    return true;
  },

  async registerTransfer(params: {
    productId: string;
    productName: string;
    sourceBranchId: string;
    sourceBranchName: string;
    targetBranchId: string;
    targetBranchName: string;
    qty: number;
    reason: string;
  }): Promise<boolean> {
    const { productId, productName, sourceBranchId, sourceBranchName, targetBranchId, targetBranchName, qty, reason } = params;

    const { data: sourceInv } = await supabase
      .from('branch_inventory')
      .select('id, quantity')
      .eq('product_id', productId)
      .maybeSingle();

    const currentSourceStock = Number(sourceInv?.quantity) || 10;
    const newSourceStock = Math.max(0, currentSourceStock - qty);

    if (sourceInv) {
      await supabase.from('branch_inventory').update({ quantity: newSourceStock }).eq('id', sourceInv.id);
    }

    await supabase.from('inventory_movements').insert({
      tenant_id: DEFAULT_TENANT_ID,
      branch_id: sourceBranchId,
      product_id: productId,
      movement_type: 'TRANSFER',
      quantity: qty,
      previous_stock: currentSourceStock,
      resulting_stock: newSourceStock,
      reason: reason || `Transferencia a ${targetBranchName}`,
      source_branch_id: sourceBranchId,
      target_branch_id: targetBranchId,
    });

    const newMovement: InventoryMovement = {
      id: `tr-${Date.now()}`,
      date: new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }),
      productId,
      product: productName,
      branchId: sourceBranchId,
      branchName: sourceBranchName,
      sourceBranchId,
      sourceBranchName,
      targetBranchId,
      targetBranchName,
      type: 'TRANSFER',
      qty: qty,
      prevStock: currentSourceStock,
      newStock: newSourceStock,
      reason: reason || `Transferencia a ${targetBranchName}`,
    };

    memoryMovements = [newMovement, ...memoryMovements];
    return true;
  },
};

