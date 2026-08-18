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
} from 'lucide-react';
import { Button, Modal, Badge } from '../components/ui';
import { productsService, customersService, catalogService, salesService, settingsService, Product as DBProduct } from '../lib/db-services';
import { DEFAULT_BRANCH_ID } from '../lib/supabase';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  icon: string;
  imagePath?: string;
}

interface CartItem extends Product {
  qty: number;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['Todas']);
  const [customers, setCustomers] = useState<{ id: string; name: string; doc: string }[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; doc: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TARJETA' | 'YAPE'>('EFECTIVO');
  const [docType, setDocType] = useState<'BOLETA' | 'FACTURA'>('BOLETA');
  const [isLoading, setIsLoading] = useState(true);

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [saleCompleted, setSaleCompleted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Boleta Preview State
  const [showBoletaPreview, setShowBoletaPreview] = useState(false);
  const [boletaData, setBoletaData] = useState<{
    companyName: string;
    companyRuc: string;
    companyAddress: string;
    companyPhone: string;
    docTitle: string;
    series: string;
    number: string;
    date: string;
    time: string;
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
        productsService.getProducts(),
        catalogService.getCategories(),
        customersService.getCustomers(),
      ]);

      // Set Products from Mantenedor (active products)
      setProducts(
        dbProds
          .filter((p) => p.status === 'ACTIVE')
          .map((p) => ({
            id: p.id,
            sku: p.code || p.sku,
            name: p.name,
            category: p.category || 'Sin categoría',
            price: p.price,
            stock: p.stock,
            icon: '📦',
            imagePath: p.imagePath,
          }))
      );

      // Set Categories dynamically
      const catList = ['Todas', ...dbCats.map((c) => c.name)];
      setCategories(Array.from(new Set(catList)));

      // Set Customers dynamically
      if (dbCusts && dbCusts.length > 0) {
        const mappedCusts = dbCusts.map((c) => ({
          id: c.id,
          name: c.name,
          doc: c.documentNumber || '00000000',
        }));
        setCustomers(mappedCusts);
        setSelectedCustomer(mappedCusts[0]);
      } else {
        const defaultCust = { id: 'default', name: 'Público General', doc: '00000000' };
        setCustomers([defaultCust]);
        setSelectedCustomer(defaultCust);
      }
    } catch (err) {
      console.error('Error loading POS data from Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPOSData();
  }, []);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert('Producto sin stock disponible.');
      return;
    }

    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      if (existing.qty < product.stock) {
        setCart(cart.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item)));
      } else {
        alert(`Stock máximo alcanzado (${product.stock} unidades).`);
      }
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
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

      const createdSaleId = await salesService.createSale({
        customerId: selectedCustomer && selectedCustomer.id !== 'default' ? selectedCustomer.id : undefined,
        branchId: DEFAULT_BRANCH_ID,
        branchName: 'Sede Principal',
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
        companyName: tenant.name || 'Empresa S.A.C.',
        companyRuc: tenant.ruc || '20000000000',
        companyAddress: tenant.address || 'Dirección no configurada',
        companyPhone: tenant.phone || '',
        docTitle: docType === 'BOLETA' ? 'BOLETA DE VENTA ELECTRÓNICA' : 'FACTURA ELECTRÓNICA',
        series: seriesStr,
        number: `${seriesStr}-${numStr}`,
        date: now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        customerName: selectedCustomer?.name || 'Público General',
        customerDoc: selectedCustomer?.doc || '00000000',
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
    const printWindow = window.open('', '_blank', 'width=400,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Comprobante</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            body { font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.4; color: #000; margin: 0; padding: 8px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; }
            .items-table { width: 100%; border-collapse: collapse; }
            .items-table td { padding: 2px 0; font-size: 10px; }
            .items-table .qty-col { width: 30px; text-align: center; }
            .items-table .price-col { width: 60px; text-align: right; }
            .items-table .total-col { width: 60px; text-align: right; }
            .totals .row { font-size: 11px; }
            .grand-total { font-size: 14px; font-weight: bold; }
          </style>
        </head>
        <body>${printContent.innerHTML}
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
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
                <div key={prod.id} className="pos-card flex flex-col justify-between" onClick={() => addToCart(prod)}>
                  <div className="pos-card-img overflow-hidden w-full flex items-center justify-center border-b border-color mb-3 rounded-lg shrink-0" style={{ height: '115px', backgroundColor: 'var(--bg-app)' }}>
                    {prod.imagePath ? (
                      <img
                        src={prod.imagePath}
                        alt={prod.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
                      />
                    ) : (
                      <span className="text-3xl">{prod.icon}</span>
                    )}
                  </div>
                  <div className="flex-grow flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-secondary tracking-wider font-semibold mb-0.5">{prod.sku}</div>
                      <div className="pos-card-title text-sm font-bold text-primary line-clamp-2 leading-tight mb-2 h-10 overflow-hidden" title={prod.name}>
                        {prod.name}
                      </div>
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
          <label className="text-xs font-bold text-secondary uppercase mb-1 block">Cliente</label>
          <select
            className="form-control text-xs font-semibold"
            value={selectedCustomer?.id || ''}
            onChange={(e) => {
              const found = customers.find((c) => c.id === e.target.value);
              if (found) setSelectedCustomer(found);
            }}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.doc})
              </option>
            ))}
          </select>
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' as const }}>Cliente</div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{selectedCustomer?.name}</div>
            </div>
            <div style={{
              padding: '4px 12px',
              background: 'var(--primary-100, #dbeafe)',
              color: 'var(--primary-700)',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
            }}>
              Doc: {selectedCustomer?.doc}
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
                maxWidth: '340px',
                margin: '0 auto',
                padding: '20px 16px',
                background: '#fff',
                color: '#000',
                fontFamily: "'Courier New', monospace",
                fontSize: '11px',
                lineHeight: 1.5,
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              {/* Company Header */}
              <div className="center" style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div className="bold" style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{boletaData.companyName}</div>
                <div style={{ fontSize: '10px' }}>RUC: {boletaData.companyRuc}</div>
                <div style={{ fontSize: '10px' }}>{boletaData.companyAddress}</div>
                {boletaData.companyPhone && <div style={{ fontSize: '10px' }}>Tel: {boletaData.companyPhone}</div>}
              </div>

              {/* Divider */}
              <div className="divider" style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

              {/* Document Title */}
              <div className="center bold" style={{ textAlign: 'center', fontWeight: 700, fontSize: '12px', margin: '6px 0' }}>
                {boletaData.docTitle}
              </div>
              <div className="center" style={{ textAlign: 'center', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                {boletaData.number}
              </div>

              {/* Divider */}
              <div className="divider" style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

              {/* Date, Customer */}
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span>Fecha: {boletaData.date}</span>
                <span>Hora: {boletaData.time}</span>
              </div>
              <div style={{ fontSize: '10px', marginTop: '4px' }}>
                Cliente: {boletaData.customerName}
              </div>
              <div style={{ fontSize: '10px' }}>
                {docType === 'FACTURA' ? 'RUC' : 'DNI'}: {boletaData.customerDoc}
              </div>

              {/* Divider */}
              <div className="divider" style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

              {/* Items Header */}
              <div className="row bold" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '10px', marginBottom: '4px' }}>
                <span style={{ flex: 1 }}>DESCRIPCIÓN</span>
                <span style={{ width: '30px', textAlign: 'center' }}>CANT</span>
                <span style={{ width: '55px', textAlign: 'right' }}>P.UNIT</span>
                <span style={{ width: '55px', textAlign: 'right' }}>TOTAL</span>
              </div>

              {/* Items */}
              {boletaData.items.map((item, i) => (
                <div key={i} className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '1px 0' }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  <span style={{ width: '30px', textAlign: 'center' }}>{item.qty}</span>
                  <span style={{ width: '55px', textAlign: 'right' }}>{item.unitPrice.toFixed(2)}</span>
                  <span style={{ width: '55px', textAlign: 'right' }}>{item.total.toFixed(2)}</span>
                </div>
              ))}

              {/* Divider */}
              <div className="divider" style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

              {/* Totals */}
              <div className="totals">
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span>OP. GRAVADA</span>
                  <span>S/ {boletaData.opGravada.toFixed(2)}</span>
                </div>
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span>IGV (18%)</span>
                  <span>S/ {boletaData.igv.toFixed(2)}</span>
                </div>
                <div className="divider" style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
                <div className="row grand-total" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700 }}>
                  <span>IMPORTE TOTAL</span>
                  <span>S/ {boletaData.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="divider" style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

              {/* Payment + Footer */}
              <div style={{ fontSize: '10px', marginBottom: '4px' }}>
                Forma de pago: {boletaData.paymentMethodLabel}
              </div>
              <div className="center" style={{ textAlign: 'center', fontSize: '10px', marginTop: '8px', color: '#666' }}>
                Representación impresa de la<br />
                {boletaData.docTitle}<br />
                Autorizado mediante Res. de Sup.<br />
                N° 000-000/SUNAT
              </div>
              <div className="center" style={{ textAlign: 'center', fontSize: '10px', marginTop: '8px', fontWeight: 700 }}>
                ¡Gracias por su compra!
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
    </div>
  );
}