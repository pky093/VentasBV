import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, MessageCircle, FileDown, Share2, Check, RefreshCw, 
  RotateCw, Gauge, Disc, Zap, Calculator, ArrowRightLeft, Shield, Award, Sliders, Sun, Flame, Layers, Grid
} from 'lucide-react';
import { productsService, settingsService, branchesService, Product, Branch } from '../lib/db-services';
import { removeWhiteBackground } from '../lib/image-cutout';
import { getMotorcycleSpecs } from '../lib/motorcycle-specs';
import { exportProductFlyerPdf } from '../lib/catalog-flyer';
import { TransferModal } from '../components/inventory/TransferModal';

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
        try {
          const cached = localStorage.getItem(`showcase_config_${found.id}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.editorialDescription) (found as any).editorialDescription = parsed.editorialDescription;
          }
        } catch (e) {}
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

  const colorsList = product?.colors && product.colors.length > 0
    ? product.colors
    : [
        { color: 'Negro Ébano', hex: '#111827', stock: 3, imagePath: product?.imagePath },
        { color: 'Rojo Racing', hex: '#dc2626', stock: 2, imagePath: product?.imagePath },
        { color: 'Blanco Perla', hex: '#f8fafc', stock: 2, imagePath: product?.imagePath },
      ];

  const activeColor = colorsList[selectedColorIndex] || colorsList[0];

  const angleThumbnails = useMemo(() => {
    if (activeColor?.galleryAngles && Array.isArray(activeColor.galleryAngles) && activeColor.galleryAngles.length > 0) {
      const hasValid = activeColor.galleryAngles.some(a => a.img && a.img.trim().length > 0);
      if (hasValid) {
        return activeColor.galleryAngles.map((a, i) => ({
          id: i,
          label: a.label || (i === 0 ? 'Vista Principal' : i === 1 ? 'Detalle Lateral' : 'Detalle Chasis'),
          is360: a.is360 ?? (i === 0),
          img: a.img || activeColor.imagePath || ''
        }));
      }
    }
    if (activeColor?.imagePath && activeColor.imagePath.trim().length > 0) {
      return [
        { id: 0, label: 'Vista Principal', is360: true, img: activeColor.imagePath },
        { id: 1, label: 'Detalle Lateral', is360: false, img: activeColor.imagePath },
        { id: 2, label: 'Detalle Chasis', is360: false, img: activeColor.imagePath },
      ];
    }
    return [
      { id: 0, label: 'Vista Principal', is360: true, img: product?.imagePath || '' },
      { id: 1, label: 'Detalle Lateral', is360: false, img: product?.imagePath || '' },
      { id: 2, label: 'Detalle Chasis', is360: false, img: product?.imagePath || '' },
    ];
  }, [product, activeColor]);

  // Dynamic active image path based on selected angle thumbnail or selected color
  const activeImagePath = useMemo(() => {
    const selectedThumb = angleThumbnails[selectedAngleIndex];
    if (selectedThumb?.img && selectedThumb.img.trim()) {
      return selectedThumb.img;
    }
    return activeColor?.imagePath || (activeColor as any)?.img || product?.imagePath || '';
  }, [angleThumbnails, selectedAngleIndex, activeColor, product]);

  // Image cutout processing
  useEffect(() => {
    let isCancelled = false;
    if (activeImagePath) {
      setIsProcessingImg(true);
      removeWhiteBackground(activeImagePath)
        .then((cutout) => {
          if (!isCancelled) {
            setProcessedImage(cutout);
            setIsProcessingImg(false);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setProcessedImage(activeImagePath || '');
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
  }, [activeImagePath]);

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
  const primaryColor = (product as any)?.primaryColor || '#f3c623';

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#07090e] text-white p-8">
        <RefreshCw size={36} className="animate-spin text-[#f3c623] mb-3" />
        <span className="text-sm font-semibold text-slate-300">Cargando ficha del vehículo...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#07090e] text-white p-8 space-y-4">
        <h2 className="text-xl font-bold">Producto no encontrado</h2>
        <p className="text-sm text-slate-400">El modelo solicitado no está disponible en la base de datos.</p>
        <button
          onClick={() => navigate('/app/products')}
          className="px-6 py-2 bg-[#f3c623] text-black font-extrabold text-xs uppercase rounded-lg shadow-lg hover:bg-yellow-400 cursor-pointer"
        >
          Volver a Inventario
        </button>
      </div>
    );
  }

  const usdPrice = product.price > 0 && exchangeRate > 0
    ? (product.price / exchangeRate).toFixed(2)
    : '0.00';

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
    text += `\n¿Me pueden confirmar disponibilidad de entrega inmediata y sedes con stock?`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleExportPdf = () => {
    exportProductFlyerPdf(product, tenantInfo, exchangeRate);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/#/catalog/showcase?p=${product.id}`;
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
  const monthlyRate = 0.015;
  const monthlyQuota = financingMonths > 0
    ? Math.round((loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, financingMonths))) / (Math.pow(1 + monthlyRate, financingMonths) - 1))
    : 0;

  const keyFeatures = [
    {
      id: 'f1',
      title: 'AGARRE SUPERIOR',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2.2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
    {
      id: 'f2',
      title: 'DISEÑO ANTIDESLIZANTE',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2.2">
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
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2.2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      id: 'f4',
      title: 'ERGONOMÍA PERFECTA',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2.2">
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

  return (
    <div className="relative w-full min-h-screen bg-[#07090e] text-white flex flex-col justify-between select-none font-sans py-3 sm:py-5 selection:bg-[#f3c623] selection:text-black">
      
      {/* Background Ambience */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 60% 40%, ${primaryColor}1a 0%, rgba(12, 16, 24, 0.7) 45%, rgba(7, 9, 14, 0.98) 80%),
            linear-gradient(to bottom, rgba(7, 9, 14, 0.85) 0%, rgba(7, 9, 14, 0.95) 100%),
            url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2400&q=80')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Main Single-Screen Content Area */}
      <div className="relative z-10 w-full max-w-[1650px] mx-auto px-4 sm:px-8 lg:px-12 flex-1 flex flex-col justify-between space-y-4">
        
        {/* Top Navbar / Navigation Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-white/10 shrink-0">
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/app/products')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Volver a Productos</span>
            </button>

            <div className="border-2 border-white px-3 py-1 text-white font-black text-xs uppercase tracking-wider select-none hidden sm:block">
              {dealerName}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Horizontal 3 Thumbnail Cards */}
            <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-xl border border-white/10 backdrop-blur-md">
              {angleThumbnails.map((thumb, idx) => {
                const isSel = selectedAngleIndex === idx;
                return (
                  <button
                    key={thumb.id}
                    type="button"
                    onClick={() => setSelectedAngleIndex(idx)}
                    style={{
                      borderColor: isSel ? primaryColor : undefined,
                      boxShadow: isSel ? `0 0 15px ${primaryColor}66` : undefined,
                    }}
                    className={`relative w-16 sm:w-20 h-11 sm:h-13 rounded-lg bg-black/90 border p-1 flex items-center justify-center overflow-hidden transition-all duration-200 cursor-pointer ${
                      isSel
                        ? 'ring-2 scale-105'
                        : 'border-white/15 opacity-60 hover:opacity-100 hover:border-white/30'
                    }`}
                    title={thumb.label}
                  >
                    {thumb.is360 && (
                      <span 
                        style={{ backgroundColor: primaryColor }}
                        className="absolute top-0.5 right-0.5 px-1 py-0.2 text-black font-black text-[7.5px] rounded uppercase tracking-wider flex items-center gap-0.5 shadow z-10"
                      >
                        <RotateCw size={7.5} /> 360°
                      </span>
                    )}
                    {thumb.img ? (
                      <img 
                        src={thumb.img} 
                        alt={thumb.label} 
                        className="max-h-full w-auto object-contain drop-shadow" 
                      />
                    ) : (
                      <span className="text-[9px] text-slate-500">Vista {idx + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleWhatsAppQuote}
                title="Cotizar por WhatsApp con un Asesor"
                className="flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#25d366] to-[#1eb854] hover:from-[#20bd5a] hover:to-[#189b45] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(37,211,102,0.45)] border border-emerald-300 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <MessageCircle size={15} className="fill-black" />
                <span className="hidden sm:inline">Cotizar WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTransferModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                title="Traspaso de inventario entre sedes"
              >
                <ArrowRightLeft size={14} />
                <span className="hidden md:inline">Traspaso</span>
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                title="Descargar Ficha Técnica PDF"
              >
                <FileDown size={14} />
                <span className="hidden md:inline">Ficha PDF</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
                <span className="hidden md:inline">{copiedLink ? 'Copiado' : 'Compartir'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* ── TOP HERO BANNER: Brand/Title/Price (Left) + Description/4 Features/Colors (Right) ── */}
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-4 lg:gap-8 bg-black/50 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-xl shrink-0">
          
          {/* LEFT SIDE (32-35%): Category Badge, Brand, Huge Model Title, Price Badge */}
          <div className="w-full md:w-[35%] lg:w-[32%] shrink-0 flex flex-col justify-center space-y-2">
            <div>
              <span 
                style={{ backgroundColor: primaryColor }}
                className="inline-block px-3 py-0.5 text-black font-black text-[11px] uppercase tracking-wider rounded shadow-md"
              >
                {categoryBadge}
              </span>
            </div>

            <div className="space-y-0 select-none">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-white tracking-tight leading-none drop-shadow-md">
                {brandDisplay}
              </h1>
              <div 
                style={{ 
                  color: primaryColor,
                  textShadow: `0 4px 20px ${primaryColor}66`
                }}
                className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-none"
              >
                {shortModelSlug}
              </div>
            </div>

            {/* Price Badge */}
            <div className="flex flex-wrap items-baseline gap-2 pt-1">
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans">
                S/ {product.price.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs font-bold text-slate-400 font-mono">
                USD $ {usdPrice} <span className="text-[10px] text-slate-500 font-normal">(REF.)</span>
              </div>
              <span 
                style={{ 
                  backgroundColor: `${primaryColor}26`, 
                  borderColor: `${primaryColor}80`, 
                  color: primaryColor 
                }}
                className="px-2 py-0.5 rounded border font-black text-[9.5px] uppercase tracking-wider shadow"
              >
                EDICIÓN 2026
              </span>
            </div>
          </div>

          {/* RIGHT SIDE (65-68%): Editorial Description, 4 Capsule Feature Cards (Horizontal Row), Colors Picker */}
          <div className="w-full md:w-[65%] lg:w-[68%] flex flex-col justify-center space-y-3 md:border-l md:border-white/10 md:pl-6">
            
            {/* Editorial Description */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
              {(product as any)?.editorialDescription || product?.description || (
                <>
                  La nueva {dealerName} <strong className="text-white font-bold">{product.brand} {product.model || product.name}</strong> no solo tiene un motor potente con tecnología de vanguardia, sino que viene equipada con frenado <strong className="text-white font-bold">{specs.brakes}</strong>, <strong className="text-white font-bold">{specs.fuelSystem}</strong> y suspensión de alta estabilidad para máximo desempeño y confort.
                </>
              )}
            </p>

            {/* 4 Key Feature Stadium Capsule Cards in 1 horizontal row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {keyFeatures.map((f) => (
                <div 
                  key={f.id}
                  style={{
                    borderColor: `${primaryColor}66`,
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-black/80 hover:bg-black/95 border transition-all duration-300 group cursor-default shadow-md backdrop-blur-sm"
                >
                  <div 
                    style={{
                      borderColor: `${primaryColor}80`,
                    }}
                    className="w-6 h-6 rounded-full border bg-black flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                  >
                    {f.icon}
                  </div>
                  <span className="text-[9px] sm:text-[9.5px] font-black text-white uppercase tracking-tight leading-tight truncate">
                    {f.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Color variants & Simulator Trigger */}
            <div className="flex items-center justify-between gap-3 pt-0.5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">COLOR:</span>
                <div className="flex items-center gap-2">
                  {colorsList.map((c, idx) => {
                    const isSel = selectedColorIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedColorIndex(idx);
                          setSelectedAngleIndex(0);
                        }}
                        title={`${c.color} (${c.stock} en stock)`}
                        style={{
                          backgroundColor: c.hex || (idx === 0 ? '#111827' : idx === 1 ? '#dc2626' : '#ffffff'),
                          borderColor: isSel ? primaryColor : 'rgba(255,255,255,0.2)',
                        }}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                          isSel ? 'ring-2 scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {isSel && <Check size={12} className={c.hex === '#ffffff' || c.color.toLowerCase().includes('blanco') ? 'text-black' : 'text-white'} />}
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-bold" style={{ color: primaryColor }}>
                  {activeColor?.color}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowSimulator(!showSimulator)}
                className="py-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Calculator size={13} />
                <span>{showSimulator ? 'Ocultar Cuotas' : 'Simular Cuotas'}</span>
              </button>
            </div>

          </div>

        </div>

        {/* ── CENTER STAGE: Centered Product Image Stage + 4 Stadium Capsule Telemetry Globes Orbiting the Product ── */}
        <div className="relative flex items-center justify-center flex-1 my-auto min-h-[340px] sm:min-h-[420px] lg:min-h-[460px] py-4">
          
          {/* Tech HUD Orbital Rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              style={{ borderColor: `${primaryColor}33` }}
              className="w-[320px] sm:w-[440px] lg:w-[500px] h-[320px] sm:h-[440px] lg:h-[500px] rounded-full border border-dashed animate-[spin_60s_linear_infinite]" 
            />
            <div 
              style={{ 
                borderColor: `${primaryColor}4d`,
                boxShadow: `0 0 45px ${primaryColor}26`
              }}
              className="absolute w-[250px] sm:w-[360px] lg:w-[420px] h-[250px] sm:h-[360px] lg:h-[420px] rounded-full border-2" 
            />
            <div 
              style={{ borderColor: `${primaryColor}40` }}
              className="absolute w-[180px] sm:w-[260px] lg:w-[310px] h-[180px] sm:h-[260px] lg:h-[310px] rounded-full border" 
            />
          </div>

          {/* ── FLOATING SPEC CAPSULE 1: Top-Left (Cilindrada) ── */}
          <div 
            style={{ 
              borderColor: `${primaryColor}`,
              boxShadow: `0 0 20px ${primaryColor}26`
            }}
            className="absolute top-2 left-0 sm:left-4 lg:left-8 z-20 hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-black/90 hover:bg-black border backdrop-blur-xl hover:scale-105 transition-all duration-300 group cursor-default min-w-[160px]"
          >
            <div 
              style={{ borderColor: `${primaryColor}` }}
              className="w-8 h-8 rounded-full border bg-black flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">CILINDRADA</span>
              <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight leading-none">{specs.displacement}</span>
            </div>
          </div>

          {/* ── FLOATING SPEC CAPSULE 2: Bottom-Left (Potencia) ── */}
          <div 
            style={{ 
              borderColor: `${primaryColor}`,
              boxShadow: `0 0 20px ${primaryColor}26`
            }}
            className="absolute bottom-2 left-0 sm:left-4 lg:left-8 z-20 hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-black/90 hover:bg-black border backdrop-blur-xl hover:scale-105 transition-all duration-300 group cursor-default min-w-[160px]"
          >
            <div 
              style={{ borderColor: `${primaryColor}` }}
              className="w-8 h-8 rounded-full border bg-black flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
            >
              <Gauge className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <div className="flex flex-col text-left">
              <span className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">POTENCIA</span>
              <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight leading-none">{specs.power.split('@')[0].trim()}</span>
            </div>
          </div>

          {/* ── FLOATING SPEC CAPSULE 3: Top-Right (Frenos) ── */}
          <div 
            style={{ 
              borderColor: `${primaryColor}`,
              boxShadow: `0 0 20px ${primaryColor}26`
            }}
            className="absolute top-2 right-0 sm:right-4 lg:right-8 z-20 hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-black/90 hover:bg-black border backdrop-blur-xl hover:scale-105 transition-all duration-300 group cursor-default min-w-[160px]"
          >
            <div 
              style={{ borderColor: `${primaryColor}` }}
              className="w-8 h-8 rounded-full border bg-black flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
            >
              <Disc className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <div className="flex flex-col text-left">
              <span className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">FRENOS</span>
              <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight leading-none">{specs.brakes.includes('ABS') ? 'ABS DOBLE CANAL' : 'DOBLE DISCO'}</span>
            </div>
          </div>

          {/* ── FLOATING SPEC CAPSULE 4: Bottom-Right (Sistema) ── */}
          <div 
            style={{ 
              borderColor: `${primaryColor}`,
              boxShadow: `0 0 20px ${primaryColor}26`
            }}
            className="absolute bottom-2 right-0 sm:right-4 lg:right-8 z-20 hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-black/90 hover:bg-black border backdrop-blur-xl hover:scale-105 transition-all duration-300 group cursor-default min-w-[160px]"
          >
            <div 
              style={{ borderColor: `${primaryColor}` }}
              className="w-8 h-8 rounded-full border bg-black flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
            >
              <Zap className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <div className="flex flex-col text-left">
              <span className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">SISTEMA</span>
              <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight leading-none">{specs.fuelSystem.toUpperCase()}</span>
            </div>
          </div>

          {/* Cutout Image */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full px-4 group">
            {processedImage || activeImagePath ? (
              <div className="relative flex flex-col items-center">
                <img
                  src={processedImage || activeImagePath}
                  alt={product.name}
                  className="max-h-[280px] sm:max-h-[360px] md:max-h-[420px] lg:max-h-[480px] w-auto max-w-full object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.95)] transition-all duration-300 group-hover:scale-105"
                />
                <div className="w-[80%] h-6 bg-black/90 blur-xl rounded-full mt-[-10px] pointer-events-none" />
              </div>
            ) : (
              <div className="w-72 h-48 flex items-center justify-center text-slate-500 text-xs border border-white/10 rounded-2xl bg-black/40">
                (Imagen no disponible)
              </div>
            )}
          </div>

        </div>

        {/* Mobile View 4 Spec Cards */}
        <div className="grid grid-cols-2 gap-2 sm:hidden pt-2 z-20">
          <div 
            style={{ borderColor: primaryColor }}
            className="flex items-center gap-2.5 p-2.5 rounded-full bg-black/90 border"
          >
            <div 
              style={{ borderColor: primaryColor }}
              className="w-7 h-7 rounded-full bg-black border flex items-center justify-center shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" /><circle cx="12" cy="12" r="3" /></svg>
            </div>
            <div className="flex flex-col text-left truncate">
              <span className="block text-[7.5px] text-slate-400 font-bold uppercase leading-none mb-0.5">CILINDRADA</span>
              <span className="text-xs font-black text-white leading-none truncate">{specs.displacement}</span>
            </div>
          </div>

          <div 
            style={{ borderColor: primaryColor }}
            className="flex items-center gap-2.5 p-2.5 rounded-full bg-black/90 border"
          >
            <div 
              style={{ borderColor: primaryColor }}
              className="w-7 h-7 rounded-full bg-black border flex items-center justify-center shrink-0"
            >
              <Gauge className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <div className="flex flex-col text-left truncate">
              <span className="block text-[7.5px] text-slate-400 font-bold uppercase leading-none mb-0.5">POTENCIA</span>
              <span className="text-xs font-black text-white leading-none truncate">{specs.power.split('@')[0].trim()}</span>
            </div>
          </div>

          <div 
            style={{ borderColor: primaryColor }}
            className="flex items-center gap-2.5 p-2.5 rounded-full bg-black/90 border"
          >
            <div 
              style={{ borderColor: primaryColor }}
              className="w-7 h-7 rounded-full bg-black border flex items-center justify-center shrink-0"
            >
              <Disc className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <div className="flex flex-col text-left truncate">
              <span className="block text-[7.5px] text-slate-400 font-bold uppercase leading-none mb-0.5">FRENOS</span>
              <span className="text-xs font-black text-white leading-none truncate">{specs.brakes.includes('ABS') ? 'ABS DOBLE CANAL' : 'DOBLE DISCO'}</span>
            </div>
          </div>

          <div 
            style={{ borderColor: primaryColor }}
            className="flex items-center gap-2.5 p-2.5 rounded-full bg-black/90 border"
          >
            <div 
              style={{ borderColor: primaryColor }}
              className="w-7 h-7 rounded-full bg-black border flex items-center justify-center shrink-0"
            >
              <Zap className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <div className="flex flex-col text-left truncate">
              <span className="block text-[7.5px] text-slate-400 font-bold uppercase leading-none mb-0.5">SISTEMA</span>
              <span className="text-xs font-black text-white leading-none truncate">{specs.fuelSystem.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Expandable Credit Mini Simulator */}
        {showSimulator && (
          <div className="relative z-20 w-full mb-1 bg-black/80 border border-white/10 rounded-xl p-4 backdrop-blur-xl animate-fade-in space-y-3 shrink-0">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Calculator size={16} style={{ color: primaryColor }} />
                <span>Simulador de Crédito Vehicular</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Cuota estimada: </span>
                <strong className="text-base font-black font-mono" style={{ color: primaryColor }}>
                  S/ {monthlyQuota.toLocaleString('es-PE')}/mes
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="w-full cursor-pointer h-2"
                  style={{ accentColor: primaryColor }}
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
                      style={{
                        backgroundColor: financingMonths === m ? primaryColor : undefined,
                        color: financingMonths === m ? '#000000' : undefined,
                      }}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        financingMonths === m
                          ? 'shadow-md'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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
