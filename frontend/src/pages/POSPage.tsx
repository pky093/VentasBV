import React, { useState, useEffect, useMemo } from 'react';
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
  Calendar,
  DollarSign,
  Percent,
  Clock,
  Share2,
  Coins,
  Layers,
  Sparkles,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { Button, Modal, Badge, SuggestionChip } from '../components/ui';
import {
  productsService,
  customersService,
  catalogService,
  salesService,
  settingsService,
  sunatReniecService,
  creditsService,
  Product as DBProduct,
} from '../lib/db-services';
import { useBranch } from '../context/BranchContext';
import { useNavigate } from 'react-router-dom';
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
  productId?: string;
  selectedColor?: string;
}

export default function POSPage() {
  const navigate = useNavigate();
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

  // DNI / RUC Lookup state
  const [isLookingUpDoc, setIsLookingUpDoc] = useState(false);

  // Credit / Financing state
  const [saleCondition, setSaleCondition] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [creditInitialPayment, setCreditInitialPayment] = useState<string>('0');
  const [creditInitialPaymentMethod, setCreditInitialPaymentMethod] = useState<'EFECTIVO' | 'TARJETA' | 'YAPE'>('EFECTIVO');
  const [creditInterestRate, setCreditInterestRate] = useState<number>(0);
  const [creditInstallmentsCount, setCreditInstallmentsCount] = useState<number>(3);
  const [creditFrequency, setCreditFrequency] = useState<'MENSUAL' | 'QUINCENAL' | 'SEMANAL'>('MENSUAL');
  const [creditFirstDueDate, setCreditFirstDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

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
    saleCondition: 'CONTADO' | 'CREDITO';
    creditInfo?: {
      initialPayment: number;
      financedAmount: number;
      interestRate: number;
      interestAmount: number;
      totalCredit: number;
      installmentsCount: number;
      installmentFrequency: string;
      installments: {
        number: number;
        dueDate: string;
        capital: number;
        interest: number;
        total: number;
      }[];
    };
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

  // Lookup DNI / RUC
  const handleLookupDoc = async () => {
    const doc = manualCustomerDoc.trim();
    if (!doc) {
      Swal.fire({
        title: 'Documento requerido',
        text: 'Por favor ingrese un número de DNI (8 dígitos) o RUC (11 dígitos).',
        icon: 'info',
      });
      return;
    }

    setIsLookingUpDoc(true);
    try {
      if (doc.length === 8) {
        const res = await sunatReniecService.consultarDni(doc);
        if (res.success && res.data) {
          setManualCustomerName(res.data.nombreCompleto);
          setManualCustomerDocType('DNI');
          Swal.fire({
            title: '¡DNI Encontrado!',
            html: `<p style="font-size:15px; font-weight:bold; color:var(--text-primary);">${res.data.nombreCompleto}</p><p style="font-size:12px; color:var(--text-secondary);">DNI: ${res.data.dni}</p>`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            title: 'Consulta DNI',
            text: res.message || 'No se encontraron datos automáticos.',
            icon: 'warning',
          });
        }
      } else if (doc.length === 11) {
        const res = await sunatReniecService.consultarRuc(doc);
        if (res.success && res.data) {
          setManualCustomerName(res.data.razonSocial);
          setManualCustomerDocType('RUC');
          setDocType('FACTURA');
          Swal.fire({
            title: '¡RUC Encontrado en SUNAT!',
            html: `<p style="font-size:15px; font-weight:bold; color:var(--text-primary);">${res.data.razonSocial}</p>
                   <p style="font-size:12px; color:#10b981; font-weight:bold;">${res.data.estado || 'ACTIVO'} • ${res.data.condicion || 'HABIDO'}</p>
                   <p style="font-size:11px; color:var(--text-secondary);">${res.data.direccion || ''}</p>`,
            icon: 'success',
            timer: 2500,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            title: 'Consulta RUC',
            text: res.message || 'No se encontraron datos automáticos.',
            icon: 'warning',
          });
        }
      } else {
        Swal.fire({
          title: 'Documento Inválido',
          text: 'El DNI debe tener 8 dígitos y el RUC 11 dígitos.',
          icon: 'warning',
        });
      }
    } catch (err: any) {
      console.error('Error during doc lookup:', err);
      Swal.fire({ title: 'Error', text: 'Error al conectar con el servicio.', icon: 'error' });
    } finally {
      setIsLookingUpDoc(false);
    }
  };

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
    const cleanProdId = product.dbProduct?.id || (product.id.includes('-') && product.id.length > 36 ? product.id.substring(0, 36) : product.id);
    const itemId = selectedColor ? `${cleanProdId}-${selectedColor.color}` : cleanProdId;
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
          productId: cleanProdId,
          selectedColor: selectedColor?.color,
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

  // Credit Financing Calculations
  const creditInitialNum = Math.min(total, Math.max(0, parseFloat(creditInitialPayment) || 0));
  const creditCapitalFinanced = Math.max(0, total - creditInitialNum);
  const creditInterestAmount = Number(((creditCapitalFinanced * (creditInterestRate || 0)) / 100).toFixed(2));
  const creditTotalFinanced = Number((creditCapitalFinanced + creditInterestAmount).toFixed(2));
  const creditInstallmentsNum = Math.max(1, creditInstallmentsCount || 1);
  const creditInstallmentCapital = Number((creditCapitalFinanced / creditInstallmentsNum).toFixed(2));
  const creditInstallmentInterest = Number((creditInterestAmount / creditInstallmentsNum).toFixed(2));
  const creditInstallmentTotal = Number((creditTotalFinanced / creditInstallmentsNum).toFixed(2));

  const creditSchedulePreview = useMemo(() => {
    if (saleCondition !== 'CREDITO') return [];
    const list = [];
    const start = creditFirstDueDate ? new Date(creditFirstDueDate) : new Date();
    for (let i = 1; i <= creditInstallmentsNum; i++) {
      const d = new Date(start);
      if (i > 1) {
        if (creditFrequency === 'SEMANAL') d.setDate(d.getDate() + (i - 1) * 7);
        else if (creditFrequency === 'QUINCENAL') d.setDate(d.getDate() + (i - 1) * 15);
        else d.setMonth(d.getMonth() + (i - 1));
      }
      list.push({
        number: i,
        dueDate: d.toISOString().split('T')[0],
        capital: creditInstallmentCapital,
        interest: creditInstallmentInterest,
        total: creditInstallmentTotal,
      });
    }
    return list;
  }, [
    saleCondition,
    creditInitialPayment,
    creditInterestRate,
    creditInstallmentsCount,
    creditFrequency,
    creditFirstDueDate,
    total,
    creditInstallmentCapital,
    creditInstallmentInterest,
    creditInstallmentTotal,
    creditInstallmentsNum,
  ]);

  // Paso 1: Abrir la Vista Previa Preliminar del Comprobante
  const handleOpenBoletaPreview = async () => {
    try {
      const isCredit = saleCondition === 'CREDITO';

      // Validate customer if credit sale
      const effectiveCustomerName = isManualCustomer
        ? (manualCustomerName.trim() || 'Público General')
        : (selectedCustomer?.name || 'Público General');

      const effectiveCustomerDoc = isManualCustomer
        ? (manualCustomerDocType === 'SIN_DOC' ? '00000000' : (manualCustomerDoc.trim() || '00000000'))
        : (selectedCustomer?.doc || '00000000');

      if (isCredit && (!effectiveCustomerDoc || effectiveCustomerDoc === '00000000')) {
        Swal.fire({
          title: 'Cliente Requerido',
          text: 'Para registrar una venta al crédito financiada, es obligatorio ingresar el DNI o RUC del cliente.',
          icon: 'warning',
        });
        return;
      }

      // Map payment method to label
      const paymentLabels: Record<string, string> = {
        EFECTIVO: 'Efectivo',
        TARJETA: 'Tarjeta de Crédito/Débito',
        YAPE: 'Yape / Plin',
      };

      // Fetch tenant info
      const tenant = await settingsService.getTenantInfo();
      const seriesInfo = await settingsService.getNextSeriesNumber(docType);
      const seriesStr = seriesInfo?.series || (docType === 'BOLETA' ? 'B001' : 'F001');
      const nextNum = seriesInfo?.number || 1;
      const numStr = String(nextNum).padStart(5, '0');

      const now = new Date();
      const tenantName = tenant.name || (typeof window !== 'undefined' ? localStorage.getItem('tenant_name') || 'EMPRESA' : 'EMPRESA');
      const tenantRuc = tenant.ruc || (typeof window !== 'undefined' ? localStorage.getItem('tenant_ruc') || '' : '');
      const tenantPhone = tenant.phone || '';
      const saleBranchName = activeBranch?.name || 'Sede Principal';
      const tenantAddress = tenant.address || (saleBranchName ? saleBranchName : 'Sede Principal');
      const currentEmitterName = typeof window !== 'undefined'
        ? (localStorage.getItem('auth_user') || localStorage.getItem('auth_username') || 'Vendedor')
        : 'Vendedor';

      setBoletaData({
        companyName: tenantName,
        companyTradeName: tenant.trade_name || '',
        companyRuc: tenantRuc,
        companyAddress: saleBranchName ? `${saleBranchName}` : tenantAddress,
        companyPhone: tenantPhone,
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
        paymentMethodLabel: isCredit ? `CRÉDITO (${creditInstallmentsNum} cuotas ${creditFrequency.toLowerCase()}es)` : (paymentLabels[paymentMethod] || paymentMethod),
        saleCondition,
        creditInfo: isCredit
          ? {
              initialPayment: creditInitialNum,
              financedAmount: creditCapitalFinanced,
              interestRate: creditInterestRate,
              interestAmount: creditInterestAmount,
              totalCredit: creditTotalFinanced,
              installmentsCount: creditInstallmentsNum,
              installmentFrequency: creditFrequency,
              installments: creditSchedulePreview,
            }
          : undefined,
      });

      setIsCheckoutOpen(false);
      setShowBoletaPreview(true);
    } catch (err) {
      console.error('Error opening boleta preview:', err);
      Swal.fire({ title: 'Error', text: 'No se pudo generar la vista preliminar del comprobante.', icon: 'error' });
    }
  };

  // Paso 2: Confirmar Venta Definitiva desde el Preliminar (Acepta venta y descuenta stock)
  const handleFinalConfirmSale = async () => {
    setIsProcessing(true);
    try {
      const isCredit = saleCondition === 'CREDITO';

      const effectiveCustomerName = isManualCustomer
        ? (manualCustomerName.trim() || 'Público General')
        : (selectedCustomer?.name || 'Público General');

      const effectiveCustomerDoc = isManualCustomer
        ? (manualCustomerDocType === 'SIN_DOC' ? '00000000' : (manualCustomerDoc.trim() || '00000000'))
        : (selectedCustomer?.doc || '00000000');

      let dbPaymentMethod: 'CASH' | 'CARD' | 'YAPE' | 'TRANSFER' = 'CASH';
      if (paymentMethod === 'TARJETA') dbPaymentMethod = 'CARD';
      if (paymentMethod === 'YAPE') dbPaymentMethod = 'YAPE';

      const seriesInfo = await settingsService.getNextSeriesNumber(docType);
      const seriesStr = seriesInfo?.series || (docType === 'BOLETA' ? 'B001' : 'F001');
      const nextNum = seriesInfo?.number || 1;
      const numStr = String(nextNum).padStart(5, '0');

      const saleItems = cart.map((item) => {
        let cleanProdId = item.productId || item.dbProduct?.id || item.id;
        if (cleanProdId.includes('-') && cleanProdId.length > 36) {
          cleanProdId = cleanProdId.substring(0, 36);
        }
        return {
          productId: cleanProdId,
          productName: item.name,
          selectedColor: item.selectedColor,
          quantity: item.qty,
          unitPrice: item.price,
          subtotal: item.price * item.qty,
        };
      });

      const saleBranchId = activeBranchId !== 'ALL' ? activeBranchId : (activeBranch?.id || DEFAULT_BRANCH_ID);
      const saleBranchName = activeBranch?.name || 'Sede Principal';

      const currentEmitterName = typeof window !== 'undefined'
        ? (localStorage.getItem('auth_user') || localStorage.getItem('auth_username') || 'Vendedor')
        : 'Vendedor';

      const effectiveCustomerId = isManualCustomer || selectedCustomer?.id === 'default' || selectedCustomer?.id === '__manual__'
        ? undefined
        : selectedCustomer?.id;

      // Create sale in DB (automatically records OUT movement and decrements stock in branch_inventory)
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
        paymentMethod: isCredit ? 'TRANSFER' : dbPaymentMethod,
        documentType: docType,
        items: saleItems,
      });

      if (!createdSaleId) {
        Swal.fire({ title: 'Error', text: 'Ocurrió un error al registrar la venta en la base de datos.', icon: 'error' });
        return;
      }

      // If credit sale, register credit & installments schedule
      if (isCredit) {
        await creditsService.createCredit({
          saleId: createdSaleId,
          saleNumber: `${seriesStr}-${numStr}`,
          branchId: saleBranchId,
          branchName: saleBranchName,
          customerId: effectiveCustomerId,
          customerName: effectiveCustomerName,
          customerDoc: effectiveCustomerDoc,
          totalAmount: total,
          initialPayment: creditInitialNum,
          interestRate: creditInterestRate,
          installmentsCount: creditInstallmentsNum,
          installmentFrequency: creditFrequency,
          firstDueDate: creditFirstDueDate,
        });
      }

      // Increment series number
      await settingsService.incrementSeriesNumber(docType, seriesStr);

      // Clean POS state
      setShowBoletaPreview(false);
      setCart([]);
      setSelectedCustomer(null);
      setIsManualCustomer(false);
      setManualCustomerName('');
      setManualCustomerDoc('');
      setCashAmount('');

      Swal.fire({
        title: '¡Venta Registrada Exitosamente!',
        html: `<p style="font-size:14px; margin-bottom:4px;">Comprobante <b>${seriesStr}-${numStr}</b> emitido.</p><p style="font-size:12px; color:var(--text-secondary);">Stock descontado del inventario. Redirigiendo al Historial de Ventas...</p>`,
        icon: 'success',
        timer: 1600,
        showConfirmButton: false,
      });

      setTimeout(() => {
        navigate('/app/sales');
      }, 1000);
    } catch (err) {
      console.error('Error confirming sale:', err);
      Swal.fire({ title: 'Error inesperado', text: 'Ocurrió un error al procesar la venta.', icon: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Controlled On-Demand Printing
  const handlePrintTicket = (paperSize: '80mm' | '58mm' = '80mm') => {
    const printContent = document.getElementById('boleta-preview-content');
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'width=450,height=750');
    if (!printWindow) return;

    const widthStyle = paperSize === '58mm' ? '220px' : '320px';
    const fontStyle = paperSize === '58mm' ? '9.5px' : '11px';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket ${boletaData?.number || ''}</title>
          <style>
            @page { size: ${paperSize} auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: ${fontStyle};
              line-height: 1.35;
              color: #000;
              margin: 0;
              padding: 6px;
              background: #fff;
            }
            * { box-sizing: border-box; }
            .ticket-container {
              width: 100%;
              max-width: ${widthStyle};
              margin: 0 auto;
            }
            @media print {
              body { padding: 2px; }
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

  const handlePrintA4 = () => {
    if (!boletaData) return;
    const printWindow = window.open('', '_blank', 'width=850,height=1000');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${boletaData.docTitle} - ${boletaData.number}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body {
              font-family: Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 20px;
              background: #fff;
              font-size: 12px;
            }
            * { box-sizing: border-box; }
            .header-box { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
            .ruc-box { border: 2px solid #0284c7; border-radius: 8px; padding: 12px 20px; text-align: center; width: 260px; background: #f0f9ff; }
            .ruc-box h3 { margin: 0; font-size: 14px; color: #0369a1; }
            .ruc-box h2 { margin: 6px 0; font-size: 16px; color: #0f172a; }
            .section-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 16px; background: #f8fafc; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #0284c7; color: #fff; padding: 8px; text-align: left; font-size: 11px; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
            .totals-box { margin-left: auto; width: 280px; margin-top: 16px; }
            .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
            .totals-total { border-top: 2px solid #0284c7; font-weight: bold; font-size: 16px; color: #0284c7; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div>
              <h1 style="margin:0; font-size:20px; color:#0f172a;">${boletaData.companyName}</h1>
              ${boletaData.companyTradeName ? `<p style="margin:2px 0; color:#64748b;">${boletaData.companyTradeName}</p>` : ''}
              <p style="margin:2px 0; color:#475569;">${boletaData.companyAddress}</p>
              <p style="margin:2px 0; color:#475569;">Teléfono: ${boletaData.companyPhone}</p>
            </div>
            <div class="ruc-box">
              <h3>RUC: ${boletaData.companyRuc}</h3>
              <h2>${boletaData.docTitle}</h2>
              <h3 style="color:#0284c7;">${boletaData.number}</h3>
            </div>
          </div>

          <div class="section-box">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div><strong>Señor(es):</strong> ${boletaData.customerName}</div>
              <div><strong>Fecha de Emisión:</strong> ${boletaData.date} ${boletaData.time}</div>
              <div><strong>N° Documento:</strong> ${boletaData.customerDoc}</div>
              <div><strong>Condición / Pago:</strong> ${boletaData.paymentMethodLabel}</div>
              <div><strong>Sucursal:</strong> ${boletaData.branchName}</div>
              <div><strong>Moneda:</strong> SOLES (PEN)</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px;">CANT.</th>
                <th>DESCRIPCIÓN DEL PRODUCTO / SERVICIO</th>
                <th style="text-align: right; width: 100px;">P. UNITARIO</th>
                <th style="text-align: right; width: 100px;">IMPORTE</th>
              </tr>
            </thead>
            <tbody>
              ${boletaData.items.map(item => `
                <tr>
                  <td>${item.qty}</td>
                  <td>${item.name}</td>
                  <td style="text-align: right;">S/ ${item.unitPrice.toFixed(2)}</td>
                  <td style="text-align: right;">S/ ${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-box">
            <div class="totals-row">
              <span>Op. Gravada:</span>
              <span>S/ ${boletaData.opGravada.toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span>IGV (18%):</span>
              <span>S/ ${boletaData.igv.toFixed(2)}</span>
            </div>
            <div class="totals-row totals-total">
              <span>IMPORTE TOTAL:</span>
              <span>S/ ${boletaData.total.toFixed(2)}</span>
            </div>
          </div>

          ${boletaData.creditInfo ? `
            <div class="section-box" style="margin-top: 20px;">
              <h4 style="margin:0 0 8px 0; color:#0369a1;">INFORMACIÓN DEL CRÉDITO Y CUOTAS (SUNAT)</h4>
              <p style="margin:2px 0;"><strong>Cuota Inicial Pagada:</strong> S/ ${boletaData.creditInfo.initialPayment.toFixed(2)}</p>
              <p style="margin:2px 0;"><strong>Monto Neto Financiado:</strong> S/ ${boletaData.creditInfo.totalCredit.toFixed(2)} (${boletaData.creditInfo.installmentsCount} cuotas ${boletaData.creditInfo.installmentFrequency.toLowerCase()}es)</p>
              <table style="margin-top: 8px;">
                <thead>
                  <tr>
                    <th>N° CUOTA</th>
                    <th>FECHA DE VENCIMIENTO</th>
                    <th style="text-align: right;">MONTO CUOTA</th>
                  </tr>
                </thead>
                <tbody>
                  ${boletaData.creditInfo.installments.map(ins => `
                    <tr>
                      <td>Cuota ${ins.number}</td>
                      <td>${ins.dueDate}</td>
                      <td style="text-align: right;">S/ ${ins.total.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <div style="margin-top: 30px; text-align: center; color: #64748b; font-size: 10px;">
            SON: ${numberToSpanishWords(boletaData.total)}<br/>
            Representación impresa de la ${boletaData.docTitle}. Consulte en línea su comprobante.
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

  const handleShareWhatsApp = () => {
    if (!boletaData) return;
    const msg = encodeURIComponent(
      `Hola ${boletaData.customerName},\nLe enviamos el resumen de su ${boletaData.docTitle} N° ${boletaData.number} de ${boletaData.companyName}.\nTotal: S/ ${boletaData.total.toFixed(2)}\nForma de pago: ${boletaData.paymentMethodLabel}\n¡Gracias por su compra!`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const handleCloseBoletaPreview = () => {
    setShowBoletaPreview(false);
    setBoletaData(null);
    setSaleCompleted(false);
    setCart([]);
    setCashAmount('');
    setCreditInitialPayment('0');
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
                  className="form-control text-xs py-1 px-2 font-medium"
                  placeholder="Ej. Carlos Mendoza o Público General"
                  value={manualCustomerName}
                  onChange={(e) => setManualCustomerName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-12 gap-1.5 items-end">
                <div className="col-span-4">
                  <label className="text-[10.5px] font-medium text-secondary block mb-1">
                    Tipo Doc:
                  </label>
                  <select
                    className="form-control text-xs py-1 px-1 font-medium"
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

                <div className="col-span-5">
                  <label className="text-[10.5px] font-semibold text-secondary block mb-1">
                    N° Doc.:
                  </label>
                  <input
                    type="text"
                    className="form-control text-xs py-1 px-2 font-mono"
                    placeholder={manualCustomerDocType === 'SIN_DOC' ? 'No requerido' : manualCustomerDocType === 'RUC' ? '11 dígitos' : '8 dígitos'}
                    disabled={manualCustomerDocType === 'SIN_DOC'}
                    value={manualCustomerDoc}
                    onChange={(e) => setManualCustomerDoc(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleLookupDoc();
                      }
                    }}
                    maxLength={manualCustomerDocType === 'RUC' ? 11 : 12}
                  />
                </div>

                <div className="col-span-3">
                  <button
                    type="button"
                    disabled={isLookingUpDoc || !manualCustomerDoc || manualCustomerDocType === 'SIN_DOC'}
                    onClick={handleLookupDoc}
                    className="btn btn-outline btn-sm w-full h-[30px] flex items-center justify-center p-0 text-[10.5px] font-bold text-primary-600 border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950 disabled:opacity-40"
                    title="Consultar en tiempo real con SUNAT / RENIEC"
                  >
                    {isLookingUpDoc ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                    <span className="ml-1">Buscar</span>
                  </button>
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

      {/* Checkout Modal — Redesigned with Credit & Controlled Printing */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Procesar Venta & Emisión de Comprobante"
        size="lg"
      >
        <div className="space-y-4">
          {/* Top Tabs: Document Type & Sale Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Document Type */}
            <div>
              <label className="text-[11px] font-bold text-secondary uppercase block mb-1">
                Tipo de Comprobante
              </label>
              <div style={{
                display: 'flex',
                gap: '6px',
                padding: '3px',
                background: 'var(--bg-app)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
              }}>
                <button
                  type="button"
                  onClick={() => setDocType('BOLETA')}
                  className="border-none"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: docType === 'BOLETA' ? 'var(--primary-600)' : 'transparent',
                    color: docType === 'BOLETA' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  <Receipt size={15} />
                  Boleta de Venta
                </button>
                <button
                  type="button"
                  onClick={() => setDocType('FACTURA')}
                  className="border-none"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: docType === 'FACTURA' ? 'var(--primary-600)' : 'transparent',
                    color: docType === 'FACTURA' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  <FileText size={15} />
                  Factura
                </button>
              </div>
            </div>

            {/* Sale Condition: Contado vs Crédito */}
            <div>
              <label className="text-[11px] font-bold text-secondary uppercase block mb-1">
                Condición de Pago
              </label>
              <div style={{
                display: 'flex',
                gap: '6px',
                padding: '3px',
                background: 'var(--bg-app)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
              }}>
                <button
                  type="button"
                  onClick={() => setSaleCondition('CONTADO')}
                  className="border-none"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: saleCondition === 'CONTADO' ? 'var(--primary-600)' : 'transparent',
                    color: saleCondition === 'CONTADO' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  <Banknote size={15} />
                  Al Contado
                </button>
                <button
                  type="button"
                  onClick={() => setSaleCondition('CREDITO')}
                  className="border-none"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: saleCondition === 'CREDITO' ? '#d97706' : 'transparent',
                    color: saleCondition === 'CREDITO' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  <Calendar size={15} />
                  Al Crédito (Financiado)
                </button>
              </div>
            </div>
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
                  N° Documento ({docType === 'FACTURA' || saleCondition === 'CREDITO' ? 'RUC / DNI Obligatorio' : 'DNI / Opcional'}):
                </label>
                <input
                  type="text"
                  className="form-control text-xs py-1 px-2 font-mono"
                  placeholder={docType === 'FACTURA' ? 'RUC 11 dígitos' : 'DNI 8 dígitos'}
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

          {/* IF CREDIT FINANCING: SIMULATOR & PARAMETERS */}
          {/* IF CREDIT FINANCING: SIMULATOR & PARAMETERS */}
          {/* IF CREDIT FINANCING: SIMULATOR & PARAMETERS (DISEÑO UNIFICADO IMAGEN 2) */}
          {saleCondition === 'CREDITO' ? (
            <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              {/* Header Banner */}
              <div style={{ padding: '12px 16px', background: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="flex items-center gap-2 font-bold text-xs text-primary">
                  <CreditCard size={15} className="text-primary-600" />
                  Plan de Financiamiento al Crédito ({creditInstallmentsNum} cuotas • {creditFrequency})
                </div>
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <span>Total Venta: <strong className="text-primary font-bold">S/ {total.toFixed(2)}</strong></span>
                  <Badge variant="warning">Pendiente</Badge>
                </div>
              </div>

              {/* 4 Form Inputs in a Single Clean Form Grid */}
              <div className="p-3.5 border-b border-border-color">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-primary flex items-center gap-1">
                      <Coins size={13} className="text-primary-600" />
                      Cuota Inicial (S/)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={total}
                      step="10"
                      className="form-control text-xs font-bold"
                      value={creditInitialPayment}
                      onChange={(e) => setCreditInitialPayment(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-primary flex items-center gap-1">
                      <Percent size={13} className="text-primary-600" />
                      Tasa Interés Total (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      className="form-control text-xs font-bold"
                      value={creditInterestRate}
                      onChange={(e) => setCreditInterestRate(parseFloat(e.target.value) || 0)}
                      placeholder="0%"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-primary flex items-center gap-1">
                      <Layers size={13} className="text-primary-600" />
                      Plazo / N° Cuotas
                    </label>
                    <select
                      className="form-control text-xs font-bold"
                      value={creditInstallmentsCount}
                      onChange={(e) => setCreditInstallmentsCount(parseInt(e.target.value, 10) || 1)}
                    >
                      <option value={1}>1 Cuota (1 mes)</option>
                      <option value={2}>2 Cuotas (2 meses)</option>
                      <option value={3}>3 Cuotas (3 meses)</option>
                      <option value={4}>4 Cuotas (4 meses)</option>
                      <option value={5}>5 Cuotas (5 meses)</option>
                      <option value={6}>6 Cuotas (6 meses)</option>
                      <option value={12}>12 Cuotas (1 año)</option>
                      <option value={18}>18 Cuotas (1.5 años)</option>
                      <option value={24}>24 Cuotas (2 años)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-primary flex items-center gap-1">
                      <Clock size={13} className="text-primary-600" />
                      Frecuencia de Cobro
                    </label>
                    <select
                      className="form-control text-xs font-bold"
                      value={creditFrequency}
                      onChange={(e: any) => setCreditFrequency(e.target.value)}
                    >
                      <option value="MENSUAL">Mensual (Cada 30 días)</option>
                      <option value="QUINCENAL">Quincenal (Cada 15 días)</option>
                      <option value="SEMANAL">Semanal (Cada 7 días)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Summary Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', padding: '14px 16px', background: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-surface)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Inicial Cobrada</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--emerald-600, #16a34a)', fontFamily: 'monospace', marginTop: '2px' }}>S/ {creditInitialNum.toFixed(2)}</div>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-surface)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Saldo Financiado</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', marginTop: '2px' }}>S/ {creditCapitalFinanced.toFixed(2)}</div>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-surface)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Interés ({creditInterestRate}%)</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-600, #2563eb)', fontFamily: 'monospace', marginTop: '2px' }}>+ S/ {creditInterestAmount.toFixed(2)}</div>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-surface)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Total a Pagar</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary-600, #2563eb)', fontFamily: 'monospace', marginTop: '2px' }}>
                    S/ {(creditCapitalFinanced + creditInterestAmount).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Installments Schedule Table matching Image 2 style */}
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-app)', color: 'var(--text-secondary)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '8px 14px', fontWeight: 600 }}>N° Cuota</th>
                      <th style={{ padding: '8px 14px', fontWeight: 600 }}>Fecha Vencimiento</th>
                      <th style={{ padding: '8px 14px', fontWeight: 600, textAlign: 'right' }}>Capital</th>
                      <th style={{ padding: '8px 14px', fontWeight: 600, textAlign: 'right' }}>Interés</th>
                      <th style={{ padding: '8px 14px', fontWeight: 600, textAlign: 'right' }}>Monto Cuota</th>
                      <th style={{ padding: '8px 14px', fontWeight: 600, textAlign: 'center' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditSchedulePreview.map((item, idx) => (
                      <tr key={item.number} style={{ borderBottom: idx < creditSchedulePreview.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Cuota {item.number}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                          {item.dueDate}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace' }}>
                          S/ {item.capital.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--primary-600)' }}>
                          + S/ {item.interest.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                          S/ {item.total.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <Badge variant="warning">Pendiente</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* CONTADO: Regular Cash / Payment breakdown */
            <>
              {/* Fiscal Breakdown */}
              <div style={{
                padding: '14px 16px',
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
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--primary-700)',
                  paddingTop: '6px',
                  borderTop: '2px solid var(--primary-200, #bfdbfe)',
                }}>
                  <span>TOTAL A PAGAR</span>
                  <span>S/ {total.toFixed(2)}</span>
                </div>
              </div>

              {/* Cash Input if Cash Payment */}
              {paymentMethod === 'EFECTIVO' && (
                <div className="space-y-2">
                  <label className="form-label text-xs font-bold">Monto Recibido en Efectivo (S/)</label>
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
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-border-color">
            <Button variant="secondary" onClick={() => setIsCheckoutOpen(false)} type="button">
              Cancelar
            </Button>
            <Button
              variant="primary"
              icon={<CheckCircle2 size={16} />}
              disabled={(saleCondition === 'CONTADO' && paymentMethod === 'EFECTIVO' && cashNum < total)}
              onClick={handleOpenBoletaPreview}
              type="button"
            >
              Aceptar Venta
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Vista Previa Preliminar del Comprobante */}
      <Modal
        isOpen={showBoletaPreview}
        onClose={() => setShowBoletaPreview(false)}
        title={boletaData?.docTitle || 'Vista Previa del Comprobante'}
        size="md"
      >
        {boletaData && (
          <div className="space-y-4">
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
                borderRadius: '6px',
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
                Representación preliminar del comprobante
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
                  <span style={{ fontWeight: 700 }}>{boletaData.paymentMethodLabel}</span>
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

              {/* Credit Information (SUNAT UBL 2.1 compliance for Credit sales) */}
              {boletaData.creditInfo && (
                <div style={{ margin: '8px 0', padding: '6px 0', borderTop: '1px dashed #000', borderBottom: '1px dashed #000' }}>
                  <div style={{ fontWeight: 700, fontSize: '10px', marginBottom: '4px' }}>INFORMACIÓN DEL CRÉDITO:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '2px' }}>
                    <span>Cuota inicial pagada:</span>
                    <span style={{ fontWeight: 700 }}>S/ {boletaData.creditInfo.initialPayment.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                    <span>Monto neto pendiente:</span>
                    <span style={{ fontWeight: 700 }}>S/ {boletaData.creditInfo.totalCredit.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: '9.5px', fontWeight: 700, marginTop: '4px', marginBottom: '2px' }}>CUOTAS:</div>
                  {boletaData.creditInfo.installments.map((ins) => (
                    <div key={ins.number} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px' }}>
                      <span>Cuota {ins.number} ({ins.dueDate}):</span>
                      <span>S/ {ins.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Amount in Words */}
              <div style={{ fontSize: '9.5px', fontWeight: 700, margin: '10px 0 6px 0', textTransform: 'uppercase' }}>
                SON: {numberToSpanishWords(boletaData.total)}
              </div>

              {/* Dashed Line */}
              <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

              {/* QR Code & Footer */}
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <div style={{ display: 'inline-flex', padding: '4px', background: '#fff' }}>
                  <QrCode size={105} className="text-black" />
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '8px' }}>
                  Gracias por su preferencia
                </div>
              </div>
            </div>

            {/* Actions: EXACTAMENTE 2 BOTONES (Rechazar Venta / Aceptar Venta) */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-border-color">
              <Button
                variant="secondary"
                onClick={() => setShowBoletaPreview(false)}
                type="button"
                disabled={isProcessing}
              >
                Rechazar Venta
              </Button>
              <Button
                variant="primary"
                icon={isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                disabled={isProcessing}
                onClick={handleFinalConfirmSale}
                type="button"
              >
                {isProcessing ? 'Procesando' : 'Aceptar Venta'}
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