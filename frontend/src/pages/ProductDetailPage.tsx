import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, MessageCircle, FileDown, Share2, Check, RefreshCw, 
  Building2, ShieldCheck, Truck, Wrench, CreditCard, RotateCw, 
  Gauge, Disc, Zap, ShoppingCart, Calculator, ArrowRightLeft, Sparkles
} from 'lucide-react';
import { productsService, settingsService, branchesService, Product, Branch, BranchStock } from '../lib/db-services';
import { removeWhiteBackground } from '../lib/image-cutout';
import { getMotorcycleSpecs } from '../lib/motorcycle-specs';
import { exportProductFlyerPdf } from '../lib/catalog-flyer';
import { TransferModal } from '../components/inventory/TransferModal';
import Swal from 'sweetalert2';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tenantInfo, setTenantInfo] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedAngleIndex, setSelectedAngleIndex] = useState(0);
  const [processedImage, setProcessedImage] = useState<string>('');
  const [isProcessingImg, setIsProcessingImg] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(3.75);

  // Credit Simulator States
  const [showSimulator, setShowSimulator] = useState(false);
  const [financingMonths, setFinancingMonths] = useState(36);
  const [initialPaymentPct, setInitialPaymentPct] = useState(20);

  // Inter-branch Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  useEffect(() => {
    loadProductData();
  }, [id]);

  const loadProductData = async () => {
    setIsLoading(true);
    try {
      const [prods, brs, tInfo] = await Promise.all([
        productsService.getProducts(),
        branchesService.getBranches(),
        settingsService.getTenantInfo(),
      ]);

      setBranches(brs || []);
      setTenantInfo(tInfo || {});

      const found = (prods || []).find((p) => String(p.id) === String(id));
      if (found) {
        setProduct(found);
      } else if (prods && prods.length > 0) {
        setProduct(prods[0]);
      }
    } catch (err) {
      console.error('Error loading product detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Image cutout processing
  useEffect(() => {
    let isCancelled = false;
    if (product?.imagePath) {
      setIsProcessingImg(true);
      removeWhiteBackground(product.imagePath)
        .then((cutout) => {
          if (!isCancelled) {
            setProcessedImage(cutout);
            setIsProcessingImg(false);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setProcessedImage(product.imagePath || '');
            setIsProcessingImg(false);
          }
        });
    } else {
      setProcessedImage('');
      setIsProcessingImg(false);
    }
    return () => {
      isCancelled = true;
    };
  }, [product?.imagePath]);

  const specs = useMemo(() => {
    if (!product) return getMotorcycleSpecs('NS 400', 'BAJAJ PULSAR');
    return getMotorcycleSpecs(
      product.name,
      product.brand,
      product.model,
      product.category,
      (product as any).specs || (product as any).technicalSpecs
    );
  }, [product]);

  const dealerName = tenantInfo.trade_name || tenantInfo.name || 'VENTAS B&V';
  const dealerPhone = tenantInfo.phone || '999888777';
  const dealerAddress = tenantInfo.address || 'Av. Principal - Tienda Autorizada';

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#07090e] text-white p-12">
        <RefreshCw size={36} className="animate-spin text-[#f3c623] mb-3" />
        <span className="text-sm font-semibold text-slate-300">Cargando ficha del vehículo...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#07090e] text-white p-12 space-y-4">
        <h2 className="text-xl font-bold">Producto no encontrado</h2>
        <p className="text-sm text-slate-400">El modelo solicitado no está disponible en la base de datos.</p>
        <button
          onClick={() => navigate('/app/products')}
          className="px-6 py-2.5 bg-[#f3c623] text-black font-extrabold text-xs uppercase rounded-lg shadow-lg hover:bg-yellow-400 cursor-pointer"
        >
          Volver a Inventario
        </button>
      </div>
    );
  }

  const colorsList = product.colors && product.colors.length > 0
    ? product.colors
    : [
        { color: 'Negro Ébano', hex: '#111827', stock: 3 },
        { color: 'Rojo Racing', hex: '#dc2626', stock: 2 },
        { color: 'Blanco Perla', hex: '#f8fafc', stock: 2 },
      ];

  const activeColor = colorsList[selectedColorIndex] || colorsList[0];

  const usdPrice = product.price > 0 && exchangeRate > 0
    ? (product.price / exchangeRate).toFixed(2)
    : '0.00';

  // Quotation trigger WhatsApp
  const handleWhatsAppQuote = () => {
    const rawPhone = dealerPhone.replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 9 ? `51${rawPhone}` : rawPhone || '51999888777';

    let text = `¡Hola *${dealerName}*! 👋\n\n`;
    text += `Estoy consultando la *Ficha Oficial de Producto* y me interesa cotizar este modelo:\n\n`;
    text += `🏍️ *${product.brand?.toUpperCase()} ${product.name?.toUpperCase()}*\n`;
    if (activeColor?.color) {
      text += `🎨 *Color de Preferencia:* ${activeColor.color}\n`;
    }
    text += `💰 *Precio:* S/ ${product.price.toLocaleString('es-PE', { minimumFractionDigits: 0 })}\n`;
    text += `💵 *Ref. USD:* $ ${usdPrice}\n`;
    text += `\n¿Me pueden confirmar disponibilidad de entrega inmediata, sedes con stock y requisitos para crédito?`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleExportPdf = () => {
    exportProductFlyerPdf(product, tenantInfo, exchangeRate);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/catalog/showcase?p=${product.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${product.brand} ${product.name}`,
          text: `Ficha Técnica ${product.brand} ${product.name}:`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Financing Calculation
  const initialAmount = (product.price * initialPaymentPct) / 100;
  const loanAmount = Math.max(0, product.price - initialAmount);
  const monthlyRate = 0.015; // 1.5% mensual referencial
  const monthlyQuota = financingMonths > 0
    ? Math.round((loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, financingMonths))) / (Math.pow(1 + monthlyRate, financingMonths) - 1))
    : 0;

  // Visual feature highlights
  const keyFeatures = [
    {
      id: 'f1',
      title: 'AGARRE SUPERIOR',
      icon: (
        <svg className="w-5 h-5 text-[#f3c623]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
    {
      id: 'f2',
      title: 'DISEÑO ANTIDESLIZANTE',
      icon: (
        <svg className="w-5 h-5 text-[#f3c623]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      id: 'f3',
      title: 'MÁXIMA DURABILIDAD',
      icon: (
        <svg className="w-5 h-5 text-[#f3c623]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      id: 'f4',
      title: 'ERGONOMÍA PERFECTA',
      icon: (
        <svg className="w-5 h-5 text-[#f3c623]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      ),
    },
  ];

  const categoryBadge = (product.category || 'MOTOCICLETAS').toUpperCase();
  const brandDisplay = (product.brand || 'BAJAJ PULSAR').toUpperCase();
  const rawModelName = (product.model || product.name || 'NS 400').toUpperCase();
  const shortModelSlug = rawModelName.replace(brandDisplay, '').trim() || rawModelName;

  const angleThumbnails = [
    { id: 0, label: 'Vista Principal', is360: true, img: processedImage || product.imagePath },
    { id: 1, label: 'Detalle Lateral', is360: false, img: processedImage || product.imagePath },
    { id: 2, label: 'Detalle Chasis', is360: false, img: processedImage || product.imagePath },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col justify-between font-sans selection:bg-[#f3c623] selection:text-black">
      
      {/* Background Ambience / Industrial Workshop Lighting */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 55% 42%, rgba(243, 198, 35, 0.12) 0%, rgba(12, 16, 24, 0.6) 40%, rgba(7, 9, 14, 0.98) 75%),
            linear-gradient(to bottom, rgba(7, 9, 14, 0.85) 0%, rgba(7, 9, 14, 0.95) 100%),
            url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2400&q=80')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-[1650px] mx-auto px-4 sm:px-8 lg:px-12 pt-4 sm:pt-6 pb-8 flex-1 flex flex-col justify-between">
        
        {/* Top Navbar / Navigation Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/app/products')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Volver a Productos</span>
            </button>

            <div className="border-2 border-white px-2.5 py-1 text-white font-black text-xs uppercase tracking-wider select-none hidden sm:block">
              {dealerName}
            </div>
          </div>

          {/* Quick Action Tools */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              title="Traspaso de inventario entre sedes"
            >
              <ArrowRightLeft size={14} />
              <span className="hidden sm:inline">Traspaso Sedes</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#f3c623] border border-white/10 text-slate-300 hover:text-black text-xs font-bold transition-all cursor-pointer"
              title="Descargar Ficha Técnica PDF"
            >
              <FileDown size={14} />
              <span className="hidden sm:inline">Ficha PDF</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#f3c623] border border-white/10 text-slate-300 hover:text-black text-xs font-bold transition-all cursor-pointer"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
              <span className="hidden sm:inline">{copiedLink ? 'Copiado' : 'Compartir'}</span>
            </button>
          </div>

        </div>

        {/* Hero Section Grid (Exact match to reference visual structure) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto py-6">
          
          {/* LEFT: Category Badge, Dual Hero Title, Editorial Description, 4 Golden Feature Boxes */}
          <div className="lg:col-span-4 flex flex-col justify-center space-y-5 z-20">
            
            {/* Category Badge */}
            <div>
              <span className="inline-block px-3.5 py-1 bg-[#f3c623] text-black font-black text-xs uppercase tracking-wider rounded-md shadow-lg shadow-yellow-500/20">
                {categoryBadge}
              </span>
            </div>

            {/* Dual Hero Title */}
            <div className="space-y-0 select-none">
              <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-black uppercase text-white tracking-tight leading-none drop-shadow-md">
                {brandDisplay}
              </h1>
              <div className="text-5xl sm:text-6xl lg:text-6xl xl:text-7xl font-black uppercase text-[#f3c623] tracking-tight leading-none drop-shadow-[0_4px_20px_rgba(243,198,35,0.4)]">
                {shortModelSlug}
              </div>
            </div>

            {/* Editorial Description with Bold Accents */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light pr-2">
              La nueva {dealerName} <strong className="text-white font-bold">{product.brand} {product.model || product.name}</strong> no solo tiene un motor potente con tecnología de vanguardia, sino que viene equipada con frenado <strong className="text-white font-bold">{specs.brakes}</strong>, <strong className="text-white font-bold">{specs.fuelSystem}</strong> y suspensión de alta estabilidad para máximo desempeño y confort en ciudad y carretera.
            </p>

            {/* 4 Key Feature Highlight Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2 pt-2">
              {keyFeatures.map((f) => (
                <div 
                  key={f.id}
                  className="flex flex-col items-center justify-center text-center p-2.5 rounded-xl bg-black/40 border border-[#f3c623]/30 hover:border-[#f3c623] hover:bg-[#f3c623]/10 transition-all duration-300 group cursor-default shadow-lg backdrop-blur-sm"
                >
                  <div className="p-2 rounded-lg bg-[#f3c623]/10 border border-[#f3c623]/40 group-hover:scale-110 transition-transform mb-1.5">
                    {f.icon}
                  </div>
                  <span className="text-[10px] font-black text-white uppercase tracking-tight leading-tight">
                    {f.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Color Variants Quick Selector */}
            <div className="pt-2 flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Variante:</span>
              <div className="flex items-center gap-2">
                {colorsList.map((c, idx) => {
                  const isSel = selectedColorIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedColorIndex(idx)}
                      title={`${c.color} (${c.stock} en stock)`}
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                        isSel ? 'ring-2 ring-[#f3c623] scale-110 border-white' : 'border-white/20 opacity-75 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex || (idx === 0 ? '#111827' : idx === 1 ? '#dc2626' : '#ffffff') }}
                    >
                      {isSel && <Check size={12} className={c.hex === '#ffffff' || c.color.toLowerCase().includes('blanco') ? 'text-black' : 'text-white'} />}
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-semibold text-[#f3c623]">
                {activeColor.color} ({activeColor.stock ?? 1} disp.)
              </span>
            </div>

          </div>

          {/* CENTER STAGE: Tech HUD Orbital Rings + Cutout Image */}
          <div className="lg:col-span-6 relative flex items-center justify-center min-h-[360px] sm:min-h-[460px] lg:min-h-[520px]">
            
            {/* Tech HUD Orbital Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[360px] sm:w-[480px] lg:w-[560px] h-[360px] sm:h-[480px] lg:h-[560px] rounded-full border border-[#f3c623]/20 border-dashed animate-[spin_60s_linear_infinite]" />
              <div className="absolute w-[280px] sm:w-[390px] lg:w-[460px] h-[280px] sm:h-[390px] lg:h-[460px] rounded-full border-2 border-[#f3c623]/30 shadow-[0_0_50px_rgba(243,198,35,0.15)]" />
              <div className="absolute w-[210px] sm:w-[290px] lg:w-[340px] h-[210px] sm:h-[290px] lg:h-[340px] rounded-full border border-[#f3c623]/25" />
            </div>

            {/* Cutout Image */}
            <div className="relative z-10 flex flex-col items-center justify-center w-full px-2 group">
              {processedImage || product.imagePath ? (
                <div className="relative flex flex-col items-center">
                  <img
                    src={processedImage || product.imagePath}
                    alt={product.name}
                    className="max-h-[340px] sm:max-h-[440px] lg:max-h-[540px] w-auto max-w-full object-contain drop-shadow-[0_30px_45px_rgba(0,0,0,0.95)] transition-all duration-500 group-hover:scale-105"
                  />
                  <div className="w-[80%] h-7 bg-black/90 blur-xl rounded-full mt-[-15px] pointer-events-none" />
                </div>
              ) : (
                <div className="w-80 h-56 flex items-center justify-center text-slate-500 text-xs border border-white/10 rounded-2xl bg-black/40">
                  (Imagen no disponible)
                </div>
              )}
            </div>

          </div>

          {/* RIGHT: Vertical Thumbnails & Angles Stack with 360 Badge */}
          <div className="lg:col-span-2 flex flex-row lg:flex-col items-center justify-center gap-3 z-20">
            {angleThumbnails.map((thumb, idx) => {
              const isSel = selectedAngleIndex === idx;
              return (
                <button
                  key={thumb.id}
                  type="button"
                  onClick={() => setSelectedAngleIndex(idx)}
                  className={`relative w-24 sm:w-28 lg:w-32 h-20 sm:h-24 lg:h-26 rounded-xl bg-black/80 border p-2 flex items-center justify-center overflow-hidden transition-all duration-300 cursor-pointer ${
                    isSel
                      ? 'border-[#f3c623] ring-2 ring-[#f3c623]/60 shadow-[0_0_20px_rgba(243,198,35,0.4)] scale-105'
                      : 'border-white/10 opacity-70 hover:opacity-100 hover:border-white/30'
                  }`}
                >
                  {thumb.is360 && (
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-[#f3c623] text-black font-black text-[9px] rounded uppercase tracking-wider flex items-center gap-0.5 shadow">
                      <RotateCw size={9} /> 360°
                    </span>
                  )}
                  {thumb.img ? (
                    <img 
                      src={thumb.img} 
                      alt={thumb.label} 
                      className="max-h-full w-auto object-contain drop-shadow" 
                    />
                  ) : (
                    <span className="text-[10px] text-slate-500">Vista {idx + 1}</span>
                  )}
                </button>
              );
            })}

            {/* Credit Simulator Toggle */}
            <button
              type="button"
              onClick={() => setShowSimulator(!showSimulator)}
              className="mt-2 w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-[#f3c623] text-slate-300 hover:text-black border border-white/10 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Calculator size={14} />
              <span>{showSimulator ? 'Ocultar Cuotas' : 'Simular Cuotas'}</span>
            </button>
          </div>

        </div>

        {/* Expandable Credit Mini Simulator (if opened) */}
        {showSimulator && (
          <div className="relative z-20 w-full mb-4 bg-black/70 border border-[#f3c623]/40 rounded-2xl p-5 backdrop-blur-xl animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Calculator size={16} className="text-[#f3c623]" />
                <span>Simulador de Crédito Vehicular Referencial</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Cuota estimada: </span>
                <strong className="text-lg font-black text-[#f3c623] font-mono">
                  S/ {monthlyQuota.toLocaleString('es-PE')}/mes
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>Cuota Inicial ({initialPaymentPct}%)</span>
                  <span className="font-mono font-bold text-white">S/ {initialAmount.toLocaleString('es-PE')}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={initialPaymentPct}
                  onChange={(e) => setInitialPaymentPct(Number(e.target.value))}
                  className="w-full accent-[#f3c623] cursor-pointer"
                />
              </div>

              <div>
                <span className="block text-xs text-slate-300 mb-1.5">Plazo de Financiamiento</span>
                <div className="grid grid-cols-4 gap-2">
                  {[12, 24, 36, 48].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFinancingMonths(m)}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        financingMonths === m
                          ? 'bg-[#f3c623] text-black shadow-md'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {m} meses
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM SECTION: Floating Telemetry Specs & Purchase Dock */}
        <div className="relative z-20 w-full mt-2">
          <div className="bg-[#0b0e14]/95 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col lg:flex-row items-center justify-between gap-6">
            
            {/* Left: 4 Circular Technical Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 w-full lg:w-auto flex-1">
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-black/60 border border-[#f3c623]/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(243,198,35,0.15)]">
                  <svg className="w-6 h-6 text-[#f3c623]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">CILINDRADA</span>
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">{specs.displacement}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-black/60 border border-[#f3c623]/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(243,198,35,0.15)]">
                  <Gauge className="w-6 h-6 text-[#f3c623]" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">POTENCIA</span>
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">{specs.power.split('@')[0].trim()}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-black/60 border border-[#f3c623]/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(243,198,35,0.15)]">
                  <Disc className="w-6 h-6 text-[#f3c623]" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">FRENOS</span>
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">{specs.brakes.includes('ABS') ? 'ABS DOBLE CANAL' : 'DOBLE DISCO'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-black/60 border border-[#f3c623]/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(243,198,35,0.15)]">
                  <Zap className="w-6 h-6 text-[#f3c623]" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">SISTEMA</span>
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">{specs.fuelSystem.toUpperCase()}</span>
                </div>
              </div>

            </div>

            {/* Right: Edition, Price, and Big Conversion Hero Button */}
            <div className="flex flex-wrap items-center justify-between lg:justify-end gap-6 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-8">
              
              <div className="space-y-0.5 text-left lg:text-right">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#f3c623]">
                  EDICIÓN 2026
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-sans">
                  S/ {product.price.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="text-[11px] font-semibold text-slate-400 font-mono">
                  USD $ {usdPrice} <span className="text-[10px] text-slate-500 font-normal">(REFERENCIAL)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleWhatsAppQuote}
                className="w-full sm:w-auto px-8 py-4 bg-[#f3c623] hover:bg-[#e5b719] active:scale-95 text-black font-black text-sm uppercase tracking-wider rounded-xl shadow-[0_10px_30px_rgba(243,198,35,0.35)] transition-all flex items-center justify-center gap-3 cursor-pointer group"
              >
                <ShoppingCart size={20} className="stroke-[2.5] group-hover:scale-110 transition-transform" />
                <span>QUIERO ESTA MOTO</span>
              </button>

            </div>

          </div>
        </div>

        {/* BOTTOM TRUST & GUARANTEES BAR */}
        <div className="relative z-20 w-full pt-6 pb-2 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/5 mt-4">
          
          <div className="flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-black/40 border border-[#f3c623]/30 text-[#f3c623]">
              <Truck size={18} />
            </div>
            <div>
              <div className="text-xs font-black text-white uppercase tracking-tight">ENVÍOS A TODO EL PERÚ</div>
              <div className="text-[11px] text-slate-400 font-light">Rápidos y seguros</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-black/40 border border-[#f3c623]/30 text-[#f3c623]">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="text-xs font-black text-white uppercase tracking-tight">GARANTÍA CERTIFICADA</div>
              <div className="text-[11px] text-slate-400 font-light">Calidad garantizada</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-black/40 border border-[#f3c623]/30 text-[#f3c623]">
              <Wrench size={18} />
            </div>
            <div>
              <div className="text-xs font-black text-white uppercase tracking-tight">SOPORTE TÉCNICO</div>
              <div className="text-[11px] text-slate-400 font-light">Asesoría especializada</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-black/40 border border-[#f3c623]/30 text-[#f3c623]">
              <CreditCard size={18} />
            </div>
            <div>
              <div className="text-xs font-black text-white uppercase tracking-tight">PAGOS SEGUROS</div>
              <div className="text-[11px] text-slate-400 font-light">100% protegidos</div>
            </div>
          </div>

        </div>

      </div>

      {/* Inter-branch Transfer Modal */}
      {isTransferModalOpen && (
        <TransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          products={product ? [product] : []}
          branches={branches}
          preselectedProduct={product}
          onSuccess={loadProductData}
        />
      )}

    </div>
  );
}
