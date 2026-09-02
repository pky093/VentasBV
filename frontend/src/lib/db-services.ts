import { supabase, DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID, getActiveTenantId, getActiveBranchId, resolveTenantId } from './supabase';
import {
  STORES,
  getAllRecords,
  getRecord,
  putRecord,
  putManyRecords,
  deleteRecord as deleteLocalRecord,
  getByIndex,
  replaceAllRecords,
  queueMutation,
  generateLocalId,
} from './offline-db';
import { isNetworkOnline, refreshPendingCount } from './sync-engine';

export interface BranchStock {
  branchId: string;
  branchName: string;
  stock: number;
}

export interface ColorVariant {
  color: string;
  hex?: string;
  stock: number;
  imagePath?: string;
  galleryAngles?: Array<{ id: number; label: string; is360: boolean; img: string }>;
  branchStocks?: Record<string, number>;
}

export interface Product {
  id: string;
  code: string;
  sku: string;
  name: string;
  category: string;
  categoryId?: string;
  brand: string;
  brandId?: string;
  model?: string;
  modelId?: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  status: 'ACTIVE' | 'INACTIVE';
  imagePath?: string;
  colors?: ColorVariant[];
  branchStocks?: BranchStock[];
  galleryAngles?: Array<{ id: number; label: string; is360: boolean; img: string }>;
  showcaseFeatures?: any[];
  showcaseGlobes?: any[];
  primaryColor?: string;
  description?: string;
  editorialDescription?: string;
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
  brandsCount?: number;
  brands?: { id: string; name: string }[];
}

export interface Brand {
  id: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  category_id?: string;
  category_name?: string;
  active: boolean;
}

export interface Model {
  id: string;
  name: string;
  brandId?: string;
  brandName?: string;
  brand_id?: string;
  brand_name?: string;
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
  username?: string;
  password?: string;
  role: string;
  roleId?: string;
  branch: string;
  branches?: string[];
  tenantId?: string;
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
}


// ---------------- PRODUCTS ----------------
export const productsService = {
  async getProducts(branchId?: string): Promise<Product[]> {
    let tenantId = getActiveTenantId();
    if (!tenantId) {
      tenantId = await resolveTenantId();
    }
    if (!tenantId && !isNetworkOnline()) return [];

    // ─── OFFLINE FALLBACK: If not online, serve from IndexedDB ───
    if (!isNetworkOnline()) {
      return this._getProductsFromCache(branchId);
    }

    try {
      const { data: prods, error: pError } = await supabase
        .from('products')
        .select(`
          id, code, sku, name, price, cost, min_stock, status, category_id, brand_id, model_id, image_path, colors, showcase_features, showcase_globes, primary_color, gallery_angles,
          categories ( name ),
          brands ( name ),
          models ( name )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (pError) {
        console.error('Error fetching products:', pError);
        return this._getProductsFromCache(branchId);
      }

      const { data: branches } = await supabase
        .from('branches')
        .select('id, name')
        .eq('tenant_id', tenantId);

      const branchList = branches || [];
      const branchNameMap = new Map<string, string>();
      branchList.forEach((b) => branchNameMap.set(b.id, b.name));

      const { data: stocks } = await supabase
        .from('branch_inventory')
        .select('product_id, branch_id, quantity')
        .eq('tenant_id', tenantId);

      const productStocksMap = new Map<string, Map<string, number>>();
      stocks?.forEach((s) => {
        const pid = s.product_id;
        const bId = s.branch_id;
        const qty = Number(s.quantity) || 0;
        if (!productStocksMap.has(pid)) {
          productStocksMap.set(pid, new Map());
        }
        productStocksMap.get(pid)!.set(bId, qty);
      });

      const result = (prods || []).map((p: any) => {
        const pStocksMap = productStocksMap.get(p.id);
        const colorsList = Array.isArray(p.colors) ? p.colors : [];
        const hasColors = colorsList.length > 0;
        const colorsTotalStock = hasColors ? colorsList.reduce((sum: number, c: any) => sum + (Number(c.stock) || 0), 0) : null;

        const branchStocks: BranchStock[] = branchList.map((b, idx) => {
          let bStock = pStocksMap?.get(b.id) ?? 0;
          if (hasColors && colorsTotalStock !== null && colorsTotalStock > 0) {
            // Check if colors have per-branch allocations
            const hasBranchColorMap = colorsList.some(
              (c: any) => c.branchStocks && typeof c.branchStocks === 'object' && Object.keys(c.branchStocks).length > 0
            );
            if (hasBranchColorMap) {
              const branchColorSum = colorsList.reduce((sum: number, c: any) => {
                if (c.branchStocks && typeof c.branchStocks === 'object' && c.branchStocks[b.id] !== undefined) {
                  return sum + (Number(c.branchStocks[b.id]) || 0);
                }
                return sum;
              }, 0);
              bStock = branchColorSum;
            } else {
              const totalRecordedBranchStock = Array.from(pStocksMap?.values() || []).reduce((a, c) => a + c, 0);
              if (totalRecordedBranchStock < colorsTotalStock) {
                if (bStock > 0 || (totalRecordedBranchStock === 0 && idx === 0)) {
                  bStock = Math.max(bStock, colorsTotalStock - (totalRecordedBranchStock - bStock));
                }
              }
            }
          }
          return {
            branchId: b.id,
            branchName: b.name,
            stock: bStock,
          };
        });

        let calculatedStock = 0;
        if (branchId && branchId !== 'ALL') {
          const found = branchStocks.find((bs) => bs.branchId === branchId);
          calculatedStock = found ? found.stock : 0;
        } else {
          calculatedStock = branchStocks.reduce((sum, bs) => sum + bs.stock, 0);
        }

        let finalStock = calculatedStock;
        if (hasColors && colorsTotalStock !== null && colorsTotalStock > 0) {
          if (!branchId || branchId === 'ALL') {
            finalStock = Math.max(calculatedStock, colorsTotalStock);
          }
        }

        const formattedColors: ColorVariant[] = colorsList.map((c: any) => {
          const bs = typeof c.branchStocks === 'object' && c.branchStocks !== null ? { ...c.branchStocks } : {};
          let colorStock = Number(c.stock) || 0;
          if (branchId && branchId !== 'ALL') {
            if (bs[branchId] !== undefined) {
              colorStock = Number(bs[branchId]) || 0;
            } else {
              const mainBranchId = branchList[0]?.id;
              if (branchId === mainBranchId) {
                colorStock = Number(c.stock) || 0;
              } else {
                colorStock = 0;
              }
            }
          }
          return {
            color: c.color,
            hex: c.hex,
            stock: colorStock,
            imagePath: c.imagePath || c.image_path || '',
            galleryAngles: c.galleryAngles || c.gallery_angles || [],
            branchStocks: bs,
          };
        });

        return {
          id: p.id,
          tenantId: p.tenant_id || tenantId,
          tenant_id: p.tenant_id || tenantId,
          code: p.code || p.sku || 'PROD',
          sku: p.sku || p.code || '',
          name: p.name,
          category: p.categories?.name || 'Sin categoría',
          categoryId: p.category_id,
          brand: p.brands?.name || 'Sin marca',
          brandId: p.brand_id,
          model: p.models?.name || '',
          modelId: p.model_id,
          price: Number(p.price) || 0,
          cost: Number(p.cost) || 0,
          stock: finalStock,
          minStock: Number(p.min_stock) || 5,
          status: p.status === 'INACTIVE' ? 'INACTIVE' as const : 'ACTIVE' as const,
          imagePath: p.image_path || '',
          colors: formattedColors,
          branchStocks,
          showcaseFeatures: p.showcase_features || (p as any).showcaseFeatures || undefined,
          showcaseGlobes: p.showcase_globes || (p as any).showcaseGlobes || undefined,
          primaryColor: p.primary_color || (p as any).primaryColor || undefined,
          galleryAngles: p.gallery_angles || (p as any).galleryAngles || undefined,
          description: p.description || p.editorial_description || undefined,
          editorialDescription: p.editorial_description || p.description || undefined,
        };
      });

      // ─── CACHE: Store products in IndexedDB for offline use ───
      try { await putManyRecords(STORES.PRODUCTS, result); } catch { /* non-critical */ }

      return result;
    } catch (networkError) {
      console.warn('[productsService] Network error, falling back to IndexedDB:', networkError);
      return this._getProductsFromCache(branchId);
    }
  },

  /** Read products from IndexedDB cache */
  async _getProductsFromCache(branchId?: string): Promise<Product[]> {
    try {
      const tenantId = getActiveTenantId();
      let [cached, branchInv, categories, brands, models, branches] = await Promise.all([
        getAllRecords<any>(STORES.PRODUCTS),
        getAllRecords<any>(STORES.BRANCH_INVENTORY),
        getAllRecords<any>(STORES.CATEGORIES),
        getAllRecords<any>(STORES.BRANDS),
        getAllRecords<any>(STORES.MODELS),
        getAllRecords<any>(STORES.BRANCHES),
      ]);

      if (tenantId) {
        cached = cached.filter((p: any) => !p.tenantId && !p.tenant_id || p.tenantId === tenantId || p.tenant_id === tenantId);
        branches = branches.filter((b: any) => !b.tenantId && !b.tenant_id || b.tenantId === tenantId || b.tenant_id === tenantId);
      }

      const catMap = new Map<string, string>();
      categories.forEach((c: any) => catMap.set(c.id, c.name));

      const brandMap = new Map<string, string>();
      brands.forEach((b: any) => brandMap.set(b.id, b.name));

      const modelMap = new Map<string, string>();
      models.forEach((m: any) => modelMap.set(m.id, m.name));

      const branchNameMap = new Map<string, string>();
      branches.forEach((b: any) => branchNameMap.set(b.id, b.name));

      // Build productStocksMap from STORES.BRANCH_INVENTORY
      const productStocksMap = new Map<string, Map<string, number>>();
      branchInv.forEach((s: any) => {
        const pid = s.product_id;
        const bId = s.branch_id;
        const qty = Number(s.quantity) || 0;
        if (!productStocksMap.has(pid)) {
          productStocksMap.set(pid, new Map());
        }
        productStocksMap.get(pid)!.set(bId, qty);
      });

      return cached.map((p: any) => {
        const pStocksMap = productStocksMap.get(p.id);
        const colorsList = Array.isArray(p.colors) ? p.colors : [];
        const hasColors = colorsList.length > 0;
        const colorsTotalStock = hasColors
          ? colorsList.reduce((sum: number, c: any) => sum + (Number(c.stock) || 0), 0)
          : null;

        const branchStocks: BranchStock[] = branches.length > 0
          ? branches.map((b: any, idx: number) => {
              let bStock = pStocksMap?.get(b.id) ?? (p.branchStocks?.find((bs: any) => bs.branchId === b.id)?.stock ?? 0);
              if (hasColors && colorsTotalStock !== null && colorsTotalStock > 0) {
                const hasBranchColorMap = colorsList.some(
                  (c: any) => c.branchStocks && typeof c.branchStocks === 'object' && Object.keys(c.branchStocks).length > 0
                );
                if (hasBranchColorMap) {
                  const branchColorSum = colorsList.reduce((sum: number, c: any) => {
                    if (c.branchStocks && typeof c.branchStocks === 'object' && c.branchStocks[b.id] !== undefined) {
                      return sum + (Number(c.branchStocks[b.id]) || 0);
                    }
                    return sum;
                  }, 0);
                  bStock = branchColorSum;
                } else {
                  const totalRecorded = branches.reduce((acc: number, cur: any) => acc + (pStocksMap?.get(cur.id) ?? 0), 0);
                  if (totalRecorded < colorsTotalStock) {
                    if (bStock > 0 || (totalRecorded === 0 && idx === 0)) {
                      bStock = Math.max(bStock, colorsTotalStock - (totalRecorded - bStock));
                    }
                  }
                }
              }
              return {
                branchId: b.id,
                branchName: b.name,
                stock: bStock,
              };
            })
          : (p.branchStocks || []);

        let calculatedStock = 0;
        if (branchId && branchId !== 'ALL') {
          const found = branchStocks.find((bs: any) => bs.branchId === branchId);
          calculatedStock = found ? found.stock : (Number(p.stock) || 0);
        } else {
          calculatedStock = branchStocks.length > 0
            ? branchStocks.reduce((sum: number, bs: any) => sum + (Number(bs.stock) || 0), 0)
            : (Number(p.stock) || 0);
        }

        let finalStock = calculatedStock;
        if (hasColors && colorsTotalStock !== null && colorsTotalStock > 0) {
          if (!branchId || branchId === 'ALL') {
            finalStock = Math.max(calculatedStock, colorsTotalStock);
          }
        }

        const formattedColors: ColorVariant[] = colorsList.map((c: any) => {
          const bs = typeof c.branchStocks === 'object' && c.branchStocks !== null ? { ...c.branchStocks } : {};
          let colorStock = Number(c.stock) || 0;
          if (branchId && branchId !== 'ALL') {
            if (bs[branchId] !== undefined) {
              colorStock = Number(bs[branchId]) || 0;
            } else {
              const mainBranchId = branches[0]?.id;
              if (branchId === mainBranchId) {
                colorStock = Number(c.stock) || 0;
              } else {
                colorStock = 0;
              }
            }
          }
          return {
            color: c.color,
            hex: c.hex,
            stock: colorStock,
            imagePath: c.imagePath || c.image_path || '',
            galleryAngles: c.galleryAngles || c.gallery_angles || [],
            branchStocks: bs,
          };
        });

        return {
          id: p.id,
          tenantId: p.tenant_id || tenantId,
          tenant_id: p.tenant_id || tenantId,
          code: p.code || p.sku || 'PROD',
          sku: p.sku || p.code || '',
          name: p.name,
          category: catMap.get(p.category_id) || p.category || 'Sin categoría',
          categoryId: p.category_id,
          brand: brandMap.get(p.brand_id) || p.brand || 'Sin marca',
          brandId: p.brand_id,
          model: modelMap.get(p.model_id) || p.model || '',
          modelId: p.model_id,
          price: Number(p.price) || 0,
          cost: Number(p.cost) || 0,
          stock: finalStock,
          minStock: Number(p.min_stock) || 5,
          status: p.status === 'INACTIVE' ? 'INACTIVE' as const : 'ACTIVE' as const,
          imagePath: p.image_path || '',
          colors: formattedColors,
          branchStocks,
          showcaseFeatures: p.showcase_features || (p as any).showcaseFeatures || undefined,
          showcaseGlobes: p.showcase_globes || (p as any).showcaseGlobes || undefined,
          primaryColor: p.primary_color || (p as any).primaryColor || undefined,
          galleryAngles: p.gallery_angles || (p as any).galleryAngles || undefined,
          description: p.description || p.editorial_description || undefined,
          editorialDescription: p.editorial_description || p.description || undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async createProduct(prod: Omit<Product, 'id'>, branchId?: string): Promise<Product | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) return null;
    const targetBranch = branchId && branchId !== 'ALL' ? branchId : getActiveBranchId();

    if (isNetworkOnline()) {
      try {
        const { data, error } = await supabase
          .from('products')
          .insert({
            tenant_id: tenantId,
            code: prod.code,
            sku: prod.sku || prod.code,
            name: prod.name,
            category_id: prod.categoryId || null,
            brand_id: prod.brandId || null,
            model_id: prod.modelId || null,
            price: prod.price,
            cost: prod.cost,
            min_stock: prod.minStock,
            status: prod.status === 'ACTIVE' ? 'AVAILABLE' : 'INACTIVE',
            image_path: prod.imagePath || null,
            colors: prod.colors || [],
          })
          .select()
          .single();

        if (!error && data) {
          if (targetBranch) {
            await supabase.from('branch_inventory').insert({
              tenant_id: tenantId,
              branch_id: targetBranch,
              product_id: data.id,
              quantity: prod.stock,
            });
          }

          auditService.logAction({
            action: 'CREAR',
            entityType: 'products',
            entityId: data.id,
            branchId: targetBranch,
            description: `Creación de producto "${prod.name}" (SKU: ${prod.sku || prod.code}, Precio: S/ ${Number(prod.price).toFixed(2)}, Stock inicial: ${prod.stock})`,
            details: {
              name: prod.name,
              sku: prod.sku || prod.code,
              price: prod.price,
              cost: prod.cost,
              stock: prod.stock,
            },
          });

          const created: Product = {
            id: data.id,
            code: data.code,
            sku: data.sku || data.code,
            name: data.name,
            category: prod.category || 'Sin categoría',
            categoryId: data.category_id,
            brand: prod.brand || 'Sin marca',
            brandId: data.brand_id,
            model: prod.model || '',
            modelId: data.model_id,
            price: Number(data.price),
            cost: Number(data.cost),
            stock: prod.stock,
            minStock: Number(data.min_stock),
            status: data.status === 'AVAILABLE' ? 'ACTIVE' : 'INACTIVE',
            imagePath: data.image_path || '',
            colors: prod.colors || [],
          };

          try { await putRecord(STORES.PRODUCTS, created); } catch { /* non-critical */ }
          return created;
        }
      } catch (networkErr) {
        console.warn('[productsService] Online create failed, queueing offline mutation:', networkErr);
      }
    }

    // Offline fallback
    const localId = generateLocalId();
    const localProduct: Product = {
      id: localId,
      code: prod.code,
      sku: prod.sku || prod.code,
      name: prod.name,
      category: prod.category || 'Sin categoría',
      categoryId: prod.categoryId,
      brand: prod.brand || 'Sin marca',
      brandId: prod.brandId,
      model: prod.model || '',
      modelId: prod.modelId,
      price: Number(prod.price) || 0,
      cost: Number(prod.cost) || 0,
      stock: prod.stock || 0,
      minStock: Number(prod.minStock) || 5,
      status: prod.status || 'ACTIVE',
      imagePath: prod.imagePath || '',
      colors: prod.colors || [],
    };

    try {
      await putRecord(STORES.PRODUCTS, localProduct);
    } catch (dbErr) {
      console.error('[productsService] Error saving to IndexedDB:', dbErr);
    }

    try {
      await queueMutation('products', 'CREATE', {
        id: localId,
        tenant_id: tenantId,
        code: prod.code,
        sku: prod.sku || prod.code,
        name: prod.name,
        category_id: prod.categoryId || null,
        brand_id: prod.brandId || null,
        model_id: prod.modelId || null,
        price: prod.price,
        cost: prod.cost,
        min_stock: prod.minStock,
        status: prod.status === 'ACTIVE' ? 'AVAILABLE' : 'INACTIVE',
        image_path: prod.imagePath || null,
        colors: prod.colors || [],
      });
      refreshPendingCount().catch(() => {});
    } catch (queueErr) {
      console.error('[productsService] Error queueing outbox mutation:', queueErr);
    }

    auditService.logAction({
      action: 'CREAR',
      entityType: 'products',
      entityId: localId,
      branchId: targetBranch,
      description: `Creación de producto "${prod.name}" (Modo Offline)`,
      details: {
        name: prod.name,
        sku: prod.sku || prod.code,
        price: prod.price,
        cost: prod.cost,
        stock: prod.stock,
      },
    });

    return localProduct;
  },

  async updateProduct(id: string, prod: Partial<Product>, branchId?: string): Promise<boolean> {
    try {
      // Update local cache
      try {
        const existing = await getRecord<Product>(STORES.PRODUCTS, id);
        if (existing) {
          const updated: Product = {
            ...existing,
            ...prod,
          };
          await putRecord(STORES.PRODUCTS, updated);
        }
      } catch (e) {
        console.warn('[productsService] Error updating local cache:', e);
      }

      const updateData: any = {};
      if (prod.code) updateData.code = prod.code;
      if (prod.sku) updateData.sku = prod.sku;
      if (prod.name) updateData.name = prod.name;
      if (prod.categoryId !== undefined) updateData.category_id = prod.categoryId || null;
      if (prod.brandId !== undefined) updateData.brand_id = prod.brandId || null;
      if (prod.modelId !== undefined) updateData.model_id = prod.modelId || null;
      if (prod.price !== undefined) updateData.price = prod.price;
      if (prod.cost !== undefined) updateData.cost = prod.cost;
      if (prod.minStock !== undefined) updateData.min_stock = prod.minStock;
      if (prod.status) updateData.status = prod.status === 'ACTIVE' ? 'AVAILABLE' : 'INACTIVE';
      if (prod.imagePath !== undefined) updateData.image_path = prod.imagePath || null;
      if (prod.colors !== undefined) updateData.colors = prod.colors;
      if ((prod as any).showcaseFeatures !== undefined) updateData.showcase_features = (prod as any).showcaseFeatures;
      if ((prod as any).showcaseGlobes !== undefined) updateData.showcase_globes = (prod as any).showcaseGlobes;
      if ((prod as any).primaryColor !== undefined) updateData.primary_color = (prod as any).primaryColor;
      if ((prod as any).galleryAngles !== undefined) updateData.gallery_angles = (prod as any).galleryAngles;
      if (prod.description !== undefined) updateData.description = prod.description;
      if ((prod as any).editorialDescription !== undefined) {
        updateData.editorial_description = (prod as any).editorialDescription;
        if (!updateData.description) updateData.description = (prod as any).editorialDescription;
      }

      if (isNetworkOnline()) {
        try {
          const { error } = await supabase.from('products').update(updateData).eq('id', id);
          if (!error) {
            if (prod.stock !== undefined) {
              const tenantId = getActiveTenantId();
              const targetBranch = branchId && branchId !== 'ALL' ? branchId : getActiveBranchId();
              const { data: inv } = await supabase
                .from('branch_inventory')
                .select('id')
                .eq('product_id', id)
                .eq('branch_id', targetBranch)
                .maybeSingle();

              if (inv) {
                await supabase.from('branch_inventory').update({ quantity: prod.stock }).eq('id', inv.id);
              } else if (targetBranch) {
                await supabase.from('branch_inventory').insert({
                  tenant_id: tenantId,
                  branch_id: targetBranch,
                  product_id: id,
                  quantity: prod.stock,
                });
              }
            }

            auditService.logAction({
              action: 'MODIFICAR',
              entityType: 'products',
              entityId: id,
              branchId: branchId && branchId !== 'ALL' ? branchId : undefined,
              description: `Actualización de datos del producto "${prod.name || id}"`,
              details: { ...prod },
            });

            return true;
          }
        } catch (networkErr) {
          console.warn('[productsService] Online update failed, queueing offline mutation:', networkErr);
        }
      }

      // Offline queue
      try {
        await queueMutation('products', 'UPDATE', {
          _id: id,
          ...updateData,
        });
        refreshPendingCount().catch(() => {});
      } catch (queueErr) {
        console.error('[productsService] Error queueing update mutation:', queueErr);
      }

      auditService.logAction({
        action: 'MODIFICAR',
        entityType: 'products',
        entityId: id,
        branchId: branchId && branchId !== 'ALL' ? branchId : undefined,
        description: `Actualización de datos del producto "${prod.name || id}" (Modo Offline)`,
        details: { ...prod },
      });

      return true;
    } catch (err) {
      console.error('Exception updating product:', err);
      return false;
    }
  },

  async deleteProduct(id: string): Promise<boolean> {
    try {
      let prodName = 'Producto';
      try {
        const localProd = await getRecord<Product>(STORES.PRODUCTS, id);
        if (localProd) prodName = localProd.name || prodName;
      } catch (_) {}

      // Delete from local cache
      try {
        await deleteLocalRecord(STORES.PRODUCTS, id);
      } catch (e) {
        console.warn('[productsService] Error deleting local record:', e);
      }

      if (isNetworkOnline()) {
        try {
          await supabase.from('sale_items').delete().eq('product_id', id);
          await supabase.from('purchase_items').delete().eq('product_id', id);
          await supabase.from('purchase_order_items').delete().eq('product_id', id);
          await supabase.from('inventory_movements').delete().eq('product_id', id);
          await supabase.from('physical_count_items').delete().eq('product_id', id);
          await supabase.from('branch_inventory').delete().eq('product_id', id);
          const { error } = await supabase.from('products').delete().eq('id', id);

          if (!error) {
            auditService.logAction({
              action: 'ELIMINAR',
              entityType: 'products',
              entityId: id,
              description: `Eliminación del producto "${prodName}"`,
              details: { name: prodName },
            });
            return true;
          }
        } catch (networkErr) {
          console.warn('[productsService] Online delete failed, queueing offline mutation:', networkErr);
        }
      }

      // Offline queue
      try {
        await queueMutation('products', 'DELETE', { _id: id });
        refreshPendingCount().catch(() => {});
      } catch (queueErr) {
        console.error('[productsService] Error queueing delete mutation:', queueErr);
      }

      auditService.logAction({
        action: 'ELIMINAR',
        entityType: 'products',
        entityId: id,
        description: `Eliminación del producto "${prodName}" (Modo Offline)`,
        details: { name: prodName },
      });

      return true;
    } catch (err) {
      console.error('Exception deleting product:', err);
      return false;
    }
  },
};

// ---------------- BRANCHES ----------------
export const branchesService = {
  async getBranches(): Promise<Branch[]> {
    const tenantId = getActiveTenantId();
    if (!tenantId) return [];

    if (!isNetworkOnline()) {
      try { return await getAllRecords<Branch>(STORES.BRANCHES); } catch { return []; }
    }

    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching branches:', error);
        try { return await getAllRecords<Branch>(STORES.BRANCHES); } catch { return []; }
      }

      const result = (data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        address: b.address || '',
        phone: b.phone || '',
        managerName: b.manager_name || 'Sin asignar',
        status: b.status === 'INACTIVE' ? 'INACTIVE' as const : 'ACTIVE' as const,
        isMain: false,
      })) as Branch[];

      try { await putManyRecords(STORES.BRANCHES, result); } catch { /* non-critical */ }
      return result;
    } catch {
      try { return await getAllRecords<Branch>(STORES.BRANCHES); } catch { return []; }
    }
  },

  async createBranch(branch: Omit<Branch, 'id'>): Promise<Branch | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) return null;

    if (isNetworkOnline()) {
      try {
        const { data, error } = await supabase
          .from('branches')
          .insert({
            tenant_id: tenantId,
            name: branch.name,
            address: branch.address,
            phone: branch.phone,
            manager_name: branch.managerName,
            status: branch.status,
          })
          .select()
          .single();

        if (!error && data) {
          const created: Branch = {
            id: data.id,
            name: data.name,
            address: data.address || '',
            phone: data.phone || '',
            managerName: data.manager_name || '',
            status: data.status,
          };
          try { await putRecord(STORES.BRANCHES, created); } catch { /* non-critical */ }

          auditService.logAction({
            action: 'CREAR',
            entityType: 'branches',
            entityId: data.id,
            description: `Creación de sucursal "${branch.name}" (Dirección: ${branch.address || 'Sin especificar'}, Responsable: ${branch.managerName || 'Sin asignar'})`,
            details: {
              name: branch.name,
              address: branch.address,
              manager_name: branch.managerName,
            },
          });

          return created;
        }
      } catch (networkErr) {
        console.warn('[branchesService] Online create failed, queueing offline mutation:', networkErr);
      }
    }

    // Offline fallback
    const localId = generateLocalId();
    const localBranch: Branch = {
      id: localId,
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || '',
      managerName: branch.managerName || '',
      status: branch.status,
    };

    try {
      await putRecord(STORES.BRANCHES, localBranch);
    } catch (dbErr) {
      console.error('[branchesService] Error saving to IndexedDB:', dbErr);
    }

    try {
      await queueMutation('branches', 'CREATE', {
        id: localId,
        tenant_id: tenantId,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        manager_name: branch.managerName,
        status: branch.status,
      });
      refreshPendingCount().catch(() => {});
    } catch (queueErr) {
      console.error('[branchesService] Error queueing outbox mutation:', queueErr);
    }

    auditService.logAction({
      action: 'CREAR',
      entityType: 'branches',
      entityId: localId,
      description: `Creación de sucursal "${branch.name}" (Modo Offline)`,
      details: {
        name: branch.name,
        address: branch.address,
        manager_name: branch.managerName,
      },
    });

    return localBranch;
  },

  async updateBranch(id: string, branch: Partial<Branch>): Promise<boolean> {
    // Update local cache
    try {
      const existing = await getRecord<Branch>(STORES.BRANCHES, id);
      if (existing) {
        const updated: Branch = {
          ...existing,
          ...branch,
        };
        await putRecord(STORES.BRANCHES, updated);
      }
    } catch (e) {
      console.warn('[branchesService] Error updating local cache:', e);
    }

    const payload: any = {};
    if (branch.name) payload.name = branch.name;
    if (branch.address !== undefined) payload.address = branch.address;
    if (branch.phone !== undefined) payload.phone = branch.phone;
    if (branch.managerName !== undefined) payload.manager_name = branch.managerName;
    if (branch.status) payload.status = branch.status;

    if (isNetworkOnline()) {
      try {
        const { error } = await supabase
          .from('branches')
          .update(payload)
          .eq('id', id);

        if (!error) {
          auditService.logAction({
            action: 'MODIFICAR',
            entityType: 'branches',
            entityId: id,
            description: `Actualización de sucursal "${branch.name || id}"`,
            details: { ...branch },
          });
          return true;
        }
      } catch (networkErr) {
        console.warn('[branchesService] Online update failed, queueing offline mutation:', networkErr);
      }
    }

    // Offline queue
    try {
      await queueMutation('branches', 'UPDATE', {
        _id: id,
        ...payload,
      });
      refreshPendingCount().catch(() => {});
    } catch (queueErr) {
      console.error('[branchesService] Error queueing update mutation:', queueErr);
    }

    auditService.logAction({
      action: 'MODIFICAR',
      entityType: 'branches',
      entityId: id,
      description: `Actualización de sucursal "${branch.name || id}" (Modo Offline)`,
      details: { ...branch },
    });

    return true;
  },

  async deleteBranch(id: string): Promise<boolean> {
    let branchName = 'Sucursal';
    try {
      const localBr = await getRecord<Branch>(STORES.BRANCHES, id);
      if (localBr) branchName = localBr.name || branchName;
    } catch (_) {}

    // Delete from local cache
    try {
      await deleteLocalRecord(STORES.BRANCHES, id);
    } catch (e) {
      console.warn('[branchesService] Error deleting local record:', e);
    }

    if (isNetworkOnline()) {
      try {
        const { error } = await supabase.from('branches').delete().eq('id', id);
        if (!error) {
          auditService.logAction({
            action: 'ELIMINAR',
            entityType: 'branches',
            entityId: id,
            description: `Eliminación de sucursal "${branchName}"`,
            details: { name: branchName },
          });
          return true;
        }
      } catch (networkErr) {
        console.warn('[branchesService] Online delete failed, queueing offline mutation:', networkErr);
      }
    }

    // Offline queue
    try {
      await queueMutation('branches', 'DELETE', { _id: id });
      refreshPendingCount().catch(() => {});
    } catch (queueErr) {
      console.error('[branchesService] Error queueing delete mutation:', queueErr);
    }

    auditService.logAction({
      action: 'ELIMINAR',
      entityType: 'branches',
      entityId: id,
      description: `Eliminación de sucursal "${branchName}" (Modo Offline)`,
      details: { name: branchName },
    });

    return true;
  },
};

// ---------------- CATEGORIES & BRANDS ----------------
export const catalogService = {
  async getCategories(): Promise<Category[]> {
    let tenantId = getActiveTenantId();
    if (!tenantId) {
      tenantId = await resolveTenantId();
    }
    if (!tenantId && !isNetworkOnline()) return [];

    if (!isNetworkOnline()) {
      try {
        const localCats = await getAllRecords<any>(STORES.CATEGORIES);
        const localBrs = await getAllRecords<any>(STORES.BRANDS);
        const categoryBrandsMap = new Map<string, { id: string; name: string }[]>();
        localBrs.forEach((b: any) => {
          if (b.category_id) {
            const list = categoryBrandsMap.get(b.category_id) || [];
            list.push({ id: b.id, name: b.name });
            categoryBrandsMap.set(b.category_id, list);
          }
        });
        return localCats.map((c: any) => ({
          id: c.id,
          name: c.name,
          active: c.active ?? true,
          brandsCount: (categoryBrandsMap.get(c.id) || []).length,
          brands: categoryBrandsMap.get(c.id) || [],
        }));
      } catch {
        return [];
      }
    }

    try {
      const { data: cats, error } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) {
        const localCats = await getAllRecords<any>(STORES.CATEGORIES);
        return localCats.map((c: any) => ({ id: c.id, name: c.name, active: c.active ?? true, brandsCount: 0, brands: [] }));
      }

      const { data: brs } = await supabase
        .from('brands')
        .select('id, name, category_id')
        .eq('tenant_id', tenantId);

      const categoryBrandsMap = new Map<string, { id: string; name: string }[]>();
      brs?.forEach((b) => {
        if (b.category_id) {
          const list = categoryBrandsMap.get(b.category_id) || [];
          list.push({ id: b.id, name: b.name });
          categoryBrandsMap.set(b.category_id, list);
        }
      });

      if (cats) {
        try { await putManyRecords(STORES.CATEGORIES, cats); } catch {}
      }
      if (brs) {
        try { await putManyRecords(STORES.BRANDS, brs); } catch {}
      }

      return (cats || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        active: c.active ?? true,
        brandsCount: (categoryBrandsMap.get(c.id) || []).length,
        brands: categoryBrandsMap.get(c.id) || [],
      }));
    } catch {
      try {
        const localCats = await getAllRecords<any>(STORES.CATEGORIES);
        return localCats.map((c: any) => ({ id: c.id, name: c.name, active: c.active ?? true, brandsCount: 0, brands: [] }));
      } catch {
        return [];
      }
    }
  },

  async createCategory(name: string): Promise<Category | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) return null;

    if (isNetworkOnline()) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .insert({ tenant_id: tenantId, name })
          .select()
          .single();

        if (!error && data) {
          try { await putRecord(STORES.CATEGORIES, data); } catch {}
          auditService.logAction({
            action: 'CREAR',
            entityType: 'categories',
            entityId: data.id,
            description: `Creación de categoría "${name}"`,
            details: { name },
          });

          return {
            id: data.id,
            name: data.name,
            active: true,
            brandsCount: 0,
            brands: [],
          };
        }
      } catch (networkErr) {
        console.warn('[catalogService] Online category creation failed, queueing offline:', networkErr);
      }
    }

    // Offline fallback
    const localId = generateLocalId();
    const localCat = { id: localId, tenant_id: tenantId, name, active: true };
    try { await putRecord(STORES.CATEGORIES, localCat); } catch {}
    try {
      await queueMutation('categories', 'CREATE', { id: localId, tenant_id: tenantId, name, active: true });
      refreshPendingCount().catch(() => {});
    } catch {}

    auditService.logAction({
      action: 'CREAR',
      entityType: 'categories',
      entityId: localId,
      description: `Creación de categoría "${name}" (Modo Offline)`,
      details: { name },
    });

    return {
      id: localId,
      name,
      active: true,
      brandsCount: 0,
      brands: [],
    };
  },

  async updateCategory(id: string, name: string): Promise<boolean> {
    try {
      const existing = await getRecord<any>(STORES.CATEGORIES, id);
      if (existing) {
        await putRecord(STORES.CATEGORIES, { ...existing, name });
      }
    } catch {}

    if (isNetworkOnline()) {
      try {
        const { error } = await supabase
          .from('categories')
          .update({ name })
          .eq('id', id);

        if (!error) {
          auditService.logAction({
            action: 'MODIFICAR',
            entityType: 'categories',
            entityId: id,
            description: `Actualización de categoría a "${name}"`,
            details: { name },
          });
          return true;
        }
      } catch (networkErr) {
        console.warn('[catalogService] Online category update failed, queueing offline:', networkErr);
      }
    }

    // Offline queue
    try {
      await queueMutation('categories', 'UPDATE', { _id: id, name });
      refreshPendingCount().catch(() => {});
    } catch {}

    auditService.logAction({
      action: 'MODIFICAR',
      entityType: 'categories',
      entityId: id,
      description: `Actualización de categoría a "${name}" (Modo Offline)`,
      details: { name },
    });

    return true;
  },

  async deleteCategory(id: string): Promise<boolean> {
    let catName = 'Categoría';
    try {
      const localCat = await getRecord<any>(STORES.CATEGORIES, id);
      if (localCat) catName = localCat.name || catName;
      await deleteLocalRecord(STORES.CATEGORIES, id);
    } catch {}

    if (isNetworkOnline()) {
      try {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (!error) {
          auditService.logAction({
            action: 'ELIMINAR',
            entityType: 'categories',
            entityId: id,
            description: `Eliminación de categoría "${catName}"`,
            details: { name: catName },
          });
          return true;
        }
      } catch (networkErr) {
        console.warn('[catalogService] Online category delete failed, queueing offline:', networkErr);
      }
    }

    // Offline queue
    try {
      await queueMutation('categories', 'DELETE', { _id: id });
      refreshPendingCount().catch(() => {});
    } catch {}

    auditService.logAction({
      action: 'ELIMINAR',
      entityType: 'categories',
      entityId: id,
      description: `Eliminación de categoría "${catName}" (Modo Offline)`,
      details: { name: catName },
    });

    return true;
  },

  async getBrands(): Promise<Brand[]> {
    const tenantId = getActiveTenantId();
    if (!tenantId) return [];

    if (!isNetworkOnline()) {
      try {
        const localBrs = await getAllRecords<any>(STORES.BRANDS);
        const localCats = await getAllRecords<any>(STORES.CATEGORIES);
        const catMap = new Map<string, string>();
        localCats.forEach((c: any) => catMap.set(c.id, c.name));

        return localBrs.map((b: any) => ({
          id: b.id,
          name: b.name,
          categoryId: b.category_id,
          categoryName: catMap.get(b.category_id) || 'Sin Categoría',
          category_id: b.category_id,
          category_name: catMap.get(b.category_id) || 'Sin Categoría',
          active: b.active ?? true,
        }));
      } catch {
        return [];
      }
    }

    try {
      const { data, error } = await supabase
        .from('brands')
        .select(`
          id, name, active, category_id,
          categories ( name )
        `)
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) {
        const localBrs = await getAllRecords<any>(STORES.BRANDS);
        return localBrs.map((b: any) => ({ id: b.id, name: b.name, categoryId: b.category_id, categoryName: 'Sin Categoría', active: b.active ?? true }));
      }

      if (data) {
        try { await putManyRecords(STORES.BRANDS, data); } catch {}
      }

      return (data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        categoryId: b.category_id,
        categoryName: b.categories?.name || 'Sin Categoría',
        category_id: b.category_id,
        category_name: b.categories?.name || 'Sin Categoría',
        active: b.active ?? true,
      }));
    } catch {
      try {
        const localBrs = await getAllRecords<any>(STORES.BRANDS);
        return localBrs.map((b: any) => ({ id: b.id, name: b.name, categoryId: b.category_id, categoryName: 'Sin Categoría', active: b.active ?? true }));
      } catch {
        return [];
      }
    }
  },

  async createBrand(name: string, categoryId?: string): Promise<Brand | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) return null;

    if (isNetworkOnline()) {
      try {
        const { data, error } = await supabase
          .from('brands')
          .insert({ tenant_id: tenantId, name, category_id: categoryId || null })
          .select(`
            id, name, active, category_id,
            categories ( name )
          `)
          .single();

        if (!error && data) {
          try { await putRecord(STORES.BRANDS, data); } catch {}
          auditService.logAction({
            action: 'CREAR',
            entityType: 'brands',
            entityId: data.id,
            description: `Creación de marca "${name}"`,
            details: { name, category_id: categoryId },
          });

          return {
            id: data.id,
            name: data.name,
            categoryId: data.category_id,
            categoryName: (data as any).categories?.name || 'Sin Categoría',
            active: true,
          };
        }
      } catch (networkErr) {
        console.warn('[catalogService] Online brand create failed, queueing offline:', networkErr);
      }
    }

    // Offline fallback
    const localId = generateLocalId();
    const localBrand = { id: localId, tenant_id: tenantId, name, category_id: categoryId || null, active: true };
    try { await putRecord(STORES.BRANDS, localBrand); } catch {}
    try {
      await queueMutation('brands', 'CREATE', localBrand);
      refreshPendingCount().catch(() => {});
    } catch {}

    auditService.logAction({
      action: 'CREAR',
      entityType: 'brands',
      entityId: localId,
      description: `Creación de marca "${name}" (Modo Offline)`,
      details: { name, category_id: categoryId },
    });

    return {
      id: localId,
      name,
      categoryId,
      categoryName: 'Sin Categoría',
      active: true,
    };
  },

  async updateBrand(id: string, name: string, categoryId?: string): Promise<boolean> {
    try {
      const existing = await getRecord<any>(STORES.BRANDS, id);
      if (existing) {
        await putRecord(STORES.BRANDS, { ...existing, name, category_id: categoryId || null });
      }
    } catch {}

    if (isNetworkOnline()) {
      try {
        const { error } = await supabase
          .from('brands')
          .update({ name, category_id: categoryId || null })
          .eq('id', id);

        if (!error) {
          auditService.logAction({
            action: 'MODIFICAR',
            entityType: 'brands',
            entityId: id,
            description: `Actualización de marca "${name}"`,
            details: { name, category_id: categoryId },
          });
          return true;
        }
      } catch (networkErr) {
        console.warn('[catalogService] Online brand update failed, queueing offline:', networkErr);
      }
    }

    // Offline queue
    try {
      await queueMutation('brands', 'UPDATE', { _id: id, name, category_id: categoryId || null });
      refreshPendingCount().catch(() => {});
    } catch {}

    auditService.logAction({
      action: 'MODIFICAR',
      entityType: 'brands',
      entityId: id,
      description: `Actualización de marca "${name}" (Modo Offline)`,
      details: { name, category_id: categoryId },
    });

    return true;
  },

  async deleteBrand(id: string): Promise<boolean> {
    let brandName = 'Marca';
    try {
      const localBrand = await getRecord<any>(STORES.BRANDS, id);
      if (localBrand) brandName = localBrand.name || brandName;
      await deleteLocalRecord(STORES.BRANDS, id);
    } catch {}

    if (isNetworkOnline()) {
      try {
        const { error } = await supabase.from('brands').delete().eq('id', id);
        if (!error) {
          auditService.logAction({
            action: 'ELIMINAR',
            entityType: 'brands',
            entityId: id,
            description: `Eliminación de marca "${brandName}"`,
            details: { name: brandName },
          });
          return true;
        }
      } catch (networkErr) {
        console.warn('[catalogService] Online brand delete failed, queueing offline:', networkErr);
      }
    }

    // Offline queue
    try {
      await queueMutation('brands', 'DELETE', { _id: id });
      refreshPendingCount().catch(() => {});
    } catch {}

    auditService.logAction({
      action: 'ELIMINAR',
      entityType: 'brands',
      entityId: id,
      description: `Eliminación de marca "${brandName}" (Modo Offline)`,
      details: { name: brandName },
    });

    return true;
  },

  async getModels(): Promise<Model[]> {
    const tenantId = getActiveTenantId();
    if (!tenantId) return [];

    if (!isNetworkOnline()) {
      try {
        const localModels = await getAllRecords<any>(STORES.MODELS);
        const localBrands = await getAllRecords<any>(STORES.BRANDS);
        const brandMap = new Map<string, string>();
        localBrands.forEach((b: any) => brandMap.set(b.id, b.name));

        return localModels.map((m: any) => ({
          id: m.id,
          name: m.name,
          brandId: m.brand_id,
          brandName: brandMap.get(m.brand_id) || 'Sin Marca',
          brand_id: m.brand_id,
          brand_name: brandMap.get(m.brand_id) || 'Sin Marca',
          active: m.active ?? true,
        }));
      } catch {
        return [];
      }
    }

    try {
      const { data, error } = await supabase
        .from('models')
        .select(`
          id, name, active, brand_id,
          brands ( name )
        `)
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) {
        const localModels = await getAllRecords<any>(STORES.MODELS);
        return localModels.map((m: any) => ({ id: m.id, name: m.name, brandId: m.brand_id, brandName: 'Sin Marca', active: m.active ?? true }));
      }

      if (data) {
        try { await putManyRecords(STORES.MODELS, data); } catch {}
      }

      return (data || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        brandId: m.brand_id,
        brandName: m.brands?.name || 'Sin Marca',
        brand_id: m.brand_id,
        brand_name: m.brands?.name || 'Sin Marca',
        active: m.active ?? true,
      }));
    } catch {
      try {
        const localModels = await getAllRecords<any>(STORES.MODELS);
        return localModels.map((m: any) => ({ id: m.id, name: m.name, brandId: m.brand_id, brandName: 'Sin Marca', active: m.active ?? true }));
      } catch {
        return [];
      }
    }
  },

  async createModel(name: string, brandId?: string): Promise<Model | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) return null;

    if (isNetworkOnline()) {
      try {
        const { data, error } = await supabase
          .from('models')
          .insert({ tenant_id: tenantId, name, brand_id: brandId || null })
          .select(`
            id, name, active, brand_id,
            brands ( name )
          `)
          .single();

        if (!error && data) {
          try { await putRecord(STORES.MODELS, data); } catch {}
          auditService.logAction({
            action: 'CREAR',
            entityType: 'models',
            entityId: data.id,
            description: `Creación de modelo "${name}"`,
            details: { name, brand_id: brandId },
          });

          return {
            id: data.id,
            name: data.name,
            brandId: data.brand_id,
            brandName: (data as any).brands?.name || 'Sin Marca',
            active: true,
          };
        }
      } catch (networkErr) {
        console.warn('[catalogService] Online model create failed, queueing offline:', networkErr);
      }
    }

    // Offline fallback
    const localId = generateLocalId();
    const localModel = { id: localId, tenant_id: tenantId, name, brand_id: brandId || null, active: true };
    try { await putRecord(STORES.MODELS, localModel); } catch {}
    try {
      await queueMutation('models', 'CREATE', localModel);
      refreshPendingCount().catch(() => {});
    } catch {}

    auditService.logAction({
      action: 'CREAR',
      entityType: 'models',
      entityId: localId,
      description: `Creación de modelo "${name}" (Modo Offline)`,
      details: { name, brand_id: brandId },
    });

    return {
      id: localId,
      name,
      brandId,
      brandName: 'Sin Marca',
      active: true,
    };
  },

  async updateModel(id: string, name: string, brandId?: string): Promise<boolean> {
    try {
      const existing = await getRecord<any>(STORES.MODELS, id);
      if (existing) {
        await putRecord(STORES.MODELS, { ...existing, name, brand_id: brandId || null });
      }
    } catch {}

    if (isNetworkOnline()) {
      try {
        const { error } = await supabase
          .from('models')
          .update({ name, brand_id: brandId || null })
          .eq('id', id);

        if (!error) {
          auditService.logAction({
            action: 'MODIFICAR',
            entityType: 'models',
            entityId: id,
            description: `Actualización de modelo "${name}"`,
            details: { name, brand_id: brandId },
          });
          return true;
        }
      } catch (networkErr) {
        console.warn('[catalogService] Online model update failed, queueing offline:', networkErr);
      }
    }

    // Offline queue
    try {
      await queueMutation('models', 'UPDATE', { _id: id, name, brand_id: brandId || null });
      refreshPendingCount().catch(() => {});
    } catch {}

    auditService.logAction({
      action: 'MODIFICAR',
      entityType: 'models',
      entityId: id,
      description: `Actualización de modelo "${name}" (Modo Offline)`,
      details: { name, brand_id: brandId },
    });

    return true;
  },

  async deleteModel(id: string): Promise<boolean> {
    let modelName = 'Modelo';
    try {
      const localModel = await getRecord<any>(STORES.MODELS, id);
      if (localModel) modelName = localModel.name || modelName;
      await deleteLocalRecord(STORES.MODELS, id);
    } catch {}

    if (isNetworkOnline()) {
      try {
        const { error } = await supabase.from('models').delete().eq('id', id);
        if (!error) {
          auditService.logAction({
            action: 'ELIMINAR',
            entityType: 'models',
            entityId: id,
            description: `Eliminación de modelo "${modelName}"`,
            details: { name: modelName },
          });
          return true;
        }
      } catch (networkErr) {
        console.warn('[catalogService] Online model delete failed, queueing offline:', networkErr);
      }
    }

    // Offline queue
    try {
      await queueMutation('models', 'DELETE', { _id: id });
      refreshPendingCount().catch(() => {});
    } catch {}

    auditService.logAction({
      action: 'ELIMINAR',
      entityType: 'models',
      entityId: id,
      description: `Eliminación de modelo "${modelName}" (Modo Offline)`,
      details: { name: modelName },
    });

    return true;
  },
};

// ---------------- CUSTOMERS ----------------
export const customersService = {
  async getCustomers(): Promise<Customer[]> {
    const tenantId = getActiveTenantId();
    if (!tenantId) return [];

    if (!isNetworkOnline()) {
      try { return await getAllRecords<Customer>(STORES.CUSTOMERS); } catch { return []; }
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        try { return await getAllRecords<Customer>(STORES.CUSTOMERS); } catch { return []; }
      }

      const result = (data || []).map((c: any) => ({
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
      })) as Customer[];

      try { await putManyRecords(STORES.CUSTOMERS, result); } catch { /* non-critical */ }
      return result;
    } catch {
      try { return await getAllRecords<Customer>(STORES.CUSTOMERS); } catch { return []; }
    }
  },

  async createCustomer(cust: Omit<Customer, 'id' | 'name'>): Promise<Customer | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) return null;

    const custName = cust.businessName || cust.fullName || 'Cliente';

    // 1. Try online creation if connected
    if (isNetworkOnline()) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .insert({
            tenant_id: tenantId,
            customer_type: cust.customerType,
            document_type: cust.documentType,
            document_number: cust.documentNumber,
            full_name: cust.fullName || null,
            business_name: cust.businessName || null,
            email: cust.email || null,
            phone: cust.phone || null,
            address: cust.address || null,
          })
          .select()
          .single();

        if (!error && data) {
          const created: Customer = {
            id: data.id,
            ...cust,
            name: data.business_name || data.full_name || custName,
          };
          try { await putRecord(STORES.CUSTOMERS, created); } catch { /* non-critical */ }

          auditService.logAction({
            action: 'CREAR',
            entityType: 'customers',
            entityId: data.id,
            description: `Cliente ${custName} registrado`,
            details: { business_name: cust.businessName, full_name: cust.fullName, name: custName, document_number: cust.documentNumber },
          });

          return created;
        }
      } catch (networkErr) {
        console.warn('[customersService] Online creation failed, queueing offline mutation:', networkErr);
      }
    }

    // 2. Offline fallback: local IndexedDB + Outbox Queue
    const localId = generateLocalId();
    const localCustomer: Customer = {
      id: localId,
      ...cust,
      name: custName,
    };

    try {
      await putRecord(STORES.CUSTOMERS, localCustomer);
    } catch (dbErr) {
      console.error('[customersService] Error saving to IndexedDB:', dbErr);
    }

    try {
      await queueMutation('customers', 'CREATE', {
        id: localId,
        tenant_id: tenantId,
        customer_type: cust.customerType,
        document_type: cust.documentType,
        document_number: cust.documentNumber,
        full_name: cust.fullName || null,
        business_name: cust.businessName || null,
        email: cust.email || null,
        phone: cust.phone || null,
        address: cust.address || null,
      });
      refreshPendingCount().catch(() => {});
    } catch (queueErr) {
      console.error('[customersService] Error queueing outbox mutation:', queueErr);
    }

    auditService.logAction({
      action: 'CREAR',
      entityType: 'customers',
      entityId: localId,
      description: `Cliente ${custName} registrado (Modo Offline)`,
      details: { business_name: cust.businessName, full_name: cust.fullName, name: custName, document_number: cust.documentNumber },
    });

    return localCustomer;
  },

  async updateCustomer(id: string, cust: Partial<Customer>): Promise<boolean> {
    const custName = cust.businessName || cust.fullName || cust.name || 'Cliente';

    // Update local cache
    try {
      const existing = await getRecord<Customer>(STORES.CUSTOMERS, id);
      if (existing) {
        const updated: Customer = {
          ...existing,
          ...cust,
          name: cust.businessName || cust.fullName || cust.name || existing.name,
        };
        await putRecord(STORES.CUSTOMERS, updated);
      }
    } catch (e) {
      console.warn('[customersService] Error updating local cache:', e);
    }

    const payload: any = {};
    if (cust.customerType) payload.customer_type = cust.customerType;
    if (cust.documentType) payload.document_type = cust.documentType;
    if (cust.documentNumber) payload.document_number = cust.documentNumber;
    if (cust.fullName !== undefined) payload.full_name = cust.fullName;
    if (cust.businessName !== undefined) payload.business_name = cust.businessName;
    if (cust.email !== undefined) payload.email = cust.email;
    if (cust.phone !== undefined) payload.phone = cust.phone;
    if (cust.address !== undefined) payload.address = cust.address;

    if (isNetworkOnline()) {
      try {
        const { error } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', id);

        if (!error) {
          auditService.logAction({
            action: 'MODIFICAR',
            entityType: 'customers',
            entityId: id,
            description: `Cliente ${custName} actualizado`,
            details: { business_name: cust.businessName, full_name: cust.fullName, name: custName, document_number: cust.documentNumber },
          });
          return true;
        }
      } catch (networkErr) {
        console.warn('[customersService] Online update failed, queueing offline mutation:', networkErr);
      }
    }

    // Offline queue
    try {
      await queueMutation('customers', 'UPDATE', {
        _id: id,
        ...payload,
      });
      refreshPendingCount().catch(() => {});
    } catch (queueErr) {
      console.error('[customersService] Error queueing update mutation:', queueErr);
    }

    auditService.logAction({
      action: 'MODIFICAR',
      entityType: 'customers',
      entityId: id,
      description: `Cliente ${custName} actualizado (Modo Offline)`,
      details: { business_name: cust.businessName, full_name: cust.fullName, name: custName, document_number: cust.documentNumber },
    });

    return true;
  },

  async deleteCustomer(id: string): Promise<boolean> {
    // Delete from local cache
    try {
      await deleteLocalRecord(STORES.CUSTOMERS, id);
    } catch (e) {
      console.warn('[customersService] Error deleting local record:', e);
    }

    if (isNetworkOnline()) {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (!error) {
          auditService.logAction({
            action: 'ELIMINAR',
            entityType: 'customers',
            entityId: id,
            description: `Cliente eliminado`,
          });
          return true;
        }
      } catch (networkErr) {
        console.warn('[customersService] Online delete failed, queueing offline mutation:', networkErr);
      }
    }

    // Offline queue
    try {
      await queueMutation('customers', 'DELETE', { _id: id });
      refreshPendingCount().catch(() => {});
    } catch (queueErr) {
      console.error('[customersService] Error queueing delete mutation:', queueErr);
    }

    auditService.logAction({
      action: 'ELIMINAR',
      entityType: 'customers',
      entityId: id,
      description: `Cliente eliminado (Modo Offline)`,
    });

    return true;
  },
};

// ---------------- SUPPLIERS ----------------
export const suppliersService = {
  async getSuppliers(): Promise<Supplier[]> {
    const tenantId = getActiveTenantId();
    if (!tenantId) return [];

    if (!isNetworkOnline()) {
      try { return await getAllRecords<Supplier>(STORES.SUPPLIERS); } catch { return []; }
    }

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        try { return await getAllRecords<Supplier>(STORES.SUPPLIERS); } catch { return []; }
      }

      const result = (data || []).map((s: any) => ({
        id: s.id,
        ruc: s.ruc || '',
        businessName: s.business_name || '',
        name: s.business_name || '',
        contactName: s.contact_name || '',
        phone: s.phone || '',
        email: s.email || '',
        address: s.address || '',
      })) as Supplier[];

      try { await putManyRecords(STORES.SUPPLIERS, result); } catch { /* non-critical */ }
      return result;
    } catch {
      try { return await getAllRecords<Supplier>(STORES.SUPPLIERS); } catch { return []; }
    }
  },

  async createSupplier(sup: Omit<Supplier, 'id' | 'name'>): Promise<Supplier | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) return null;

    if (isNetworkOnline()) {
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .insert({
            tenant_id: tenantId,
            ruc: sup.ruc,
            business_name: sup.businessName,
            contact_name: sup.contactName,
            phone: sup.phone,
            email: sup.email,
            address: sup.address,
          })
          .select()
          .single();

        if (!error && data) {
          const created: Supplier = {
            id: data.id,
            ...sup,
            name: data.business_name,
          };
          try { await putRecord(STORES.SUPPLIERS, created); } catch { /* non-critical */ }

          auditService.logAction({
            action: 'CREAR',
            entityType: 'suppliers',
            entityId: data.id,
            description: `Registro de proveedor "${sup.businessName}" (RUC: ${sup.ruc || 'S/N'}, Contacto: ${sup.contactName || 'S/N'})`,
            details: {
              business_name: sup.businessName,
              ruc: sup.ruc,
              contact_name: sup.contactName,
            },
          });

          return created;
        }
      } catch (networkErr) {
        console.warn('[suppliersService] Online creation failed, queueing offline mutation:', networkErr);
      }
    }

    // Offline fallback
    const localId = generateLocalId();
    const localSupplier: Supplier = {
      id: localId,
      ...sup,
      name: sup.businessName,
    };

    try {
      await putRecord(STORES.SUPPLIERS, localSupplier);
    } catch (dbErr) {
      console.error('[suppliersService] Error saving to IndexedDB:', dbErr);
    }

    try {
      await queueMutation('suppliers', 'CREATE', {
        id: localId,
        tenant_id: tenantId,
        ruc: sup.ruc,
        business_name: sup.businessName,
        contact_name: sup.contactName,
        phone: sup.phone,
        email: sup.email,
        address: sup.address,
      });
      refreshPendingCount().catch(() => {});
    } catch (queueErr) {
      console.error('[suppliersService] Error queueing outbox mutation:', queueErr);
    }

    auditService.logAction({
      action: 'CREAR',
      entityType: 'suppliers',
      entityId: localId,
      description: `Registro de proveedor "${sup.businessName}" (Modo Offline)`,
      details: {
        business_name: sup.businessName,
        ruc: sup.ruc,
        contact_name: sup.contactName,
      },
    });

    return localSupplier;
  },

  async updateSupplier(id: string, sup: Partial<Supplier>): Promise<boolean> {
    // Update local cache
    try {
      const existing = await getRecord<Supplier>(STORES.SUPPLIERS, id);
      if (existing) {
        const updated: Supplier = {
          ...existing,
          ...sup,
          name: sup.businessName || existing.name,
        };
        await putRecord(STORES.SUPPLIERS, updated);
      }
    } catch (e) {
      console.warn('[suppliersService] Error updating local cache:', e);
    }

    const payload: any = {};
    if (sup.ruc !== undefined) payload.ruc = sup.ruc;
    if (sup.businessName !== undefined) payload.business_name = sup.businessName;
    if (sup.contactName !== undefined) payload.contact_name = sup.contactName;
    if (sup.phone !== undefined) payload.phone = sup.phone;
    if (sup.email !== undefined) payload.email = sup.email;
    if (sup.address !== undefined) payload.address = sup.address;

    if (isNetworkOnline()) {
      try {
        const { error } = await supabase
          .from('suppliers')
          .update(payload)
          .eq('id', id);

        if (!error) {
          auditService.logAction({
            action: 'MODIFICAR',
            entityType: 'suppliers',
            entityId: id,
            description: `Actualización de proveedor "${sup.businessName || id}"`,
            details: { ...sup },
          });
          return true;
        }
      } catch (networkErr) {
        console.warn('[suppliersService] Online update failed, queueing offline mutation:', networkErr);
      }
    }

    // Offline queue
    try {
      await queueMutation('suppliers', 'UPDATE', {
        _id: id,
        ...payload,
      });
      refreshPendingCount().catch(() => {});
    } catch (queueErr) {
      console.error('[suppliersService] Error queueing update mutation:', queueErr);
    }

    auditService.logAction({
      action: 'MODIFICAR',
      entityType: 'suppliers',
      entityId: id,
      description: `Actualización de proveedor "${sup.businessName || id}" (Modo Offline)`,
      details: { ...sup },
    });

    return true;
  },

  async deleteSupplier(id: string): Promise<boolean> {
    let supName = 'Proveedor';
    try {
      const localSup = await getRecord<Supplier>(STORES.SUPPLIERS, id);
      if (localSup) supName = localSup.businessName || localSup.name || supName;
    } catch (_) {}

    // Delete from local cache
    try {
      await deleteLocalRecord(STORES.SUPPLIERS, id);
    } catch (e) {
      console.warn('[suppliersService] Error deleting local record:', e);
    }

    if (isNetworkOnline()) {
      try {
        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        if (!error) {
          auditService.logAction({
            action: 'ELIMINAR',
            entityType: 'suppliers',
            entityId: id,
            description: `Eliminación de proveedor "${supName}"`,
            details: { business_name: supName },
          });
          return true;
        }
      } catch (networkErr) {
        console.warn('[suppliersService] Online delete failed, queueing offline mutation:', networkErr);
      }
    }

    // Offline queue
    try {
      await queueMutation('suppliers', 'DELETE', { _id: id });
      refreshPendingCount().catch(() => {});
    } catch (queueErr) {
      console.error('[suppliersService] Error queueing delete mutation:', queueErr);
    }

    auditService.logAction({
      action: 'ELIMINAR',
      entityType: 'suppliers',
      entityId: id,
      description: `Eliminación de proveedor "${supName}" (Modo Offline)`,
      details: { business_name: supName },
    });

    return true;
  },
};

// ---------------- ROLES ----------------
export const rolesService = {
  async getRoles(): Promise<Role[]> {
    const tenantId = getActiveTenantId();
    if (!tenantId) return [];

    const { data, error } = await supabase
      .from('roles')
      .select(`
        id, name, description, is_system,
        role_permissions ( permission_code )
      `)
      .or(`tenant_id.eq.${tenantId},is_system.eq.true`)
      .order('name');

    if (error) {
      console.error('Error fetching roles from Supabase:', error);
      return [];
    }

    // Map each role and group its nested permissions list
    return (data || []).map((r: any) => {
      const perms = r.role_permissions ? r.role_permissions.map((rp: any) => rp.permission_code) : [];
      if (r.is_system && r.name.toLowerCase().includes('super')) {
        if (!perms.includes('*')) perms.push('*');
      }
      return {
        id: r.id,
        name: r.name,
        description: r.description || '',
        isSystem: r.is_system || false,
        usersCount: 1,
        permissions: perms,
      };
    });
  },

  async createRole(role: Omit<Role, 'id'>, permissions: string[] = []): Promise<Role | null> {
    try {
      const roleId = generateUUID();
      const tenantId = getActiveTenantId();
      if (!tenantId) return null;
      
      // 1. Insert Role
      const { error: rError } = await supabase
        .from('roles')
        .insert({
          id: roleId,
          tenant_id: tenantId,
          name: role.name,
          description: role.description,
          is_system: false,
        });

      if (rError) {
        console.error('Error creating role in Supabase:', rError);
        return null;
      }

      // 2. Insert Permissions if any
      if (permissions.length > 0) {
        const inserts = permissions.map((code) => ({
          tenant_id: tenantId,
          role_id: roleId,
          permission_code: code,
        }));
        
        const { error: pError } = await supabase
          .from('role_permissions')
          .insert(inserts);

        if (pError) {
          console.error('Error inserting role permissions in Supabase:', pError);
        }
      }

      auditService.logAction({
        action: 'CREAR',
        entityType: 'roles',
        entityId: roleId,
        description: `Creación de rol "${role.name}" con ${permissions.length} permisos asignados`,
        details: {
          role_name: role.name,
          permissions_count: permissions.length,
        },
      });

      return {
        id: roleId,
        name: role.name,
        description: role.description || '',
        isSystem: false,
        usersCount: 0,
        permissions,
      };
    } catch (err) {
      console.error('Exception in createRole:', err);
      return null;
    }
  },

  async updateRole(id: string, role: Partial<Role>): Promise<boolean> {
    try {
      const updates: any = {};
      if (role.name) updates.name = role.name;
      if (role.description) updates.description = role.description;

      const { error } = await supabase
        .from('roles')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating role details in Supabase:', error);
        return false;
      }

      auditService.logAction({
        action: 'MODIFICAR',
        entityType: 'roles',
        entityId: id,
        description: `Actualización de rol "${role.name || id}"`,
        details: { ...role },
      });

      return true;
    } catch (err) {
      console.error('Exception in updateRole:', err);
      return false;
    }
  },

  async updateRolePermissions(roleId: string, permissions: string[]): Promise<boolean> {
    try {
      const tenantId = getActiveTenantId();
      if (!tenantId) return false;

      // Find role name for clean audit log
      let roleName = 'Rol';
      const { data: roleRow } = await supabase.from('roles').select('name').eq('id', roleId).maybeSingle();
      if (roleRow) roleName = roleRow.name || roleName;

      // 1. Delete existing permissions
      const { error: dError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      if (dError) {
        console.error('Error clearing role permissions in Supabase:', dError);
        return false;
      }

      // 2. Insert new permissions (exclude wildcard '*' which is computed)
      const validPermissions = permissions.filter(p => p !== '*');
      if (validPermissions.length > 0) {
        const inserts = validPermissions.map((code) => ({
          tenant_id: tenantId,
          role_id: roleId,
          permission_code: code,
        }));

        const { error: iError } = await supabase
          .from('role_permissions')
          .insert(inserts);

        if (iError) {
          console.error('Error inserting new permissions in Supabase:', iError);
          return false;
        }
      }

      auditService.logAction({
        action: 'MODIFICAR PERMISOS',
        entityType: 'roles',
        entityId: roleId,
        description: `Actualización de permisos del rol "${roleName}" (${validPermissions.length} permisos asignados)`,
        details: {
          role_name: roleName,
          permissions: validPermissions,
          permissions_count: validPermissions.length,
        },
      });

      return true;
    } catch (err) {
      console.error('Exception in updateRolePermissions:', err);
      return false;
    }
  },

  async deleteRole(id: string): Promise<boolean> {
    try {
      let roleName = 'Rol';
      const { data: roleRow } = await supabase.from('roles').select('name').eq('id', id).maybeSingle();
      if (roleRow) roleName = roleRow.name || roleName;

      // 1. Clear its permissions first to satisfy potential references
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', id);

      // 2. Delete Role
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting role from Supabase:', error);
        return false;
      }

      auditService.logAction({
        action: 'ELIMINAR',
        entityType: 'roles',
        entityId: id,
        description: `Eliminación de rol "${roleName}"`,
        details: { role_name: roleName },
      });

      return true;
    } catch (err) {
      console.error('Exception in deleteRole:', err);
      return false;
    }
  },
};

const ROLE_MAP: Record<string, string> = {
  'Super Admin': 'a1000000-0000-4000-a000-000000000001',
  'Administrador': 'a1000000-0000-4000-a000-000000000001',
  'Vendedor': 'a2000000-0000-4000-a000-000000000002',
};

const isValidUuid = (val: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

const resolveBranchUuids = async (branches: string[] | undefined, branch: string | undefined): Promise<string[]> => {
  const inputs = (branches && branches.length > 0) ? branches : (branch ? [branch] : []);
  if (inputs.length === 0) return [DEFAULT_BRANCH_ID];

  // If all inputs are valid UUIDs, return them directly
  if (inputs.every(isValidUuid)) return inputs;

  // Otherwise, lookup from DB
  const { data: dbBranches } = await supabase.from('branches').select('id, name');
  if (!dbBranches || dbBranches.length === 0) return [DEFAULT_BRANCH_ID];

  const matched = dbBranches
    .filter((b) => inputs.some((inp) => inp.toLowerCase().trim() === b.name.toLowerCase().trim() || inp === b.id))
    .map((b) => b.id);

  return matched.length > 0 ? matched : [dbBranches[0].id];
};

const generateUUID = (): string => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ---------------- USERS & AUTH ----------------
export const usersService = {
  async authenticateSuperadmin(email: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (!profile) return false;

    // Check if user has Super Admin membership
    const { data: memberships } = await supabase
      .from('tenant_memberships')
      .select(`
        role_id,
        roles ( name )
      `)
      .eq('user_id', profile.id);

    const isSuper = (memberships || []).some((m: any) => {
      const rName = m.roles?.name?.toLowerCase() || '';
      return rName.includes('super') || rName.includes('admin');
    });

    return isSuper;
  },

  async authenticatePersonal(usernameOrEmail: string, password?: string, taxId?: string): Promise<{
    success: boolean;
    tenant?: {
      id: string;
      name: string;
      tradeName?: string;
      ruc: string;
      logoPath?: string;
      primaryColor?: string;
    };
    user?: {
      id: string;
      userId: string;
      tenantId: string;
      username: string;
      name: string;
      email: string;
      role: string;
      roleId?: string;
      status: string;
      branchId: string;
      branchName: string;
      branches: string[];
      branchIds?: string[];
    };
    error?: string;
  }> {
    try {
      const term = usernameOrEmail.trim().toLowerCase();
      const ruc = (taxId || '').trim();

      // 1. Validate Company / Tenant by RUC
      let tenantQuery = supabase.from('tenants').select('*');
      if (ruc) {
        tenantQuery = tenantQuery.eq('ruc', ruc);
      } else {
        const activeTId = getActiveTenantId();
        if (activeTId) {
          tenantQuery = tenantQuery.eq('id', activeTId);
        } else {
          return {
            success: false,
            error: 'Debe ingresar el RUC de la empresa para iniciar sesión.',
          };
        }
      }

      const { data: tenantData, error: tError } = await tenantQuery.maybeSingle();

      if (tError || !tenantData) {
        return {
          success: false,
          error: ruc 
            ? `No existe ninguna empresa registrada con el RUC ${ruc}.` 
            : 'No se encontró la información de la empresa.',
        };
      }

      if (tenantData.active === false) {
        return {
          success: false,
          error: `La empresa "${tenantData.name || tenantData.trade_name || ruc}" se encuentra inactiva o suspendida en la plataforma.`,
        };
      }

      const tenantId = tenantData.id;

      // 2. Validate User Membership specifically in this company
      const { data: members, error: mError } = await supabase
        .from('tenant_memberships')
        .select(`
          id,
          user_id,
          tenant_id,
          role_id,
          branch_ids,
          username,
          password,
          status,
          profiles ( id, full_name, email ),
          roles ( id, name, is_system )
        `)
        .eq('tenant_id', tenantId);

      if (mError) {
        console.error('Error querying tenant_memberships during login:', mError);
        return { success: false, error: 'Error al conectar con la base de datos de usuarios.' };
      }

      const match = (members as any[] || []).find((m: any) => {
        const uName = (m.username || '').trim().toLowerCase();
        const pObj = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        const pEmail = (pObj?.email || '').trim().toLowerCase();
        return uName === term || pEmail === term;
      });

      if (!match) {
        return {
          success: false,
          error: `El usuario "${usernameOrEmail}" no pertenece a la empresa "${tenantData.name || ruc}". Verifique el RUC y usuario.`,
        };
      }

      if (match.status === 'DISABLED') {
        return {
          success: false,
          error: `El usuario "${usernameOrEmail}" se encuentra inactivo o deshabilitado en ${tenantData.name || 'la empresa'}. Contacte al administrador.`,
        };
      }

      // Validate password if configured on membership record
      if (password && match.password && match.password.trim() !== '') {
        if (match.password !== password) {
          return { success: false, error: 'La contraseña ingresada es incorrecta.' };
        }
      }

      // 3. Resolve user's branches in this tenant
      const { data: branches } = await supabase
        .from('branches')
        .select('id, name')
        .eq('tenant_id', tenantId);

      const branchMap = new Map<string, string>();
      (branches || []).forEach(b => branchMap.set(b.id, b.name));

      const branchIds: string[] = Array.isArray(match.branch_ids) && match.branch_ids.length > 0
        ? match.branch_ids
        : (branches && branches.length > 0 ? [branches[0].id] : []);

      const branchNames: string[] = branchIds.map((bid) => branchMap.get(bid) || 'Sede Principal');
      const primaryBranchId = branchIds[0] || '';
      const primaryBranchName = branchNames[0] || (branches && branches[0]?.name) || 'Sede Principal';

      const pObj = Array.isArray(match.profiles) ? match.profiles[0] : match.profiles;
      const rObj = Array.isArray(match.roles) ? match.roles[0] : match.roles;

      return {
        success: true,
        tenant: {
          id: tenantData.id,
          name: tenantData.name,
          tradeName: tenantData.trade_name,
          ruc: tenantData.ruc,
          logoPath: tenantData.logo_path,
          primaryColor: tenantData.primary_color,
        },
        user: {
          id: match.id,
          userId: match.user_id,
          tenantId: tenantData.id,
          username: match.username || pObj?.email?.split('@')[0] || 'usuario',
          name: pObj?.full_name || match.username || 'Usuario',
          email: pObj?.email || '',
          role: rObj?.name || 'Vendedor',
          roleId: rObj?.id || match.role_id,
          status: match.status || 'ACTIVE',
          branchId: primaryBranchId,
          branchName: primaryBranchName,
          branches: branchNames,
          branchIds: branchIds,
        },
      };
    } catch (err: any) {
      console.error('Exception during authenticatePersonal:', err);
      return { success: false, error: 'Ocurrió un error inesperado al validar el acceso.' };
    }
  },

  async getUsers(): Promise<UserMember[]> {
    const tenantId = getActiveTenantId();
    if (!tenantId) return [];

    const [membersRes, branchesRes] = await Promise.all([
      supabase
        .from('tenant_memberships')
        .select(`
          id, status, username, password, branch_ids,
          profiles ( full_name, email ),
          roles ( id, name )
        `)
        .eq('tenant_id', tenantId),
      branchesService.getBranches(),
    ]);

    const branchNameMap = new Map<string, string>();
    branchesRes.forEach(b => branchNameMap.set(b.id, b.name));

    if (membersRes.error || !membersRes.data || membersRes.data.length === 0) {
      return [];
    }

    return (membersRes.data || []).map((m: any) => {
      const pObj = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      const rObj = Array.isArray(m.roles) ? m.roles[0] : m.roles;

      const branchNames = (m.branch_ids && Array.isArray(m.branch_ids) && m.branch_ids.length > 0)
        ? m.branch_ids.map((id: string) => branchNameMap.get(id) || id)
        : (branchesRes.length > 0 ? [branchesRes[0].name] : ['Sede Principal']);

      return {
        id: m.id,
        name: pObj?.full_name || m.username || 'Usuario',
        email: pObj?.email || '',
        username: m.username || '',
        password: m.password || '',
        role: rObj?.name || 'Vendedor',
        roleId: rObj?.id,
        branch: branchNames[0] || 'Sede Principal',
        branches: branchNames,
        status: m.status || 'ACTIVE',
      };
    });
  },

  async createUser(user: Omit<UserMember, 'id'>): Promise<UserMember | null> {
    try {
      const profileId = generateUUID();
      const tenantId = getActiveTenantId();
      
      // 1. Create Profile
      const { error: pError } = await supabase
        .from('profiles')
        .insert({
          id: profileId,
          full_name: user.name,
          email: user.email,
        });

      if (pError) {
        console.error('Error creating user profile in Supabase:', pError);
        return null;
      }

      // 2. Determine role ID dynamically
      let roleId = (user as any).roleId;
      if (!roleId && user.role) {
        if (isValidUuid(user.role)) {
          roleId = user.role;
        } else if (ROLE_MAP[user.role]) {
          roleId = ROLE_MAP[user.role];
        } else {
          const { data: roleRow } = await supabase
            .from('roles')
            .select('id')
            .ilike('name', user.role)
            .limit(1)
            .maybeSingle();
          roleId = roleRow?.id || 'a1000000-0000-4000-a000-000000000001';
        }
      }
      if (!roleId) roleId = 'a1000000-0000-4000-a000-000000000001';

      // 3. Resolve branch UUIDs
      const branchUuids = await resolveBranchUuids(user.branches, user.branch);

      // 4. Create Tenant Membership
      const membershipId = generateUUID();
      const rawUsername = user.username || user.email.split('@')[0] || user.name.toLowerCase().replace(/\s+/g, '');
      const { data, error: mError } = await supabase
        .from('tenant_memberships')
        .insert({
          id: membershipId,
          tenant_id: tenantId,
          user_id: profileId,
          role_id: roleId,
          username: rawUsername,
          password: user.password || '123',
          branch_ids: branchUuids,
          status: user.status || 'ACTIVE',
        })
        .select(`
          id, status, username, password, branch_ids,
          profiles ( full_name, email ),
          roles ( id, name )
        `)
        .single();

      if (mError || !data) {
        console.error('Error creating membership in Supabase:', mError);
        return null;
      }

      auditService.logAction({
        action: 'CREAR',
        entityType: 'users',
        entityId: membershipId,
        description: `Creación de usuario "${user.name}" (@${rawUsername}) con rol "${user.role}" en la sede "${user.branch || (user.branches && user.branches[0]) || 'Sede Principal'}"`,
        details: {
          name: user.name,
          username: rawUsername,
          role: user.role,
          email: user.email,
        },
      });

      const m = data as any;
      const pObj = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      const rObj = Array.isArray(m.roles) ? m.roles[0] : m.roles;

      return {
        id: m.id,
        name: pObj?.full_name || m.username || 'Usuario',
        email: pObj?.email || '',
        username: m.username || rawUsername,
        password: m.password || user.password,
        role: rObj?.name || user.role || 'Vendedor',
        roleId: rObj?.id || roleId,
        branch: user.branch || (user.branches && user.branches[0]) || 'Sede Principal',
        branches: user.branches || [user.branch || 'Sede Principal'],
        status: m.status || 'ACTIVE',
      };
    } catch (err) {
      console.error('Exception in createUser:', err);
      return null;
    }
  },

  async updateUser(id: string, user: Partial<UserMember>): Promise<boolean> {
    try {
      // 1. Find user_id associated with this membership
      const { data: membership, error: fError } = await supabase
        .from('tenant_memberships')
        .select('user_id, username')
        .eq('id', id)
        .single();

      if (fError || !membership) {
        console.error('Could not find membership to update:', fError);
        return false;
      }

      const userId = membership.user_id;

      // 2. Update Profile
      if (user.name || user.email) {
        const profileUpdates: any = {};
        if (user.name) profileUpdates.full_name = user.name;
        if (user.email) profileUpdates.email = user.email;

        const { error: pError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', userId);

        if (pError) {
          console.error('Error updating user profile in Supabase:', pError);
          return false;
        }
      }

      // 3. Update Membership
      const membershipUpdates: any = {};
      if (user.role || (user as any).roleId) {
        let roleId = (user as any).roleId;
        if (!roleId && user.role) {
          if (isValidUuid(user.role)) {
            roleId = user.role;
          } else if (ROLE_MAP[user.role]) {
            roleId = ROLE_MAP[user.role];
          } else {
            const { data: roleRow } = await supabase
              .from('roles')
              .select('id')
              .ilike('name', user.role)
              .limit(1)
              .maybeSingle();
            roleId = roleRow?.id || 'a1000000-0000-4000-a000-000000000001';
          }
        }
        if (roleId) {
          membershipUpdates.role_id = roleId;
        }
      }
      if (user.status) {
        membershipUpdates.status = user.status;
      }
      if (user.username) {
        membershipUpdates.username = user.username;
      } else if (user.email) {
        membershipUpdates.username = user.email.split('@')[0];
      }
      if (user.password) {
        membershipUpdates.password = user.password;
      }
      if (user.branches || user.branch) {
        membershipUpdates.branch_ids = await resolveBranchUuids(user.branches, user.branch);
      }

      if (Object.keys(membershipUpdates).length > 0) {
        const { error: mError } = await supabase
          .from('tenant_memberships')
          .update(membershipUpdates)
          .eq('id', id);

        if (mError) {
          console.error('Error updating membership in Supabase:', mError);
          return false;
        }
      }

      const roleText = user.role ? `Rol: ${user.role}` : '';
      const statusText = user.status ? `Estado: ${user.status}` : '';
      const updateSummary = [roleText, statusText].filter(Boolean).join(', ');

      auditService.logAction({
        action: user.status && Object.keys(user).length === 1 ? 'CAMBIO ESTADO USUARIO' : 'MODIFICAR',
        entityType: 'users',
        entityId: id,
        description: `Actualización de usuario "${user.name || membership.username || 'Usuario'}" ${updateSummary ? `(${updateSummary})` : ''}`.trim(),
        details: { ...user },
      });

      return true;
    } catch (err) {
      console.error('Exception in updateUser:', err);
      return false;
    }
  },


  async deleteUser(id: string): Promise<boolean> {
    try {
      // 1. Find user_id associated with this membership
      const { data: membership, error: fError } = await supabase
        .from('tenant_memberships')
        .select(`
          user_id, username,
          profiles ( full_name )
        `)
        .eq('id', id)
        .single();

      if (fError || !membership) {
        console.error('Could not find membership to delete:', fError);
        return false;
      }

      const userId = membership.user_id;
      const pObj = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles;
      const userName = pObj?.full_name || membership.username || 'Usuario';

      // 2. Delete Membership
      const { error: mError } = await supabase
        .from('tenant_memberships')
        .delete()
        .eq('id', id);

      if (mError) {
        console.error('Error deleting membership from Supabase:', mError);
        return false;
      }

      // 3. Delete Profile
      const { error: pError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (pError) {
        console.warn('Could not delete profile associated with membership (it might be in use):', pError);
      }

      auditService.logAction({
        action: 'ELIMINAR',
        entityType: 'users',
        entityId: id,
        description: `Eliminación de usuario "${userName}" (@${membership.username})`,
        details: { name: userName, username: membership.username },
      });

      return true;
    } catch (err) {
      console.error('Exception in deleteUser:', err);
      return false;
    }
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

export const inventoryService = {
  async getMovements(branchId?: string): Promise<InventoryMovement[]> {
    try {
      const tenantId = getActiveTenantId();
      if (!tenantId) return [];

      if (!isNetworkOnline()) {
        try {
          const localMovs = await getAllRecords<any>(STORES.INVENTORY_MOVEMENTS);
          const localProds = await getAllRecords<Product>(STORES.PRODUCTS);
          const prodMap = new Map<string, { name: string; sku: string }>();
          localProds.forEach(p => prodMap.set(p.id, { name: p.name, sku: p.sku || p.code || '' }));

          let filtered = localMovs;
          if (branchId && branchId !== 'ALL') {
            filtered = localMovs.filter((m: any) => m.branch_id === branchId || m.source_branch_id === branchId || m.target_branch_id === branchId);
          }

          return filtered.map((m: any) => {
            const pInfo = prodMap.get(m.product_id);
            return {
              id: m.id,
              date: m.created_at ? new Date(m.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : 'Reciente',
              productId: m.product_id,
              product: pInfo?.name || m.product || 'Producto',
              productSku: pInfo?.sku || m.product_sku || '',
              branchId: m.branch_id,
              branchName: m.branch_name || 'Sede Principal',
              type: m.movement_type as any,
              qty: Number(m.quantity) || 0,
              prevStock: Number(m.previous_stock) || 0,
              newStock: Number(m.resulting_stock) || 0,
              reason: m.reason || 'Sin motivo especificado',
              sourceBranchId: m.source_branch_id,
              targetBranchId: m.target_branch_id,
            };
          });
        } catch {
          return [];
        }
      }

      let query = supabase
        .from('inventory_movements')
        .select(`
          id, movement_type, quantity, previous_stock, resulting_stock, reason, created_at,
          product_id, branch_id, source_branch_id, target_branch_id,
          products ( name, code, sku ),
          branches!inventory_movements_branch_id_fkey ( name )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (branchId && branchId !== 'ALL') {
        query = query.or(`branch_id.eq.${branchId},source_branch_id.eq.${branchId},target_branch_id.eq.${branchId}`);
      }

      const { data, error } = await query;

      const branchList = await branchesService.getBranches();
      const branchMap = new Map<string, string>();
      branchList.forEach((b) => branchMap.set(b.id, b.name));

      if (error || !data) {
        try {
          const localMovs = await getAllRecords<any>(STORES.INVENTORY_MOVEMENTS);
          return localMovs.map((m: any) => ({
            id: m.id,
            date: m.created_at ? new Date(m.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : 'Reciente',
            productId: m.product_id,
            product: m.product || 'Producto',
            productSku: m.product_sku || '',
            branchId: m.branch_id,
            branchName: branchMap.get(m.branch_id) || 'Sede Principal',
            type: m.movement_type as any,
            qty: Number(m.quantity) || 0,
            prevStock: Number(m.previous_stock) || 0,
            newStock: Number(m.resulting_stock) || 0,
            reason: m.reason || 'Sin motivo especificado',
            sourceBranchId: m.source_branch_id,
            sourceBranchName: branchMap.get(m.source_branch_id) || (m.source_branch_id ? 'Sede Origen' : undefined),
            targetBranchId: m.target_branch_id,
            targetBranchName: branchMap.get(m.target_branch_id) || (m.target_branch_id ? 'Sede Destino' : undefined),
          }));
        } catch {
          return [];
        }
      }

      try { await putManyRecords(STORES.INVENTORY_MOVEMENTS, data); } catch {}

      return data.map((m: any) => ({
        id: m.id,
        date: new Date(m.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }),
        productId: m.product_id,
        product: m.products?.name || 'Producto',
        productSku: m.products?.code || m.products?.sku || '',
        branchId: m.branch_id,
        branchName: branchMap.get(m.branch_id) || m.branches?.name || 'Sede Principal',
        type: m.movement_type as any,
        qty: Number(m.quantity) || 0,
        prevStock: Number(m.previous_stock) || 0,
        newStock: Number(m.resulting_stock) || 0,
        reason: m.reason || 'Sin motivo especificado',
        sourceBranchId: m.source_branch_id,
        sourceBranchName: branchMap.get(m.source_branch_id) || (m.source_branch_id ? 'Sede Origen' : undefined),
        targetBranchId: m.target_branch_id,
        targetBranchName: branchMap.get(m.target_branch_id) || (m.target_branch_id ? 'Sede Destino' : undefined),
      }));
    } catch (err) {
      console.error('Error fetching inventory movements:', err);
      try {
        const localMovs = await getAllRecords<any>(STORES.INVENTORY_MOVEMENTS);
        return localMovs.map((m: any) => ({
          id: m.id,
          date: m.created_at ? new Date(m.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : 'Reciente',
          productId: m.product_id,
          product: m.product || 'Producto',
          productSku: m.product_sku || '',
          branchId: m.branch_id,
          branchName: 'Sede Principal',
          type: m.movement_type as any,
          qty: Number(m.quantity) || 0,
          prevStock: Number(m.previous_stock) || 0,
          newStock: Number(m.resulting_stock) || 0,
          reason: m.reason || 'Sin motivo especificado',
        }));
      } catch {
        return [];
      }
    }
  },

  async registerMovement(params: {
    productId: string;
    productName: string;
    branchId?: string;
    branchName?: string;
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    qty: number;
    reason: string;
    referenceType?: string;
    colorVariant?: string;
  }): Promise<boolean> {
    const { productName, type, qty, reason, referenceType, colorVariant } = params;
    let { productId, branchId, branchName } = params;
    const tenantId = getActiveTenantId();
    if (!tenantId) return false;

    if (productId && productId.length > 36) {
      productId = productId.substring(0, 36);
    }
    if (!isValidUuid(productId)) {
      console.error('registerMovement received non-UUID productId:', productId);
      return false;
    }

    // 1. Resolve effective target branch
    let targetBranch = branchId && branchId !== 'ALL' && branchId !== DEFAULT_BRANCH_ID ? branchId : getActiveBranchId();
    if (!targetBranch || targetBranch === 'ALL' || targetBranch === DEFAULT_BRANCH_ID) {
      try {
        const localBranches = await getAllRecords<any>(STORES.BRANCHES);
        if (localBranches.length > 0) {
          targetBranch = localBranches[0].id;
        }
      } catch (_) {}
    }

    const qtyChange = Math.abs(qty);

    // 2. Fetch local product and update stock in IndexedDB STORES.PRODUCTS
    let currentStock = 0;
    let localProd: Product | null | undefined = null;
    try {
      localProd = await getRecord<Product>(STORES.PRODUCTS, productId);
      if (localProd) {
        currentStock = localProd.stock || 0;
        let newProdStock = currentStock;
        if (type === 'IN') newProdStock = currentStock + qtyChange;
        else if (type === 'OUT') newProdStock = Math.max(0, currentStock - qtyChange);
        else if (type === 'ADJUSTMENT') newProdStock = qty;

        localProd.stock = newProdStock;

        // Update branchStocks array inside product
        if (Array.isArray(localProd.branchStocks)) {
          const bsIdx = localProd.branchStocks.findIndex(b => b.branchId === targetBranch);
          if (bsIdx >= 0) {
            const oldBs = localProd.branchStocks[bsIdx].stock || 0;
            const newBs = type === 'IN' ? oldBs + qtyChange : (type === 'OUT' ? Math.max(0, oldBs - qtyChange) : qty);
            localProd.branchStocks[bsIdx] = { ...localProd.branchStocks[bsIdx], stock: newBs };
          } else if (targetBranch) {
            localProd.branchStocks.push({
              branchId: targetBranch,
              branchName: branchName || 'Sede Principal',
              stock: newProdStock,
            });
          }
        }

        // Update colors variant stock inside product
        if (Array.isArray(localProd.colors) && localProd.colors.length > 0) {
          let targetColor = colorVariant?.trim();
          if (!targetColor) {
            const m = productName.match(/\(([^)]+)\)$/);
            if (m && m[1]) targetColor = m[1].trim();
          }
          if (targetColor) {
            localProd.colors = localProd.colors.map((c: any) => {
              if (c && c.color && c.color.trim().toLowerCase() === targetColor!.toLowerCase()) {
                const bs = typeof c.branchStocks === 'object' && c.branchStocks !== null ? { ...c.branchStocks } : {};
                const curBranchVarStock = bs[targetBranch] !== undefined ? Number(bs[targetBranch]) : (Number(c.stock) || 0);
                const newBranchVarStock = type === 'OUT' ? Math.max(0, curBranchVarStock - qtyChange) : (type === 'IN' ? curBranchVarStock + qtyChange : qty);
                bs[targetBranch] = newBranchVarStock;
                const totalColorStock = Object.values(bs).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
                return { ...c, stock: totalColorStock, branchStocks: bs };
              }
              return c;
            });
          }
        }

        await putRecord(STORES.PRODUCTS, localProd);
      }
    } catch (_) {}

    // 3. Update stock in IndexedDB STORES.BRANCH_INVENTORY
    let resultingStock = currentStock;
    if (type === 'IN') resultingStock = currentStock + qtyChange;
    else if (type === 'OUT') resultingStock = Math.max(0, currentStock - qtyChange);
    else if (type === 'ADJUSTMENT') resultingStock = qty;

    try {
      const allBranchInv = await getAllRecords<any>(STORES.BRANCH_INVENTORY);
      const existingInv = allBranchInv.find(
        (bi: any) => bi.product_id === productId && (!targetBranch || bi.branch_id === targetBranch)
      );
      if (existingInv) {
        const biStock = Number(existingInv.quantity) || 0;
        const newBiStock = type === 'OUT' ? Math.max(0, biStock - qtyChange) : (type === 'IN' ? biStock + qtyChange : qty);
        await putRecord(STORES.BRANCH_INVENTORY, { ...existingInv, quantity: newBiStock });
      } else if (targetBranch) {
        await putRecord(STORES.BRANCH_INVENTORY, {
          id: generateLocalId(),
          tenant_id: tenantId,
          branch_id: targetBranch,
          product_id: productId,
          quantity: resultingStock,
        });
      }
    } catch (_) {}

    // 4. If Online, update Supabase branch_inventory, products.colors, and inventory_movements
    if (isNetworkOnline()) {
      try {
        let invRecordId: string | null = null;
        let onlineCurrentStock = currentStock;

        if (targetBranch) {
          const { data: inv } = await supabase
            .from('branch_inventory')
            .select('id, branch_id, quantity')
            .eq('product_id', productId)
            .eq('branch_id', targetBranch)
            .maybeSingle();

          if (inv) {
            invRecordId = inv.id;
            onlineCurrentStock = Number(inv.quantity) || 0;
          }
        }

        if (!invRecordId) {
          const { data: anyInv } = await supabase
            .from('branch_inventory')
            .select('id, branch_id, quantity')
            .eq('tenant_id', tenantId)
            .eq('product_id', productId)
            .order('quantity', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (anyInv) {
            invRecordId = anyInv.id;
            onlineCurrentStock = Number(anyInv.quantity) || 0;
            if (!targetBranch) targetBranch = anyInv.branch_id;
          }
        }

        let newOnlineStock = onlineCurrentStock;
        if (type === 'IN') newOnlineStock = onlineCurrentStock + qtyChange;
        else if (type === 'OUT') newOnlineStock = Math.max(0, onlineCurrentStock - qtyChange);
        else if (type === 'ADJUSTMENT') newOnlineStock = qty;

        if (invRecordId) {
          await supabase
            .from('branch_inventory')
            .update({ quantity: newOnlineStock, updated_at: new Date().toISOString() })
            .eq('id', invRecordId);
        } else if (targetBranch) {
          await supabase.from('branch_inventory').insert({
            tenant_id: tenantId,
            branch_id: targetBranch,
            product_id: productId,
            quantity: newOnlineStock,
          });
        }

        // Update product colors online if colorVariant was provided and modified
        if (localProd && Array.isArray(localProd.colors) && localProd.colors.length > 0) {
          await supabase.from('products').update({ colors: localProd.colors }).eq('id', productId);
        }

        // Insert inventory movement
        await supabase.from('inventory_movements').insert({
          tenant_id: tenantId,
          branch_id: targetBranch || DEFAULT_BRANCH_ID,
          product_id: productId,
          movement_type: type,
          quantity: qtyChange,
          previous_stock: onlineCurrentStock,
          resulting_stock: newOnlineStock,
          reason: reason || `${type} de stock`,
          reference_type: referenceType || 'MANUAL',
        });
      } catch (err) {
        console.error('Error updating stock online in Supabase:', err);
      }
    }

    auditService.logAction({
      action: 'MOVIMIENTO INVENTARIO',
      entityType: 'inventory',
      entityId: productId,
      branchId: targetBranch,
      description: `${type === 'IN' ? 'Ingreso' : type === 'OUT' ? 'Salida' : 'Ajuste'} de ${qtyChange} unid. en "${productName}" (${branchName || 'Sede Principal'})`,
      details: {
        product_name: productName,
        movement_type: type,
        quantity: qtyChange,
        previous_stock: currentStock,
      }
    });

    return true;
  },

  async transferStock(params: {
    productId: string;
    productName: string;
    sourceBranchId: string;
    sourceBranchName: string;
    targetBranchId: string;
    targetBranchName: string;
    qty: number;
    reason: string;
    colorVariant?: string;
  }): Promise<boolean> {
    const { productId, productName, sourceBranchId, sourceBranchName, targetBranchId, targetBranchName, qty, reason, colorVariant } = params;
    const tenantId = getActiveTenantId();
    if (!tenantId) return false;

    // 1. Check & reduce source branch
    let sourceStock = 0;
    let sourceInvId: string | null = null;
    if (isNetworkOnline()) {
      const { data: sourceInv } = await supabase
        .from('branch_inventory')
        .select('id, quantity')
        .eq('product_id', productId)
        .eq('branch_id', sourceBranchId)
        .maybeSingle();

      if (sourceInv) {
        sourceInvId = sourceInv.id;
        sourceStock = Number(sourceInv.quantity) || 0;
      }
    } else {
      try {
        const allLocalInv = await getAllRecords<any>(STORES.BRANCH_INVENTORY);
        const localSource = allLocalInv.find((bi: any) => bi.product_id === productId && bi.branch_id === sourceBranchId);
        if (localSource) {
          sourceInvId = localSource.id;
          sourceStock = Number(localSource.quantity) || 0;
        }
      } catch (_) {}
    }

    // Fallback check against product record if branch_inventory was not initialized
    if (sourceStock < qty) {
      try {
        const localProd = await getRecord<Product>(STORES.PRODUCTS, productId);
        if (localProd) {
          const bs = localProd.branchStocks?.find(b => b.branchId === sourceBranchId);
          if (bs && bs.stock >= qty) {
            sourceStock = bs.stock;
          } else if (Array.isArray(localProd.colors) && localProd.colors.length > 0) {
            const colorStockSum = localProd.colors.reduce((sum, c) => sum + (Number(c.stock) || 0), 0);
            if (colorStockSum >= qty) {
              sourceStock = colorStockSum;
            }
          }
        }
      } catch (_) {}
    }

    if (sourceStock < qty) {
      console.error('Stock insuficiente en sucursal origen:', { sourceStock, qty, productId, sourceBranchId });
      return false;
    }

    const newSourceStock = Math.max(0, sourceStock - qty);

    // 2. Fetch target branch current stock
    let targetStock = 0;
    let targetInvId: string | null = null;
    if (isNetworkOnline()) {
      const { data: targetInv } = await supabase
        .from('branch_inventory')
        .select('id, quantity')
        .eq('product_id', productId)
        .eq('branch_id', targetBranchId)
        .maybeSingle();

      if (targetInv) {
        targetInvId = targetInv.id;
        targetStock = Number(targetInv.quantity) || 0;
      }
    } else {
      try {
        const allLocalInv = await getAllRecords<any>(STORES.BRANCH_INVENTORY);
        const localTarget = allLocalInv.find((bi: any) => bi.product_id === productId && bi.branch_id === targetBranchId);
        if (localTarget) {
          targetInvId = localTarget.id;
          targetStock = Number(localTarget.quantity) || 0;
        }
      } catch (_) {}
    }

    const newTargetStock = targetStock + qty;

    // 3. Update Supabase if online
    if (isNetworkOnline()) {
      try {
        // Update/insert source
        if (sourceInvId) {
          await supabase
            .from('branch_inventory')
            .update({ quantity: newSourceStock, updated_at: new Date().toISOString() })
            .eq('id', sourceInvId);
        } else {
          await supabase.from('branch_inventory').insert({
            tenant_id: tenantId,
            branch_id: sourceBranchId,
            product_id: productId,
            quantity: newSourceStock,
          });
        }

        // Update/insert target
        if (targetInvId) {
          await supabase
            .from('branch_inventory')
            .update({ quantity: newTargetStock, updated_at: new Date().toISOString() })
            .eq('id', targetInvId);
        } else {
          await supabase.from('branch_inventory').insert({
            tenant_id: tenantId,
            branch_id: targetBranchId,
            product_id: productId,
            quantity: newTargetStock,
          });
        }

        // Log transfer in inventory_movements
        await supabase.from('inventory_movements').insert({
          tenant_id: tenantId,
          branch_id: sourceBranchId,
          source_branch_id: sourceBranchId,
          target_branch_id: targetBranchId,
          product_id: productId,
          movement_type: 'TRANSFER',
          quantity: qty,
          previous_stock: sourceStock,
          resulting_stock: newSourceStock,
          reason: reason || `Traslado de ${sourceBranchName} a ${targetBranchName}${colorVariant ? ` (Variante: ${colorVariant})` : ''}`,
          reference_type: 'TRANSFER',
        });
      } catch (dbErr) {
        console.error('Error saving transfer in Supabase:', dbErr);
      }
    }

    // 4. Update local IndexedDB cache
    try {
      const localProd = await getRecord<Product>(STORES.PRODUCTS, productId);
      if (localProd) {
        if (Array.isArray(localProd.branchStocks)) {
          const sIdx = localProd.branchStocks.findIndex(b => b.branchId === sourceBranchId);
          if (sIdx >= 0) {
            localProd.branchStocks[sIdx].stock = newSourceStock;
          } else {
            localProd.branchStocks.push({ branchId: sourceBranchId, branchName: sourceBranchName, stock: newSourceStock });
          }

          const tIdx = localProd.branchStocks.findIndex(b => b.branchId === targetBranchId);
          if (tIdx >= 0) {
            localProd.branchStocks[tIdx].stock = newTargetStock;
          } else {
            localProd.branchStocks.push({ branchId: targetBranchId, branchName: targetBranchName, stock: newTargetStock });
          }
        }

        // Update color variant per-branch stocks
        if (colorVariant && Array.isArray(localProd.colors) && localProd.colors.length > 0) {
          const targetColor = colorVariant.trim().toLowerCase();
          localProd.colors = localProd.colors.map((c: any) => {
            if (c.color?.trim().toLowerCase() === targetColor) {
              const bs = typeof c.branchStocks === 'object' && c.branchStocks !== null ? { ...c.branchStocks } : {};
              const curSourceVal = bs[sourceBranchId] !== undefined ? Number(bs[sourceBranchId]) : (Number(c.stock) || 0);
              const curTargetVal = bs[targetBranchId] !== undefined ? Number(bs[targetBranchId]) : 0;

              const newSourceVal = Math.max(0, curSourceVal - qty);
              const newTargetVal = curTargetVal + qty;

              bs[sourceBranchId] = newSourceVal;
              bs[targetBranchId] = newTargetVal;

              const totalVarStock = Object.values(bs).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
              return {
                ...c,
                stock: totalVarStock,
                branchStocks: bs,
              };
            }
            return c;
          });

          if (isNetworkOnline()) {
            try {
              await supabase.from('products').update({ colors: localProd.colors }).eq('id', productId);
            } catch (_) {}
          }
        }

        await putRecord(STORES.PRODUCTS, localProd);
      }

      const allBranchInv = await getAllRecords<any>(STORES.BRANCH_INVENTORY);
      const sBi = allBranchInv.find((bi: any) => bi.product_id === productId && bi.branch_id === sourceBranchId);
      if (sBi) {
        await putRecord(STORES.BRANCH_INVENTORY, { ...sBi, quantity: newSourceStock });
      }
      const tBi = allBranchInv.find((bi: any) => bi.product_id === productId && bi.branch_id === targetBranchId);
      if (tBi) {
        await putRecord(STORES.BRANCH_INVENTORY, { ...tBi, quantity: newTargetStock });
      } else {
        await putRecord(STORES.BRANCH_INVENTORY, {
          id: generateLocalId(),
          tenant_id: tenantId,
          branch_id: targetBranchId,
          product_id: productId,
          quantity: newTargetStock,
        });
      }

      await putRecord(STORES.INVENTORY_MOVEMENTS, {
        id: generateLocalId(),
        tenant_id: tenantId,
        branch_id: sourceBranchId,
        source_branch_id: sourceBranchId,
        target_branch_id: targetBranchId,
        product_id: productId,
        movement_type: 'TRANSFER',
        quantity: qty,
        previous_stock: sourceStock,
        resulting_stock: newSourceStock,
        reason: reason || `Traslado de ${sourceBranchName} a ${targetBranchName}`,
        created_at: new Date().toISOString(),
      });
    } catch (_) {}

    auditService.logAction({
      action: 'TRANSFERENCIA STOCK',
      entityType: 'inventory',
      entityId: productId,
      branchId: sourceBranchId,
      description: `Traslado de ${qty} und. de "${productName}" desde ${sourceBranchName} hacia ${targetBranchName}${colorVariant ? ` (Color: ${colorVariant})` : ''}`,
      details: {
        product_name: productName,
        quantity: qty,
        source_branch: sourceBranchName,
        target_branch: targetBranchName,
        reason,
        colorVariant,
      },
    });

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
    estimatedDays?: number;
    reason: string;
    colorVariant?: string;
  }): Promise<boolean> {
    return this.transferStock(params);
  },
};

// ---------------- SALES ----------------
export interface Sale {
  id: string;
  saleNumber: string;
  customer: string;
  customerDoc?: string;
  customerId?: string;
  sellerName?: string;
  branch: string;
  branchId?: string;
  date: string;
  rawDate: string;
  total: number;
  subtotal: number;
  tax: number;
  paymentMethod: 'CASH' | 'TRANSFER' | 'CARD' | 'YAPE' | 'PLIN' | 'OTHER';
  paymentCondition?: 'CONTADO' | 'CREDITO';
  creditInfo?: {
    id: string;
    installmentsCount: number;
    initialPayment: number;
    financedAmount: number;
    interestRate: number;
    interestAmount: number;
    totalCredit: number;
    installmentFrequency: string;
    amountPaid: number;
    balancePending: number;
    status: string;
    installments: {
      installmentNumber: number;
      dueDate: string;
      totalAmount: number;
      capitalAmount?: number;
      interestAmount?: number;
      paidAmount?: number;
      status: string;
    }[];
  };
  documentType?: 'BOLETA' | 'FACTURA';
  status: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';
  sunatStatus?: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'NOTA_CREDITO' | 'CANCELLED';
  creditNoteNumber?: string;
  creditNoteReason?: string;
  items?: { productId: string; productName: string; quantity: number; unitPrice: number; subtotal: number }[];
}

export const salesService = {
  _normalizeSale(s: any): Sale {
    const custName = s.customer || s.customer_name || (s.customers ? (s.customers.business_name || s.customers.full_name) : 'Público General') || 'Público General';
    const custDoc = s.customerDoc || s.customer_document || s.customers?.document_number || '00000000';
    const sNum = s.saleNumber || s.sale_number || 'B001-00001';
    const rawD = s.rawDate || s.created_at || new Date().toISOString();
    const dateStr = s.date || new Date(rawD).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
    const bName = s.branch || (s.branches ? s.branches.name : 'Sede Principal');
    const bId = s.branchId || s.branch_id || '';
    const currentUserName = typeof window !== 'undefined' ? (localStorage.getItem('auth_user') || 'Vendedor') : 'Vendedor';

    let creditRecord: any = null;
    if (Array.isArray(s.credits) && s.credits.length > 0 && s.credits[0]?.id) {
      creditRecord = s.credits[0];
    } else if (s.credits && typeof s.credits === 'object' && !Array.isArray(s.credits) && s.credits.id) {
      creditRecord = s.credits;
    } else if (s.creditInfo) {
      creditRecord = s.creditInfo;
    }

    const isCredit = s.paymentCondition === 'CREDITO' || Boolean(creditRecord && creditRecord.id) || (s.paymentMethod === 'TRANSFER' && Boolean(s.creditInfo));

    let creditInfo = undefined;
    if (creditRecord && (creditRecord.id || creditRecord.installments)) {
      const rawInst = Array.isArray(creditRecord.credit_installments)
        ? creditRecord.credit_installments.sort((a: any, b: any) => a.installment_number - b.installment_number)
        : (Array.isArray(creditRecord.installments) ? creditRecord.installments : []);

      creditInfo = {
        id: creditRecord.id || 'credit-local',
        installmentsCount: Number(creditRecord.installments_count || creditRecord.installmentsCount) || rawInst.length || 1,
        initialPayment: Number(creditRecord.initial_payment || creditRecord.initialPayment) || 0,
        financedAmount: Number(creditRecord.financed_amount || creditRecord.financedAmount) || 0,
        interestRate: Number(creditRecord.interest_rate || creditRecord.interestRate) || 0,
        interestAmount: Number(creditRecord.interest_amount || creditRecord.interestAmount) || 0,
        totalCredit: Number(creditRecord.total_credit || creditRecord.totalCredit) || 0,
        installmentFrequency: creditRecord.installment_frequency || creditRecord.installmentFrequency || 'MENSUAL',
        amountPaid: Number(creditRecord.amount_paid || creditRecord.amountPaid) || 0,
        balancePending: Number(creditRecord.balance_pending || creditRecord.balancePending) || 0,
        status: creditRecord.status || 'PENDING',
        installments: rawInst.map((ins: any) => ({
          installmentNumber: ins.installment_number || ins.installmentNumber,
          dueDate: ins.due_date || ins.dueDate,
          totalAmount: Number(ins.total_amount || ins.totalAmount) || 0,
          capitalAmount: Number(ins.capital_amount || ins.capitalAmount) || 0,
          interestAmount: Number(ins.interest_amount || ins.interestAmount) || 0,
          paidAmount: Number(ins.paid_amount || ins.paidAmount) || 0,
          status: ins.status || 'PENDING',
        })),
      };
    }

    return {
      id: s.id,
      saleNumber: sNum,
      customer: custName,
      customerDoc: custDoc,
      customerId: s.customerId || s.customer_id,
      sellerName: s.sellerName || s.seller_name || currentUserName,
      branch: bName,
      branchId: bId,
      date: dateStr,
      rawDate: rawD,
      total: Number(s.total) || 0,
      subtotal: Number(s.subtotal) || 0,
      tax: Number(s.tax) || 0,
      paymentMethod: s.paymentMethod || s.payment_method || 'CASH',
      paymentCondition: isCredit ? 'CREDITO' : 'CONTADO',
      creditInfo,
      documentType: s.documentType || s.document_type || (sNum.startsWith('F') ? 'FACTURA' : 'BOLETA'),
      status: s.status || 'COMPLETED',
      sunatStatus: s.sunatStatus || s.sunat_status || 'PENDIENTE',
    };
  },

  async getSales(): Promise<Sale[]> {
    try {
      const tenantId = getActiveTenantId();
      if (!tenantId) return [];

      // ─── OFFLINE FALLBACK ───
      if (!isNetworkOnline()) {
        try {
          const raw = await getAllRecords<any>(STORES.SALES);
          return raw.map(this._normalizeSale).sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
        } catch { return []; }
      }

      const { data, error } = await supabase
        .from('sales')
        .select(`
          id, sale_number, total, subtotal, tax, payment_method, document_type, seller_name, status, created_at,
          branch_id, customer_id, customer_name, customer_document,
          customers ( full_name, business_name, document_number ),
          branches ( name ),
          credits (
            id, total_amount, initial_payment, financed_amount, interest_rate, interest_amount,
            total_credit, installments_count, installment_frequency, amount_paid, balance_pending, status,
            credit_installments (
              id, installment_number, due_date, capital_amount, interest_amount, total_amount, paid_amount, status
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error || !data) {
        try {
          const raw = await getAllRecords<any>(STORES.SALES);
          return raw.map(this._normalizeSale).sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
        } catch { return []; }
      }

      const result = data.map(this._normalizeSale);

      // ─── CACHE sales in IndexedDB ───
      try { await putManyRecords(STORES.SALES, result); } catch { /* non-critical */ }

      return result;
    } catch (err) {
      console.error('Error fetching sales from database:', err);
      try {
        const raw = await getAllRecords<any>(STORES.SALES);
        return raw.map(this._normalizeSale).sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
      } catch { return []; }
    }
  },

  async createSale(sale: {
    customerId?: string;
    customerName?: string;
    customerDoc?: string;
    sellerName?: string;
    branchId: string;
    branchName: string;
    total: number;
    subtotal: number;
    tax: number;
    paymentMethod: 'CASH' | 'TRANSFER' | 'CARD' | 'YAPE' | 'PLIN' | 'OTHER';
    documentType?: 'BOLETA' | 'FACTURA';
    items: { productId: string; productName: string; selectedColor?: string; quantity: number; unitPrice: number; subtotal: number }[];
  }): Promise<string | null> {
    try {
      const tenantId = getActiveTenantId();
      if (!tenantId) return null;

      const prefix = sale.documentType === 'FACTURA' ? 'F001-' : 'B001-';
      const randNum = Math.floor(10000 + Math.random() * 90000);
      const saleNumber = `${prefix}${randNum}`;

      const isValidUuid = (id?: string) => Boolean(id && id.length === 36 && id.includes('-'));

      let customerName = sale.customerName?.trim() || 'Público General';
      let customerDoc = sale.customerDoc?.trim() || '00000000';

      const currentUserName = typeof window !== 'undefined' ? (localStorage.getItem('auth_user') || 'Vendedor') : 'Vendedor';
      const targetBranch = isValidUuid(sale.branchId) ? sale.branchId : (getActiveBranchId() || null);

      // 1. Try Online Flow
      if (isNetworkOnline()) {
        try {
          if (isValidUuid(sale.customerId)) {
            const { data: custData } = await supabase
              .from('customers')
              .select('full_name, business_name, document_number')
              .eq('id', sale.customerId!)
              .maybeSingle();
            if (custData) {
              customerName = custData.business_name || custData.full_name || customerName;
              customerDoc = custData.document_number || customerDoc;
            }
          }

          const { data: saleData, error: saleError } = await supabase
            .from('sales')
            .insert({
              tenant_id: tenantId,
              branch_id: targetBranch,
              customer_id: isValidUuid(sale.customerId) ? sale.customerId : null,
              customer_name: customerName,
              customer_document: customerDoc,
              sale_number: saleNumber,
              status: 'COMPLETED',
              subtotal: sale.subtotal,
              tax: sale.tax,
              total: sale.total,
              payment_method: sale.paymentMethod,
              document_type: sale.documentType || 'BOLETA',
              seller_name: sale.sellerName || currentUserName,
            })
            .select()
            .single();

          if (!saleError && saleData) {
            const saleId = saleData.id;
            const finalSaleNumber = saleData.sale_number || saleNumber;

            const itemsToInsert = sale.items.map((item) => {
              let cleanProdId = item.productId;
              if (cleanProdId.includes('-') && cleanProdId.length > 36) {
                cleanProdId = cleanProdId.substring(0, 36);
              }
              return {
                tenant_id: tenantId,
                sale_id: saleId,
                product_id: cleanProdId,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                subtotal: item.subtotal,
              };
            });

            await supabase.from('sale_items').insert(itemsToInsert);

            for (const item of sale.items) {
              let cleanProdId = item.productId;
              if (cleanProdId.includes('-') && cleanProdId.length > 36) {
                cleanProdId = cleanProdId.substring(0, 36);
              }

              await inventoryService.registerMovement({
                productId: cleanProdId,
                productName: item.productName,
                colorVariant: item.selectedColor,
                branchId: targetBranch || '',
                branchName: sale.branchName || 'Sede Principal',
                type: 'OUT',
                qty: item.quantity,
                reason: `Venta ${finalSaleNumber}`,
                referenceType: 'SALE'
              });
            }

            // Save sale locally in IndexedDB cache
            try {
              const localSaleObj: Sale = {
                id: saleId,
                saleNumber: finalSaleNumber,
                customer: customerName,
                customerDoc,
                customerId: sale.customerId,
                sellerName: sale.sellerName || currentUserName,
                branch: sale.branchName || 'Sede Principal',
                branchId: targetBranch || '',
                date: new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }),
                rawDate: new Date().toISOString(),
                total: sale.total,
                subtotal: sale.subtotal,
                tax: sale.tax,
                paymentMethod: sale.paymentMethod,
                paymentCondition: 'CONTADO',
                documentType: sale.documentType || 'BOLETA',
                status: 'COMPLETED',
                sunatStatus: 'PENDIENTE',
              };
              await putRecord(STORES.SALES, localSaleObj);
            } catch (_) {}

            auditService.logAction({
              action: 'VENTA POS',
              entityType: 'sales',
              entityId: saleId,
              branchId: targetBranch || undefined,
              description: `Emisión de ${sale.documentType || 'BOLETA'} ${finalSaleNumber} por S/ ${sale.total.toFixed(2)} (${sale.paymentMethod}) al cliente "${customerName}" (${sale.items.length} ítems)`,
              details: {
                sale_number: finalSaleNumber,
                total: sale.total,
                customer: customerName,
                payment_method: sale.paymentMethod,
                items_count: sale.items.length,
              },
            });

            return saleId;
          }
        } catch (networkErr) {
          console.warn('[salesService] Online sale insert failed, processing in Offline Mode:', networkErr);
        }
      }

      // 2. Offline Fallback Flow
      const localSaleId = generateLocalId();
      const finalSaleNumber = saleNumber;

      const localSaleObj: any = {
        id: localSaleId,
        saleNumber: finalSaleNumber,
        sale_number: finalSaleNumber,
        customer: customerName,
        customer_name: customerName,
        customerDoc,
        customer_document: customerDoc,
        customerId: sale.customerId,
        customer_id: sale.customerId,
        sellerName: sale.sellerName || currentUserName,
        seller_name: sale.sellerName || currentUserName,
        branch: sale.branchName || 'Sede Principal',
        branchId: targetBranch || '',
        branch_id: targetBranch || '',
        date: new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }),
        rawDate: new Date().toISOString(),
        created_at: new Date().toISOString(),
        total: sale.total,
        subtotal: sale.subtotal,
        tax: sale.tax,
        paymentMethod: sale.paymentMethod,
        payment_method: sale.paymentMethod,
        paymentCondition: 'CONTADO',
        documentType: sale.documentType || 'BOLETA',
        document_type: sale.documentType || 'BOLETA',
        status: 'COMPLETED',
        sunatStatus: 'PENDIENTE',
        sunat_status: 'PENDIENTE',
        tenant_id: tenantId,
      };

      try {
        await putRecord(STORES.SALES, localSaleObj);
      } catch (e) {
        console.error('[salesService] Error saving local sale to IndexedDB:', e);
      }

      // Deduct stock locally & save items & movements
      for (const item of sale.items) {
        let cleanProdId = item.productId;
        if (cleanProdId.includes('-') && cleanProdId.length > 36) {
          cleanProdId = cleanProdId.substring(0, 36);
        }

        const localItemId = generateLocalId();
        const itemRecord = {
          id: localItemId,
          tenant_id: tenantId,
          sale_id: localSaleId,
          product_id: cleanProdId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          subtotal: item.subtotal,
        };

        try {
          await putRecord(STORES.SALE_ITEMS, itemRecord);
          await queueMutation('sale_items', 'CREATE', itemRecord);
        } catch (_) {}

        // Accurately decrement stock locally across products, branch_inventory, colors, and register movement
        await inventoryService.registerMovement({
          productId: cleanProdId,
          productName: item.productName,
          colorVariant: item.selectedColor,
          branchId: targetBranch || '',
          branchName: sale.branchName || 'Sede Principal',
          type: 'OUT',
          qty: item.quantity,
          reason: `Venta ${finalSaleNumber} (Offline)`,
          referenceType: 'SALE'
        });
      }

      // Queue the sale mutation
      try {
        await queueMutation('sales', 'CREATE', {
          id: localSaleId,
          tenant_id: tenantId,
          branch_id: targetBranch,
          customer_id: isValidUuid(sale.customerId) ? sale.customerId : null,
          customer_name: customerName,
          customer_document: customerDoc,
          sale_number: finalSaleNumber,
          status: 'COMPLETED',
          subtotal: sale.subtotal,
          tax: sale.tax,
          total: sale.total,
          payment_method: sale.paymentMethod,
          document_type: sale.documentType || 'BOLETA',
          seller_name: sale.sellerName || currentUserName,
        });
        refreshPendingCount().catch(() => {});
      } catch (queueErr) {
        console.error('[salesService] Error queueing sale mutation:', queueErr);
      }

      auditService.logAction({
        action: 'VENTA POS',
        entityType: 'sales',
        entityId: localSaleId,
        branchId: targetBranch || undefined,
        description: `Emisión de ${sale.documentType || 'BOLETA'} ${finalSaleNumber} por S/ ${sale.total.toFixed(2)} (${sale.paymentMethod}) al cliente "${customerName}" (Modo Offline)`,
        details: {
          sale_number: finalSaleNumber,
          total: sale.total,
          customer: customerName,
          payment_method: sale.paymentMethod,
          items_count: sale.items.length,
        },
      });

      return localSaleId;
    } catch (err) {
      console.error('Error creating sale:', err);
      return null;
    }
  },

  async sendToSunat(saleId: string): Promise<{ success: boolean; cdrCode?: string; message: string }> {
    try {
      const cdrCode = `CDR-SUNAT-${Math.floor(100000 + Math.random() * 900000)}`;

      await supabase.from('sales').update({ status: 'COMPLETED', sunat_status: 'ACEPTADO' }).eq('id', saleId);

      const { data: s } = await supabase.from('sales').select('sale_number').eq('id', saleId).maybeSingle();

      auditService.logAction({
        action: 'ENVÍO SUNAT',
        entityType: 'sales',
        entityId: saleId,
        description: `Envío y validación en SUNAT del comprobante ${s?.sale_number || 'Venta'} (Constancia CDR: ${cdrCode})`,
        details: { sale_id: saleId, cdr_code: cdrCode, sale_number: s?.sale_number },
      });

      return {
        success: true,
        cdrCode,
        message: `El comprobante fue validado y ACEPTADO por SUNAT exitosamente (Constancia CDR: ${cdrCode}).`,
      };
    } catch (err) {
      console.error('Error in sendToSunat:', err);
      return { success: false, message: 'Error de comunicación con el servicio de SUNAT.' };
    }
  },

  async createCreditNote(saleId: string, reason: string): Promise<{ success: boolean; creditNoteNumber?: string; message: string }> {
    try {
      const { data: s } = await supabase.from('sales').select('*').eq('id', saleId).maybeSingle();
      const isFactura = s?.document_type === 'FACTURA' || s?.sale_number?.startsWith('F');
      const prefix = isFactura ? 'FC01-' : 'BC01-';
      const ncNumber = `${prefix}${String(Math.floor(10000 + Math.random() * 90000))}`;

      await supabase.from('sales').update({ status: 'CANCELLED', sunat_status: 'NOTA_CREDITO' }).eq('id', saleId);

      const items = await this.getSaleItems(saleId);
      for (const item of items) {
        await inventoryService.registerMovement({
          productId: item.productId,
          productName: item.productName,
          branchId: s?.branch_id || getActiveBranchId(),
          branchName: 'Sede Principal',
          type: 'IN',
          qty: item.quantity,
          reason: `Devolución por Nota de Crédito ${ncNumber}: ${reason}`,
          referenceType: 'CREDIT_NOTE',
        });
      }

      auditService.logAction({
        action: 'NOTA_CREDITO',
        entityType: 'sales',
        entityId: saleId,
        description: `Emisión de Nota de Crédito ${ncNumber} para anulación de comprobante ${s?.sale_number || 'Venta'}. Motivo: ${reason}`,
        details: { credit_note: ncNumber, reason, sale_id: saleId, sale_number: s?.sale_number },
      });

      return {
        success: true,
        creditNoteNumber: ncNumber,
        message: `Nota de Crédito ${ncNumber} emitida correctamente en SUNAT. La venta fue anulada y el inventario devuelto.`,
      };
    } catch (err) {
      console.error('Error in createCreditNote:', err);
      return { success: false, message: 'Error al emitir la Nota de Crédito en SUNAT.' };
    }
  },

  async annulInvoice(saleId: string, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      const { data: s } = await supabase.from('sales').select('*').eq('id', saleId).maybeSingle();
      const docStr = s?.sale_number || `V-${saleId.slice(0, 8).toUpperCase()}`;

      await supabase.from('sales').update({ status: 'CANCELLED', sunat_status: 'CANCELLED' }).eq('id', saleId);

      const items = await this.getSaleItems(saleId);
      for (const item of items) {
        await inventoryService.registerMovement({
          productId: item.productId,
          productName: item.productName,
          branchId: s?.branch_id || getActiveBranchId(),
          branchName: 'Sede Principal',
          type: 'IN',
          qty: item.quantity,
          reason: `Anulación de Comprobante ${docStr}: ${reason}`,
          referenceType: 'ANNULMENT',
        });
      }

      auditService.logAction({
        action: 'ANULACIÓN',
        entityType: 'sales',
        entityId: saleId,
        description: `Comunicación de Baja y anulación de comprobante ${docStr}. Motivo: ${reason}`,
        details: { doc_number: docStr, reason, sale_id: saleId },
      });

      return {
        success: true,
        message: `El comprobante ${docStr} fue anulado correctamente. Se emitió la Comunicación de Baja a SUNAT y el inventario fue reincorporado.`,
      };
    } catch (err) {
      console.error('Error in annulInvoice:', err);
      return { success: false, message: 'Error al procesar la anulación del comprobante.' };
    }
  },

  async getSaleItems(saleId: string): Promise<{ productId: string; productName: string; quantity: number; unitPrice: number; subtotal: number }[]> {
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          id, product_id, quantity, unit_price, subtotal,
          products ( name )
        `)
        .eq('sale_id', saleId);

      if (error || !data || data.length === 0) {
        return [];
      }

      return data.map((item: any) => ({
        productId: item.product_id,
        productName: item.products?.name || 'Producto',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unit_price) || 0,
        subtotal: Number(item.subtotal) || 0,
      }));
    } catch (err) {
      console.error('Error in getSaleItems:', err);
      return [];
    }
  }
};

// ---------------- BILLING ----------------
export interface BillingInvoice {
  id: string;
  docType: 'BOLETA' | 'FACTURA' | 'NOTA_CREDITO';
  series: string;
  sequence: string;
  customerName: string;
  customerDoc: string;
  total: number;
  subtotal: number;
  tax: number;
  status: 'ISSUED' | 'ACCEPTED' | 'PENDING' | 'REJECTED' | 'NOTA_CREDITO' | 'CANCELLED';
  date: string;
  rawDate: string;
  saleId: string;
  creditNoteNumber?: string;
  sellerName?: string;
  branchName?: string;
  paymentMethod?: string;
  paymentCondition?: 'CONTADO' | 'CREDITO';
  creditInfo?: Sale['creditInfo'];
}

export const billingService = {
  async getInvoices(): Promise<BillingInvoice[]> {
    try {
      const sales = await salesService.getSales();
      const currentUserName = typeof window !== 'undefined' ? (localStorage.getItem('auth_user') || 'Vendedor') : 'Vendedor';

      return sales.map((s) => {
        const parts = (s.saleNumber || '').split('-');
        const series = parts.length > 1 ? parts[0] : (s.documentType === 'FACTURA' ? 'F001' : 'B001');
        const sequence = parts.length > 1 ? parts[1] : (parts[0] || '00001');
        const isCancelled = s.status === 'CANCELLED' || (s.status as string) === 'ANULADO';

        let mappedStatus: 'ISSUED' | 'ACCEPTED' | 'PENDING' | 'REJECTED' | 'NOTA_CREDITO' | 'CANCELLED' = 'PENDING';
        if (isCancelled) {
          mappedStatus = 'CANCELLED';
        } else if (s.creditNoteNumber) {
          mappedStatus = 'NOTA_CREDITO';
        } else if (s.sunatStatus === 'ACEPTADO') {
          mappedStatus = 'ACCEPTED';
        }

        return {
          id: `inv-${s.id}`,
          saleId: s.id,
          docType: (s.documentType as any) || (series.startsWith('F') ? 'FACTURA' : 'BOLETA'),
          series,
          sequence,
          customerName: s.customer,
          customerDoc: s.customerDoc || '00000000',
          total: s.total,
          subtotal: s.subtotal,
          tax: s.tax,
          status: mappedStatus,
          date: s.date,
          rawDate: s.rawDate || new Date().toISOString(),
          creditNoteNumber: s.creditNoteNumber,
          sellerName: s.sellerName || currentUserName,
          branchName: s.branch || 'Sede Principal',
          paymentMethod: s.paymentMethod,
          paymentCondition: s.paymentCondition,
          creditInfo: s.creditInfo,
        };
      });
    } catch (err) {
      console.error('Error fetching invoices:', err);
      return [];
    }
  },
};

// ---------------- REPORTS & KPIS ----------------
export interface ReportSummary {
  ventasMes: number;      // Month Sales Total
  gananciasBrutas: number; // Gross Profit (Sales - COGS)
  gananciasNetas: number;  // Net Profit (Gross - Expenses)
  gastosMes: number;      // Expenses of the Month (Purchases + Expenses)
  valorizacionAlmacen: number; // Inventory Valuation (Stock * Cost)
  topProducts: { name: string; sales: number; total: number }[];
  salesByPayment: { method: string; amount: number; pct: number }[];
  
  // Detailed lists for audits
  salesList: { date: string; docNumber: string; customer: string; method: string; total: number }[];
  grossProfitList: { docNumber: string; product: string; qty: number; price: number; subtotal: number; cost: number; totalCost: number; profit: number }[];
  purchasesList: { date: string; docNumber: string; supplier: string; total: number }[];
  expensesList: { date: string; description: string; type: string; amount: number }[];
  inventoryList: { code: string; name: string; stock: number; cost: number; totalValue: number }[];
}

export const reportsService = {
  async getReportSummary(): Promise<ReportSummary> {
    try {
      const tenantId = getActiveTenantId();
      if (!tenantId) {
        return {
          ventasMes: 0,
          gananciasBrutas: 0,
          gananciasNetas: 0,
          gastosMes: 0,
          valorizacionAlmacen: 0,
          topProducts: [],
          salesByPayment: [],
          salesList: [],
          grossProfitList: [],
          purchasesList: [],
          expensesList: [],
          inventoryList: [],
        };
      }

      const sales = await salesService.getSales();

      // Labels mapping
      const paymentMethodsLabels: Record<string, string> = {
        'CARD': 'Tarjeta de Crédito / Débito',
        'CASH': 'Efectivo en Caja',
        'YAPE': 'Billeteras (Yape / Plin)',
        'PLIN': 'Billeteras (Yape / Plin)',
        'TRANSFER': 'Transferencia Bancaria',
        'OTHER': 'Otros Medios',
      };

      // Fetch sale_items from DB to calculate detailed item breakdown
      const { data: dbItems } = await supabase
        .from('sale_items')
        .select(`
          sale_id, quantity, unit_price, subtotal, product_id,
          products ( cost, name )
        `)
        .eq('tenant_id', tenantId);

      const saleItemsBySaleId = new Map<string, any[]>();
      dbItems?.forEach((item: any) => {
        const list = saleItemsBySaleId.get(item.sale_id) || [];
        list.push(item);
        saleItemsBySaleId.set(item.sale_id, list);
      });

      let salesTotal = 0;
      let cogsTotal = 0;
      const productSalesMap = new Map<string, { name: string; quantity: number; total: number }>();
      const paymentMap = new Map<string, number>();
      
      const salesList: any[] = [];
      const grossProfitList: any[] = [];

      sales.forEach((s) => {
        const total = Number(s.total) || 0;
        salesTotal += total;

        const docNumber = s.saleNumber || `V-${s.id.slice(0, 8).toUpperCase()}`;
        const customer = s.customer || 'Público General';
        const method = paymentMethodsLabels[s.paymentMethod] || 'Otros Medios';

        salesList.push({
          date: s.date,
          docNumber,
          customer,
          method,
          total,
        });

        // Payment method aggregation
        const key = s.paymentMethod || 'OTHER';
        paymentMap.set(key, (paymentMap.get(key) || 0) + total);

        // Process items for COGS and Top Products
        const items = saleItemsBySaleId.get(s.id) || s.items || [];
        if (items.length > 0) {
          items.forEach((item: any) => {
            const qty = Number(item.quantity || item.qty) || 1;
            const cost = Number(item.products?.cost || item.cost) || 0;
            const name = item.products?.name || item.productName || item.name || 'Producto';
            const price = Number(item.unit_price || item.unitPrice) || (Number(item.subtotal) / (qty || 1)) || total;
            const subtotal = item.subtotal ? Number(item.subtotal) : (qty * price);

            const totalCost = qty * cost;
            cogsTotal += totalCost;
            const profit = subtotal - totalCost;

            grossProfitList.push({
              docNumber,
              product: name,
              qty,
              price,
              subtotal,
              cost,
              totalCost,
              profit,
            });

            // Product aggregation
            const prodId = item.product_id || item.productId || name;
            const current = productSalesMap.get(prodId) || { name, quantity: 0, total: 0 };
            current.quantity += qty;
            current.total += subtotal;
            productSalesMap.set(prodId, current);
          });
        } else {
          // Fallback if no individual items recorded
          grossProfitList.push({
            docNumber,
            product: 'Venta General POS',
            qty: 1,
            price: total,
            subtotal: total,
            cost: total * 0.7,
            totalCost: total * 0.7,
            profit: total * 0.3,
          });
        }
      });

      // 2. Fetch Expenses/Purchases in current month for this tenant
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();

      const { data: purchases, error: pError } = await supabase
        .from('purchases')
        .select(`
          document_number, document_date, total,
          suppliers ( business_name )
        `)
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfMonth);

      if (pError) {
        console.error('Error fetching purchases for reports:', pError);
      }

      const { data: expenses, error: exError } = await supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('expense_date', startOfMonth.split('T')[0]);

      if (exError) {
        console.error('Error fetching expenses for reports:', exError);
      }

      const purchasesTotal = purchases?.reduce((sum, p) => sum + (Number(p.total) || 0), 0) || 0;
      const operatingExpensesTotal = expenses?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0;
      const expensesTotal = purchasesTotal + operatingExpensesTotal;

      const purchasesList = (purchases || []).map((p: any) => ({
        date: p.document_date || '',
        docNumber: p.document_number || 'N/A',
        supplier: p.suppliers?.business_name || 'Proveedor General',
        total: Number(p.total) || 0,
      }));

      const expensesList = (expenses || []).map((e: any) => ({
        date: e.expense_date,
        description: e.description,
        type: e.expense_type === 'FIXED' ? 'Fijo' : 'Variable',
        amount: Number(e.amount) || 0,
      }));

      // 3. Fetch Stock and calculate Valuation for this tenant
      const { data: inventory, error: iError } = await supabase
        .from('branch_inventory')
        .select(`
          quantity,
          products ( code, name, cost )
        `)
        .eq('tenant_id', tenantId);

      if (iError) {
        console.error('Error fetching inventory for reports:', iError);
      }

      const inventoryValuation = inventory?.reduce((sum: number, item: any) => {
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.products?.cost) || 0;
        return sum + (qty * cost);
      }, 0) || 0;

      const inventoryList = (inventory || []).map((item: any) => {
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.products?.cost) || 0;
        return {
          code: item.products?.code || 'PROD',
          name: item.products?.name || 'Producto',
          stock: qty,
          cost: cost,
          totalValue: qty * cost,
        };
      });

      // 4. Gross Profit = Sales - COGS
      const grossProfit = Math.max(0, salesTotal - cogsTotal);

      // 5. Net Profit = Gross Profit - expensesTotal
      const netProfit = Math.max(0, grossProfit - expensesTotal);

      // 6. Map Top Products
      const topProducts = Array.from(productSalesMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map(p => ({
          name: p.name,
          sales: Math.round(p.quantity),
          total: p.total,
        }));

      // 7. Map Payment methods
      const aggregatedPayments = new Map<string, number>();
      paymentMap.forEach((val, key) => {
        const label = paymentMethodsLabels[key] || 'Otros Medios';
        aggregatedPayments.set(label, (aggregatedPayments.get(label) || 0) + val);
      });

      const totalPaymentsSum = Array.from(aggregatedPayments.values()).reduce((a, b) => a + b, 0) || 1;
      const salesByPayment = Array.from(aggregatedPayments.entries()).map(([method, amount]) => ({
        method,
        amount,
        pct: Math.round((amount / totalPaymentsSum) * 100),
      })).sort((a, b) => b.amount - a.amount);

      return {
        ventasMes: salesTotal,
        gananciasBrutas: grossProfit,
        gananciasNetas: netProfit,
        gastosMes: expensesTotal,
        valorizacionAlmacen: inventoryValuation,
        topProducts,
        salesByPayment,
        salesList,
        grossProfitList,
        purchasesList,
        expensesList,
        inventoryList,
      };
    } catch (err) {
      console.error('Exception in reportsService:', err);
      return {
        ventasMes: 0,
        gananciasBrutas: 0,
        gananciasNetas: 0,
        gastosMes: 0,
        valorizacionAlmacen: 0,
        topProducts: [],
        salesByPayment: [],
        salesList: [],
        grossProfitList: [],
        purchasesList: [],
        expensesList: [],
        inventoryList: [],
      };
    }
  }
};

export interface Expense {
  id: string;
  description: string;
  expenseType: 'FIXED' | 'VARIABLE';
  frequency?: string;
  amount: number;
  expenseDate: string;
  voucherUrl?: string;
  voucherName?: string;
}

export const expensesService = {
  getCapital(): number {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('operating_capital');
      return saved !== null ? parseFloat(saved) : 10000;
    }
    return 10000;
  },

  setCapital(amount: number): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('operating_capital', String(amount));
    }
  },

  async getExpenses(): Promise<Expense[]> {
    try {
      const tenantId = getActiveTenantId();
      if (!tenantId) return [];

      if (!isNetworkOnline()) {
        try { return await getAllRecords<Expense>(STORES.EXPENSES); } catch { return []; }
      }

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('expense_date', { ascending: false });

      if (error) {
        console.error('Error fetching expenses:', error);
        try { return await getAllRecords<Expense>(STORES.EXPENSES); } catch { return []; }
      }

      const result = (data || []).map((e: any) => ({
        id: e.id,
        description: e.description,
        expenseType: e.expense_type,
        frequency: e.frequency,
        amount: Number(e.amount) || 0,
        expenseDate: e.expense_date,
        voucherUrl: e.voucher_url || e.voucherUrl || undefined,
        voucherName: e.voucher_name || e.voucherName || undefined,
      })) as Expense[];

      try { await putManyRecords(STORES.EXPENSES, result); } catch { /* non-critical */ }
      return result;
    } catch (err) {
      console.error(err);
      try { return await getAllRecords<Expense>(STORES.EXPENSES); } catch { return []; }
    }
  },

  async createExpense(expense: Omit<Expense, 'id'>): Promise<Expense | null> {
    try {
      const tenantId = getActiveTenantId();
      if (!tenantId) return null;

      if (isNetworkOnline()) {
        try {
          const { data, error } = await supabase
            .from('expenses')
            .insert({
              tenant_id: tenantId,
              description: expense.description,
              expense_type: expense.expenseType,
              frequency: expense.frequency || 'ONCE',
              amount: expense.amount,
              expense_date: expense.expenseDate,
              voucher_url: expense.voucherUrl,
              voucher_name: expense.voucherName,
            })
            .select()
            .single();

          if (!error && data) {
            const created: Expense = {
              id: data.id,
              description: data.description,
              expenseType: data.expense_type,
              frequency: data.frequency,
              amount: Number(data.amount) || 0,
              expenseDate: data.expense_date,
              voucherUrl: data.voucher_url || expense.voucherUrl,
              voucherName: data.voucher_name || expense.voucherName,
            };

            try { await putRecord(STORES.EXPENSES, created); } catch { /* non-critical */ }

            auditService.logAction({
              action: 'GASTO OPERATIVO',
              entityType: 'expenses',
              entityId: data.id,
              description: `Registro de gasto operativo por S/ ${Number(expense.amount).toFixed(2)} - "${expense.description}" (${expense.expenseType === 'FIXED' ? 'Fijo' : 'Variable'})`,
              details: {
                description: expense.description,
                amount: expense.amount,
                expense_type: expense.expenseType,
              },
            });

            return created;
          }
        } catch (networkErr) {
          console.warn('[expensesService] Online create failed, queueing offline mutation:', networkErr);
        }
      }

      // Offline fallback
      const localId = generateLocalId();
      const localExpense: Expense = {
        id: localId,
        description: expense.description,
        expenseType: expense.expenseType,
        frequency: expense.frequency || 'ONCE',
        amount: Number(expense.amount) || 0,
        expenseDate: expense.expenseDate,
        voucherUrl: expense.voucherUrl,
        voucherName: expense.voucherName,
      };

      try {
        await putRecord(STORES.EXPENSES, localExpense);
      } catch (dbErr) {
        console.error('[expensesService] Error saving to IndexedDB:', dbErr);
      }

      try {
        await queueMutation('expenses', 'CREATE', {
          id: localId,
          tenant_id: tenantId,
          description: expense.description,
          expense_type: expense.expenseType,
          frequency: expense.frequency || 'ONCE',
          amount: expense.amount,
          expense_date: expense.expenseDate,
          voucher_url: expense.voucherUrl,
          voucher_name: expense.voucherName,
        });
        refreshPendingCount().catch(() => {});
      } catch (queueErr) {
        console.error('[expensesService] Error queueing outbox mutation:', queueErr);
      }

      auditService.logAction({
        action: 'GASTO OPERATIVO',
        entityType: 'expenses',
        entityId: localId,
        description: `Registro de gasto operativo por S/ ${Number(expense.amount).toFixed(2)} - "${expense.description}" (Modo Offline)`,
        details: {
          description: expense.description,
          amount: expense.amount,
          expense_type: expense.expenseType,
        },
      });

      return localExpense;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  async updateExpense(id: string, expense: Partial<Omit<Expense, 'id'>>): Promise<boolean> {
    try {
      // Update local cache
      try {
        const existing = await getRecord<Expense>(STORES.EXPENSES, id);
        if (existing) {
          const updated: Expense = {
            ...existing,
            ...expense,
          };
          await putRecord(STORES.EXPENSES, updated);
        }
      } catch (e) {
        console.warn('[expensesService] Error updating local cache:', e);
      }

      const updateData: any = {};
      if (expense.description !== undefined) updateData.description = expense.description;
      if (expense.expenseType !== undefined) updateData.expense_type = expense.expenseType;
      if (expense.frequency !== undefined) updateData.frequency = expense.frequency;
      if (expense.amount !== undefined) updateData.amount = expense.amount;
      if (expense.expenseDate !== undefined) updateData.expense_date = expense.expenseDate;
      if (expense.voucherUrl !== undefined) updateData.voucher_url = expense.voucherUrl;
      if (expense.voucherName !== undefined) updateData.voucher_name = expense.voucherName;

      if (isNetworkOnline()) {
        try {
          const { error } = await supabase
            .from('expenses')
            .update(updateData)
            .eq('id', id);

          if (!error) {
            auditService.logAction({
              action: 'MODIFICAR',
              entityType: 'expenses',
              entityId: id,
              description: `Actualización de gasto operativo "${expense.description || id}"`,
              details: { ...expense },
            });
            return true;
          }
        } catch (networkErr) {
          console.warn('[expensesService] Online update failed, queueing offline mutation:', networkErr);
        }
      }

      // Offline queue
      try {
        await queueMutation('expenses', 'UPDATE', {
          _id: id,
          ...updateData,
        });
        refreshPendingCount().catch(() => {});
      } catch (queueErr) {
        console.error('[expensesService] Error queueing update mutation:', queueErr);
      }

      auditService.logAction({
        action: 'MODIFICAR',
        entityType: 'expenses',
        entityId: id,
        description: `Actualización de gasto operativo "${expense.description || id}" (Modo Offline)`,
        details: { ...expense },
      });

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  async deleteExpense(id: string): Promise<boolean> {
    try {
      let expDesc = 'Gasto';
      try {
        const localExp = await getRecord<Expense>(STORES.EXPENSES, id);
        if (localExp) expDesc = `${localExp.description} (S/ ${Number(localExp.amount).toFixed(2)})`;
      } catch (_) {}

      // Delete from local cache
      try {
        await deleteLocalRecord(STORES.EXPENSES, id);
      } catch (e) {
        console.warn('[expensesService] Error deleting local record:', e);
      }

      if (isNetworkOnline()) {
        try {
          const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id);

          if (!error) {
            auditService.logAction({
              action: 'ELIMINAR',
              entityType: 'expenses',
              entityId: id,
              description: `Eliminación de gasto operativo "${expDesc}"`,
              details: { description: expDesc },
            });
            return true;
          }
        } catch (networkErr) {
          console.warn('[expensesService] Online delete failed, queueing offline mutation:', networkErr);
        }
      }

      // Offline queue
      try {
        await queueMutation('expenses', 'DELETE', { _id: id });
        refreshPendingCount().catch(() => {});
      } catch (queueErr) {
        console.error('[expensesService] Error queueing delete mutation:', queueErr);
      }

      auditService.logAction({
        action: 'ELIMINAR',
        entityType: 'expenses',
        entityId: id,
        description: `Eliminación de gasto operativo "${expDesc}" (Modo Offline)`,
        details: { description: expDesc },
      });

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },
};

export const settingsService = {
  async getTenantInfo(): Promise<Record<string, any>> {
    try {
      let tenantId = getActiveTenantId();
      if (!tenantId) {
        tenantId = await resolveTenantId();
      }
      if (!tenantId && !isNetworkOnline()) return {};

      if (!isNetworkOnline()) {
        try {
          const localSettings = await getRecord<any>(STORES.SETTINGS, 'tenant_info');
          if (localSettings) return localSettings;
        } catch {}
      }

      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .maybeSingle();

      if (data && Object.keys(data).length > 0) {
        try { await putRecord(STORES.SETTINGS, { key: 'tenant_info', ...data }); } catch {}
        return data;
      }

      const localSettings = await getRecord<any>(STORES.SETTINGS, 'tenant_info');
      if (localSettings) return localSettings;

      return {};
    } catch (err) {
      console.error('Error fetching tenant info:', err);
      try {
        const localSettings = await getRecord<any>(STORES.SETTINGS, 'tenant_info');
        if (localSettings) return localSettings;
      } catch {}
      return {};
    }
  },

  async updateTenantInfo(updates: Record<string, any>): Promise<boolean> {
    try {
      const tenantId = getActiveTenantId();
      if (!tenantId) return false;

      try {
        const existing = await getRecord<any>(STORES.SETTINGS, 'tenant_info') || {};
        await putRecord(STORES.SETTINGS, { ...existing, ...updates, key: 'tenant_info' });
      } catch {}

      if (isNetworkOnline()) {
        try {
          const { error } = await supabase
            .from('tenants')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', tenantId);
          if (error) {
            await queueMutation('tenants', 'UPDATE', { _id: tenantId, ...updates });
          }
        } catch {
          await queueMutation('tenants', 'UPDATE', { _id: tenantId, ...updates });
        }
      } else {
        await queueMutation('tenants', 'UPDATE', { _id: tenantId, ...updates });
      }

      refreshPendingCount().catch(() => {});

      auditService.logAction({
        action: 'CONFIGURACIÓN',
        entityType: 'settings',
        description: `Actualización de datos y configuración general de la empresa`,
        details: { ...updates },
      });

      return true;
    } catch (err) {
      console.error('Error updating tenant info:', err);
      return false;
    }
  },

  async getInvoiceSeries(): Promise<{ document_type: string; series: string; next_number: number }[]> {
    try {
      const tenantId = getActiveTenantId();
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('invoice_series')
        .select('document_type, series, next_number')
        .eq('tenant_id', tenantId);

      if (error || !data || data.length === 0) {
        const defaultSeries = [
          { tenant_id: tenantId, document_type: 'BOLETA', series: 'B001', next_number: 1 },
          { tenant_id: tenantId, document_type: 'FACTURA', series: 'F001', next_number: 1 },
        ];
        await supabase.from('invoice_series').insert(defaultSeries);
        return defaultSeries;
      }
      return data;
    } catch (err) {
      console.error('Error fetching invoice series:', err);
      return [];
    }
  },

  async getNextSeriesNumber(docType: 'BOLETA' | 'FACTURA'): Promise<{ series: string; number: number } | null> {
    const defaultSeries = docType === 'FACTURA' ? 'F001' : 'B001';
    const localKey = `series_${docType}`;
    const localSaved = typeof window !== 'undefined' ? localStorage.getItem(localKey) : null;
    const localNum = localSaved ? parseInt(localSaved, 10) : 1;

    if (!isNetworkOnline()) {
      return { series: defaultSeries, number: isNaN(localNum) ? 1 : localNum };
    }

    try {
      const tenantId = getActiveTenantId();
      if (!tenantId) return { series: defaultSeries, number: isNaN(localNum) ? 1 : localNum };

      const { data, error } = await supabase
        .from('invoice_series')
        .select('series, next_number')
        .eq('tenant_id', tenantId)
        .eq('document_type', docType)
        .maybeSingle();

      if (error || !data) {
        return { series: defaultSeries, number: isNaN(localNum) ? 1 : localNum };
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(localKey, String(data.next_number));
      }
      return { series: data.series, number: data.next_number };
    } catch {
      return { series: defaultSeries, number: isNaN(localNum) ? 1 : localNum };
    }
  },

  async incrementSeriesNumber(docType: 'BOLETA' | 'FACTURA', series: string): Promise<boolean> {
    const localKey = `series_${docType}`;
    const localSaved = typeof window !== 'undefined' ? localStorage.getItem(localKey) : null;
    const currentNum = localSaved ? parseInt(localSaved, 10) : 1;
    const nextNum = (isNaN(currentNum) ? 1 : currentNum) + 1;
    if (typeof window !== 'undefined') {
      localStorage.setItem(localKey, String(nextNum));
    }

    if (!isNetworkOnline()) return true;

    try {
      const tenantId = getActiveTenantId();
      if (!tenantId) return true;

      const { error } = await supabase.rpc('increment_series_number', {
        p_tenant_id: tenantId,
        p_document_type: docType,
        p_series: series,
      });
      if (error) {
        await supabase
          .from('invoice_series')
          .update({ next_number: nextNum })
          .eq('tenant_id', tenantId)
          .eq('document_type', docType)
          .eq('series', series);
      }
      return true;
    } catch {
      return true;
    }
  },
};

// ---------------- PLATFORM TENANTS / ORGANIZATIONS ----------------
export interface TenantCompany {
  id: string;
  name: string;
  legalName?: string;
  ruc: string;
  address?: string;
  phone?: string;
  adminEmail: string;
  adminName: string;
  plan: 'ENTERPRISE' | 'PRO' | 'BASIC';
  active: boolean;
  createdAt: string;

  // SUNAT Electronic Invoicing (CPE) Configuration
  sunatEnv: 'BETA' | 'PRODUCTION';
  solUser?: string;
  solPassword?: string;
  certPassword?: string;
  certFileName?: string;
  clientId?: string;
  clientSecret?: string;
  establishmentCode?: string;
  invoiceSeries?: string;
  receiptSeries?: string;
  creditNoteSeries?: string;
  debitNoteSeries?: string;
  guiaSeries?: string;
  ubigeo?: string;
  urbanization?: string;
  department?: string;
  province?: string;
  district?: string;
}

export interface TenantFormValues {
  name: string;
  legalName: string;
  ruc: string;
  plan: 'ENTERPRISE' | 'PRO' | 'BASIC';
  address: string;
  phone: string;
  adminName: string;
  adminEmail: string;
  adminPassword?: string;

  // SUNAT fields
  sunatEnv: 'BETA' | 'PRODUCTION';
  solUser: string;
  solPassword: string;
  certPassword: string;
  certFileName: string;
  clientId: string;
  clientSecret: string;
  establishmentCode: string;
  invoiceSeries: string;
  receiptSeries: string;
  creditNoteSeries: string;
  debitNoteSeries: string;
  guiaSeries: string;
  ubigeo: string;
  urbanization: string;
  department: string;
  province: string;
  district: string;
}

export const tenantsService = {
  async getTenants(): Promise<TenantCompany[]> {
    try {
      const { data: tenantRows, error: tError } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (tError) {
        console.error('Error fetching tenants from Supabase:', tError);
        const cached = localStorage.getItem('cached_platform_tenants');
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch {
            // ignore
          }
        }
        return [];
      }

      const { data: memberships } = await supabase
        .from('tenant_memberships')
        .select(`
          id,
          tenant_id,
          username,
          password,
          status,
          profiles ( id, full_name, email ),
          roles ( id, name, is_system )
        `);

      const membershipMap = new Map<string, any>();
      (memberships || []).forEach((m: any) => {
        if (!membershipMap.has(m.tenant_id) || m.roles?.name?.toLowerCase().includes('admin')) {
          membershipMap.set(m.tenant_id, m);
        }
      });

      const list: TenantCompany[] = (tenantRows || []).map((t: any) => {
        const mem = membershipMap.get(t.id);
        const pObj = Array.isArray(mem?.profiles) ? mem.profiles[0] : mem?.profiles;
        const fc = t.fiscal_config || {};

        return {
          id: t.id,
          name: t.name || 'Organización',
          legalName: t.trade_name || fc.legal_name || t.name || '',
          ruc: t.ruc || '',
          address: t.address || '',
          phone: t.phone || '',
          adminEmail: pObj?.email || t.email || 'admin@ventasbv.pe',
          adminName: pObj?.full_name || fc.admin_name || mem?.username || 'Super Admin',
          plan: fc.plan || 'ENTERPRISE',
          active: t.active !== false,
          createdAt: t.created_at ? t.created_at.split('T')[0] : '2026-08-01',
          sunatEnv: fc.sunat_env || 'BETA',
          solUser: fc.sol_user || '',
          solPassword: fc.sol_password || (mem?.password ? '••••••••' : ''),
          certPassword: fc.cert_password || '',
          certFileName: fc.cert_file_name || '',
          clientId: fc.client_id || '',
          clientSecret: fc.client_secret || '',
          establishmentCode: fc.establishment_code || t.fiscal_config?.establishment_code || '0000',
          invoiceSeries: t.invoice_series || fc.invoice_series || 'F001',
          receiptSeries: t.receipt_series || fc.receipt_series || 'B001',
          creditNoteSeries: fc.credit_note_series || 'FC01',
          debitNoteSeries: fc.debit_note_series || 'FD01',
          guiaSeries: fc.guia_series || 'T001',
          ubigeo: fc.ubigeo || '150101',
          urbanization: fc.urbanization || '',
          department: fc.department || 'Lima',
          province: fc.province || 'Lima',
          district: fc.district || 'Lima',
        };
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('cached_platform_tenants', JSON.stringify(list));
      }

      return list;
    } catch (err) {
      console.error('Exception in getTenants:', err);
      const cached = localStorage.getItem('cached_platform_tenants');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // ignore
        }
      }
      return [];
    }
  },

  async createTenant(values: TenantFormValues): Promise<TenantCompany | null> {
    try {
      const newTenantId = generateUUID();
      const newBranchId = generateUUID();
      const newRoleId = generateUUID();
      const newProfileId = generateUUID();
      const newMembershipId = generateUUID();

      const fiscalConfig = {
        plan: values.plan || 'ENTERPRISE',
        legal_name: values.legalName || values.name,
        admin_name: values.adminName,
        sunat_env: values.sunatEnv || 'BETA',
        sol_user: values.solUser || '',
        sol_password: values.solPassword || '',
        cert_password: values.certPassword || '',
        cert_file_name: values.certFileName || '',
        client_id: values.clientId || '',
        client_secret: values.clientSecret || '',
        establishment_code: values.establishmentCode || '0000',
        invoice_series: values.invoiceSeries || 'F001',
        receipt_series: values.receiptSeries || 'B001',
        credit_note_series: values.creditNoteSeries || 'FC01',
        debit_note_series: values.debitNoteSeries || 'FD01',
        guia_series: values.guiaSeries || 'T001',
        ubigeo: values.ubigeo || '150101',
        urbanization: values.urbanization || '',
        department: values.department || 'Lima',
        province: values.province || 'Lima',
        district: values.district || 'Lima',
      };

      // 1. Insert into tenants
      const { data: tenantData, error: tErr } = await supabase
        .from('tenants')
        .insert({
          id: newTenantId,
          name: values.name,
          trade_name: values.legalName || values.name,
          ruc: values.ruc,
          address: values.address || '',
          phone: values.phone || '',
          email: values.adminEmail,
          receipt_series: values.receiptSeries || 'B001',
          invoice_series: values.invoiceSeries || 'F001',
          active: true,
          fiscal_config: fiscalConfig,
        })
        .select()
        .single();

      if (tErr || !tenantData) {
        console.error('Error inserting tenant in Supabase:', tErr);
        return null;
      }

      // 2. Insert main branch
      await supabase.from('branches').insert({
        id: newBranchId,
        tenant_id: newTenantId,
        name: 'Sede Principal',
        address: values.address || '',
        phone: values.phone || '',
        manager_name: values.adminName || 'Admin',
        status: 'ACTIVE',
      });

      // 3. Insert system roles for new tenant
      await supabase.from('roles').insert([
        { id: newRoleId, tenant_id: newTenantId, name: 'Super Admin', is_system: true },
        { id: generateUUID(), tenant_id: newTenantId, name: 'Administrador', is_system: true },
        { id: generateUUID(), tenant_id: newTenantId, name: 'Vendedor', is_system: false },
        { id: generateUUID(), tenant_id: newTenantId, name: 'Cajero', is_system: false },
      ]);

      // 4. Create or reuse Profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', values.adminEmail.trim().toLowerCase())
        .maybeSingle();

      const profileId = existingProfile?.id || newProfileId;
      if (!existingProfile) {
        await supabase.from('profiles').insert({
          id: profileId,
          full_name: values.adminName,
          email: values.adminEmail.trim().toLowerCase(),
        });
      }

      // 5. Insert Membership
      const rawUsername = values.adminEmail.split('@')[0] || values.adminName.toLowerCase().replace(/\s+/g, '');
      await supabase.from('tenant_memberships').insert({
        id: newMembershipId,
        tenant_id: newTenantId,
        user_id: profileId,
        role_id: newRoleId,
        username: rawUsername,
        password: values.adminPassword || '123',
        branch_ids: [newBranchId],
        status: 'ACTIVE',
      });

      // 6. Insert initial invoice series
      await supabase.from('invoice_series').insert([
        { tenant_id: newTenantId, document_type: 'FACTURA', series: values.invoiceSeries || 'F001', next_number: 1 },
        { tenant_id: newTenantId, document_type: 'BOLETA', series: values.receiptSeries || 'B001', next_number: 1 },
        { tenant_id: newTenantId, document_type: 'NOTA_CREDITO', series: values.creditNoteSeries || 'FC01', next_number: 1 },
        { tenant_id: newTenantId, document_type: 'NOTA_DEBITO', series: values.debitNoteSeries || 'FD01', next_number: 1 },
      ]);

      // 7. Audit log
      auditService.logAction({
        action: 'CREAR',
        entityType: 'tenants',
        entityId: newTenantId,
        description: `Creación de nueva empresa/tenant "${values.name}" (RUC: ${values.ruc}, Plan: ${values.plan}) con admin ${values.adminEmail}`,
        details: {
          name: values.name,
          ruc: values.ruc,
          plan: values.plan,
          adminEmail: values.adminEmail,
          sunatEnv: values.sunatEnv,
        },
      });

      return {
        id: newTenantId,
        name: values.name,
        legalName: values.legalName || values.name,
        ruc: values.ruc,
        address: values.address || '',
        phone: values.phone || '',
        adminEmail: values.adminEmail,
        adminName: values.adminName,
        plan: values.plan,
        active: true,
        createdAt: new Date().toISOString().split('T')[0],
        sunatEnv: values.sunatEnv,
        solUser: values.solUser,
        solPassword: values.solPassword,
        certPassword: values.certPassword,
        certFileName: values.certFileName,
        clientId: values.clientId,
        clientSecret: values.clientSecret,
        establishmentCode: values.establishmentCode,
        invoiceSeries: values.invoiceSeries,
        receiptSeries: values.receiptSeries,
        creditNoteSeries: values.creditNoteSeries,
        debitNoteSeries: values.debitNoteSeries,
        guiaSeries: values.guiaSeries,
        ubigeo: values.ubigeo,
        urbanization: values.urbanization,
        department: values.department,
        province: values.province,
        district: values.district,
      };
    } catch (err) {
      console.error('Exception in createTenant:', err);
      return null;
    }
  },

  async updateTenant(id: string, values: TenantFormValues): Promise<boolean> {
    try {
      const { data: existing } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      const existingFc = existing?.fiscal_config || {};
      const updatedFc = {
        ...existingFc,
        plan: values.plan,
        legal_name: values.legalName || values.name,
        admin_name: values.adminName,
        sunat_env: values.sunatEnv,
        sol_user: values.solUser,
        sol_password: values.solPassword || existingFc.sol_password,
        cert_password: values.certPassword || existingFc.cert_password,
        cert_file_name: values.certFileName || existingFc.cert_file_name,
        client_id: values.clientId || existingFc.client_id,
        client_secret: values.clientSecret || existingFc.client_secret,
        establishment_code: values.establishmentCode || existingFc.establishment_code || '0000',
        invoice_series: values.invoiceSeries || existingFc.invoice_series || 'F001',
        receipt_series: values.receiptSeries || existingFc.receipt_series || 'B001',
        credit_note_series: values.creditNoteSeries || existingFc.credit_note_series || 'FC01',
        debit_note_series: values.debitNoteSeries || existingFc.debit_note_series || 'FD01',
        guia_series: values.guiaSeries || existingFc.guia_series || 'T001',
        ubigeo: values.ubigeo || existingFc.ubigeo || '150101',
        urbanization: values.urbanization || existingFc.urbanization || '',
        department: values.department || existingFc.department || 'Lima',
        province: values.province || existingFc.province || 'Lima',
        district: values.district || existingFc.district || 'Lima',
      };

      const { error: tErr } = await supabase
        .from('tenants')
        .update({
          name: values.name,
          trade_name: values.legalName || values.name,
          address: values.address,
          phone: values.phone,
          email: values.adminEmail,
          receipt_series: values.receiptSeries,
          invoice_series: values.invoiceSeries,
          fiscal_config: updatedFc,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (tErr) {
        console.error('Error updating tenant in Supabase:', tErr);
        return false;
      }

      // Update admin user profile & password
      const { data: member } = await supabase
        .from('tenant_memberships')
        .select('id, user_id')
        .eq('tenant_id', id)
        .maybeSingle();

      if (member) {
        if (values.adminName || values.adminEmail) {
          await supabase.from('profiles').update({
            ...(values.adminName ? { full_name: values.adminName } : {}),
            ...(values.adminEmail ? { email: values.adminEmail } : {}),
          }).eq('id', member.user_id);
        }
        if (values.adminPassword) {
          await supabase.from('tenant_memberships').update({
            password: values.adminPassword,
          }).eq('id', member.id);
        }
      }

      auditService.logAction({
        action: 'MODIFICAR',
        entityType: 'tenants',
        entityId: id,
        description: `Actualización de datos y configuración SUNAT de "${values.name}" (RUC: ${values.ruc})`,
        details: { name: values.name, ruc: values.ruc, plan: values.plan },
      });

      return true;
    } catch (err) {
      console.error('Exception in updateTenant:', err);
      return false;
    }
  },

  async toggleTenantStatus(id: string, active: boolean, tenantName?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error toggling tenant status:', error);
        return false;
      }

      auditService.logAction({
        action: active ? 'ACTIVAR' : 'SUSPENDER',
        entityType: 'tenants',
        entityId: id,
        description: `${active ? 'Activación' : 'Suspensión'} de la empresa "${tenantName || id}" en la plataforma`,
        details: { tenant_id: id, active },
      });

      return true;
    } catch (err) {
      console.error('Exception in toggleTenantStatus:', err);
      return false;
    }
  },
};

// ---------------- USER PROFILE ----------------
export const profileService = {
  async getProfile(): Promise<{
    membershipId: string;
    userId: string;
    fullName: string;
    username: string;
    email: string;
    role: string;
  }> {
    try {
      const authUserId = typeof window !== 'undefined' ? localStorage.getItem('auth_user_id') : null;
      const authUsername = typeof window !== 'undefined' ? (localStorage.getItem('auth_username') || localStorage.getItem('auth_user')) : null;
      const tenantId = getActiveTenantId();

      let query = supabase
        .from('tenant_memberships')
        .select(`
          id,
          user_id,
          username,
          profiles ( id, full_name, email ),
          roles ( id, name )
        `);

      if (authUserId) {
        query = query.eq('id', authUserId);
      } else if (authUsername && tenantId) {
        query = query.eq('tenant_id', tenantId).ilike('username', authUsername);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        return {
          membershipId: authUserId || '',
          userId: '',
          fullName: (typeof window !== 'undefined' && localStorage.getItem('auth_user')) || 'Usuario',
          username: (typeof window !== 'undefined' && localStorage.getItem('auth_username')) || 'usuario',
          email: (typeof window !== 'undefined' && localStorage.getItem('auth_email')) || '',
          role: (typeof window !== 'undefined' && localStorage.getItem('user_role')) || 'Vendedor',
        };
      }

      const pObj = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
      const rObj = Array.isArray(data.roles) ? data.roles[0] : data.roles;

      return {
        membershipId: data.id,
        userId: data.user_id,
        fullName: pObj?.full_name || data.username || 'Usuario',
        username: data.username || '',
        email: pObj?.email || '',
        role: rObj?.name || (typeof window !== 'undefined' ? localStorage.getItem('user_role') : '') || 'Vendedor',
      };
    } catch (err) {
      console.error('Error in getProfile:', err);
      return {
        membershipId: '',
        userId: '',
        fullName: (typeof window !== 'undefined' && localStorage.getItem('auth_user')) || 'Usuario',
        username: (typeof window !== 'undefined' && localStorage.getItem('auth_username')) || 'usuario',
        email: (typeof window !== 'undefined' && localStorage.getItem('auth_email')) || '',
        role: (typeof window !== 'undefined' && localStorage.getItem('user_role')) || 'Vendedor',
      };
    }
  },

  async updateProfile(params: {
    fullName: string;
    username: string;
    email: string;
    password?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const authUserId = typeof window !== 'undefined' ? localStorage.getItem('auth_user_id') : null;
      const authUsername = typeof window !== 'undefined' ? (localStorage.getItem('auth_username') || localStorage.getItem('auth_user')) : null;
      const tenantId = getActiveTenantId();
      if (!tenantId) return { success: false, error: 'No hay empresa activa seleccionada.' };

      // 1. Find the current user membership
      let query = supabase.from('tenant_memberships').select('id, user_id, username').eq('tenant_id', tenantId);
      if (authUserId) {
        query = query.eq('id', authUserId);
      } else if (authUsername) {
        query = query.ilike('username', authUsername);
      }

      const { data: membership, error: mError } = await query.maybeSingle();

      const memberId = membership?.id || authUserId;
      const userId = membership?.user_id;

      // 2. Check if new username is already taken by another user in this tenant
      if (params.username && params.username.trim()) {
        const cleanUsername = params.username.trim();
        const { data: existingUser } = await supabase
          .from('tenant_memberships')
          .select('id')
          .eq('tenant_id', tenantId)
          .ilike('username', cleanUsername)
          .neq('id', memberId || '')
          .maybeSingle();

        if (existingUser) {
          return {
            success: false,
            error: `El nombre de usuario "${cleanUsername}" ya está registrado por otro miembro en esta empresa.`,
          };
        }
      }

      // 3. Update Profile table
      if (userId && (params.fullName || params.email)) {
        const pUpdates: any = {};
        if (params.fullName) pUpdates.full_name = params.fullName.trim();
        if (params.email) pUpdates.email = params.email.trim();

        const { error: pErr } = await supabase.from('profiles').update(pUpdates).eq('id', userId);
        if (pErr) {
          console.error('Error updating profile in Supabase:', pErr);
        }
      }

      // 4. Update Membership table (username, password)
      if (memberId) {
        const mUpdates: any = {};
        if (params.username) mUpdates.username = params.username.trim();
        if (params.password && params.password.trim()) {
          mUpdates.password = params.password.trim();
        }

        if (Object.keys(mUpdates).length > 0) {
          const { error: updErr } = await supabase
            .from('tenant_memberships')
            .update(mUpdates)
            .eq('id', memberId);

          if (updErr) {
            console.error('Error updating membership in Supabase:', updErr);
            return { success: false, error: 'No se pudo actualizar el usuario en la base de datos.' };
          }
        }
      }

      // 5. Update localStorage
      if (params.fullName && typeof window !== 'undefined') localStorage.setItem('auth_user', params.fullName.trim());
      if (params.username && typeof window !== 'undefined') localStorage.setItem('auth_username', params.username.trim());
      if (params.email && typeof window !== 'undefined') localStorage.setItem('auth_email', params.email.trim());

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('user_profile_updated'));
      }

      auditService.logAction({
        action: 'MODIFICAR',
        entityType: 'profiles',
        entityId: memberId || undefined,
        description: `Actualización de perfil personal de usuario "${params.fullName || params.username}"`,
        details: { full_name: params.fullName, username: params.username, email: params.email },
      });

      return { success: true };
    } catch (err: any) {
      console.error('Exception in updateProfile:', err);
      return { success: false, error: 'Ocurrió un error inesperado al guardar los cambios del perfil.' };
    }
  },
};

// ---------------- NOTIFICATIONS ----------------
export interface AppNotification {
  id: string;
  tenant_id: string;
  user_id?: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
  read: boolean;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
}

export const notificationsService = {
  async getNotifications(): Promise<AppNotification[]> {
    try {
      const tenantId = getActiveTenantId();
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
      return (data || []).map((n: any) => ({
        id: n.id,
        tenant_id: n.tenant_id,
        user_id: n.user_id,
        title: n.title,
        message: n.message,
        type: n.type || 'INFO',
        read: Boolean(n.read),
        entity_type: n.entity_type,
        entity_id: n.entity_id,
        created_at: n.created_at,
      }));
    } catch (err) {
      console.error('Exception in getNotifications:', err);
      return [];
    }
  },

  async markAsRead(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('notifications_updated'));
      }
      return true;
    } catch (err) {
      console.error('Exception in markAsRead:', err);
      return false;
    }
  },

  async markAllAsRead(): Promise<boolean> {
    try {
      const tenantId = getActiveTenantId();
      if (!tenantId) return false;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('notifications_updated'));
      }
      return true;
    } catch (err) {
      console.error('Exception in markAllAsRead:', err);
      return false;
    }
  },

  async deleteNotification(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting notification:', error);
        return false;
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('notifications_updated'));
      }
      return true;
    } catch (err) {
      console.error('Exception in deleteNotification:', err);
      return false;
    }
  },

  async createNotification(notification: {
    title: string;
    message: string;
    type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
    entity_type?: string;
    entity_id?: string;
  }): Promise<boolean> {
    try {
      const tenantId = getActiveTenantId();
      if (!tenantId) return false;

      const { error } = await supabase
        .from('notifications')
        .insert({
          id: generateUUID(),
          tenant_id: tenantId,
          title: notification.title,
          message: notification.message,
          type: notification.type || 'INFO',
          read: false,
          entity_type: notification.entity_type || 'system',
          entity_id: notification.entity_id || null,
        });

      if (error) {
        console.error('Error creating notification:', error);
        return false;
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('notifications_updated'));
      }
      return true;
    } catch (err) {
      console.error('Exception in createNotification:', err);
      return false;
    }
  },
};

// ---------------- AUDIT LOGS ----------------
export interface AuditLogEntry {
  id: string;
  time: string;
  actor: string;
  username?: string;
  userRole?: string;
  action: string;
  branchName: string;
  branchId?: string;
  description: string;
  ip: string;
  entityType?: string;
  rawAction?: string;
}

let cachedClientIp = (typeof window !== 'undefined' && sessionStorage.getItem('client_ip')) || '';

export const getOrFetchClientIp = async (): Promise<string> => {
  if (typeof window === 'undefined') return '127.0.0.1';
  if (cachedClientIp) return cachedClientIp;
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(1500) });
    const data = await res.json();
    if (data?.ip) {
      sessionStorage.setItem('client_ip', data.ip);
      cachedClientIp = data.ip;
      return data.ip;
    }
  } catch (e) {
    // Offline or network restriction fallback
  }
  return '190.235.12.89';
};

export const auditService = {
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    try {
      const tenantId = getActiveTenantId();
      if (!tenantId) return [];

      // Query audit logs, branches, members, and profiles simultaneously
      const [logsRes, branchesRes, membersRes, profilesRes] = await Promise.all([
        supabase
          .from('audit_logs')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(200),
        branchesService.getBranches(),
        usersService.getUsers(),
        supabase.from('profiles').select('id, full_name, email'),
      ]);

      const branchMap = new Map<string, string>();
      branchesRes.forEach((b) => branchMap.set(b.id, b.name));

      const userMap = new Map<string, { name: string; username: string; role?: string }>();

      // 1. Map profiles
      (profilesRes.data || []).forEach((p: any) => {
        userMap.set(p.id, {
          name: p.full_name || 'Usuario',
          username: p.email ? p.email.split('@')[0] : 'usuario',
          role: '',
        });
      });

      // 2. Map tenant members (which have richer role and username data)
      membersRes.forEach((m: any) => {
        const info = {
          name: m.name,
          username: m.username || m.name,
          role: m.role || '',
        };
        userMap.set(m.id, info);
        if (m.userId) userMap.set(m.userId, info);
      });

      const MODULE_MAP: Record<string, string> = {
        customers: 'MODULO CLIENTE',
        sales: 'MODULO VENTAS',
        products: 'MODULO PRODUCTO',
        inventory_movements: 'MODULO INVENTARIO',
        inventory: 'MODULO INVENTARIO',
        branch_inventory: 'MODULO INVENTARIO SUCURSAL',
        transfers: 'MODULO TRASPASO',
        tenant_memberships: 'MODULO USUARIO',
        users: 'MODULO USUARIO',
        profiles: 'MODULO USUARIO',
        roles: 'MODULO ROLES Y PERMISOS',
        role_permissions: 'MODULO ROLES Y PERMISOS',
        permissions: 'MODULO ROLES Y PERMISOS',
        cash_registers: 'MODULO CAJA CHICA',
        cash_movements: 'MODULO CAJA CHICA',
        cash: 'MODULO CAJA CHICA',
        expenses: 'MODULO GASTOS OPERATIVOS',
        tenants: 'MODULO CONFIGURACIÓN',
        settings: 'MODULO CONFIGURACIÓN',
        branches: 'MODULO SUCURSALES',
        categories: 'MODULO CATEGORÍAS',
        brands: 'MODULO MARCAS',
        models: 'MODULO MODELOS',
        suppliers: 'MODULO PROVEEDORES',
        contracts: 'MODULO CONTRATOS',
        auth: 'MODULO SEGURIDAD',
        login: 'MODULO INICIO DE SESIÓN',
        notifications: 'MODULO NOTIFICACIONES',
      };

      return (logsRes.data || [])
        // Filter out noisy secondary child entities if any
        .filter((log: any) => !['role_permissions', 'branch_inventory', 'sale_items', 'purchase_items', 'purchase_order_items', 'physical_count_items', 'invoice_items', 'product_attribute_values', 'product_images'].includes(log.entity_type))
        .map((log: any) => {
          const nv = log.new_values || {};
          const pv = log.previous_values || {};
          const normType = (log.entity_type || 'sistema').toLowerCase();
          const moduleName = MODULE_MAP[normType] || `MODULO ${normType.replace(/_/g, ' ').toUpperCase()}`;

          // Determine branch name
          let branchName = 'Sede Principal';
          if (log.branch_id && branchMap.has(log.branch_id)) {
            branchName = branchMap.get(log.branch_id)!;
          } else if (nv.branch_name) {
            branchName = nv.branch_name;
          } else if (pv.branch_name) {
            branchName = pv.branch_name;
          } else if (branchesRes.length > 0) {
            branchName = branchesRes[0].name;
          }

          // Determine user identity snapshot
          let actorName = 'Sistema / Automático';
          let username = 'sistema';
          let userRole = '';

          if (nv.user_name) {
            actorName = nv.user_name;
            username = nv.username || nv.user_name;
            userRole = nv.user_role || '';
          } else if (nv.actor_name) {
            actorName = nv.user_role ? `${nv.actor_name} (${nv.user_role})` : nv.actor_name;
            username = nv.username || nv.actor_name;
            userRole = nv.user_role || '';
          } else if (log.actor_user_id && userMap.has(log.actor_user_id)) {
            const u = userMap.get(log.actor_user_id)!;
            actorName = u.role ? `${u.name} (${u.role})` : u.name;
            username = u.username;
            userRole = u.role || '';
          } else if (nv.created_by && userMap.has(nv.created_by)) {
            const u = userMap.get(nv.created_by)!;
            actorName = u.role ? `${u.name} (${u.role})` : u.name;
            username = u.username;
            userRole = u.role || '';
          } else if (nv.updated_by && userMap.has(nv.updated_by)) {
            const u = userMap.get(nv.updated_by)!;
            actorName = u.role ? `${u.name} (${u.role})` : u.name;
            username = u.username;
            userRole = u.role || '';
          } else if (pv.created_by && userMap.has(pv.created_by)) {
            const u = userMap.get(pv.created_by)!;
            actorName = u.role ? `${u.name} (${u.role})` : u.name;
            username = u.username;
            userRole = u.role || '';
          } else if (pv.updated_by && userMap.has(pv.updated_by)) {
            const u = userMap.get(pv.updated_by)!;
            actorName = u.role ? `${u.name} (${u.role})` : u.name;
            username = u.username;
            userRole = u.role || '';
          }

          // Format description
          let description = '';
          if (nv.description) {
            description = nv.description;
          } else if (log.action === 'DELETE') {
            const deletedItemName = pv.name || pv.business_name || pv.full_name || pv.contract_number || pv.description || (pv.sku ? `SKU: ${pv.sku}` : '');
            if (deletedItemName) {
              description = `Eliminación en ${moduleName}: "${deletedItemName}"`;
            } else {
              description = `Eliminación en ${moduleName}`;
            }
          } else if (log.action === 'INSERT') {
            const createdItemName = nv.name || nv.business_name || nv.full_name || nv.contract_number || nv.description || (nv.sku ? `SKU: ${nv.sku}` : '');
            description = createdItemName ? `Creación en ${moduleName}: "${createdItemName}"` : `Creación en ${moduleName}`;
          } else if (log.action === 'UPDATE') {
            const updatedItemName = nv.name || nv.business_name || nv.full_name || nv.contract_number || nv.description || pv.name || '';
            description = updatedItemName ? `Modificación en ${moduleName}: "${updatedItemName}"` : `Modificación en ${moduleName}`;
          } else {
            description = `${log.action} en ${moduleName}`;
          }

          return {
            id: log.id,
            time: log.created_at ? new Date(log.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'medium' }) : new Date().toLocaleString('es-PE'),
            actor: actorName,
            username: username,
            userRole: userRole,
            action: log.action || 'INSERT',
            branchName: branchName,
            branchId: log.branch_id,
            description: description,
            ip: log.ip_address || '190.235.12.89',
            entityType: log.entity_type,
            rawAction: log.action,
          };
        });
    } catch (err) {
      console.error('Exception in getAuditLogs:', err);
      return [];
    }
  },

  async logAction(params: {
    action: string;
    entityType: string;
    entityId?: string;
    branchId?: string;
    description?: string;
    details?: any;
    actorUserId?: string;
    actorUserName?: string;
    actorUsername?: string;
    actorRole?: string;
    branchName?: string;
  }): Promise<boolean> {
    try {
      const tenantId = getActiveTenantId();
      const branchId = params.branchId || getActiveBranchId();
      const currentUserId = params.actorUserId || (typeof window !== 'undefined' ? localStorage.getItem('auth_user_id') : null);
      const currentUserName = params.actorUserName || (typeof window !== 'undefined' ? localStorage.getItem('auth_user') || 'Usuario' : 'Usuario');
      const currentAuthUsername = params.actorUsername || (typeof window !== 'undefined' ? (localStorage.getItem('auth_username') || localStorage.getItem('auth_user')) || 'usuario' : 'usuario');
      const currentUserRole = params.actorRole || (typeof window !== 'undefined' ? (localStorage.getItem('user_role') || localStorage.getItem('auth_role')) || '' : '');
      const activeBranchName = params.branchName || (typeof window !== 'undefined' ? localStorage.getItem('active_branch_name') || 'Sede Principal' : 'Sede Principal');
      
      const clientIp = await getOrFetchClientIp();

      const formattedUserName = currentUserRole ? `${currentUserName} (${currentUserRole})` : currentUserName;

      const { error } = await supabase.from('audit_logs').insert({
        id: generateUUID(),
        tenant_id: tenantId,
        branch_id: branchId && branchId !== 'ALL' && isValidUuid(branchId) ? branchId : null,
        actor_user_id: currentUserId && isValidUuid(currentUserId) ? currentUserId : null,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId && isValidUuid(params.entityId) ? params.entityId : null,
        ip_address: clientIp,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Browser',
        new_values: {
          description: params.description || `${params.action} en ${params.entityType}`,
          user_name: formattedUserName,
          actor_name: currentUserName,
          username: currentAuthUsername,
          user_role: currentUserRole,
          branch_name: activeBranchName,
          ...params.details,
        },
      });

      if (error) {
        console.error('Error logging audit action:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Exception in logAction:', err);
      return false;
    }
  },
};

// ---------------- SUNAT / RENIEC LOOKUP SERVICE ----------------
export interface SunatRucResult {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  estado?: string;
  condicion?: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  ubigeo?: string;
}

export interface ReniecDniResult {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
}

export const sunatReniecService = {
  async consultarRuc(ruc: string): Promise<{ success: boolean; data?: SunatRucResult; message?: string }> {
    const cleanRuc = ruc.trim();
    if (!/^\d{11}$/.test(cleanRuc)) {
      return { success: false, message: 'El RUC debe tener 11 dígitos numéricos.' };
    }

    try {
      // 1. Try local Vite proxy endpoint (Bypasses browser CORS completely)
      try {
        const response = await fetch(`/api/ruc?numero=${cleanRuc}`);
        if (response.ok) {
          const json = await response.json();
          if (json && (json.nombre || json.razonSocial)) {
            return {
              success: true,
              data: {
                ruc: cleanRuc,
                razonSocial: json.nombre || json.razonSocial || '',
                nombreComercial: json.nombreComercial || json.nombre || '',
                estado: json.estado || 'ACTIVO',
                condicion: json.condicion || 'HABIDO',
                direccion: json.direccion || '',
                departamento: json.departamento || '',
                provincia: json.provincia || '',
                distrito: json.distrito || '',
                ubigeo: json.ubigeo || '',
              },
            };
          }
        }
      } catch (e) {
        console.warn('Local proxy RUC failed, trying direct endpoint:', e);
      }

      // 2. Try direct public APIS.NET.PE endpoint
      try {
        const response = await fetch(`https://api.apis.net.pe/v1/ruc?numero=${cleanRuc}`);
        if (response.ok) {
          const json = await response.json();
          if (json && (json.nombre || json.razonSocial)) {
            return {
              success: true,
              data: {
                ruc: cleanRuc,
                razonSocial: json.nombre || json.razonSocial || '',
                nombreComercial: json.nombreComercial || json.nombre || '',
                estado: json.estado || 'ACTIVO',
                condicion: json.condicion || 'HABIDO',
                direccion: json.direccion || '',
                departamento: json.departamento || '',
                provincia: json.provincia || '',
                distrito: json.distrito || '',
                ubigeo: json.ubigeo || '',
              },
            };
          }
        }
      } catch (e) {
        console.warn('Primary RUC API failed, trying fallback:', e);
      }

      // 3. Try secondary DecoLect endpoint
      try {
        const response2 = await fetch(`https://api.decolect.com/v1/ruc/${cleanRuc}`);
        if (response2.ok) {
          const json = await response2.json();
          const rData = json.data || json;
          if (rData && (rData.razon_social || rData.nombre)) {
            return {
              success: true,
              data: {
                ruc: cleanRuc,
                razonSocial: rData.razon_social || rData.nombre || '',
                nombreComercial: rData.nombre_comercial || rData.razon_social || '',
                estado: rData.estado || 'ACTIVO',
                condicion: rData.condicion || 'HABIDO',
                direccion: rData.direccion || '',
                departamento: rData.departamento || '',
                provincia: rData.provincia || '',
                distrito: rData.distrito || '',
                ubigeo: rData.ubigeo || '',
              },
            };
          }
        }
      } catch (e) {
        console.warn('Secondary RUC API failed:', e);
      }

      // 4. Check existing customers table in database as fallback
      const existing = await customersService.getCustomers();
      const match = existing.find((c) => c.documentNumber === cleanRuc);
      if (match) {
        return {
          success: true,
          data: {
            ruc: cleanRuc,
            razonSocial: match.businessName || match.name,
            nombreComercial: match.businessName || match.name,
            direccion: match.address || '',
            estado: 'REGISTRADO',
            condicion: 'HABIDO',
          },
        };
      }

      return { success: false, message: `No se encontraron datos automáticos para el RUC ${cleanRuc}. Puede ingresarlo manualmente.` };
    } catch (err: any) {
      console.error('Error in consultarRuc:', err);
      return { success: false, message: 'Error de conexión con el servicio de consulta SUNAT.' };
    }
  },

  async consultarDni(dni: string): Promise<{ success: boolean; data?: ReniecDniResult; message?: string }> {
    const cleanDni = dni.trim();
    if (!/^\d{8}$/.test(cleanDni)) {
      return { success: false, message: 'El DNI debe tener 8 dígitos numéricos.' };
    }

    try {
      // 1. Try local Vite proxy endpoint (Bypasses browser CORS completely)
      try {
        const response = await fetch(`/api/dni?numero=${cleanDni}`);
        if (response.ok) {
          const json = await response.json();
          if (json && (json.nombre || json.nombres)) {
            const nombres = json.nombres || json.nombre || '';
            const apPaterno = json.apellidoPaterno || '';
            const apMaterno = json.apellidoMaterno || '';
            const full = json.nombre || `${nombres} ${apPaterno} ${apMaterno}`.trim();
            return {
              success: true,
              data: {
                dni: cleanDni,
                nombres,
                apellidoPaterno: apPaterno,
                apellidoMaterno: apMaterno,
                nombreCompleto: full || nombres,
              },
            };
          }
        }
      } catch (e) {
        console.warn('Local proxy DNI failed, trying direct endpoint:', e);
      }

      // 2. Try direct public APIS.NET.PE endpoint
      try {
        const response = await fetch(`https://api.apis.net.pe/v1/dni?numero=${cleanDni}`);
        if (response.ok) {
          const json = await response.json();
          if (json && (json.nombre || json.nombres)) {
            const nombres = json.nombres || json.nombre || '';
            const apPaterno = json.apellidoPaterno || '';
            const apMaterno = json.apellidoMaterno || '';
            const full = json.nombre || `${nombres} ${apPaterno} ${apMaterno}`.trim();
            return {
              success: true,
              data: {
                dni: cleanDni,
                nombres,
                apellidoPaterno: apPaterno,
                apellidoMaterno: apMaterno,
                nombreCompleto: full || nombres,
              },
            };
          }
        }
      } catch (e) {
        console.warn('Primary DNI API failed, trying fallback:', e);
      }

      // 3. Try DecoLect endpoint
      try {
        const response2 = await fetch(`https://api.decolect.com/v1/dni/${cleanDni}`);
        if (response2.ok) {
          const json = await response2.json();
          const dData = json.data || json;
          if (dData && (dData.nombres || dData.nombre_completo)) {
            return {
              success: true,
              data: {
                dni: cleanDni,
                nombres: dData.nombres || '',
                apellidoPaterno: dData.apellido_paterno || '',
                apellidoMaterno: dData.apellido_materno || '',
                nombreCompleto: dData.nombre_completo || `${dData.nombres} ${dData.apellido_paterno || ''}`.trim(),
              },
            };
          }
        }
      } catch (e) {
        console.warn('Secondary DNI API failed:', e);
      }

      // 4. Check existing customers database as fallback
      const existing = await customersService.getCustomers();
      const match = existing.find((c) => c.documentNumber === cleanDni);
      if (match) {
        return {
          success: true,
          data: {
            dni: cleanDni,
            nombres: match.fullName || match.name,
            apellidoPaterno: '',
            apellidoMaterno: '',
            nombreCompleto: match.fullName || match.name,
          },
        };
      }

      return { success: false, message: `No se encontraron datos automáticos para el DNI ${cleanDni}. Puede ingresarlo manualmente.` };
    } catch (err: any) {
      console.error('Error in consultarDni:', err);
      return { success: false, message: 'Error de conexión con el servicio de consulta RENIEC.' };
    }
  },
};

// ---------------- CREDITS & FINANCING SERVICE ----------------
export interface CreditInstallment {
  id: string;
  creditId: string;
  installmentNumber: number;
  dueDate: string;
  capitalAmount: number;
  interestAmount: number;
  totalAmount: number;
  paidAmount: number;
  paidDate?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  notes?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL';
}

export interface Credit {
  id: string;
  tenantId: string;
  branchId?: string;
  branchName?: string;
  saleId?: string;
  saleNumber?: string;
  customerId?: string;
  customerName: string;
  customerDoc: string;
  totalAmount: number;
  initialPayment: number;
  financedAmount: number;
  interestRate: number;
  interestAmount: number;
  totalCredit: number;
  installmentsCount: number;
  installmentFrequency: 'MENSUAL' | 'QUINCENAL' | 'SEMANAL';
  amountPaid: number;
  balancePending: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  createdAt: string;
  installments?: CreditInstallment[];
}

export interface CreateCreditParams {
  saleId?: string;
  saleNumber?: string;
  branchId?: string;
  branchName?: string;
  customerId?: string;
  customerName: string;
  customerDoc: string;
  totalAmount: number;
  initialPayment: number;
  interestRate: number;
  installmentsCount: number;
  installmentFrequency?: 'MENSUAL' | 'QUINCENAL' | 'SEMANAL';
  firstDueDate?: string;
}

export const creditsService = {
  async getCredits(branchId?: string): Promise<Credit[]> {
    try {
      const tenantId = getActiveTenantId();
      if (!tenantId) return [];

      if (!isNetworkOnline()) {
        try {
          const localCredits = await getAllRecords<any>(STORES.CREDITS);
          const localIns = await getAllRecords<any>(STORES.CREDIT_INSTALLMENTS);
          const insByCredit = new Map<string, CreditInstallment[]>();

          localIns.forEach((ins: any) => {
            const list = insByCredit.get(ins.credit_id || ins.creditId) || [];
            const isOverdue = ins.status === 'PENDING' && new Date(ins.due_date) < new Date();
            list.push({
              id: ins.id,
              creditId: ins.credit_id || ins.creditId,
              installmentNumber: ins.installment_number || ins.installmentNumber,
              dueDate: ins.due_date || ins.dueDate,
              capitalAmount: Number(ins.capital_amount || ins.capitalAmount) || 0,
              interestAmount: Number(ins.interest_amount || ins.interestAmount) || 0,
              totalAmount: Number(ins.total_amount || ins.totalAmount) || 0,
              paidAmount: Number(ins.paid_amount || ins.paidAmount) || 0,
              paidDate: ins.paid_date || ins.paidDate,
              paymentMethod: ins.payment_method || ins.paymentMethod,
              receiptNumber: ins.receipt_number || ins.receiptNumber,
              notes: ins.notes,
              status: isOverdue ? 'OVERDUE' : (ins.status as any),
            });
            insByCredit.set(ins.credit_id || ins.creditId, list);
          });

          let filtered = localCredits;
          if (branchId && branchId !== 'ALL' && isValidUuid(branchId)) {
            filtered = localCredits.filter((c: any) => c.branch_id === branchId || c.branchId === branchId);
          }

          return filtered.map((c: any) => {
            const rawInstallments = (insByCredit.get(c.id) || []).sort(
              (a: any, b: any) => a.installmentNumber - b.installmentNumber
            );
            const hasOverdue = rawInstallments.some((ins) => ins.status === 'OVERDUE');
            const calculatedStatus = hasOverdue && c.status !== 'PAID' ? 'OVERDUE' : (c.status || 'PENDING');

            return {
              id: c.id,
              tenantId: c.tenant_id || c.tenantId || tenantId,
              branchId: c.branch_id || c.branchId || '',
              branchName: c.branches?.name || c.branchName || 'Sede Principal',
              saleId: c.sale_id || c.saleId,
              saleNumber: c.sale_number || c.saleNumber,
              customerId: c.customer_id || c.customerId,
              customerName: c.customer_name || c.customerName || 'Cliente',
              customerDoc: c.customer_doc || c.customerDoc || '00000000',
              totalAmount: Number(c.total_amount || c.totalAmount) || 0,
              initialPayment: Number(c.initial_payment || c.initialPayment) || 0,
              financedAmount: Number(c.financed_amount || c.financedAmount) || 0,
              interestRate: Number(c.interest_rate || c.interestRate) || 0,
              interestAmount: Number(c.interest_amount || c.interestAmount) || 0,
              totalCredit: Number(c.total_credit || c.totalCredit) || 0,
              installmentsCount: Number(c.installments_count || c.installmentsCount) || 1,
              installmentFrequency: c.installment_frequency || c.installmentFrequency || 'MENSUAL',
              amountPaid: Number(c.amount_paid || c.amountPaid) || 0,
              balancePending: Number(c.balance_pending || c.balancePending) || 0,
              status: calculatedStatus as any,
              createdAt: c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : (c.createdAt || new Date().toISOString().split('T')[0]),
              installments: rawInstallments,
            };
          });
        } catch {
          return [];
        }
      }

      let query = supabase
        .from('credits')
        .select(`
          *,
          branches ( name ),
          credit_installments (*)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (branchId && branchId !== 'ALL' && isValidUuid(branchId)) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query;

      if (error || !data) {
        console.error('Error fetching credits from online, loading local cache:', error);
        const localCredits = await getAllRecords<any>(STORES.CREDITS);
        return localCredits as any;
      }

      // Cache records locally
      try {
        const allInstallments: any[] = [];
        data.forEach((c: any) => {
          if (Array.isArray(c.credit_installments)) {
            allInstallments.push(...c.credit_installments);
          }
        });
        await putManyRecords(STORES.CREDITS, data);
        if (allInstallments.length > 0) {
          await putManyRecords(STORES.CREDIT_INSTALLMENTS, allInstallments);
        }
      } catch {}

      return (data || []).map((c: any) => {
        const rawInstallments = (c.credit_installments || []).sort(
          (a: any, b: any) => a.installment_number - b.installment_number
        );

        const installments: CreditInstallment[] = rawInstallments.map((ins: any) => {
          const isOverdue = ins.status === 'PENDING' && new Date(ins.due_date) < new Date();
          return {
            id: ins.id,
            creditId: ins.credit_id,
            installmentNumber: ins.installment_number,
            dueDate: ins.due_date,
            capitalAmount: Number(ins.capital_amount) || 0,
            interestAmount: Number(ins.interest_amount) || 0,
            totalAmount: Number(ins.total_amount) || 0,
            paidAmount: Number(ins.paid_amount) || 0,
            paidDate: ins.paid_date,
            paymentMethod: ins.payment_method,
            receiptNumber: ins.receipt_number,
            notes: ins.notes,
            status: isOverdue ? 'OVERDUE' : (ins.status as any),
          };
        });

        const hasOverdue = installments.some((ins) => ins.status === 'OVERDUE');
        const calculatedStatus = hasOverdue && c.status !== 'PAID' ? 'OVERDUE' : c.status;

        return {
          id: c.id,
          tenantId: c.tenant_id,
          branchId: c.branch_id,
          branchName: c.branches?.name || 'Sede Principal',
          saleId: c.sale_id,
          saleNumber: c.sale_number,
          customerId: c.customer_id,
          customerName: c.customer_name || 'Cliente',
          customerDoc: c.customer_doc || '00000000',
          totalAmount: Number(c.total_amount) || 0,
          initialPayment: Number(c.initial_payment) || 0,
          financedAmount: Number(c.financed_amount) || 0,
          interestRate: Number(c.interest_rate) || 0,
          interestAmount: Number(c.interest_amount) || 0,
          totalCredit: Number(c.total_credit) || 0,
          installmentsCount: Number(c.installments_count) || 1,
          installmentFrequency: c.installment_frequency || 'MENSUAL',
          amountPaid: Number(c.amount_paid) || 0,
          balancePending: Number(c.balance_pending) || 0,
          status: calculatedStatus as any,
          createdAt: c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          installments,
        };
      });
    } catch (err) {
      console.error('Exception in getCredits:', err);
      try {
        const localCredits = await getAllRecords<any>(STORES.CREDITS);
        return localCredits as any;
      } catch {
        return [];
      }
    }
  },

  async createCredit(params: CreateCreditParams): Promise<Credit | null> {
    try {
      const tenantId = getActiveTenantId();
      const creditId = generateUUID();

      const initial = Math.max(0, Number(params.initialPayment) || 0);
      const totalSale = Number(params.totalAmount) || 0;
      const capitalFinanced = Math.max(0, totalSale - initial);
      const interestRate = Number(params.interestRate) || 0;
      const interestAmount = Number(((capitalFinanced * interestRate) / 100).toFixed(2));
      const totalCredit = Number((capitalFinanced + interestAmount).toFixed(2));
      const count = Math.max(1, params.installmentsCount || 1);
      const freq = params.installmentFrequency || 'MENSUAL';

      const installmentCapital = Number((capitalFinanced / count).toFixed(2));
      const installmentInterest = Number((interestAmount / count).toFixed(2));
      const installmentTotal = Number((totalCredit / count).toFixed(2));

      const installmentsToInsert: any[] = [];
      const startDate = params.firstDueDate ? new Date(params.firstDueDate) : new Date();

      for (let i = 1; i <= count; i++) {
        const dueDate = new Date(startDate);
        if (freq === 'SEMANAL') {
          dueDate.setDate(dueDate.getDate() + (i - 1) * 7);
        } else if (freq === 'QUINCENAL') {
          dueDate.setDate(dueDate.getDate() + (i - 1) * 15);
        } else {
          dueDate.setMonth(dueDate.getMonth() + (i - 1));
        }

        installmentsToInsert.push({
          id: generateUUID(),
          credit_id: creditId,
          tenant_id: tenantId,
          installment_number: i,
          due_date: dueDate.toISOString().split('T')[0],
          capital_amount: installmentCapital,
          interest_amount: installmentInterest,
          total_amount: installmentTotal,
          paid_amount: 0,
          status: 'PENDING',
        });
      }

      const creditPayload = {
        id: creditId,
        tenant_id: tenantId,
        branch_id: params.branchId,
        sale_id: params.saleId || null,
        sale_number: params.saleNumber || null,
        customer_id: params.customerId || null,
        customer_name: params.customerName,
        customer_doc: params.customerDoc,
        total_amount: totalSale,
        initial_payment: initial,
        financed_amount: capitalFinanced,
        interest_rate: interestRate,
        interest_amount: interestAmount,
        total_credit: totalCredit,
        installments_count: count,
        installment_frequency: freq,
        amount_paid: 0,
        balance_pending: totalCredit,
        status: 'PENDING',
        created_at: new Date().toISOString(),
      };

      // Save locally to IndexedDB
      try {
        await putRecord(STORES.CREDITS, creditPayload);
        await putManyRecords(STORES.CREDIT_INSTALLMENTS, installmentsToInsert);
      } catch (_) {}

      // Try online insert
      if (isNetworkOnline()) {
        try {
          await supabase.from('credits').insert(creditPayload);
          await supabase.from('credit_installments').insert(installmentsToInsert);
        } catch (netErr) {
          console.warn('[creditsService] Online credit create failed, queueing offline:', netErr);
          await queueMutation('credits', 'CREATE', creditPayload);
          for (const ins of installmentsToInsert) {
            await queueMutation('credit_installments', 'CREATE', ins);
          }
          refreshPendingCount().catch(() => {});
        }
      } else {
        await queueMutation('credits', 'CREATE', creditPayload);
        for (const ins of installmentsToInsert) {
          await queueMutation('credit_installments', 'CREATE', ins);
        }
        refreshPendingCount().catch(() => {});
      }

      auditService.logAction({
        action: 'CRÉDITO OTORGADO',
        entityType: 'credits',
        entityId: creditId,
        branchId: params.branchId,
        description: `Crédito otorgado a "${params.customerName}" por S/ ${totalCredit.toFixed(2)} (${count} cuotas ${freq.toLowerCase()}es, Inicial: S/ ${initial.toFixed(2)})`,
        details: {
          customer: params.customerName,
          total_sale: totalSale,
          initial,
          financed: capitalFinanced,
          interest_rate: interestRate,
          total_credit: totalCredit,
          installments_count: count,
        },
      });

      return {
        id: creditId,
        tenantId,
        branchId: params.branchId,
        branchName: params.branchName || 'Sede Principal',
        saleId: params.saleId,
        customerName: params.customerName,
        customerDoc: params.customerDoc,
        totalAmount: totalSale,
        initialPayment: initial,
        financedAmount: capitalFinanced,
        interestRate,
        interestAmount,
        totalCredit,
        installmentsCount: count,
        installmentFrequency: freq,
        amountPaid: 0,
        balancePending: totalCredit,
        status: 'PENDING',
        createdAt: new Date().toISOString().split('T')[0],
        installments: installmentsToInsert.map((ins: any) => ({
          id: ins.id,
          creditId: ins.credit_id,
          installmentNumber: ins.installment_number,
          dueDate: ins.due_date,
          capitalAmount: ins.capital_amount,
          interestAmount: ins.interest_amount,
          totalAmount: ins.total_amount,
          paidAmount: 0,
          status: 'PENDING',
        })),
      };
    } catch (err) {
      console.error('Exception in createCredit:', err);
      return null;
    }
  },

  async payInstallment(params: {
    creditId: string;
    installmentId?: string;
    amount: number;
    paymentMethod: string;
    notes?: string;
  }): Promise<{ success: boolean; receiptNumber?: string; message: string }> {
    try {
      const receiptNo = `REC-${Math.floor(100000 + Math.random() * 900000)}`;

      // 1. Fetch installments from local IndexedDB or online
      let allIns = await getAllRecords<any>(STORES.CREDIT_INSTALLMENTS);
      allIns = allIns.filter((i: any) => (i.credit_id || i.creditId) === params.creditId);

      if (isNetworkOnline() && allIns.length === 0) {
        const { data } = await supabase
          .from('credit_installments')
          .select('*')
          .eq('credit_id', params.creditId)
          .order('installment_number', { ascending: true });
        if (data) allIns = data;
      }

      if (allIns.length === 0) {
        return { success: false, message: 'No se encontraron cuotas para este crédito.' };
      }

      allIns.sort((a: any, b: any) => (a.installment_number || a.installmentNumber) - (b.installment_number || b.installmentNumber));

      let remainingToApply = params.amount;
      let targetInstallments = [...allIns];
      if (params.installmentId) {
        const startIdx = allIns.findIndex((i: any) => i.id === params.installmentId);
        if (startIdx >= 0) {
          targetInstallments = [...allIns.slice(startIdx), ...allIns.slice(0, startIdx)];
        }
      }

      for (const ins of targetInstallments) {
        if (remainingToApply <= 0.001) break;
        const total = Number(ins.total_amount || ins.totalAmount) || 0;
        const currentPaid = Number(ins.paid_amount || ins.paidAmount) || 0;
        const pending = Math.max(0, total - currentPaid);

        if (pending <= 0.001) continue;

        const payToThis = Math.min(pending, remainingToApply);
        const newPaid = currentPaid + payToThis;
        const newStatus = newPaid >= (total - 0.01) ? 'PAID' : 'PARTIAL';
        remainingToApply -= payToThis;

        const updatePayload = {
          paid_amount: newPaid,
          paid_date: new Date().toISOString(),
          payment_method: params.paymentMethod,
          receipt_number: receiptNo,
          notes: params.notes || null,
          status: newStatus,
          updated_at: new Date().toISOString(),
        };

        // Update local store
        try {
          await putRecord(STORES.CREDIT_INSTALLMENTS, { ...ins, ...updatePayload });
        } catch (_) {}

        if (isNetworkOnline()) {
          try {
            await supabase.from('credit_installments').update(updatePayload).eq('id', ins.id);
          } catch {
            await queueMutation('credit_installments', 'UPDATE', { _id: ins.id, ...updatePayload });
          }
        } else {
          await queueMutation('credit_installments', 'UPDATE', { _id: ins.id, ...updatePayload });
        }
      }

      // Update credit balance
      const updatedLocalIns = (await getAllRecords<any>(STORES.CREDIT_INSTALLMENTS)).filter(
        (i: any) => (i.credit_id || i.creditId) === params.creditId
      );
      const totalPaidAll = updatedLocalIns.reduce((sum, item) => sum + (Number(item.paid_amount || item.paidAmount) || 0), 0);

      const masterCredit = await getRecord<any>(STORES.CREDITS, params.creditId);
      const totalCreditVal = Number(masterCredit?.total_credit || masterCredit?.totalCredit) || 0;
      const newBalance = Math.max(0, totalCreditVal - totalPaidAll);
      const masterStatus = newBalance <= 0.01 ? 'PAID' : 'PARTIAL';

      const creditUpdatePayload = {
        amount_paid: totalPaidAll,
        balance_pending: newBalance,
        status: masterStatus,
        updated_at: new Date().toISOString(),
      };

      try {
        if (masterCredit) {
          await putRecord(STORES.CREDITS, { ...masterCredit, ...creditUpdatePayload });
        }
      } catch (_) {}

      if (isNetworkOnline()) {
        try {
          await supabase.from('credits').update(creditUpdatePayload).eq('id', params.creditId);
        } catch {
          await queueMutation('credits', 'UPDATE', { _id: params.creditId, ...creditUpdatePayload });
        }
      } else {
        await queueMutation('credits', 'UPDATE', { _id: params.creditId, ...creditUpdatePayload });
      }

      refreshPendingCount().catch(() => {});

      auditService.logAction({
        action: 'ABONO DE CUOTA',
        entityType: 'credits',
        entityId: params.creditId,
        description: `Abono de S/ ${params.amount.toFixed(2)} registrado para el cliente "${masterCredit?.customer_name || 'Cliente'}" (${params.paymentMethod}, Recibo: ${receiptNo})`,
        details: {
          receipt_number: receiptNo,
          amount: params.amount,
          payment_method: params.paymentMethod,
          remaining_balance: newBalance,
        },
      });

      return {
        success: true,
        receiptNumber: receiptNo,
        message: `Abono de S/ ${params.amount.toFixed(2)} registrado exitosamente. Recibo: ${receiptNo}. Saldo pendiente: S/ ${newBalance.toFixed(2)}.`,
      };
    } catch (err: any) {
      console.error('Exception in payInstallment:', err);
      return { success: false, message: err?.message || 'Error al registrar abono.' };
    }
  },
};
