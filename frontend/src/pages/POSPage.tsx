import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Printer,
  Receipt,
  FileText,
  X,
  Loader2,
  ArrowRightLeft,
  Store,
  Package,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button, Modal, Badge } from '../components/ui';
import { productsService, customersService, catalogService, salesService, settingsService, Product as DBProduct } from '../lib/db-services';
import { useBranch } from '../context/BranchContext';
import { TransferModal } from '../components/inventory/TransferModal';
import { DEFAULT_BRANCH_ID } from '../lib/supabase';
import { numberToSpanishWords } from '../lib/numberToWords';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  price: number;
  stock: number;
  icon: string;
  imagePath?: string;
  dbProduct?: DBProduct;
}

interface CartItem extends Product {
  qty: number;
}

export default function POSPage() {
  const { activeBranchId, activeBranch, branches: contextBranches } = useBranch();
  const [products, setProducts] = useState<Product[]>([]);
  const [dbProductList, setDbProductList] = useState<DBProduct[]>([]);
  const [categories, setCategories] = useState<string[]>(['Todas']);
  const [customers, setCustomers] = useState<{ id: string; name: string; doc: string }[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; doc: string } | null>(null);
  const [isManualCustomer, setIsManualCustomer] = useState(false);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualCustomerDocType, setManualCustomerDocType] = useState<'DNI' | 'RUC' | 'CE' | 'SIN_DOC'>('DNI');
  const [manualCustomerDoc, setManualCustomerDoc] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TARJETA' | 'YAPE'>('EFECTIVO');
  const [docType, setDocType] = useState<'BOLETA' | 'FACTURA'>('BOLETA');
  const [isLoading, setIsLoading] = useState(true);

  // Transfer Modal State in POS
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetProduct, setTransferTargetProduct] = useState<DBProduct | null>(null);

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [saleCompleted, setSaleCompleted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Boleta Preview State
  const [showBoletaPreview, setShowBoletaPreview] = useState(false);
  const [boletaData, setBoletaData] = useState<{
    companyName: string;
    companyTradeName?: string;
    companyRuc: string;
    companyAddress: string;
    companyPhone: string;
    logoPath?: string;
    docTitle: string;
    series: string;
    number: string;
    date: string;
    time: string;
    emitterName: string;
    branchName: string;
    customerName: string;
    customerDoc: string;
    items: { name: string; qty: number; unitPrice: number; total: number }[];
    opGravada: number;
    igv: number;
    total: number;
    paymentMethodLabel: string;
  } | null>(null);

  const loadPOSData = async () => {
    setIsLoading(true);
    try {
      const [dbProds, dbCats, dbCusts] = await Promise.all([
        productsService.getProducts(activeBranchId),
        catalogService.getCategories(),
        customersService.getCustomers(),
      ]);

      setDbProductList(dbProds);

      setProducts(
        dbProds
          .filter((p) => p.status === 'ACTIVE')
          .map((p) => ({
            id: p.id,
            sku: p.code || p.sku,
            name: p.name,
            category: p.category || 'Sin categoría',
            brand: p.brand || '',
            model: p.model || '',
            price: p.price,
            stock: p.stock,
            icon: '',
            imagePath: p.imagePath,
            dbProduct: p,
          }))
      );

      const catList = ['Todas', ...dbCats.map((c) => c.name)];
      setCategories(Array.from(new Set(catList)));

      const defaultCust = { id: 'default', name: 'Público General', doc: '00000000' };
      const mappedCusts = (dbCusts || []).map((c) => ({
        id: c.id,
        name: c.name,
        doc: c.documentNumber || '00000000',
      }));
      const allCusts = [defaultCust, ...mappedCusts.filter((c) => c.id !== 'default')];
      setCustomers(allCusts);
      setSelectedCustomer(defaultCust);
    } catch (err) {
      console.error('Error loading POS data from Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPOSData();
  }, [activeBranchId]);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.model && p.model.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Color Selection Modal State
  const [colorModalProduct, setColorModalProduct] = useState<Product | null>(null);

  // Cart operations
  const handleProductClick = (product: Product) => {
    if (product.stock <= 0) {
      alert('Producto sin stock disponible.');
      return;
    }

    if (product.dbProduct?.colors && product.dbProduct.colors.length > 0) {
      setColorModalProduct(product);
    } else {
      addToCartWithColor(product);
    }
  };

  const addToCartWithColor = (product: Product, selectedColor?: { color: string; hex?: string; stock: number }) => {
    const itemId = selectedColor ? `${product.id}-${selectedColor.color}` : product.id;
    const itemName = selectedColor ? `${product.name} (${selectedColor.color})` : product.name;
    const maxStock = selectedColor ? selectedColor.stock : product.stock;

    if (maxStock <= 0) {
      alert(`El color "${selectedColor?.color}" no tiene stock disponible.`);
      return;
    }

    const existing = cart.find((item) => item.id === itemId);
    if (existing) {
      if (existing.qty < maxStock) {
        setCart(cart.map((item) => (item.id === itemId ? { ...item, qty: item.qty + 1 } : item)));
      } else {
        alert(`Stock máximo alcanzado para este producto/color (${maxStock} unidades).`);
      }
    } else {
      setCart([
        ...cart,
        {
          ...product,
          id: itemId,
          name: itemName,
          stock: maxStock,
          qty: 1,
        },
      ]);
    }
    setColorModalProduct(null);
  };

  const updateQty = (id: string, delta: number) => {
    setCart(
      cart.map((item) => {
        if (item.id === id) {
          const newQty = item.qty + delta;
          return newQty > 0 && newQty <= item.stock ? { ...item, qty: newQty } : item;
        }
        return item;
      })
    );
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const clearCart = () => setCart([]);

  // Totals calculation
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0) / 1.18;
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const igv = total - subtotal;

  const cashNum = parseFloat(cashAmount) || 0;
  const change = Math.max(0, cashNum - total);

  const handleProcessSale = async () => {
    setIsProcessing(true);
    try {
      // Map payment method to DB payment method
      let dbPaymentMethod: 'CASH' | 'CARD' | 'YAPE' | 'TRANSFER' = 'CASH';
      if (paymentMethod === 'TARJETA') dbPaymentMethod = 'CARD';
      if (paymentMethod === 'YAPE') dbPaymentMethod = 'YAPE';

      const paymentLabels: Record<string, string> = {
        EFECTIVO: 'Efectivo',
        TARJETA: 'Tarjeta de Crédito/Débito',
        YAPE: 'Yape / Plin',
      };

      // 1. Fetch tenant info for boleta header
      const tenant = await settingsService.getTenantInfo();

      // 2. Get next series number
      const seriesInfo = await settingsService.getNextSeriesNumber(docType);
      const seriesStr = seriesInfo?.series || (docType === 'BOLETA' ? 'B001' : 'F001');
      const nextNum = seriesInfo?.number || 1;
      const numStr = String(nextNum).padStart(5, '0');

      // 3. Create sale in DB
      const saleItems = cart.map((item) => ({
        productId: item.id,
        productName: item.name,
        quantity: item.qty,
        unitPrice: item.price,
        subtotal: item.price * item.qty,
      }));

      const saleBranchId = activeBranchId !== 'ALL' ? activeBranchId : (activeBranch?.id || DEFAULT_BRANCH_ID);
      const saleBranchName = activeBranch?.name || 'Sede Principal';

      const currentEmitterName = typeof window !== 'undefined'
        ? (localStorage.getItem('auth_user') || localStorage.getItem('auth_username') || 'Niver Contreras')
        : 'Niver Contreras';

      const effectiveCustomerName = isManualCustomer
        ? (manualCustomerName.trim() || 'Público General')
        : (selectedCustomer?.name || 'Público General');

      const effectiveCustomerDoc = isManualCustomer
        ? (manualCustomerDocType === 'SIN_DOC' ? '00000000' : (manualCustomerDoc.trim() || '00000000'))
        : (selectedCustomer?.doc || '00000000');

      const effectiveCustomerId = isManualCustomer || selectedCustomer?.id === 'default' || selectedCustomer?.id === '__manual__'
        ? undefined
        : selectedCustomer?.id;

      const createdSaleId = await salesService.createSale({
        customerId: effectiveCustomerId,
        customerName: effectiveCustomerName,
        customerDoc: effectiveCustomerDoc,
        sellerName: currentEmitterName,
        branchId: saleBranchId,
        branchName: saleBranchName,
        total: total,
        subtotal: subtotal,
        tax: igv,
        paymentMethod: dbPaymentMethod,
        documentType: docType,
        items: saleItems,
      });

      if (!createdSaleId) {
        alert('Ocurrió un error al registrar la venta en la base de datos. Intente nuevamente.');
        return;
      }

      // 4. Increment series number
      await settingsService.incrementSeriesNumber(docType, seriesStr);

      // 5. Build boleta preview data
      const now = new Date();
      setBoletaData({
        companyName: tenant.name || 'Grupo K contreras S.A.C',
        companyTradeName: tenant.trade_name || '',
        companyRuc: tenant.ruc || '20613639030',
        companyAddress: saleBranchName ? `${saleBranchName} - Retamas` : (tenant.address || 'Retamas'),
        companyPhone: tenant.phone || '+51 993 275 893',
        logoPath: tenant.logo_path || '',
        docTitle: docType === 'BOLETA' ? 'BOLETA DE VENTA ELECTRÓNICA' : 'FACTURA ELECTRÓNICA',
        series: seriesStr,
        number: `${seriesStr}-${numStr}`,
        date: now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        emitterName: currentEmitterName,
        branchName: saleBranchName,
        customerName: effectiveCustomerName,
        customerDoc: effectiveCustomerDoc,
        items: cart.map((item) => ({
          name: item.name,
          qty: item.qty,
          unitPrice: item.price,
          total: item.price * item.qty,
        })),
        opGravada: subtotal,
        igv: igv,
        total: total,
        paymentMethodLabel: paymentLabels[paymentMethod] || paymentMethod,
      });

      // 6. Show boleta preview & close checkout dialog
      setIsCheckoutOpen(false);
      setShowBoletaPreview(true);
    } catch (err) {
      console.error('Error processing sale:', err);
      alert('Error inesperado al procesar la venta.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintBoleta = () => {
    const printContent = document.getElementById('boleta-preview-content');
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'width=450,height=750');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comprobante ${boletaData?.number || ''}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.4;
              color: #000;
              margin: 0;
              padding: 10px;
              background: #fff;
            }
            * { box-sizing: border-box; }
            .ticket-container {
              width: 100%;
              max-width: 320px;
              margin: 0 auto;
            }
            @media print {
              body { padding: 4px; }
            }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCloseBoletaPreview = () => {
    setShowBoletaPreview(false);
    setBoletaData(null);
    setSaleCompleted(false);
    setCart([]);
    setCashAmount('');
    loadPOSData();
  };

  return (
    <div className="pos-container">
      {/* Left Panel: Catalog & Search */}
      <div className="pos-main-panel">
        <div className="pos-header-bar">
          <div className="header-search flex-1 min-w-[220px]">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar producto por código, SKU o nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="pos-categories overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`pos-category-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        {isLoading ? (
          <div className="p-12 text-center text-secondary">Cargando catálogo desde la base de datos...</div>
        ) : (
          <div className="pos-product-grid">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center p-12 card text-center">
                <AlertCircle size={36} className="text-secondary mb-2" />
                <div className="font-semibold text-primary">No se encontraron productos activos</div>
                <div className="text-xs text-secondary mt-1">
                  Agrega o activa productos en la sección "Productos" para verlos aquí.
                </div>
              </div>
            ) : (
              filteredProducts.map((prod) => (
                <div key={prod.id} className="pos-card flex flex-col justify-between cursor-pointer hover:shadow-md transition-all" onClick={() => handleProductClick(prod)}>
                  <div className="pos-card-img overflow-hidden w-full flex items-center justify-center border-b border-color mb-3 rounded-lg shrink-0" style={{ height: '115px', backgroundColor: 'var(--bg-app)' }}>
                    {prod.imagePath ? (
                      <img
                        src={prod.imagePath}
                        alt={prod.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
                      />
                    ) : (
                      <Package size={28} className="text-secondary opacity-60" />
                    )}
                  </div>
                  <div className="flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[10px] font-mono text-secondary tracking-wider font-semibold">{prod.sku}</span>
                        {(prod.brand || prod.model) && (
                          <span className="text-[10px] text-secondary font-medium truncate max-w-[120px]" title={`${prod.brand || ''} ${prod.model || ''}`}>
                            {prod.brand}{prod.model && ` • ${prod.model}`}
                          </span>
                        )}
                      </div>
                      <div className="pos-card-title text-sm font-bold text-primary line-clamp-2 leading-tight mb-1 h-9 overflow-hidden" title={prod.name}>
                        {prod.name}
                      </div>

                      {prod.dbProduct?.colors && prod.dbProduct.colors.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {prod.dbProduct.colors.map((c, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-app border border-color text-primary"
                              title={`${c.color} (${c.stock} dispon.)`}
                            >
                              <span
                                className="w-2 h-2 rounded-full border border-black/20 shrink-0"
                                style={{ backgroundColor: c.hex || '#94a3b8' }}
                              />
                              <span>{c.color}</span>
                              <span className="text-primary-600">({c.stock})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="pos-card-footer flex items-center justify-between border-t border-color pt-2 mt-1">
                      <div className="pos-card-price text-base font-extrabold text-primary-600">S/ {prod.price.toFixed(2)}</div>
                      <Badge variant={prod.stock > 5 ? 'success' : prod.stock > 0 ? 'warning' : 'danger'}>
                        Stock: {prod.stock}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right Panel: Cart & Checkout Summary */}
      <div className="pos-cart-panel">
        <div className="pos-cart-header">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary-600" />
            <span className="font-bold text-base text-primary">Orden de Venta</span>
          </div>
          {cart.length > 0 && (
            <button className="btn btn-ghost btn-sm text-danger-500 hover:bg-danger-50" onClick={clearCart}>
              Vaciar
            </button>
          )}
        </div>

        {/* Customer Selector */}
        <div className="px-4 py-3 border-b border-color bg-app">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-secondary uppercase flex items-center gap-1.5">
              <User size={13} className="text-primary-600" />
              Cliente Receptor
            </label>
            <button
              type="button"
              onClick={() => {
                const next = !isManualCustomer;
                setIsManualCustomer(next);
                if (next) {
                  setManualCustomerName(selectedCustomer?.name === 'Público General' ? '' : (selectedCustomer?.name || ''));
                  setManualCustomerDoc(selectedCustomer?.doc === '00000000' ? '' : (selectedCustomer?.doc || ''));
                }
              }}
              className="text-[11px] font-bold text-primary-600 hover:text-primary-700 bg-primary-50 dark:bg-primary-950/40 px-2 py-0.5 rounded-full border border-primary-200 dark:border-primary-800 transition-colors flex items-center gap-1"
            >
              {isManualCustomer ? (
                <>
                  <Users size={11} /> Seleccionar Registrado
                </>
              ) : (
                <>
                  <UserPlus size={11} /> + No Registrado / Manual
                </>
              )}
            </button>
          </div>

          {!isManualCustomer ? (
            <div>
              <select
                className="form-control text-xs font-semibold w-full"
                value={selectedCustomer?.id || 'default'}
                onChange={(e) => {
                  if (e.target.value === '__manual__') {
                    setIsManualCustomer(true);
                    setManualCustomerName('');
                    setManualCustomerDoc('');
                    return;
                  }
                  const found = customers.find((c) => c.id === e.target.value);
                  if (found) setSelectedCustomer(found);
                }}
              >
                <option value="default">Público General (Sin DNI / 00000000)</option>
                <option value="__manual__">➕ Escribir cliente manual (No registrado)...</option>
                <optgroup label="Clientes Registrados">
                  {customers
                    .filter((c) => c.id !== 'default')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.doc})
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          ) : (
            <div className="space-y-2 p-2.5 rounded-lg border border-primary-200 dark:border-primary-800/60 bg-surface">
              <div>
                <label className="text-[10.5px] font-semibold text-secondary block mb-1">
                  Nombre Completo / Razón Social:
                </label>
                <input
                  type="text"
                  className="form-control text-xs py-1 px-2 font-semibold"
                  placeholder="Ej. Carlos Mendoza o Público General"
                  value={manualCustomerName}
                  onChange={(e) => setManualCustomerName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-12 gap-1.5">
                <div className="col-span-5">
                  <label className="text-[10.5px] font-semibold text-secondary block mb-1">
                    Tipo Doc:
                  </label>
                  <select
                    className="form-control text-xs py-1 px-1 font-semibold"
                    value={manualCustomerDocType}
                    onChange={(e: any) => {
                      setManualCustomerDocType(e.target.value);
                      if (e.target.value === 'SIN_DOC') {
                        setManualCustomerDoc('');
                      }
                    }}
                  >
                    <option value="DNI">DNI</option>
                    <option value="RUC">RUC</option>
                    <option value="CE">C.E.</option>
                    <option value="SIN_DOC">Sin DNI</option>
                  </select>
                </div>

                <div className="col-span-7">
                  <label className="text-[10.5px] font-semibold text-secondary block mb-1">
                    N° Doc. (Opcional):
                  </label>
                  <input
                    type="text"
                    className="form-control text-xs py-1 px-2 font-mono"
                    placeholder={manualCustomerDocType === 'SIN_DOC' ? 'No requerido' : manualCustomerDocType === 'RUC' ? '11 dígitos' : '8 dígitos (opcional)'}
                    disabled={manualCustomerDocType === 'SIN_DOC'}
                    value={manualCustomerDoc}
                    onChange={(e) => setManualCustomerDoc(e.target.value.replace(/\D/g, ''))}
                    maxLength={manualCustomerDocType === 'RUC' ? 11 : 12}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-color text-[10.5px] text-muted">
                <span>{manualCustomerDocType === 'SIN_DOC' || !manualCustomerDoc ? 'Emitir sin documento' : `Doc: ${manualCustomerDoc}`}</span>
                <button
                  type="button"
                  className="text-primary-600 hover:underline font-bold"
                  onClick={() => setIsManualCustomer(false)}
                >
                  Volver a lista
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cart Item List */}
        <div className="pos-cart-list">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-12">
              <ShoppingCart size={40} className="text-muted mb-2 opacity-50" />
              <div className="text-sm font-semibold text-secondary">El carrito está vacío</div>
              <div className="text-xs text-muted mt-1">Haz clic en un producto para agregarlo</div>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="pos-cart-item">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-primary truncate">{item.name}</div>
                  <div className="text-xs text-secondary font-medium">S/ {item.price.toFixed(2)}</div>
                </div>

                <div className="pos-qty-control">
                  <button className="pos-qty-btn" onClick={() => updateQty(item.id, -1)}>
                    <Minus size={12} />
                  </button>
                  <span className="pos-qty-num">{item.qty}</span>
                  <button className="pos-qty-btn" onClick={() => updateQty(item.id, 1)}>
                    <Plus size={12} />
                  </button>
                </div>

                <button
                  className="icon-btn btn-ghost text-secondary hover:text-danger-500"
                  onClick={() => removeFromCart(item.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Checkout Footer */}
        <div className="pos-cart-footer">
          <div className="space-y-1.5 mb-3 text-xs">
            <div className="flex justify-between text-secondary">
              <span>Subtotal</span>
              <span>S/ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-secondary">
              <span>IGV (18%)</span>
              <span>S/ {igv.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-primary border-t border-color pt-2 mt-2">
              <span>TOTAL A PAGAR</span>
              <span className="text-primary-600">S/ {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="pos-pay-methods">
            <button
              className={`pos-pay-btn ${paymentMethod === 'EFECTIVO' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('EFECTIVO')}
            >
              <Banknote size={18} />
              <span>Efectivo</span>
            </button>
            <button
              className={`pos-pay-btn ${paymentMethod === 'TARJETA' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('TARJETA')}
            >
              <CreditCard size={18} />
              <span>Tarjeta</span>
            </button>
            <button
              className={`pos-pay-btn ${paymentMethod === 'YAPE' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('YAPE')}
            >
              <QrCode size={18} />
              <span>Yape / QR</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full font-bold text-base shadow-glow"
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
          >
            COBRAR S/ {total.toFixed(2)}
          </Button>
        </div>
      </div>

      {/* Checkout Modal — Redesigned */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Procesar Venta & Emisión de Comprobante"
        size="md"
      >
        <div className="space-y-4">
          {/* Document Type Toggle */}
          <div style={{
            display: 'flex',
            gap: '8px',
            padding: '4px',
            background: 'var(--bg-app)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}>
            <button
              onClick={() => setDocType('BOLETA')}
              className="border-none"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: docType === 'BOLETA' ? 'var(--primary-600)' : 'transparent',
                color: docType === 'BOLETA' ? '#fff' : 'var(--text-secondary)',
                boxShadow: docType === 'BOLETA' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              <Receipt size={16} />
              Boleta de Venta
            </button>
            <button
              onClick={() => setDocType('FACTURA')}
              className="border-none"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: docType === 'FACTURA' ? 'var(--primary-600)' : 'transparent',
                color: docType === 'FACTURA' ? '#fff' : 'var(--text-secondary)',
                boxShadow: docType === 'FACTURA' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              <FileText size={16} />
              Factura
            </button>
          </div>

          {/* Customer Info */}
          <div style={{
            padding: '12px 16px',
            background: 'var(--bg-app)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' as const, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={12} className="text-primary-600" />
                Datos del Receptor en Comprobante
              </div>
              <span style={{
                padding: '2px 8px',
                background: 'var(--primary-100, #dbeafe)',
                color: 'var(--primary-700)',
                borderRadius: '12px',
                fontSize: '10.5px',
                fontWeight: 700,
              }}>
                {isManualCustomer ? (manualCustomerDocType === 'SIN_DOC' || !manualCustomerDoc ? 'Sin DNI' : `Doc: ${manualCustomerDoc}`) : `Doc: ${selectedCustomer?.doc || '00000000'}`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-secondary block mb-0.5">Nombre / Razón Social:</label>
                <input
                  type="text"
                  className="form-control text-xs py-1 px-2 font-semibold"
                  placeholder="Público General"
                  value={isManualCustomer ? manualCustomerName : (selectedCustomer?.name || 'Público General')}
                  onChange={(e) => {
                    setIsManualCustomer(true);
                    setManualCustomerName(e.target.value);
                  }}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-secondary block mb-0.5">
                  N° Documento ({docType === 'FACTURA' ? 'RUC' : 'DNI / Opcional'}):
                </label>
                <input
                  type="text"
                  className="form-control text-xs py-1 px-2 font-mono"
                  placeholder={docType === 'FACTURA' ? 'RUC 11 dígitos' : 'DNI 8 dígitos o vacío'}
                  value={isManualCustomer ? manualCustomerDoc : (selectedCustomer?.doc === '00000000' ? '' : (selectedCustomer?.doc || ''))}
                  onChange={(e) => {
                    setIsManualCustomer(true);
                    setManualCustomerDoc(e.target.value.replace(/\D/g, ''));
                  }}
                  maxLength={docType === 'FACTURA' ? 11 : 12}
                />
              </div>
            </div>
          </div>

          {/* Items Summary */}
          <div style={{
            background: 'var(--bg-app)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '8px 16px',
              background: 'var(--bg-surface-hover)',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase' as const,
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Producto</span>
              <span>Subtotal</span>
            </div>
            <div style={{ maxHeight: '140px', overflow: 'auto' }}>
              {cart.map((item, i) => (
                <div key={item.id} style={{
                  padding: '8px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>{item.qty} × S/ {item.price.toFixed(2)}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>S/ {(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fiscal Breakdown */}
          <div style={{
            padding: '16px',
            background: 'linear-gradient(135deg, var(--primary-50, #eff6ff), var(--primary-100, #dbeafe))',
            borderRadius: '12px',
            border: '1px solid var(--primary-200, #bfdbfe)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <span>Op. Gravada</span>
              <span>S/ {subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <span>IGV (18%)</span>
              <span>S/ {igv.toFixed(2)}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--primary-700)',
              paddingTop: '8px',
              borderTop: '2px solid var(--primary-200, #bfdbfe)',
            }}>
              <span>TOTAL</span>
              <span>S/ {total.toFixed(2)}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' as const }}>
              Método: <strong>{paymentMethod}</strong>
            </div>
          </div>

          {/* Cash Input if Cash Payment */}
          {paymentMethod === 'EFECTIVO' && (
            <div className="space-y-2">
              <label className="form-label">Monto Recibido en Efectivo (S/)</label>
              <input
                type="number"
                step="0.10"
                className="form-control text-lg font-bold"
                placeholder="Ej: 700.00"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                autoFocus
              />
              {cashNum > 0 && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: cashNum >= total ? 'var(--success-100, #dcfce7)' : 'var(--danger-100, #fef2f2)',
                  color: cashNum >= total ? 'var(--success-700, #15803d)' : 'var(--danger-700, #b91c1c)',
                }}>
                  <span>Vuelto a entregar:</span>
                  <span>S/ {change.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-color">
            <Button variant="secondary" onClick={() => setIsCheckoutOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              icon={isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
              disabled={(paymentMethod === 'EFECTIVO' && cashNum < total) || isProcessing}
              onClick={handleProcessSale}
            >
              {isProcessing ? 'Procesando...' : 'Emitir & Imprimir Ticket'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Boleta / Factura Preview Modal */}
      <Modal
        isOpen={showBoletaPreview}
        onClose={handleCloseBoletaPreview}
        title={boletaData?.docTitle || 'Vista Previa del Comprobante'}
        size="md"
      >
        {boletaData && (
          <div className="space-y-4">
            {/* Success Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'var(--success-100, #dcfce7)',
              border: '1px solid var(--success-200, #bbf7d0)',
            }}>
              <CheckCircle2 size={20} style={{ color: 'var(--success-600, #16a34a)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--success-700, #15803d)' }}>¡Venta Registrada Exitosamente!</div>
                <div style={{ fontSize: '11px', color: 'var(--success-600, #16a34a)' }}>Comprobante {boletaData.number} emitido • Inventario actualizado</div>
              </div>
            </div>

            {/* Boleta Ticket Preview */}
            <div
              id="boleta-preview-content"
              style={{
                maxWidth: '320px',
                margin: '0 auto',
                padding: '24px 18px',
                background: '#fff',
                color: '#000',
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '11px',
                lineHeight: 1.35,
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                {boletaData.logoPath && (
                  <div style={{ marginBottom: '8px' }}>
                    <img
                      src={boletaData.logoPath}
                      alt="Logo Empresa"
                      style={{ maxHeight: '55px', maxWidth: '160px', margin: '0 auto', display: 'block', objectFit: 'contain' }}
                    />
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.02em', marginBottom: '2px', color: '#000' }}>
                  {boletaData.companyName}
                </div>
                {boletaData.companyTradeName && (
                  <div style={{ fontSize: '11px', color: '#1e293b' }}>
                    {boletaData.companyTradeName}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#1e293b' }}>
                  {boletaData.companyAddress}
                </div>
                {boletaData.companyPhone && (
                  <div style={{ fontSize: '11px', color: '#1e293b' }}>
                    Tel. {boletaData.companyPhone}
                  </div>
                )}
              </div>

              {/* Dashed Line */}
              <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

              {/* RUC & Document Title */}
              <div style={{ textAlign: 'center', margin: '6px 0' }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>
                  RUC {boletaData.companyRuc}
                </div>
                <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '2px' }}>
                  {boletaData.docTitle}
                </div>
                <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '2px' }}>
                  {boletaData.number.includes('-') && boletaData.number.split('-')[1].length < 8
                    ? `${boletaData.number.split('-')[0]}-${boletaData.number.split('-')[1].padStart(8, '0')}`
                    : boletaData.number}
                </div>
              </div>

              {/* Dashed Line */}
              <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

              {/* Subtitle */}
              <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#334155', marginBottom: '8px' }}>
                Representación impresa de la boleta de venta electrónica
              </div>

              {/* Solid Double Divider Line */}
              <div style={{ borderBottom: '2px solid #000', margin: '6px 0' }} />

              {/* Metadata Table */}
              <div style={{ fontSize: '11px', margin: '8px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px', marginBottom: '2px' }}>
                  <span>Fecha de emisión:</span>
                  <span style={{ fontWeight: 600 }}>{boletaData.date}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px', marginBottom: '2px' }}>
                  <span>Hora de emisión:</span>
                  <span>{boletaData.time}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px', marginBottom: '2px' }}>
                  <span>Sede / Sucursal:</span>
                  <span style={{ fontWeight: 600 }}>{boletaData.branchName || 'Sede Principal'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px', marginBottom: '2px' }}>
                  <span>Emitido por:</span>
                  <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{boletaData.emitterName}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px', marginBottom: '2px' }}>
                  <span>Moneda:</span>
                  <span>SOLES (PEN)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px', marginBottom: '2px' }}>
                  <span>Cliente:</span>
                  <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{boletaData.customerName === 'Público General' ? 'Consumidor final' : boletaData.customerName}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px', marginBottom: '2px' }}>
                  <span>Documento:</span>
                  <span>{boletaData.customerDoc && boletaData.customerDoc !== '00000000' ? boletaData.customerDoc : '-'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px', marginBottom: '2px' }}>
                  <span>Forma de pago:</span>
                  <span>{boletaData.paymentMethodLabel}</span>
                </div>
              </div>

              {/* Dashed Line */}
              <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

              {/* Items Table Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 60px 60px', fontWeight: 700, fontSize: '10px', margin: '4px 0 6px 0' }}>
                <span>CANT.</span>
                <span>DESCRIPCIÓN</span>
                <span style={{ textAlign: 'right' }}>P.UNIT.</span>
                <span style={{ textAlign: 'right' }}>IMPORTE</span>
              </div>

              {/* Items Rows */}
              {boletaData.items.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 60px 60px', fontSize: '10.5px', padding: '3px 0' }}>
                  <span>{item.qty} und.</span>
                  <span style={{ paddingRight: '4px', wordBreak: 'break-word' }}>{item.name}</span>
                  <span style={{ textAlign: 'right' }}>{item.unitPrice.toFixed(2)}</span>
                  <span style={{ textAlign: 'right' }}>{item.total.toFixed(2)}</span>
                </div>
              ))}

              {/* Solid Line */}
              <div style={{ borderBottom: '2px solid #000', margin: '8px 0' }} />

              {/* Totals Breakdown */}
              <div style={{ textAlign: 'right', fontSize: '11px', margin: '6px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginBottom: '3px' }}>
                  <span style={{ width: '110px' }}>Op. gravada</span>
                  <span style={{ width: '80px', fontWeight: 600 }}>S/ {boletaData.opGravada.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginBottom: '6px' }}>
                  <span style={{ width: '110px' }}>IGV (18%)</span>
                  <span style={{ width: '80px', fontWeight: 600 }}>S/ {boletaData.igv.toFixed(2)}</span>
                </div>

                {/* Solid Divider Line for Total */}
                <div style={{ borderBottom: '2px solid #000', width: '220px', marginLeft: 'auto', margin: '6px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', fontSize: '13px', fontWeight: 700, marginTop: '4px' }}>
                  <span style={{ width: '130px' }}>IMPORTE TOTAL</span>
                  <span style={{ width: '90px' }}>S/ {boletaData.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Amount in Words */}
              <div style={{ fontSize: '9.5px', fontWeight: 700, margin: '10px 0 6px 0', textTransform: 'uppercase' }}>
                SON: {numberToSpanishWords(boletaData.total)}
              </div>

              {/* Dashed Line */}
              <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

              {/* Test Banner */}
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '10px', margin: '8px 0', letterSpacing: '0.02em' }}>
                AMBIENTE DE PRUEBAS - SIN VALIDEZ TRIBUTARIA
              </div>

              {/* QR Code & Footer */}
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <div style={{ display: 'inline-flex', padding: '4px', background: '#fff' }}>
                  <QrCode size={110} className="text-black" />
                </div>
                <div style={{ fontSize: '8.5px', color: '#334155', marginTop: '8px', padding: '0 4px', lineHeight: 1.3 }}>
                  Consulte y descargue su comprobante escaneando el QR o en:<br />
                  <span style={{ wordBreak: 'break-all' }}>https://restaurante-rho-liart.vercel.app/cpe/81db4f00-2acc-4b3f-919f-a28c167da62f</span>
                </div>
                <div style={{ fontSize: '8px', color: '#64748b', marginTop: '4px', wordBreak: 'break-all' }}>
                  Huella digital: KCHh3pS4HsRVixnpQfh80iMVervaqwliUS4G8NP643o=<br />
                  CDR: 0
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '12px' }}>
                  Gracias por su preferencia
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              alignItems: 'center',
              paddingTop: '16px',
            }}>
              <Button
                variant="primary"
                icon={<CheckCircle2 size={16} />}
                onClick={handleCloseBoletaPreview}
              >
                Aceptar
              </Button>
              <Button
                variant="outline"
                icon={<Printer size={16} />}
                onClick={handlePrintBoleta}
              >
                Imprimir Comprobante
              </Button>
              <Button
                variant="secondary"
                onClick={handleCloseBoletaPreview}
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Inter-Branch Transfer Modal for POS */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferTargetProduct(null);
        }}
        products={dbProductList}
        branches={contextBranches}
        preselectedProduct={transferTargetProduct}
        targetBranchId={activeBranchId}
        onSuccess={() => {
          loadPOSData();
        }}
      />

      {/* Modal Selección de Color en POS */}
      <Modal
        isOpen={!!colorModalProduct}
        onClose={() => setColorModalProduct(null)}
        title="Seleccionar Variante de Color"
        size="md"
      >
        <div className="space-y-4 p-1">
          {/* Header Info Banner */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-color bg-app/80">
            {colorModalProduct?.imagePath ? (
              <img
                src={colorModalProduct.imagePath}
                alt={colorModalProduct.name}
                className="w-12 h-12 rounded-lg object-cover border border-color shrink-0 bg-surface"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg border border-color bg-surface flex items-center justify-center text-primary shrink-0 font-bold text-lg">
                🎨
              </div>
            )}
            <div>
              <h4 className="font-extrabold text-sm text-primary leading-tight">
                {colorModalProduct?.name}
              </h4>
              <p className="text-xs text-secondary mt-0.5">
                {colorModalProduct?.brand}{colorModalProduct?.model ? ` • ${colorModalProduct.model}` : ''} — <strong className="text-primary-600 font-mono">S/ {(colorModalProduct?.price || 0).toFixed(2)}</strong>
              </p>
            </div>
          </div>

          <p className="text-xs font-medium text-secondary">
            Este producto dispone de varios colores en stock. Selecciona el color que va a llevar el cliente:
          </p>

          {/* Color Options List */}
          <div className="space-y-2.5">
            {colorModalProduct?.dbProduct?.colors?.map((c, idx) => {
              const isAvailable = c.stock > 0;
              const unitText = c.stock === 1 ? '1 unidad disponible' : `${c.stock} unidades disponibles`;
              const isWhite = c.hex?.toLowerCase() === '#ffffff' || c.hex?.toLowerCase() === '#fff';

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => addToCartWithColor(colorModalProduct, c)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all text-left group ${
                    isAvailable
                      ? 'border-color bg-surface hover:border-primary-500 hover:shadow-md cursor-pointer'
                      : 'border-color/40 bg-app/50 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                    <div className="relative shrink-0 flex items-center justify-center">
                      <span
                        className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800 shadow-sm transition-transform group-hover:scale-110"
                        style={{
                          backgroundColor: c.hex || '#94a3b8',
                          boxShadow: isWhite ? 'inset 0 0 0 1px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.15)',
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-sm text-primary truncate flex items-center gap-2">
                        {c.color}
                      </div>
                      <div className={`text-xs ${isAvailable ? 'text-secondary font-medium' : 'text-danger-500 font-semibold'}`}>
                        {isAvailable ? unitText : 'Sin stock disponible'}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                      isAvailable
                        ? 'bg-primary-600 text-white shadow-xs group-hover:bg-primary-700'
                        : 'bg-secondary/10 text-secondary'
                    }`}>
                      {isAvailable ? 'Seleccionar ➔' : 'Agotado'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}