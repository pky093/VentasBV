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
} from 'lucide-react';
import { Button, Modal, Badge } from '../components/ui';
import { productsService, customersService, catalogService, Product as DBProduct } from '../lib/db-services';

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
    // Process sale and update stock in database
    for (const item of cart) {
      const newStock = Math.max(0, item.stock - item.qty);
      await productsService.updateProduct(item.id, { stock: newStock });
    }

    setSaleCompleted(true);
    setTimeout(() => {
      setSaleCompleted(false);
      setIsCheckoutOpen(false);
      setCart([]);
      setCashAmount('');
      loadPOSData();
    }, 1800);
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

      {/* Checkout Modal */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Procesar Venta & Emisión de Comprobante"
        size="md"
      >
        {saleCompleted ? (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-scaleUp">
            <CheckCircle2 size={54} className="text-success-500 mb-3" />
            <h3 className="font-bold text-xl text-primary">¡Venta Realizada con Éxito!</h3>
            <p className="text-xs text-secondary mt-1">Comprobante emitido e inventario actualizado en Supabase</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Customer & Document Info */}
            <div className="p-3 bg-app rounded-lg border border-color flex justify-between items-center text-xs">
              <div>
                <span className="text-secondary block font-semibold">Cliente</span>
                <span className="font-bold text-primary">{selectedCustomer?.name}</span>
                <span className="text-secondary ml-1">({selectedCustomer?.doc})</span>
              </div>
              <div className="flex gap-1">
                <button
                  className={`px-3 py-1 rounded font-bold transition-all ${
                    docType === 'BOLETA' ? 'bg-primary-600 text-white' : 'bg-surface text-secondary'
                  }`}
                  onClick={() => setDocType('BOLETA')}
                >
                  Boleta
                </button>
                <button
                  className={`px-3 py-1 rounded font-bold transition-all ${
                    docType === 'FACTURA' ? 'bg-primary-600 text-white' : 'bg-surface text-secondary'
                  }`}
                  onClick={() => setDocType('FACTURA')}
                >
                  Factura
                </button>
              </div>
            </div>

            {/* Total Display */}
            <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-xl border border-primary-200 text-center">
              <div className="text-xs text-secondary uppercase font-bold">Monto Total a Cobrar</div>
              <div className="text-3xl font-extrabold text-primary-700 dark:text-primary-400 mt-1">
                S/ {total.toFixed(2)}
              </div>
              <div className="text-xs text-secondary mt-1">
                Método de pago: <strong>{paymentMethod}</strong>
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
                  <div
                    className={`p-3 rounded-lg text-sm font-bold flex justify-between ${
                      cashNum >= total ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'
                    }`}
                  >
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
                icon={<Printer size={16} />}
                disabled={paymentMethod === 'EFECTIVO' && cashNum < total}
                onClick={handleProcessSale}
              >
                Emitir & Imprimir Ticket
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}